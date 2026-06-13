// src/pages/AdminPage.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Layout, Card, Form, Input, Button, Select, Tabs, Typography,
    Tag, Space, Divider, InputNumber, Table, Upload, Alert, App as AntdApp,
    Row, Col, Badge, Tooltip, Modal, Progress,
} from 'antd';
import {
    BookOutlined, UserOutlined, LockOutlined, LogoutOutlined, SafetyCertificateOutlined,
    SettingOutlined, CloudUploadOutlined, ReloadOutlined, PlusOutlined, DeleteOutlined, DatabaseOutlined,
    FileTextOutlined,
} from '@ant-design/icons';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { authApi, gameApi, staticApi, userApi } from '../api';
import { fileApiClient } from '../api/client';
import { IS_TEST } from '../config/envConfig';

import LoginPanel from '../components/AdminPage/LoginPanel'
import UserRolePanel from '../components/AdminPage/UserRolePanel';
import DamageCoefficientPanel from '../components/AdminPage/DamageCoefficientPanel';
import ResourceInfoPanel from '../components/AdminPage/ResourceInfoPanel.jsx';
import ManualEditorPanel from '../components/AdminPage/ManualEditorPanel.jsx';
import ShipFormFields from '../components/AdminPage/ShipFormFields.jsx';
import ShipDataPanel from '../components/AdminPage/ShipDataPanel.jsx';
import MatchRecordPanel from '../components/AdminPage/MatchRecordPanel.jsx';

const { Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;

// 舰种映射（BB, CA, CL, CV, DD, DDG, SCA, BASE, AIR）
export const SHIP_TYPES = [
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
export const SHIP_WEAPON_TYPES = [
    { value: 0, label: 'HE（高爆）', color: '#a50000' },
    { value: 1, label: 'AP（穿甲）', color: '#004799' },
    { value: 2, label: 'Missile（导弹）', color: '#beab00' },
    { value: 3, label: 'Torpedo（鱼雷）', color: '#009b53' },
    { value: 4, label: 'Bomb（航弹）', color: '#94007b' },
];

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
// 主页面：AdminPage
// ────────────────────────────────────────────────
const AdminPage = () => {
    const { message: messageApi } = AntdApp.useApp();
    const [auth, setAuth] = useState(null); // { playerID, token, username }
    const [initializing, setInitializing] = useState(true);

    // 页面加载时从 localStorage 恢复登录态，并通过 Me 接口校验 Token 是否有效
    useEffect(() => {
        const saved = loadAuth();
        if (!saved) {
            setInitializing(false);
            return;
        }
        // 通过 Me 接口校验登录态
        authApi.me(saved.token).then((res) => {
            const { Role } = res.data;
            if (Role != "SuperAdmin" && Role != "Admin") {
                setAuth(null)
                return;
            }
            setAuth(saved)
        }).catch((err) => {
            const status = err.response?.status;
            if (status === 401 || status === 403) {
                clearAuth();
                messageApi.warning('登录态已过期，请重新登录');
            } else {
                // 网络或其他异常时保留本地登录态，允许继续使用
                setAuth(saved);
            }
        }).finally(() => {
            setInitializing(false);
        });
    }, [messageApi]);

    const handleLogin = useCallback((authInfo) => {
        setAuth(authInfo);
        saveAuth(authInfo);
    }, []);

    const handleLogout = useCallback(() => {
        setAuth(null);
        clearAuth();
        messageApi.info('已退出登录');
    }, [messageApi]);

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
            key: 'match-record',
            label: <Space><FileTextOutlined />对局记录查询</Space>,
            children: <MatchRecordPanel token={auth?.token} playerID={auth?.playerID} />,
        },
        {
            key: 'manual',
            label: <Space><BookOutlined />玩家手册编辑</Space>,
            children: <ManualEditorPanel token={auth?.token} />,
        },
        {
            key: 'ship-data',
            label: <Space><DatabaseOutlined />舰船配置更新</Space>,
            children: <ShipDataPanel token={auth?.token} />,
        },
    ];

    return (
        <Layout className={IS_TEST ? 'acb-admin-layout' : undefined} style={{ minHeight: '100vh' }}>
            <Header />
            <Content
                className={IS_TEST ? 'acb-admin-content' : undefined}
                style={IS_TEST ? undefined : { padding: '32px 48px', background: '#f5f5f5' }}
            >
                {initializing ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 200px)' }}>
                        <Card><Text type="secondary">正在验证用户信息...</Text></Card>
                    </div>
                ) : !auth ? (
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
