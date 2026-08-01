import React, { useState, useEffect, useCallback } from 'react';
import {
    Card, Input, Button, Typography, Select,
    Space, Upload, Alert, App as AntdApp, Table, Tag,
    Progress, Popconfirm,
} from 'antd';
import {
    CloudUploadOutlined, ReloadOutlined, InboxOutlined, DeleteOutlined,
    SyncOutlined,
} from '@ant-design/icons';
import { gameApi } from '../../api';

const { Text } = Typography;
const { Dragger } = Upload;

const bufferToHex = (buffer) => Array.from(new Uint8Array(buffer))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');

const calculateFileSHA1 = async (file) => {
    if (!window.crypto?.subtle) {
        throw new Error('当前浏览器不支持 Web Crypto，无法计算 SHA1');
    }

    const buffer = await file.arrayBuffer();
    const hashBuffer = await window.crypto.subtle.digest('SHA-1', buffer);
    return bufferToHex(hashBuffer);
};

const getPlatformPrefix = (platform) => platform || 'Windows';

const getUrlPrefixPath = (url) => {
    try {
        const pathname = new URL(url).pathname;
        const parts = pathname.split('/').filter(Boolean);
        return parts.length > 1 ? parts.slice(0, -1).join('/') : '';
    } catch {
        return '';
    }
};

const getPrefixRoot = (prefix = '') => prefix.split('/').filter(Boolean)[0] || '';

const getPlatformFromPrefix = (prefix) => {
    const root = getPrefixRoot(prefix);
    return root === 'Common' ? '' : root;
};

const formatLastModified = (value) => {
    if (!value) {
        return '-';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '-';
    }

    return date.toLocaleString(undefined, { hour12: false });
};

// 需要过滤的文件后缀（Unity 生成的 .meta / .manifest 清单文件不参与资源上传）
const FILTERED_UPLOAD_EXTENSIONS = ['.meta.manifest', '.manifest', '.meta'];

const isFilteredUploadFile = (fileName = '') => {
    const lower = fileName.toLowerCase();
    return FILTERED_UPLOAD_EXTENSIONS.some(ext => lower.endsWith(ext));
};

const getUploadTarget = (fileName, platform, resources) => {
    const existing = resources.find(resource => resource.Name === fileName);
    const existingPrefix = existing?.URL ? getUrlPrefixPath(existing.URL) : '';

    if (existingPrefix) {
        return {
            ossPrefix: existingPrefix,
            platform: getPlatformFromPrefix(existingPrefix),
            isExisting: true,
            existingURL: existing.URL,
            existingHash: existing.Hash || '',
        };
    }

    return {
        ossPrefix: '',
        platform: '',
        isExisting: false,
        suggestedPrefix: getPlatformPrefix(platform),
    };
};

// ────────────────────────────────────────────────
// 子组件：资源信息管理
// ────────────────────────────────────────────────
const ResourceInfoPanel = ({ token }) => {
    const { message: messageApi } = AntdApp.useApp();
    const [resources, setResources] = useState([]);
    const [platform, setPlatform] = useState('');
    const [fetchLoading, setFetchLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadPercent, setUploadPercent] = useState(0);
    const [uploadPhase, setUploadPhase] = useState('');
    const [lastUploaded, setLastUploaded] = useState(null);
    const [uploadQueue, setUploadQueue] = useState([]);
    const [regenerating, setRegenerating] = useState(false);

    const mapResourceRow = useCallback((resource) => ({
        key: `${resource.Name || 'resource'}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        Name: resource.Name || '',
        Hash: resource.Hash || '',
        URL: resource.URL || '',
        SubDirectory: resource.SubDirectory || '',
        LastModified: resource.LastModified || '',
    }), []);

    const loadResources = useCallback(async (targetPlatform = '', options = {}) => {
        const { silent = false } = options;
        setFetchLoading(true);
        try {
            const [res, metadataRes] = await Promise.all([
                gameApi.getResourceInfo(targetPlatform),
                token ? gameApi.getResourceInfoMetadata(targetPlatform, token).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
            ]);
            const list = Array.isArray(res.data) ? res.data : [];
            const metadataList = Array.isArray(metadataRes.data) ? metadataRes.data : [];
            const metadataMap = new Map(metadataList.map(item => [`${item.Name}|${item.URL}`, item]));
            setResources(list.map(resource => mapResourceRow({
                ...resource,
                LastModified: metadataMap.get(`${resource.Name}|${resource.URL}`)?.LastModified,
            })));
            if (!silent) {
                messageApi.success(`已加载 ${list.length} 条资源信息`);
            }
        } catch (err) {
            const status = err.response?.status;
            const msg = err.response?.data;
            if (status === 401 || status === 403) messageApi.error('权限不足或 Token 无效');
            else messageApi.error(msg || '资源信息加载失败');
        } finally {
            setFetchLoading(false);
        }
    }, [mapResourceRow, messageApi, token]);

    useEffect(() => {
        loadResources('', { silent: true });
    }, [loadResources]);

    const handlePlatformChange = (value) => {
        setPlatform(value);
        loadResources(value);
    };

    const handleRegenerateResourceInfo = async () => {
        if (!token) {
            messageApi.error('请先登录 Admin 账号');
            return;
        }

        setRegenerating(true);
        try {
            const res = await gameApi.regenerateResourceInfo(token);
            const msg = typeof res.data === 'string' ? res.data : '已计划重新生成 ResourceInfo';
            messageApi.success(msg);
            messageApi.info('扫描完成后请点击「加载当前配置」刷新列表');
        } catch (err) {
            const status = err.response?.status;
            const msg = err.response?.data;
            if (status === 401 || status === 403) messageApi.error('权限不足或 Token 无效');
            else if (status === 503) messageApi.error(msg || 'OSS 未启用');
            else messageApi.error(msg || '重新生成 ResourceInfo 失败');
        } finally {
            setRegenerating(false);
        }
    };

    const updateQueuedFile = (key, patch) => {
        setUploadQueue(prev => prev.map(item => item.key === key ? { ...item, ...patch } : item));
    };

    const removeQueuedFile = (key) => {
        setUploadQueue(prev => prev.filter(item => item.key !== key));
    };

    const handleStageResourceFile = async ({ file, onSuccess, onError }) => {
        const uploadTarget = getUploadTarget(file.name, platform, resources);
        const key = `${file.name}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const queuedFile = {
            key,
            file,
            Name: file.name,
            Hash: '',
            ossPrefix: uploadTarget.ossPrefix,
            platform: uploadTarget.platform,
            isExisting: uploadTarget.isExisting,
            existingURL: uploadTarget.existingURL,
            suggestedPrefix: uploadTarget.suggestedPrefix,
            status: 'hashing',
            percent: 0,
            error: '',
        };

        setUploadQueue(prev => [...prev.filter(item => item.Name !== file.name), queuedFile]);

        try {
            const hash = await calculateFileSHA1(file);
            if (uploadTarget.isExisting && uploadTarget.existingHash
                && hash.toLowerCase() === uploadTarget.existingHash.toLowerCase()) {
                updateQueuedFile(key, { Hash: hash, status: 'duplicate', error: '此文件与旧文件哈希一致，取消上传' });
                onSuccess?.({ staged: true });
                setTimeout(() => removeQueuedFile(key), 5000);
                return;
            }
            updateQueuedFile(key, { Hash: hash, status: 'pending' });
            if (!uploadTarget.isExisting) {
                messageApi.warning(`检测到新文件 ${file.name}，请确认名称没有拼写错误并填写 OSS Prefix`);
            }
            onSuccess?.({ staged: true });
        } catch (err) {
            updateQueuedFile(key, { status: 'error', error: err.message || 'SHA1 计算失败' });
            onError?.(err);
        }
    };

    const validateQueueItem = (item) => {
        const prefix = (item.ossPrefix || '').trim().replace(/^\/+|\/+$/g, '');
        const root = getPrefixRoot(prefix);
        if (!prefix) {
            return { valid: false, message: `${item.Name} 缺少 OSS Prefix` };
        }
        if (!['Common', 'Windows', 'Android', 'iOS', 'macOS'].includes(root)) {
            return { valid: false, message: `${item.Name} 的 OSS Prefix 必须以 Common、Windows、Android、iOS 或 macOS 开头` };
        }
        return {
            valid: true,
            ossPrefix: prefix,
            platform: getPlatformFromPrefix(prefix),
        };
    };

    const handleUploadQueue = async () => {
        if (!token) {
            messageApi.error('请先登录 Admin 账号');
            return;
        }

        const pendingItems = uploadQueue.filter(item => item.status === 'pending' || item.status === 'error');
        if (pendingItems.length === 0) {
            messageApi.info('上传队列为空');
            return;
        }

        for (const item of pendingItems) {
            const validation = validateQueueItem(item);
            if (!validation.valid) {
                messageApi.warning(validation.message);
                return;
            }
        }

        const toastKey = 'resource-file-upload';
        setUploading(true);
        setUploadPercent(0);
        setLastUploaded(null);
        messageApi.loading({ content: '正在上传资源队列...', key: toastKey, duration: 0 });

        try {
            for (let index = 0; index < pendingItems.length; index += 1) {
                const item = pendingItems[index];
                const validation = validateQueueItem(item);
                const basePercent = Math.round((index / pendingItems.length) * 100);
                setUploadPhase(`正在上传 ${item.Name} (${index + 1}/${pendingItems.length})`);
                updateQueuedFile(item.key, { status: 'uploading', percent: 0, error: '' });

                const res = await gameApi.uploadResourceFile(
                    item.file,
                    {
                        resourceName: item.Name,
                        hash: item.Hash,
                        ossPrefix: validation.ossPrefix,
                        platform: validation.platform,
                    },
                    token,
                    event => {
                        if (!event.total) return;
                        const itemPercent = Math.round((event.loaded / event.total) * 100);
                        const totalPercent = Math.round(((index + itemPercent / 100) / pendingItems.length) * 100);
                        setUploadPercent(Math.max(basePercent, totalPercent));
                        updateQueuedFile(item.key, { percent: itemPercent });
                    }
                );

                updateQueuedFile(item.key, { status: 'done', percent: 100 });
                setLastUploaded(res.data || { Name: item.Name, Hash: item.Hash });
            }

            setUploadPhase('上传完成，正在刷新资源列表...');
            await loadResources(platform, { silent: true });
            messageApi.success({ content: '资源队列上传完成', key: toastKey });
        } catch (err) {
            const msg = err.response?.data?.Message || err.response?.data || err.message || '资源包上传失败';
            const currentName = uploadPhase.match(/正在上传 (.+) \(/)?.[1];
            if (currentName) {
                setUploadQueue(prev => prev.map(item => item.Name === currentName ? { ...item, status: 'error', error: msg } : item));
            }
            messageApi.error({ content: msg, key: toastKey });
        } finally {
            setUploading(false);
            setUploadPhase('');
        }
    };

    const resourceColumns = [
        { title: '#', width: 56, render: (_, __, idx) => idx + 1 },
        { title: 'Name', dataIndex: 'Name', width: 180 },
        { title: 'Hash', dataIndex: 'Hash', render: value => <Text code copyable>{value}</Text> },
        { title: 'URL', dataIndex: 'URL', render: value => <Text copyable ellipsis style={{ maxWidth: 420 }}>{value}</Text> },
        { title: 'SubDirectory', dataIndex: 'SubDirectory', width: 150 },
        {
            title: 'Last Modified',
            dataIndex: 'LastModified',
            width: 190,
            render: value => <Text>{formatLastModified(value)}</Text>,
        },
    ];

    const queueColumns = [
        {
            title: '文件',
            dataIndex: 'Name',
            width: 180,
            render: (_, record) => (
                <Space direction="vertical" size={0}>
                    <Text>{record.Name}</Text>
                    {!record.isExisting && <Tag color="warning">新文件，请确认名称无误</Tag>}
                </Space>
            ),
        },
        {
            title: 'OSS Prefix',
            width: 260,
            render: (_, record) => record.isExisting ? (
                <Space direction="vertical" size={0}>
                    <Text code>{record.ossPrefix}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>沿用同名资源路径</Text>
                </Space>
            ) : (
                <Input
                    value={record.ossPrefix}
                    placeholder={`如 Common 或 ${record.suggestedPrefix}`}
                    disabled={uploading}
                    onChange={e => updateQueuedFile(record.key, { ossPrefix: e.target.value })}
                />
            ),
        },
        { title: 'SHA1', dataIndex: 'Hash', render: value => value ? <Text code copyable>{value}</Text> : <Text type="secondary">计算中...</Text> },
        {
            title: '状态',
            width: 150,
            render: (_, record) => {
                const statusMap = {
                    hashing: ['processing', '计算 SHA1'],
                    pending: ['default', '待上传'],
                    uploading: ['processing', `上传中 ${record.percent || 0}%`],
                    done: ['success', '已上传'],
                    duplicate: ['warning', record.error || '此文件与旧文件哈希一致，取消上传'],
                    error: ['error', record.error || '失败'],
                };
                const [color, text] = statusMap[record.status] || ['default', record.status];
                return <Tag color={color} style={{ whiteSpace: 'normal' }}>{text}</Tag>;
            },
        },
        {
            title: '操作',
            width: 90,
            render: (_, record) => (
                <Button
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    disabled={uploading || record.status === 'uploading'}
                    onClick={() => removeQueuedFile(record.key)}
                />
            ),
        },
    ];

    return (
        <Space direction="vertical" style={{ width: '100%' }} size="large">
            {/* 更新资源信息 */}
            <Card
                title="更新资源信息"
                extra={
                    <Space>
                        <Text type="secondary">Platform：</Text>
                        <Select
                            value={platform}
                            onChange={handlePlatformChange}
                            style={{ width: 130 }}
                            options={[
                                { value: '', label: 'Windows' },
                                { value: 'Android', label: 'Android' },
                                { value: 'iOS', label: 'iOS' },
                                { value: 'macOS', label: 'macOS' },
                            ]}
                        />
                        <Button
                            icon={<ReloadOutlined />}
                            loading={fetchLoading}
                            onClick={() => loadResources(platform)}
                        >
                            加载当前配置
                        </Button>
                        <Popconfirm
                            title="从 OSS 重新生成 ResourceInfo？"
                            description="将扫描 OSS 重建各平台资源清单文件，耗时可能较长。Ships.json 会保留最新版本条目。"
                            okText="确认重新生成"
                            cancelText="取消"
                            okButtonProps={{ danger: true, loading: regenerating }}
                            onConfirm={handleRegenerateResourceInfo}
                            disabled={!token || regenerating}
                        >
                            <Button
                                danger
                                icon={<SyncOutlined spin={regenerating} />}
                                loading={regenerating}
                                disabled={!token}
                            >
                                重新生成资源列表
                            </Button>
                        </Popconfirm>
                    </Space>
                }
            >
                <Alert
                    message="此操作需要 Admin 及以上权限。页面会先加载当前配置；切换 Platform 后可重新加载对应 ResourceInfo。「重新生成资源列表」会调用 RegenerateResourceInfo，从 OSS 扫描重建 ResourceInfo.json。"
                    type="info"
                    showIcon
                    style={{ marginBottom: 12 }}
                />

                <Card
                    size="small"
                    title="拖拽上传资源包"
                    style={{ marginBottom: 16 }}
                >
                    <Alert
                        message="拖拽文件后会先暂存到上传队列。已有同名资源会自动匹配 OSS Prefix；新文件确认名称无误，并手动填写 OSS Prefix。"
                        type="info"
                        showIcon
                        style={{ marginBottom: 12 }}
                    />
                    <Dragger
                        multiple
                        showUploadList={false}
                        beforeUpload={file => (isFilteredUploadFile(file.name) ? Upload.LIST_IGNORE : true)}
                        customRequest={handleStageResourceFile}
                        disabled={uploading}
                    >
                        <p className="ant-upload-drag-icon">
                            <InboxOutlined />
                        </p>
                        <p className="ant-upload-text">点击或拖拽资源包到此处加入队列</p>
                        <p className="ant-upload-hint">
                            Common 资源会同步三平台清单；平台资源只更新当前选择的平台清单。
                        </p>
                    </Dragger>
                    {uploadQueue.length > 0 && (
                        <Space direction="vertical" style={{ width: '100%', marginTop: 12 }}>
                            <Table
                                size="small"
                                rowKey="key"
                                dataSource={uploadQueue}
                                columns={queueColumns}
                                pagination={false}
                                scroll={{ x: 980 }}
                            />
                            <Space>
                                <Button
                                    type="primary"
                                    icon={<CloudUploadOutlined />}
                                    loading={uploading}
                                    onClick={handleUploadQueue}
                                >
                                    上传队列
                                </Button>
                                <Button
                                    disabled={uploading}
                                    onClick={() => setUploadQueue([])}
                                >
                                    清空队列
                                </Button>
                            </Space>
                        </Space>
                    )}
                    {uploading && (
                        <Space direction="vertical" style={{ width: '100%', marginTop: 12 }}>
                            <Text type="secondary">{uploadPhase}</Text>
                            <Progress percent={uploadPercent} status="active" />
                        </Space>
                    )}
                    {lastUploaded && !uploading && (
                        <Alert
                            type="success"
                            showIcon
                            style={{ marginTop: 12 }}
                            message={`最近上传：${lastUploaded.Name || lastUploaded.name || '资源包'}`}
                            description={
                                <Space direction="vertical" size={0}>
                                    <Text code>{lastUploaded.Hash || lastUploaded.hash}</Text>
                                    {lastUploaded.URL && <Text copyable>{lastUploaded.URL}</Text>}
                                </Space>
                            }
                        />
                    )}
                </Card>

                <Table
                    size="small"
                    rowKey="key"
                    dataSource={resources}
                    columns={resourceColumns}
                    pagination={false}
                    scroll={{ x: 1000 }}
                    locale={{ emptyText: '当前平台暂无资源信息' }}
                />
            </Card>
        </Space>
    );
};

export default ResourceInfoPanel