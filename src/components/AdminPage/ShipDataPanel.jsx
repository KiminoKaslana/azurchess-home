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

import serverConfig from '../../config/serverConfig';
import { SHIP_TYPES, SHIP_WEAPON_TYPES } from "../../pages/AdminPage"
import ShipFormFields from './ShipFormFields';

const { Title, Text } = Typography;
const { Option } = Select;

// 空舰船数据模板
const EMPTY_SHIP = {
    Name: '',
    Type: 0,
    AssetPath: '',
    DetectRadius: 5.0,
    MoveRadius: 5,
    MaxHP: 30,
    MaxDamage: 10,
    MinDamage: 8,
    MaxAADamage: 0,
    AttackRadius: 6.0,
    ChildAircraftHP: 0,
    MissRate: 30,
    Accuracy: 60,
    TorpedoProtectCoefficient: 0,
    TorpedoDamage: 0,
    WeaponType: 0,
    ChildAircraftServerTime: 3,
    CriticalProbability: 1,
    DeployCost: 3,
    SkillType: '',
};

// ────────────────────────────────────────────────
// 子组件：舰船配置数据更新（单船 + 批量）
// ────────────────────────────────────────────────
const ShipDataPanel = ({ token }) => {
    const { message: messageApi } = AntdApp.useApp();
    // --- 批量更新 ---
    const [shipList, setShipList] = useState([]);
    const [batchLoading, setBatchLoading] = useState(false);
    // SSE 进度状态
    const [ssePhase, setSsePhase] = useState('idle'); // idle | connecting | start | db | oss | complete | error
    const [sseTotalCount, setSseTotalCount] = useState(3);
    const [sseDbStatus, setSseDBStatus] = useState();
    const [sseOssStatus, setSseOssStatus] = useState(''); // uploading | success | failed
    const [sseFinalResult, setSseFinalResult] = useState(null); // complete event data
    const [sseError, setSseError] = useState(null);
    const abortRef = React.useRef(null);

    // --- 从远程加载 ---
    const [fetchLoading, setFetchLoading] = useState(false);
    const [nameMap, setNameMap] = useState({});
    const [searchText, setSearchText] = useState('');

    // 加载 NameMap 用于中文名查表
    useEffect(() => {
        staticApi.getNameMap().then(res => {
            setNameMap(res.data || {});
        }).catch(() => { });
    }, []);

    const handleFetchShips = useCallback(async () => {
        setFetchLoading(true);
        try {
            // 1. 获取资源信息列表，找到 Ships.json
            const resInfoRes = await gameApi.getResourceInfo();
            const resourceList = Array.isArray(resInfoRes.data) ? resInfoRes.data : [];
            const shipResource = resourceList.find(r => r.Name === 'Ships.json');
            if (!shipResource || !shipResource.URL) {
                messageApi.error('未在资源列表中找到 Ships.json 记录');
                return;
            }

            // 2. 从资源信息中提取路径，通过 fileApiClient 获取文件（自动兼容 dev 代理）
            const pathname = new URL(shipResource.URL).pathname;
            const res = await fileApiClient.get(pathname);
            const data = Array.isArray(res.data) ? res.data : Object.values(res.data);
            setShipList(data.map((s, i) => ({ ...s, _key: `remote_${i}_${Date.now()}` })));
            messageApi.success(`已加载 ${data.length} 条舰船数据`);
        } catch (err) {
            messageApi.error('加载舰船数据失败，请检查网络或获取资源信息接口是否正常');
        } finally {
            setFetchLoading(false);
        }
    }, [messageApi]);

    useEffect(() => {
        handleFetchShips();
    }, [handleFetchShips]);

    // --- 编辑 Modal ---
    const [modalVisible, setModalVisible] = useState(false);
    const [editingKey, setEditingKey] = useState(null); // null = 新增
    const [modalForm] = Form.useForm();

    const openAddModal = () => {
        setEditingKey(null);
        modalForm.setFieldsValue({ ...EMPTY_SHIP });
        setModalVisible(true);
    };

    const openEditModal = (record) => {
        setEditingKey(record._key);
        const { _key, ...shipData } = record;
        modalForm.setFieldsValue(shipData);
        setModalVisible(true);
    };

    const handleModalOk = () => {
        modalForm.validateFields().then(values => {
            if (editingKey === null) {
                setShipList(prev => [...prev, { ...values, _key: Date.now() }]);
            } else {
                setShipList(prev => prev.map(s => s._key === editingKey ? { ...values, _key: editingKey } : s));
            }
            setModalVisible(false);
        }).catch(() => { });
    };

    const handleDeleteShip = (key) => {
        setShipList(prev => prev.filter(s => s._key !== key));
    };

    // 根据搜索关键词过滤舰船列表（同时匹配英文名和中文名）
    const filteredShipList = useMemo(() => {
        if (!searchText.trim()) return shipList;
        const keyword = searchText.trim().toLowerCase();
        return shipList.filter(s => {
            const cnName = (nameMap[s.Name] || '').toLowerCase();
            return s.Name.toLowerCase().includes(keyword) || cnName.includes(keyword);
        });
    }, [shipList, searchText, nameMap]);

    const handleCancelSse = useCallback(() => {
        if (abortRef.current) {
            abortRef.current.abort();
            abortRef.current = null;
        }
        setBatchLoading(false);
        setSsePhase('idle');
        messageApi.info('已取消更新');
    }, [messageApi]);

    const handleBatchSubmit = useCallback(async () => {
        if (shipList.length === 0) {
            messageApi.warning('请先添加至少一条舰船数据');
            return;
        }
        // 重置所有 SSE 状态
        setSsePhase('connecting');
        setSseTotalCount(3);
        setSseDBStatus([]);
        setSseOssStatus('');
        setSseFinalResult(null);
        setSseError(null);
        setBatchLoading(true);

        const controller = new AbortController();
        abortRef.current = controller;
        const payload = shipList.map(({ _key, ...s }) => s);
        const url = `${serverConfig.gameServerBaseUrl}/UpdateAllShipsData`;

        /** 解析 SSE 事件行 */
        const processSseLine = (eventType, dataStr) => {
            if (dataStr === '[DONE]') {
                setSsePhase('idle');
                return;
            }
            let parsed;
            try { parsed = JSON.parse(dataStr); } catch { return; }

            switch (eventType) {
                case 'start':
                    setSseTotalCount(parsed.TotalCount || shipList.length);
                    setSsePhase('start');
                    break;
                case 'db':
                    setSsePhase('db');
                    setSseDBStatus(prev => [...prev, {
                        index: parsed.Index,
                        shipName: parsed.ShipName,
                        status: parsed.Status,
                        error: parsed.Error || null,
                    }]);
                    break;
                case 'oss':
                    setSsePhase('oss');
                    setSseOssStatus(parsed.Status);
                    break;
                case 'complete':
                    setSseFinalResult(parsed);
                    setSsePhase('complete');
                    messageApi.success('批量舰船更新已完成');
                    break;
                case 'error':
                    setSseError(dataStr);
                    setSsePhase('error');
                    messageApi.error('服务端返回错误');
                    break;
                default:
                    break;
            }
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Token: token,
                },
                body: JSON.stringify(payload),
                signal: controller.signal,
            });

            if (!response.ok) {
                const text = await response.text();
                if (response.status === 400) messageApi.error(text || '请求体为空或列表为空');
                else if (response.status === 401 || response.status === 403) messageApi.error('权限不足或 Token 无效');
                else messageApi.error(text || `服务器异常 (${response.status})`);
                setSsePhase('error');
                setSseError(text);
                return;
            }

            // 读取 SSE 流
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let currentEvent = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                // 最后一个可能是不完整的行，保留到下次
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('event: ')) {
                        currentEvent = line.slice(7).trim();
                    } else if (line.startsWith('data: ')) {
                        const dataStr = line.slice(6);
                        processSseLine(currentEvent, dataStr);
                    }
                    // 空行是事件分隔符
                    if (line === '') {
                        currentEvent = '';
                    }
                }
            }
        } catch (err) {
            if (err.name === 'AbortError') return; // 用户取消
            messageApi.error('网络异常或服务器不可达');
            setSsePhase('error');
            setSseError(err.message);
        } finally {
            setBatchLoading(false);
            abortRef.current = null;
        }
    }, [shipList, token, messageApi]);

    const batchColumns = [
        { title: 'Name', dataIndex: 'Name', key: 'Name', width: 120, ellipsis: true, sorter: (a, b) => a.Name.localeCompare(b.Name) },
        {
            title: '中文名', dataIndex: 'Name', key: 'cnName', width: 120, ellipsis: true,
            sorter: (a, b) => (nameMap[a.Name] || a.Name).localeCompare(nameMap[b.Name] || b.Name),
            render: (v) => {
                const cn = nameMap[v];
                return cn ? <Text style={{ color: '#1677ff' }}>{cn}</Text> : <Text type="secondary">—</Text>;
            },
        },
        {
            title: 'Type', dataIndex: 'Type', key: 'Type', width: 150, sorter: (a, b) => a.Type - b.Type,
            render: (v) => {
                const t = SHIP_TYPES.find(x => x.value === v);
                return <Tag>{t ? t.label : v}</Tag>;
            },
        },
        {
            title: 'WeaponType', dataIndex: 'WeaponType', key: 'WeaponType', width: 150, sorter: (a, b) => a.WeaponType - b.WeaponType,
            render: (v) => {
                const t = SHIP_WEAPON_TYPES.find(x => x.value === v);
                return t ? <Tag color={t.color}>{t.label}</Tag> : v;
            },
        },
        { title: 'MaxHP', dataIndex: 'MaxHP', key: 'MaxHP', width: 80, sorter: (a, b) => a.MaxHP - b.MaxHP },
        { title: 'DeployCost', dataIndex: 'DeployCost', key: 'DeployCost', width: 90, sorter: (a, b) => a.DeployCost - b.DeployCost },
        { title: 'SkillType', dataIndex: 'SkillType', key: 'SkillType', width: 90, sorter: (a, b) => (a.SkillType || '').localeCompare(b.SkillType || '') },
        {
            title: '操作', key: 'action', width: 110, fixed: 'right',
            render: (_, record) => (
                <Space size="small">
                    <Button size="small" onClick={() => openEditModal(record)}>编辑</Button>
                    <Button size="small" danger onClick={() => handleDeleteShip(record._key)}>删除</Button>
                </Space>
            ),
        },
    ];

    return (
        <Space direction="vertical" style={{ width: '100%' }} size="large">
            {/* 批量更新 */}
            <Card
                title="批量更新"
                extra={
                    <Space>
                        <Button
                            icon={<ReloadOutlined />}
                            loading={fetchLoading}
                            onClick={handleFetchShips}
                        >
                            重新加载
                        </Button>
                        <Button type="dashed" icon={<PlusOutlined />} onClick={openAddModal}>
                            添加舰船
                        </Button>
                    </Space>
                }
            >
                <Alert
                    message="权限要求：Admin 及以上。在下方列表中维护舰船数据，确认无误后一键提交。"
                    type="info"
                    showIcon
                    style={{ marginBottom: 12 }}
                />
                <Input.Search
                    placeholder="搜索舰船英文名或中文名…"
                    allowClear
                    value={searchText}
                    onChange={e => setSearchText(e.target.value)}
                    style={{ marginBottom: 12, maxWidth: 360 }}
                />
                <Table
                    columns={batchColumns}
                    dataSource={filteredShipList}
                    rowKey="_key"
                    pagination={false}
                    size="small"
                    scroll={{ x: 'max-content' }}
                    style={{ marginBottom: 12 }}
                    locale={{ emptyText: searchText ? '无匹配舰船' : '正在加载舰船数据...' }}
                />
                <Space direction="vertical" style={{ width: '100%' }}>
                    <Space>
                        <Button
                            type="primary"
                            loading={batchLoading && ssePhase !== 'idle'}
                            onClick={handleBatchSubmit}
                            icon={<CloudUploadOutlined />}
                            disabled={shipList.length === 0 || batchLoading}
                        >
                            提交批量更新（{filteredShipList.length} 艘 / 共 {shipList.length} 艘）
                        </Button>
                        {batchLoading && (
                            <Button danger onClick={handleCancelSse}>取消</Button>
                        )}
                    </Space>

                    {/* SSE 实时进度 */}
                    {ssePhase !== 'idle' && (
                        <Card size="small" style={{ background: '#fafafa' }}>
                            {/* 进度条 */}
                            <Progress
                                percent={
                                    ssePhase === 'complete' ? 100
                                        : ssePhase === 'oss' ? 50
                                            : ssePhase === 'db' ? 30
                                                : 0
                                }
                                status={ssePhase === 'error' ? 'exception' : ssePhase === 'complete' ? 'success' : 'active'}
                                format={() => {
                                    if (ssePhase === 'connecting') return '连接中…';
                                    if (ssePhase === 'start') return `准备处理 ${sseTotalCount} 艘…`;
                                    if (ssePhase === 'db') return `批处理成功 ${sseDbStatus.SuccessCount} 艘`;
                                    if (ssePhase === 'oss') return `OSS: ${sseOssStatus}`;
                                    if (ssePhase === 'complete') return '完成';
                                    if (ssePhase === 'error') return '出错';
                                    return '';
                                }}
                            />

                            {/* 实时状态列表 */}
                            {sseDbStatus.length > 0 && (
                                <div style={{ maxHeight: 200, overflow: 'auto', marginTop: 12 }}>
                                    <Table
                                        columns={[
                                            { title: '#', dataIndex: 'index', key: 'index', width: 50 },
                                            {
                                                title: '舰船', dataIndex: 'shipName', key: 'shipName', width: 140, ellipsis: true,
                                                render: (v) => <Text strong>{v}</Text>,
                                            },
                                            {
                                                title: '状态', dataIndex: 'status', key: 'status', width: 90,
                                                render: (v) => {
                                                    const colorMap = { success: 'success', failed: 'error', error: 'error' };
                                                    const labelMap = { success: '成功', failed: '失败', error: '异常' };
                                                    return <Tag color={colorMap[v] || 'default'}>{labelMap[v] || v}</Tag>;
                                                },
                                            },
                                            { title: '错误信息', dataIndex: 'error', key: 'error', ellipsis: true, render: (v) => v ? <Text type="danger">{v}</Text> : '—' },
                                        ]}
                                        dataSource={sseDbStatus}
                                        rowKey="index"
                                        pagination={false}
                                        size="small"
                                    />
                                </div>
                            )}

                            {/* OSS 状态 */}
                            {sseOssStatus && (
                                <Alert
                                    style={{ marginTop: 8 }}
                                    type={sseOssStatus === 'failed' ? 'error' : sseOssStatus === 'success' ? 'success' : 'info'}
                                    showIcon
                                    message={`OSS 上传状态：${sseOssStatus}`}
                                />
                            )}

                            {/* 最终结果 */}
                            {sseFinalResult && (
                                <Alert
                                    style={{ marginTop: 8 }}
                                    type={sseFinalResult.Success ? 'success' : 'warning'}
                                    showIcon
                                    message={`成功: ${sseFinalResult.SuccessCount ?? 0} | 失败: ${sseFinalResult.FailedCount ?? 0}${sseFinalResult.OSSHash ? ` | OSS SHA1: ${sseFinalResult.OSSHash}` : ''}`}
                                    description={
                                        Array.isArray(sseFinalResult.FailedShips) && sseFinalResult.FailedShips.length > 0
                                            ? <div>失败项：{sseFinalResult.FailedShips.join('；')}</div>
                                            : '无失败项'
                                    }
                                />
                            )}

                            {/* 错误 */}
                            {sseError && ssePhase === 'error' && (
                                <Alert style={{ marginTop: 8 }} type="error" showIcon message={sseError} />
                            )}
                        </Card>
                    )}
                </Space>
            </Card>

            {/* 编辑 Modal */}
            <Modal
                title={editingKey === null ? '添加舰船数据' : '编辑舰船数据'}
                open={modalVisible}
                onOk={handleModalOk}
                onCancel={() => setModalVisible(false)}
                width={860}
                okText="确认"
                cancelText="取消"
                destroyOnClose={false}
            >
                <Form form={modalForm} layout="vertical">
                    <ShipFormFields />
                </Form>
            </Modal>
        </Space>
    );
};

export default ShipDataPanel