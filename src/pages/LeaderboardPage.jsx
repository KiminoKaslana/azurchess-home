// TODO: 场均伤害
/*
        对局记录索引里暂时没有对局伤害记录，等待后续设计回放记录系统的对局结束数据
        详细记录信息后，再启用相关功能
*/


// src/pages/LeaderboardPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
    Layout, Card, Table, Typography, Space, Row, Col, Badge,
    Button, Select, Tag, App as AntdApp,
} from 'antd';
import { TrophyOutlined, ReloadOutlined, LogoutOutlined } from '@ant-design/icons';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { authApi, gameApi } from '../api';
import LoginPanel from '../components/AdminPage/LoginPanel';
import { IS_TEST } from '../config/envConfig';

const { Content } = Layout;
const { Title, Text } = Typography;

// ────────────────────────────────────────────────
// localStorage 登录态（与管理页 admin_auth 隔离，互不影响）
// ────────────────────────────────────────────────
const STORAGE_KEY = 'leaderboard_auth';
const saveAuth = (auth) => localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
const loadAuth = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null; } catch { return null; }
};
const clearAuth = () => localStorage.removeItem(STORAGE_KEY);

const SORT_OPTIONS = [
    // { value: 'avgDamage', label: '场均伤害' },
    { value: 'winRate', label: '胜率' },
    { value: 'wins', label: '胜场数' },
    { value: 'games', label: '场次数' },
];

const RESULT_LIMIT = 100;

// 写死的最低场次门槛：低于此场次的玩家不计入榜单
const MIN_GAMES = 10;

// 前三名用奖牌色标记，其余直接显示数字
const renderRank = (rank) => {
    const color = rank === 1 ? 'gold' : rank === 2 ? 'blue' : rank === 3 ? 'volcano' : undefined;
    if (color) {
        return <Tag color={color} style={{ minWidth: 34, textAlign: 'center', margin: 0 }}>{rank}</Tag>;
    }
    return <span>{rank}</span>;
};

const columns = [
    { title: '排名', dataIndex: 'rank', key: 'rank', width: 80, align: 'center', render: renderRank },
    {
        title: '玩家', dataIndex: 'PlayerName', key: 'PlayerName',
        render: (name, r) => name || <Text type="secondary">{(r.PlayerId || '').slice(-6) || '未知'}</Text>,
    },
    { title: '场次', dataIndex: 'Games', key: 'Games', width: 90, align: 'right', sorter: (a, b) => a.Games - b.Games },
    { title: '胜场', dataIndex: 'Wins', key: 'Wins', width: 90, align: 'right', sorter: (a, b) => a.Wins - b.Wins },
    {
        title: '胜率', dataIndex: 'WinRate', key: 'WinRate', width: 110, align: 'right',
        sorter: (a, b) => a.WinRate - b.WinRate,
        render: (v) => `${(Number(v) * 100).toFixed(1)}%`,
    },
    // {
    //     title: '场均伤害', dataIndex: 'AvgDamage', key: 'AvgDamage', width: 130, align: 'right',
    //     sorter: (a, b) => a.AvgDamage - b.AvgDamage,
    //     render: (v) => Math.round(Number(v) || 0).toLocaleString(),
    // },
];

const LeaderboardPage = () => {
    const { message: messageApi } = AntdApp.useApp();
    const [auth, setAuth] = useState(null); // { playerID, token, username, role }
    const [initializing, setInitializing] = useState(true);

    const [sortBy, setSortBy] = useState('games');
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);

    // 恢复登录态：排行榜要求 >= Player，即任意有效账号；通过 Me 校验 Token 是否仍有效
    useEffect(() => {
        const saved = loadAuth();
        if (!saved) {
            setInitializing(false);
            return;
        }
        authApi.me(saved.token).then(() => {
            setAuth(saved);
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
        setRows([]);
        messageApi.info('已退出登录');
    }, [messageApi]);

    const fetchLeaderboard = useCallback(async (opts = {}) => {
        if (!auth?.playerID) return;
        const sb = opts.sortBy ?? sortBy;
        setLoading(true);
        try {
            const res = await gameApi.getLeaderboard(
                { SortBy: sb, MinGames: MIN_GAMES, Limit: RESULT_LIMIT },
                auth.playerID,
            );
            const entries = res.data?.Entries ?? [];
            setRows(entries.map((e, i) => ({ ...e, rank: i + 1 })));
        } catch (err) {
            const status = err.response?.status;
            if (status === 401) {
                clearAuth();
                setAuth(null);
                messageApi.warning('登录态已过期，请重新登录');
            } else {
                messageApi.error('获取排行榜失败，请稍后重试');
            }
        } finally {
            setLoading(false);
        }
    }, [auth, sortBy, messageApi]);

    // 登录后首次加载
    useEffect(() => {
        if (auth?.playerID) {
            fetchLeaderboard();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [auth]);

    const handleSortChange = (value) => {
        setSortBy(value);
        fetchLeaderboard({ sortBy: value });
    };

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
                    <LoginPanel
                        onLogin={handleLogin}
                        isRoleAllowed={() => true}
                        deniedMessage="账号无效，无法登录"
                        title={<Space><TrophyOutlined /> 登录查看排行榜</Space>}
                        hint="请登录后查看排行榜"
                    />
                ) : (
                    <>
                        {/* 顶部状态栏 */}
                        <Card style={{ marginBottom: 24 }} bodyStyle={{ padding: '12px 24px' }}>
                            <Row justify="space-between" align="middle">
                                <Col>
                                    <Space size="large">
                                        <Badge status="success" text="已登录" />
                                        <Text>用户：<Text strong>{auth.username}</Text></Text>
                                    </Space>
                                </Col>
                                <Col>
                                    <Button icon={<LogoutOutlined />} onClick={handleLogout} danger>
                                        退出登录
                                    </Button>
                                </Col>
                            </Row>
                        </Card>

                        {/* 排行榜 */}
                        <Card>
                            <Row justify="space-between" align="middle" gutter={[12, 12]} style={{ marginBottom: 16 }}>
                                <Col>
                                    <Title level={4} style={{ margin: 0 }}>
                                        <TrophyOutlined /> 玩家排行榜
                                    </Title>
                                </Col>
                                <Col>
                                    <Space wrap>
                                        <Space size={4}>
                                            <Text type="secondary">排序依据</Text>
                                            <Select
                                                value={sortBy}
                                                onChange={handleSortChange}
                                                options={SORT_OPTIONS}
                                                style={{ width: 120 }}
                                            />
                                        </Space>
                                        <Button icon={<ReloadOutlined />} onClick={() => fetchLeaderboard()} loading={loading}>
                                            刷新
                                        </Button>
                                    </Space>
                                </Col>
                            </Row>
                            <Table
                                rowKey={(r) => r.PlayerId || String(r.rank)}
                                columns={columns}
                                dataSource={rows}
                                loading={loading}
                                pagination={{ pageSize: 20, showSizeChanger: false, hideOnSinglePage: true }}
                                size="middle"
                            />
                        </Card>
                    </>
                )}
            </Content>
            <Footer />
        </Layout>
    );
};

export default LeaderboardPage;
