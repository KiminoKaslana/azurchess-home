// src/pages/AdminPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
    Layout, Card, Form, Input, Button, Select, Tabs, Typography,
    message, Tag, Space, Divider, InputNumber, Table, Upload, Alert,
    Row, Col, Badge, Tooltip, Modal,
} from 'antd';
import {
    UserOutlined, LockOutlined, LogoutOutlined, SafetyCertificateOutlined,
    SettingOutlined, CloudUploadOutlined, ReloadOutlined, PlusOutlined, DeleteOutlined, DatabaseOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import Header from '../components/Header';
import Footer from '../components/Footer';
import serverConfig from '../config/serverConfig';

const { Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;

// 舰种映射（BB, CA, CL, CV, DD, DDG, SCA, BASE, AIR）
const SHIP_TYPES = [
    { value: 0, label: 'BB（战列）' },
    { value: 1, label: 'CA（重巡）' },
    { value: 2, label: 'CL（轻巡）' },
    { value: 3, label: 'CV（航母）' },
    { value: 4, label: 'DD（驱逐）' },
    { value: 5, label: 'DDG（导弹驱逐舰）' },
    { value: 6, label: 'SCA（超巡）' },
    { value: 7, label: 'BASE（基地）' },
    { value: 8, label: 'AIR（飞机）' },
];

// 武器类型映射（HE, AP, Missile, Torpedo, Bomb）
const SHIP_WEAPON_TYPES = [
    { value: 0, label: 'HE（高爆）', color: '#a50000' },
    { value: 1, label: 'AP（穿甲）', color: '#004799' },
    { value: 2, label: 'Missile（导弹）', color: '#beab00' },
    { value: 3, label: 'Torpedo（鱼雷）', color: '#009b53' },
    { value: 4, label: 'Bomb（航弹）', color: '#94007b' },
];

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

// 角色枚举
const USER_ROLES = [
    { value: 0, label: 'Player（普通玩家）', color: 'default' },
    { value: 1, label: 'Admin（管理员）', color: 'blue' },
    { value: 2, label: 'SuperAdmin（超级管理员）', color: 'gold' },
];

// 武器类型（5种）× 舰船类型（9种）默认矩阵
const DEFAULT_DAMAGE_MATRIX = Array.from({ length: 5 }, () => Array(9).fill(1.0));
const WEAPON_TYPES = ['高爆', '穿甲', '导弹', '鱼雷', '航弹'];
const UNIT_TYPES = ['战列', '重巡', '轻巡', '航母', '驱逐', '导弹驱逐', '超巡', '潜艇', '其他'];

// ────────────────────────────────────────────────
// 工具函数：从 localStorage 读写 auth 信息
// ────────────────────────────────────────────────
const STORAGE_KEY = 'admin_auth';
const saveAuth = (auth) => localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
const loadAuth = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null; } catch { return null; }
};
const clearAuth = () => localStorage.removeItem(STORAGE_KEY);

// ────────────────────────────────────────────────
// 子组件：登录面板
// ────────────────────────────────────────────────
const LoginPanel = ({ onLogin }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    const handleLogin = async (values) => {
        setLoading(true);
        try {
            const res = await axios.post(`${serverConfig.userServerBaseUrl}/Login`, {
                UserName: values.username,
                Password: values.password,
                Version: serverConfig.version,
            });
            const { PlayerID, Token } = res.data;
            onLogin({ playerID: PlayerID, token: Token, username: values.username });
            message.success('登录成功');
        } catch (err) {
            const status = err.response?.status;
            const msg = err.response?.data;
            if (status === 403) {
                message.error(msg || '用户名或密码错误');
            } else if (status === 400) {
                message.error('请求参数有误');
            } else {
                message.error('服务器异常，请稍后重试');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 200px)' }}>
            <Card
                title={<Space><SafetyCertificateOutlined /> 管理员登录</Space>}
                style={{ width: 380, boxShadow: '0 4px 24px rgba(0,0,0,0.1)' }}
            >
                <Form form={form} onFinish={handleLogin} layout="vertical" requiredMark={false}>
                    <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
                        <Input prefix={<UserOutlined />} placeholder="请输入管理员用户名" />
                    </Form.Item>
                    <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
                        <Input.Password prefix={<LockOutlined />} placeholder="请输入密码" />
                    </Form.Item>
                    <Form.Item style={{ marginBottom: 0 }}>
                        <Button type="primary" htmlType="submit" block loading={loading}>
                            登录
                        </Button>
                    </Form.Item>
                </Form>
                <Divider />
                <Text type="secondary" style={{ fontSize: 12 }}>
                    仅供管理员使用。请使用 Admin 或 SuperAdmin 账号登录。
                </Text>
            </Card>
        </div>
    );
};

// ────────────────────────────────────────────────
// 子组件：用户角色管理（需要 SuperAdmin）
// ────────────────────────────────────────────────
const UserRolePanel = ({ token }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (values) => {
        setLoading(true);
        try {
            const res = await axios.post(
                `${serverConfig.userServerBaseUrl}/AdminSetUserRole`,
                { TargetUserId: values.targetUserId, NewRole: values.newRole },
                { headers: { Token: token } }
            );
            message.success(res.data || '操作成功');
        } catch (err) {
            const status = err.response?.status;
            const msg = err.response?.data;
            if (status === 403) message.error('权限不足，需要 SuperAdmin');
            else if (status === 401) message.error('Token 无效或已过期，请重新登录');
            else if (status === 400) message.error(msg || '参数错误');
            else message.error('服务器异常');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card title="修改用户角色" style={{ maxWidth: 520 }}>
            <Alert
                message="此操作需要 SuperAdmin 权限"
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
            />
            <Form form={form} onFinish={handleSubmit} layout="vertical">
                <Form.Item
                    name="targetUserId"
                    label="目标用户 ID"
                    rules={[{ required: true, message: '请输入目标用户 ID' }]}
                >
                    <Input placeholder="输入 MongoDB ObjectId，如 655f4d8b4a3c123456789012" />
                </Form.Item>
                <Form.Item
                    name="newRole"
                    label="新角色"
                    rules={[{ required: true, message: '请选择角色' }]}
                >
                    <Select placeholder="请选择用户角色">
                        {USER_ROLES.map(r => (
                            <Option key={r.value} value={r.value}>
                                <Tag color={r.color}>{r.label}</Tag>
                            </Option>
                        ))}
                    </Select>
                </Form.Item>
                <Form.Item>
                    <Button type="primary" htmlType="submit" loading={loading} icon={<SafetyCertificateOutlined />}>
                        提交修改
                    </Button>
                </Form.Item>
            </Form>
        </Card>
    );
};

// ────────────────────────────────────────────────
// 子组件：伤害系数矩阵编辑
// ────────────────────────────────────────────────
const DamageCoefficientPanel = ({ token }) => {
    const [matrix, setMatrix] = useState(DEFAULT_DAMAGE_MATRIX.map(row => [...row]));
    const [loading, setLoading] = useState(false);

    const handleCellChange = (rowIdx, colIdx, value) => {
        setMatrix(prev => {
            const next = prev.map(r => [...r]);
            next[rowIdx][colIdx] = value ?? 1.0;
            return next;
        });
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const res = await axios.post(
                `${serverConfig.gameServerBaseUrl}/UpdateDamageCoefficient`,
                matrix,
                { headers: { Token: token, 'Content-Type': 'application/json' } }
            );
            message.success(res.data || '伤害补正表更新成功');
        } catch (err) {
            const status = err.response?.status;
            const msg = err.response?.data;
            if (status === 400) message.error(msg || '格式或维度错误');
            else if (status === 401 || status === 403) message.error('权限不足或 Token 无效');
            else message.error('服务器异常');
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        {
            title: '武器 \\ 舰船',
            dataIndex: 'weaponType',
            key: 'weaponType',
            fixed: 'left',
            width: 90,
            render: (text) => <Tag color="purple">{text}</Tag>,
        },
        ...UNIT_TYPES.map((unit, colIdx) => ({
            title: unit,
            key: unit,
            width: 90,
            render: (_, record, rowIdx) => (
                <InputNumber
                    size="small"
                    min={0}
                    step={0.1}
                    value={matrix[rowIdx][colIdx]}
                    onChange={(val) => handleCellChange(rowIdx, colIdx, val)}
                    style={{ width: 72 }}
                />
            ),
        })),
    ];

    const dataSource = WEAPON_TYPES.map((w, i) => ({ key: i, weaponType: w }));

    return (
        <Card title="伤害系数矩阵（5 武器类型 × 9 舰船类型）">
            <Alert
                message="此操作需要 Admin 及以上权限。修改后将实时生效，请谨慎操作。"
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
            />
            <Table
                columns={columns}
                dataSource={dataSource}
                pagination={false}
                scroll={{ x: 'max-content' }}
                size="small"
                style={{ marginBottom: 16 }}
            />
            <Button type="primary" loading={loading} onClick={handleSubmit} icon={<SettingOutlined />}>
                提交更新
            </Button>
        </Card>
    );
};

// ────────────────────────────────────────────────
// 子组件：资源信息管理
// ────────────────────────────────────────────────
const ResourceInfoPanel = ({ token }) => {
    const [resources, setResources] = useState([
        { key: Date.now(), Name: '', Hash: '', URL: '' },
    ]);
    const [platform, setPlatform] = useState('');
    const [loading, setLoading] = useState(false);
    const [regenLoading, setRegenLoading] = useState(false);

    const addRow = () => {
        setResources(prev => [...prev, { key: Date.now(), Name: '', Hash: '', URL: '' }]);
    };

    const removeRow = (key) => {
        setResources(prev => prev.filter(r => r.key !== key));
    };

    const updateRow = (key, field, value) => {
        setResources(prev => prev.map(r => r.key === key ? { ...r, [field]: value } : r));
    };

    const handleUpdateResource = async () => {
        const invalid = resources.find(r => !r.Name || !r.Hash || !r.URL);
        if (invalid) {
            message.warning('每条资源信息的 Name、Hash、URL 均不能为空');
            return;
        }
        setLoading(true);
        try {
            const headers = { Token: token, 'Content-Type': 'application/json' };
            if (platform) headers['Platform'] = platform;
            const payload = resources.map(({ Name, Hash, URL }) => ({ Name, Hash, URL }));
            const res = await axios.post(
                `${serverConfig.gameServerBaseUrl}/UpdateResourceInfo`,
                payload,
                { headers }
            );
            message.success(res.data || '资源信息更新成功');
        } catch (err) {
            const status = err.response?.status;
            const msg = err.response?.data;
            if (status === 400) message.error(msg || '资源项缺少必要字段');
            else if (status === 401 || status === 403) message.error('权限不足或 Token 无效');
            else message.error('服务器异常');
        } finally {
            setLoading(false);
        }
    };

    const handleRegenerate = async () => {
        setRegenLoading(true);
        try {
            const res = await axios.post(
                `${serverConfig.gameServerBaseUrl}/RegenerateResourceInfo`,
                null,
                { headers: { Token: token } }
            );
            message.success(res.data || '已计划重新生成 ResourceInfo');
        } catch (err) {
            const status = err.response?.status;
            const msg = err.response?.data;
            if (status === 503) message.error(msg || 'OSS 未启用');
            else if (status === 401 || status === 403) message.error('权限不足或 Token 无效');
            else message.error('服务器异常');
        } finally {
            setRegenLoading(false);
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
                    </Space>
                }
            >
                <Alert
                    message="此操作需要 Admin 及以上权限。留空 Platform 则写入默认 ResourceInfo.json。"
                    type="info"
                    showIcon
                    style={{ marginBottom: 12 }}
                />

                {resources.map((row, idx) => (
                    <Row key={row.key} gutter={8} style={{ marginBottom: 8 }} align="middle">
                        <Col span={1}>
                            <Text type="secondary" style={{ fontSize: 12 }}>{idx + 1}</Text>
                        </Col>
                        <Col span={6}>
                            <Input
                                placeholder="Name（Bundle名）"
                                value={row.Name}
                                onChange={e => updateRow(row.key, 'Name', e.target.value)}
                            />
                        </Col>
                        <Col span={6}>
                            <Input
                                placeholder="Hash（如 abcdef1234）"
                                value={row.Hash}
                                onChange={e => updateRow(row.key, 'Hash', e.target.value)}
                            />
                        </Col>
                        <Col span={9}>
                            <Input
                                placeholder="URL（完整下载地址）"
                                value={row.URL}
                                onChange={e => updateRow(row.key, 'URL', e.target.value)}
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

            {/* 重新生成资源信息 */}
            <Card title="从 OSS 重新生成资源信息">
                <Alert
                    message="此操作将在服务端后台异步执行，需要服务端已配置并启用 OSS。"
                    type="warning"
                    showIcon
                    style={{ marginBottom: 12 }}
                />
                <Button
                    type="primary"
                    danger
                    loading={regenLoading}
                    icon={<ReloadOutlined />}
                    onClick={handleRegenerate}
                >
                    触发重新生成
                </Button>
            </Card>
        </Space>
    );
};

// ────────────────────────────────────────────────
// 子组件：舰船表单字段（单/批量 Modal 共用）
// ────────────────────────────────────────────────
const ShipFormFields = () => (
    <>
        <Row gutter={16}>
            <Col span={8}>
                <Form.Item name="Name" label="Name（舰船标识）" rules={[{ required: true, message: '必填' }]}>
                    <Input placeholder="如 guandao" />
                </Form.Item>
            </Col>
            <Col span={8}>
                <Form.Item name="Type" label="Type（舰种）">
                    <Select>
                        {SHIP_TYPES.map(t => <Option key={t.value} value={t.value}>{t.label}</Option>)}
                    </Select>
                </Form.Item>
            </Col>
            <Col span={8}>
                <Form.Item name="AssetPath" label="AssetPath（阵营）">
                    <Input placeholder="如 America" />
                </Form.Item>
            </Col>
        </Row>
        <Row gutter={16}>
            <Col span={8}>
                <Form.Item name="WeaponType" label="WeaponType（武器类型）">
                    <Select>
                        {SHIP_WEAPON_TYPES.map(t => (
                            <Option key={t.value} value={t.value}>
                                <Tag color={t.color}>{t.label}</Tag>
                            </Option>
                        ))}
                    </Select>
                </Form.Item>
            </Col>
            <Col span={8}>
                <Form.Item name="SkillType" label="SkillType（技能）">
                    <Input placeholder="如 SCA" />
                </Form.Item>
            </Col>
            <Col span={8}>
                <Form.Item name="DeployCost" label="DeployCost（费用）">
                    <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
            </Col>
        </Row>
        <Divider orientation="left" plain>生命与战斗</Divider>
        <Row gutter={16}>
            <Col span={6}><Form.Item name="MaxHP" label="MaxHP（血量）"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={6}><Form.Item name="MaxDamage" label="MaxDamage"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={6}><Form.Item name="MinDamage" label="MinDamage"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={6}><Form.Item name="MaxAADamage" label="MaxAADamage（防空）"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
        </Row>
        <Row gutter={16}>
            <Col span={6}><Form.Item name="TorpedoDamage" label="TorpedoDamage"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={6}><Form.Item name="CriticalProbability" label="CriticalProbability（暴击率）"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={6}><Form.Item name="MissRate" label="MissRate（%）"><InputNumber min={0} max={100} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={6}><Form.Item name="Accuracy" label="Accuracy（%）"><InputNumber min={0} max={100} style={{ width: '100%' }} /></Form.Item></Col>
        </Row>
        <Divider orientation="left" plain>范围与机动</Divider>
        <Row gutter={16}>
            <Col span={6}><Form.Item name="AttackRadius" label="AttackRadius"><InputNumber min={0} step={0.1} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={6}><Form.Item name="DetectRadius" label="DetectRadius"><InputNumber min={0} step={0.1} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={6}><Form.Item name="MoveRadius" label="MoveRadius"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={6}><Form.Item name="TorpedoProtectCoefficient" label="TorpedoProtect（%）"><InputNumber min={0} max={100} style={{ width: '100%' }} /></Form.Item></Col>
        </Row>
        <Divider orientation="left" plain>舰载机</Divider>
        <Row gutter={16}>
            <Col span={8}><Form.Item name="ChildAircraftHP" label="ChildAircraftHP"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={8}><Form.Item name="ChildAircraftServerTime" label="ChildAircraftServerTime（s）"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
        </Row>
    </>
);

// ────────────────────────────────────────────────
// 子组件：舰船配置数据更新（单船 + 批量）
// ────────────────────────────────────────────────
const ShipDataPanel = ({ token }) => {
    // --- 单船更新 ---
    const [singleForm] = Form.useForm();
    const [singleLoading, setSingleLoading] = useState(false);

    // --- 批量更新 ---
    const [shipList, setShipList] = useState([]);
    const [batchLoading, setBatchLoading] = useState(false);
    const [batchResult, setBatchResult] = useState(null);

    // --- 编辑 Modal ---
    const [modalVisible, setModalVisible] = useState(false);
    const [editingKey, setEditingKey] = useState(null); // null = 新增
    const [modalForm] = Form.useForm();

    const handleSingleSubmit = async (values) => {
        setSingleLoading(true);
        try {
            const res = await axios.post(
                `${serverConfig.gameServerBaseUrl}/UpdateShipData`,
                values,
                { headers: { Token: token, 'Content-Type': 'application/json' } }
            );
            message.success((typeof res.data === 'string' && res.data) || '舰船数据更新成功');
        } catch (err) {
            const status = err.response?.status;
            const msg = err.response?.data;
            if (status === 400) message.error(msg || '请求体为空或反序列化失败');
            else if (status === 401 || status === 403) message.error('权限不足或 Token 无效');
            else message.error(msg || '更新失败或服务器异常');
        } finally {
            setSingleLoading(false);
        }
    };

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
        }).catch(() => {});
    };

    const handleDeleteShip = (key) => {
        setShipList(prev => prev.filter(s => s._key !== key));
    };

    const handleBatchSubmit = async () => {
        if (shipList.length === 0) {
            message.warning('请先添加至少一条舰船数据');
            return;
        }
        setBatchLoading(true);
        setBatchResult(null);
        try {
            const payload = shipList.map(({ _key, ...s }) => s);
            const res = await axios.post(
                `${serverConfig.gameServerBaseUrl}/UpdateAllShipsData`,
                payload,
                { headers: { Token: token, 'Content-Type': 'application/json' } }
            );
            setBatchResult(res.data);
            message.success('批量更新请求已完成');
        } catch (err) {
            const status = err.response?.status;
            const msg = err.response?.data;
            if (status === 400) message.error(msg || '请求体为空或列表为空');
            else if (status === 401 || status === 403) message.error('权限不足或 Token 无效');
            else message.error(msg || '批量更新失败或服务器异常');
        } finally {
            setBatchLoading(false);
        }
    };

    const batchColumns = [
        { title: 'Name', dataIndex: 'Name', key: 'Name', width: 120, ellipsis: true },
        {
            title: 'Type', dataIndex: 'Type', key: 'Type', width: 150,
            render: (v) => {
                const t = SHIP_TYPES.find(x => x.value === v);
                return <Tag>{t ? t.label : v}</Tag>;
            },
        },
        {
            title: 'WeaponType', dataIndex: 'WeaponType', key: 'WeaponType', width: 150,
            render: (v) => {
                const t = SHIP_WEAPON_TYPES.find(x => x.value === v);
                return t ? <Tag color={t.color}>{t.label}</Tag> : v;
            },
        },
        { title: 'MaxHP', dataIndex: 'MaxHP', key: 'MaxHP', width: 70 },
        { title: 'DeployCost', dataIndex: 'DeployCost', key: 'DeployCost', width: 90 },
        { title: 'SkillType', dataIndex: 'SkillType', key: 'SkillType', width: 90 },
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
            {/* 单船更新 */}
            <Card title="单船更新（POST /UpdateShipData）">
                <Alert
                    message="权限要求：Admin 及以上。Name 字段不能为空。"
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                />
                <Form form={singleForm} onFinish={handleSingleSubmit} initialValues={EMPTY_SHIP} layout="vertical">
                    <ShipFormFields />
                    <Form.Item style={{ marginTop: 8 }}>
                        <Button type="primary" htmlType="submit" loading={singleLoading} icon={<CloudUploadOutlined />}>
                            提交单船更新
                        </Button>
                    </Form.Item>
                </Form>
            </Card>

            {/* 批量更新 */}
            <Card
                title="批量更新（POST /UpdateAllShipsData）"
                extra={
                    <Button type="dashed" icon={<PlusOutlined />} onClick={openAddModal}>
                        添加舰船
                    </Button>
                }
            >
                <Alert
                    message="权限要求：Admin 及以上。在下方列表中维护舰船数据，确认无误后一键提交。"
                    type="info"
                    showIcon
                    style={{ marginBottom: 12 }}
                />
                <Table
                    columns={batchColumns}
                    dataSource={shipList}
                    rowKey="_key"
                    pagination={false}
                    size="small"
                    scroll={{ x: 'max-content' }}
                    style={{ marginBottom: 12 }}
                    locale={{ emptyText: '暂无舰船数据，请点击右上角「添加舰船」' }}
                />
                <Space direction="vertical" style={{ width: '100%' }}>
                    <Button
                        type="primary"
                        loading={batchLoading}
                        onClick={handleBatchSubmit}
                        icon={<CloudUploadOutlined />}
                        disabled={shipList.length === 0}
                    >
                        提交批量更新（{shipList.length} 艘）
                    </Button>
                    {batchResult && (
                        <Alert
                            type={batchResult.Success ? 'success' : 'warning'}
                            showIcon
                            message={`Success: ${String(batchResult.Success)} | 成功: ${batchResult.SuccessCount ?? 0} | 失败: ${batchResult.FailedCount ?? 0}`}
                            description={
                                Array.isArray(batchResult.FailedShips) && batchResult.FailedShips.length > 0
                                    ? <div>失败项：{batchResult.FailedShips.join('；')}</div>
                                    : '无失败项'
                            }
                        />
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

// ────────────────────────────────────────────────
// 主页面：AdminPage
// ────────────────────────────────────────────────
const AdminPage = () => {
    const [auth, setAuth] = useState(null); // { playerID, token, username }

    // 页面加载时从 localStorage 恢复登录态
    useEffect(() => {
        const saved = loadAuth();
        if (saved) setAuth(saved);
    }, []);

    const handleLogin = useCallback((authInfo) => {
        setAuth(authInfo);
        saveAuth(authInfo);
    }, []);

    const handleLogout = useCallback(() => {
        setAuth(null);
        clearAuth();
        message.info('已退出登录');
    }, []);

    const tabItems = [
        {
            key: 'user-role',
            label: <Space><SafetyCertificateOutlined />用户角色管理</Space>,
            children: <UserRolePanel token={auth?.token} />,
        },
        {
            key: 'damage',
            label: <Space><SettingOutlined />伤害系数配置</Space>,
            children: <DamageCoefficientPanel token={auth?.token} />,
        },
        {
            key: 'resource',
            label: <Space><CloudUploadOutlined />资源信息管理</Space>,
            children: <ResourceInfoPanel token={auth?.token} />,
        },
        {
            key: 'ship-data',
            label: <Space><DatabaseOutlined />舰船配置更新</Space>,
            children: <ShipDataPanel token={auth?.token} />,
        },
    ];

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Header />
            <Content style={{ padding: '32px 48px', background: '#f5f5f5' }}>
                {!auth ? (
                    <LoginPanel onLogin={handleLogin} />
                ) : (
                    <>
                        {/* 顶部状态栏 */}
                        <Card style={{ marginBottom: 24 }} bodyStyle={{ padding: '12px 24px' }}>
                            <Row justify="space-between" align="middle">
                                <Col>
                                    <Space size="large">
                                        <Badge status="success" text="已登录" />
                                        <Text>
                                            用户：<Text strong>{auth.username}</Text>
                                        </Text>
                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                            PlayerID: {auth.playerID}
                                        </Text>
                                    </Space>
                                </Col>
                                <Col>
                                    <Button
                                        icon={<LogoutOutlined />}
                                        onClick={handleLogout}
                                        danger
                                    >
                                        退出登录
                                    </Button>
                                </Col>
                            </Row>
                        </Card>

                        {/* 功能 Tabs */}
                        <Card>
                            <Title level={4} style={{ marginBottom: 0 }}>
                                <SettingOutlined /> 管理控制台
                            </Title>
                            <Divider />
                            <Tabs items={tabItems} defaultActiveKey="user-role" />
                        </Card>
                    </>
                )}
            </Content>
            <Footer />
        </Layout>
    );
};

export default AdminPage;
