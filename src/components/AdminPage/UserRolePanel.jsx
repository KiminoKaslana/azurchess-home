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

// 角色枚举
const USER_ROLES = [
    { value: 0, label: 'Player（普通玩家）', color: 'default' },
    { value: 1, label: 'Admin（管理员）', color: 'blue' },
    { value: 2, label: 'SuperAdmin（超级管理员）', color: 'gold' },
];

// ────────────────────────────────────────────────
// 子组件：用户角色管理（需要 SuperAdmin）
// ────────────────────────────────────────────────
const UserRolePanel = ({ token }) => {
    const { message: messageApi } = AntdApp.useApp();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (values) => {
        const toastKey = 'user-role-update';
        messageApi.loading({ content: '正在提交角色修改...', key: toastKey, duration: 0 });
        setLoading(true);
        try {
            const res = await userApi.adminSetUserRole({ TargetUserId: values.targetUserId, NewRole: values.newRole }, token);
            messageApi.success({ content: res.data || '角色修改已完成', key: toastKey });
        } catch (err) {
            const status = err.response?.status;
            const msg = err.response?.data;
            if (status === 403) messageApi.error({ content: '权限不足，需要 SuperAdmin', key: toastKey });
            else if (status === 401) messageApi.error({ content: 'Token 无效或已过期，请重新登录', key: toastKey });
            else if (status === 400) messageApi.error({ content: msg || '参数错误', key: toastKey });
            else messageApi.error({ content: '服务器异常', key: toastKey });
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

export default UserRolePanel