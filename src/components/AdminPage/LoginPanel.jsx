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

const isAdminRole = (role) => role === 'Admin' || role === 'SuperAdmin';

// ────────────────────────────────────────────────
// 子组件：登录面板
// 通过 props 复用于管理页与排行榜页：
//   isRoleAllowed - 角色准入判定，默认仅 Admin/SuperAdmin（保持管理页原行为）
//   title / hint  - 面板标题与底部提示文案
//   deniedMessage - 角色不被允许时的报错文案
// ────────────────────────────────────────────────

const LoginPanel = ({
    onLogin,
    isRoleAllowed = isAdminRole,
    deniedMessage = '当前账号无管理员权限',
    title = <Space><SafetyCertificateOutlined /> 管理员登录</Space>,
    hint = '仅供管理员使用。请使用 Admin 或 SuperAdmin 账号登录。',
}) => {
    const { message: messageApi } = AntdApp.useApp();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    // -----------------------------------------------
    //                登录检查
    // -----------------------------------------------
    const handleLogin = async (values) => {
        setLoading(true);
        try {
            const res = await authApi.login(values.username, values.password);
            const { PlayerID, Token } = res.data;
            const meRes = await authApi.me(Token);
            const { Role } = meRes.data;
            if (!isRoleAllowed(Role)) {
                messageApi.error(deniedMessage);
                return;
            }
            onLogin({ playerID: PlayerID, token: Token, username: values.username, role: Role });
            messageApi.success('登录成功');
        } catch (err) {
            const status = err.response?.status;
            const msg = err.response?.data;
            if (status === 403) {
                messageApi.error(msg || '用户名或密码错误');
            } else if (status === 400) {
                messageApi.error('请求参数有误');
            } else {
                messageApi.error('服务器异常，请稍后重试');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 200px)' }}>
            <Card
                title={title}
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
                    {hint}
                </Text>
            </Card>
        </div>
    );
};

export default LoginPanel