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

// 武器类型（5种）× 舰船类型（9种）默认矩阵
const DEFAULT_DAMAGE_MATRIX = Array.from({ length: 5 }, () => Array(9).fill(1.0));
const WEAPON_TYPES = ['高爆', '穿甲', '导弹', '鱼雷', '航弹'];
const UNIT_TYPES = ['战列', '重巡', '轻巡', '航母', '驱逐', '导弹驱逐', '超巡', '基地', '飞机'];
const normalizeDamageMatrix = (source) => {
    const rowCount = WEAPON_TYPES.length;
    const colCount = UNIT_TYPES.length;
    return Array.from({ length: rowCount }, (_, rowIdx) =>
        Array.from({ length: colCount }, (_, colIdx) => {
            const raw = source?.[rowIdx]?.[colIdx];
            const val = Number(raw);
            return Number.isFinite(val) ? val : 1.0;
        })
    );
};

// ────────────────────────────────────────────────
// 子组件：伤害系数矩阵编辑
// ────────────────────────────────────────────────
const DamageCoefficientPanel = ({ token }) => {
    const { message: messageApi } = AntdApp.useApp();
    const [matrix, setMatrix] = useState(DEFAULT_DAMAGE_MATRIX.map(row => [...row]));
    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(false);

    const loadMatrix = useCallback(async (options = {}) => {
        const { silent = false } = options;
        setFetchLoading(true);
        try {
            const res = await gameApi.getDamageCoefficient();
            const nextMatrix = normalizeDamageMatrix(res.data);
            setMatrix(nextMatrix);
            if (!silent) {
                messageApi.success('已加载当前伤害系数矩阵');
            }
        } catch (err) {
            const msg = err.response?.data;
            messageApi.error(msg || '加载伤害系数失败');
        } finally {
            setFetchLoading(false);
        }
    }, [messageApi]);

    useEffect(() => {
        loadMatrix({ silent: true });
    }, [loadMatrix]);

    const handleCellChange = (rowIdx, colIdx, value) => {
        setMatrix(prev => {
            const next = prev.map(r => [...r]);
            next[rowIdx][colIdx] = value ?? 1.0;
            return next;
        });
    };

    const handleSubmit = async () => {
        const toastKey = 'damage-coefficient-update';
        messageApi.loading({ content: '正在提交伤害矩阵更新...', key: toastKey, duration: 0 });
        setLoading(true);
        try {
            const res = await gameApi.updateDamageCoefficient(matrix, token);
            messageApi.success({ content: res.data || '伤害补正表更新已完成', key: toastKey });
        } catch (err) {
            const status = err.response?.status;
            const msg = err.response?.data;
            if (status === 400) messageApi.error({ content: msg || '格式或维度错误', key: toastKey });
            else if (status === 401 || status === 403) messageApi.error({ content: '权限不足或 Token 无效', key: toastKey });
            else messageApi.error({ content: '服务器异常', key: toastKey });
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
        <Card
            title="伤害系数矩阵（5 武器类型 × 9 舰船类型）"
            extra={
                <Button icon={<ReloadOutlined />} loading={fetchLoading} onClick={() => loadMatrix()}>
                    重新加载
                </Button>
            }
        >
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

export default DamageCoefficientPanel