import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Layout, Card, Form, Input, Button, Select, Tabs, Typography,
    Tag, Space, Divider, InputNumber, Table, Upload, Alert, App as AntdApp,
    Row, Col, Badge, Tooltip, Modal, Progress,
} from 'antd';
import {
    UserOutlined, LockOutlined, LogoutOutlined, SafetyCertificateOutlined,
    SettingOutlined, CloudUploadOutlined, ReloadOutlined, PlusOutlined, DeleteOutlined, DatabaseOutlined,
} from '@ant-design/icons';
import Header from '../Header';
import Footer from '../Footer';
import { authApi, gameApi, staticApi, userApi } from '../../api';
import { fileApiClient } from '../../api/client';

const { Title, Text } = Typography;
const { Option } = Select;

const createEmptyResource = () => ({
    key: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    Name: '',
    Hash: '',
    URL: '',
    SubDirectory: '',
});

// ────────────────────────────────────────────────
// 子组件：资源信息管理
// ────────────────────────────────────────────────
const ResourceInfoPanel = ({ token }) => {
    const { message: messageApi } = AntdApp.useApp();
    const [resources, setResources] = useState([createEmptyResource()]);
    const [platform, setPlatform] = useState('');
    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(false);
    const [regenLoading, setRegenLoading] = useState(false);

    const mapResourceRow = useCallback((resource) => ({
        key: `${resource.Name || 'resource'}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        Name: resource.Name || '',
        Hash: resource.Hash || '',
        URL: resource.URL || '',
        SubDirectory: resource.SubDirectory || '',
    }), []);

    const loadResources = useCallback(async (targetPlatform = '', options = {}) => {
        const { silent = false } = options;
        setFetchLoading(true);
        try {
            const res = await gameApi.getResourceInfo(targetPlatform);
            const list = Array.isArray(res.data) ? res.data : [];
            setResources(list.length > 0 ? list.map(mapResourceRow) : [createEmptyResource()]);
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
    }, [mapResourceRow, messageApi]);

    useEffect(() => {
        loadResources('', { silent: true });
    }, [loadResources]);

    const addRow = () => {
        setResources(prev => [...prev, createEmptyResource()]);
    };

    const removeRow = (key) => {
        setResources(prev => prev.filter(r => r.key !== key));
    };

    const updateRow = (key, field, value) => {
        setResources(prev => prev.map(r => r.key === key ? { ...r, [field]: value } : r));
    };

    const handleUpdateResource = async () => {
        const sanitizedResources = resources.map(({ Name, Hash, URL, SubDirectory }) => ({
            Name: Name.trim(),
            Hash: Hash.trim(),
            URL: URL.trim(),
            SubDirectory: SubDirectory.trim(),
        }));
        const invalid = sanitizedResources.find(r => !r.Name || !r.Hash || !r.URL || !r.SubDirectory);
        if (invalid) {
            messageApi.warning('每条资源信息的 Name、Hash、URL、SubDirectory 均不能为空');
            return;
        }
        const toastKey = 'resource-info-update';
        messageApi.loading({ content: '正在提交资源信息更新...', key: toastKey, duration: 0 });
        setLoading(true);
        try {
            const res = await gameApi.updateResourceInfo(sanitizedResources, token, platform);
            messageApi.success({ content: res.data || '资源信息更新已完成', key: toastKey });
            await loadResources(platform, { silent: true });
        } catch (err) {
            const status = err.response?.status;
            const msg = err.response?.data;
            if (status === 400) messageApi.error({ content: msg || '资源项缺少必要字段', key: toastKey });
            else if (status === 401 || status === 403) messageApi.error({ content: '权限不足或 Token 无效', key: toastKey });
            else messageApi.error({ content: '服务器异常', key: toastKey });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Space direction="vertical" style={{ width: '100%' }} size="large">
            {/* 更新资源信息 */}
            <Card
                title="更新资源信息"
                extra={
                    <Space>
                        <Text type="secondary">Platform（可选）：</Text>
                        <Input
                            placeholder="如 Android"
                            value={platform}
                            onChange={e => setPlatform(e.target.value)}
                            style={{ width: 130 }}
                            allowClear
                        />
                        <Button
                            icon={<ReloadOutlined />}
                            loading={fetchLoading}
                            onClick={() => loadResources(platform)}
                        >
                            加载当前配置
                        </Button>
                    </Space>
                }
            >
                <Alert
                    message="此操作需要 Admin 及以上权限。页面会先加载当前配置；切换 Platform 后可重新加载对应 ResourceInfo。"
                    type="info"
                    showIcon
                    style={{ marginBottom: 12 }}
                />

                {resources.map((row, idx) => (
                    <Row key={row.key} gutter={8} style={{ marginBottom: 8 }} align="middle">
                        <Col span={1}>
                            <Text type="secondary" style={{ fontSize: 12 }}>{idx + 1}</Text>
                        </Col>
                        <Col span={4}>
                            <Input
                                placeholder="Name（Bundle名）"
                                value={row.Name}
                                onChange={e => updateRow(row.key, 'Name', e.target.value)}
                            />
                        </Col>
                        <Col span={5}>
                            <Input
                                placeholder="Hash（如 abcdef1234）"
                                value={row.Hash}
                                onChange={e => updateRow(row.key, 'Hash', e.target.value)}
                            />
                        </Col>
                        <Col span={7}>
                            <Input
                                placeholder="URL（完整下载地址）"
                                value={row.URL}
                                onChange={e => updateRow(row.key, 'URL', e.target.value)}
                            />
                        </Col>
                        <Col span={5}>
                            <Input
                                placeholder="SubDirectory（如 AssetBundles）"
                                value={row.SubDirectory}
                                onChange={e => updateRow(row.key, 'SubDirectory', e.target.value)}
                            />
                        </Col>
                        <Col span={2}>
                            <Tooltip title="删除此行">
                                <Button
                                    danger
                                    size="small"
                                    icon={<DeleteOutlined />}
                                    onClick={() => removeRow(row.key)}
                                    disabled={resources.length === 1}
                                />
                            </Tooltip>
                        </Col>
                    </Row>
                ))}

                <Space style={{ marginTop: 8 }}>
                    <Button icon={<PlusOutlined />} onClick={addRow}>添加一行</Button>
                    <Button type="primary" loading={loading} icon={<CloudUploadOutlined />} onClick={handleUpdateResource}>
                        提交资源列表
                    </Button>
                </Space>
            </Card>
        </Space>
    );
};

export default ResourceInfoPanel