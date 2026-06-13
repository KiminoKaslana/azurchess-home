import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert, App as AntdApp, Button, Card, Descriptions, Empty, Modal,
    Space, Table, Tag, Typography,
} from 'antd';
import { FileTextOutlined, ReloadOutlined } from '@ant-design/icons';
import { gameApi } from '../../api';

const { Text } = Typography;

const DOTNET_EPOCH_TICKS = 621355968000000000;
const TICKS_PER_MILLISECOND = 10000;

const formatDateTime = (ticks) => {
    const value = Number(ticks);
    if (!Number.isFinite(value) || value <= 0) return '-';

    const milliseconds = (value - DOTNET_EPOCH_TICKS) / TICKS_PER_MILLISECOND;
    const date = new Date(milliseconds);
    if (Number.isNaN(date.getTime())) return '-';

    return new Intl.DateTimeFormat('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    }).format(date);
};

const formatDuration = (seconds) => {
    const total = Math.max(0, Math.floor(Number(seconds) || 0));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const remainSeconds = total % 60;

    if (hours > 0) {
        return `${hours}小时 ${minutes}分 ${remainSeconds}秒`;
    }
    if (minutes > 0) {
        return `${minutes}分 ${remainSeconds}秒`;
    }
    return `${remainSeconds}秒`;
};

const formatBytes = (bytes) => {
    const value = Number(bytes) || 0;
    if (value <= 0) return '-';
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    return `${(value / 1024 / 1024).toFixed(1)} MB`;
};

const renderPlayers = (players = [], survivors = []) => {
    if (!players.length) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无玩家数据" />;

    const survivorIds = new Set(survivors.map(player => player.PlayerId));
    return (
        <Space wrap>
            {players.map(player => (
                <Tag key={`${player.PlayerId}_${player.BaseId}`} color={survivorIds.has(player.PlayerId) ? 'success' : 'default'}>
                    {player.PlayerName || player.PlayerId || '未知玩家'}
                    {player.BaseId ? ` / ${player.BaseId}` : ''}
                    {player.Union ? ` / ${player.Union}` : ''}
                </Tag>
            ))}
        </Space>
    );
};

const MatchDetails = ({ record, onViewLog, logLoading }) => (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Descriptions size="small" bordered column={{ xs: 1, sm: 2, lg: 3 }}>
            <Descriptions.Item label="ReplayId">{record.ReplayId || '-'}</Descriptions.Item>
            <Descriptions.Item label="地图">{record.MapName || '-'}</Descriptions.Item>
            <Descriptions.Item label="胜利阵营">{record.Winner || '-'}</Descriptions.Item>
            <Descriptions.Item label="胜利联盟">{record.WinnerUnion || '-'}</Descriptions.Item>
            <Descriptions.Item label="总回合数">{record.TotalRounds || '-'}</Descriptions.Item>
            <Descriptions.Item label="回放大小">{formatBytes(record.FileSizeBytes)}</Descriptions.Item>
            <Descriptions.Item label="版本">{record.Version || '-'}</Descriptions.Item>
            <Descriptions.Item label="创建时间">{formatDateTime(record.CreatedAt)}</Descriptions.Item>
            <Descriptions.Item label="日志状态">
                {record.HasLog ? <Tag color="success">可查看</Tag> : <Tag>无日志</Tag>}
            </Descriptions.Item>
        </Descriptions>

        <div>
            <Text strong>参战玩家：</Text>
            <div style={{ marginTop: 8 }}>{renderPlayers(record.Players, record.Survivors)}</div>
        </div>

        <Space>
            <Button
                type="primary"
                icon={<FileTextOutlined />}
                disabled={!record.HasLog}
                loading={logLoading}
                onClick={(event) => onViewLog(record, event)}
            >
                查看日志
            </Button>
            {!record.HasLog && <Text type="secondary">该对局没有关联到日志文件</Text>}
        </Space>
    </Space>
);

const MatchRecordPanel = ({ token, playerID }) => {
    const { message: messageApi } = AntdApp.useApp();
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(false);
    const [logLoadingId, setLogLoadingId] = useState('');
    const [logModalOpen, setLogModalOpen] = useState(false);
    const [logTitle, setLogTitle] = useState('');
    const [logText, setLogText] = useState('');

    const loadRecords = useCallback(async (options = {}) => {
        const { silent = false } = options;
        setLoading(true);
        try {
            const res = await gameApi.getReplayList({ Limit: 0 }, { token, playerID });
            const list = Array.isArray(res.data?.Replays) ? res.data.Replays : [];
            const sorted = [...list].sort((a, b) => Number(b.StartTime || 0) - Number(a.StartTime || 0));
            setRecords(sorted);
            if (!silent) {
                messageApi.success(`已加载 ${sorted.length} 条对局记录`);
            }
        } catch (err) {
            const status = err.response?.status;
            if (status === 401 || status === 403) messageApi.error('权限不足或登录态无效');
            else messageApi.error(err.response?.data || '对局记录加载失败');
        } finally {
            setLoading(false);
        }
    }, [messageApi, playerID, token]);

    useEffect(() => {
        loadRecords({ silent: true });
    }, [loadRecords]);

    const handleViewLog = useCallback(async (record, event) => {
        event?.stopPropagation();
        setLogLoadingId(record.ReplayId);
        setLogTitle(`${record.RoomName || record.DisplayName || record.ReplayId} - 对局日志`);
        setLogText('');
        setLogModalOpen(true);

        try {
            const res = await gameApi.getMatchLog(record.ReplayId, token);
            setLogText(res.data?.Log || '日志内容为空');
        } catch (err) {
            const status = err.response?.status;
            if (status === 404) setLogText('该对局日志不存在或文件已丢失。');
            else if (status === 401 || status === 403) setLogText('权限不足或 Token 无效。');
            else setLogText(err.response?.data || '日志读取失败。');
        } finally {
            setLogLoadingId('');
        }
    }, [token]);

    const columns = useMemo(() => [
        {
            title: '房间名称',
            dataIndex: 'RoomName',
            key: 'RoomName',
            render: (value, record) => value || record.DisplayName || '-',
        },
        {
            title: '开始时间',
            dataIndex: 'StartTime',
            key: 'StartTime',
            render: formatDateTime,
            sorter: (a, b) => Number(a.StartTime || 0) - Number(b.StartTime || 0),
            defaultSortOrder: 'descend',
        },
        {
            title: '持续时间',
            dataIndex: 'DurationSeconds',
            key: 'DurationSeconds',
            render: formatDuration,
            sorter: (a, b) => Number(a.DurationSeconds || 0) - Number(b.DurationSeconds || 0),
        },
        {
            title: '对局人数',
            dataIndex: 'PlayerCount',
            key: 'PlayerCount',
            width: 120,
            sorter: (a, b) => Number(a.PlayerCount || 0) - Number(b.PlayerCount || 0),
            render: value => `${value || 0} 人`,
        },
    ], []);

    return (
        <Space direction="vertical" style={{ width: '100%' }} size="large">
            <Card
                title="对局记录查询"
                extra={
                    <Button icon={<ReloadOutlined />} loading={loading} onClick={() => loadRecords()}>
                        刷新
                    </Button>
                }
            >
                <Alert
                    message="点击任意对局行可展开详细信息；日志内容仅 Admin 及以上权限可查看。"
                    type="info"
                    showIcon
                    style={{ marginBottom: 12 }}
                />
                <Table
                    rowKey="ReplayId"
                    loading={loading}
                    columns={columns}
                    dataSource={records}
                    pagination={{ pageSize: 20, showSizeChanger: true }}
                    expandable={{
                        expandedRowRender: record => (
                            <MatchDetails
                                record={record}
                                onViewLog={handleViewLog}
                                logLoading={logLoadingId === record.ReplayId}
                            />
                        ),
                        expandRowByClick: true,
                    }}
                />
            </Card>

            <Modal
                title={logTitle}
                open={logModalOpen}
                onCancel={() => setLogModalOpen(false)}
                footer={null}
                width={960}
                destroyOnClose
            >
                <pre
                    style={{
                        maxHeight: '70vh',
                        overflow: 'auto',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        margin: 0,
                    }}
                >
                    {logText || '正在加载日志...'}
                </pre>
            </Modal>
        </Space>
    );
};

export default MatchRecordPanel;
