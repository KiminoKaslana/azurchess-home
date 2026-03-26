// src/pages/CompendiumPage.jsx
import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Spin, Typography, Tag, message, Layout } from 'antd';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { staticApi } from '../api';
const { Content } = Layout;
const { Title, Text } = Typography;
const CompendiumPage = () => {
    const [characters, setCharacters] = useState([]);
    const [nameMap, setNameMap] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filterType, setFilterType] = useState(null); // 新增筛选状态

    // 类型映射表
    const typeMap = {
        0: '战列',
        1: '重巡',
        2: '轻巡',
        3: '航母',
        4: '驱逐',
        5: '导弹驱逐舰',
        6: '超巡',
    };
    const weaponTypeMap = {
        0: { color: "#a50000ff", name: "高爆" },
        1: { color: "#004799ff", name: "穿甲" },
        2: { color: "#beab00ff", name: "导弹" },
        3: { color: "#009b53ff", name: "鱼雷" },
        4: { color: "#94007bff", name: "航弹" }
    };
    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const [shipsResponse, nameMapResponse] = await Promise.all([
                    staticApi.getShips(),
                    staticApi.getNameMap()
                ]);

                setCharacters(shipsResponse.data);
                setNameMap(nameMapResponse.data);
                setError(null);
            } catch (err) {
                console.error('加载数据失败:', err);
                setError('加载角色数据失败，请稍后重试');
                message.error('数据加载失败');
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);
    if (loading) {
        return (
            <Layout style={{ minHeight: '100vh' }}>
                <Header />
                <Content style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
                    <Spin size="large" tip="加载角色图鉴中..." />
                </Content>
                <Footer />
            </Layout>
        );
    }
    if (error) {
        return (
            <Layout style={{ minHeight: '100vh' }}>
                <Header />
                <Content style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
                    <Text type="danger">{error}</Text>
                </Content>
                <Footer />
            </Layout>
        );
    }
    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Header />
            <Content>
                <div id="compendium" style={{ padding: '5% 5%' }}>
                    <div className="container">
                        <Title level={2} style={{ textAlign: 'center', marginBottom: '40px' }}>
                            角色图鉴
                        </Title>

                        {/* 筛选功能 */}
                        <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                            {Object.entries(typeMap).map(([key, value]) => (
                                <Tag
                                    key={key}
                                    color={filterType === parseInt(key) ? 'blue' : 'default'}
                                    style={{ cursor: 'pointer', margin: '0 8px' }}
                                    onClick={() => setFilterType(filterType === parseInt(key) ? null : parseInt(key))}
                                >
                                    {value}
                                </Tag>
                            ))}
                        </div>

                        {characters.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '50px' }}>
                                <Text>暂无角色数据</Text>
                            </div>
                        ) : (
                            <Row
                                gutter={[16, 16]}  // 卡片间距（水平16px，垂直16px）
                                style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',  // 自动换行
                                    justifyContent: 'center'  // 行内卡片居中对齐
                                }}
                            >
                                {characters
                                    .filter((char) => filterType === null || char.Type === filterType) // 根据筛选条件过滤
                                    .map((char) => (
                                        <Col
                                            key={char.Name}
                                            style={{
                                                flex: '1 1 auto',  // 弹性伸缩：允许放大、缩小，基础尺寸自动
                                                minWidth: 192,     // 卡片最小宽度（与卡片宽度一致）
                                                maxWidth: 220,     // 可选：限制卡片最大宽度，避免过宽
                                                padding: '0 8px'   // 列内边距，配合gutter控制间距
                                            }}
                                        >
                                            <Card
                                                hoverable
                                                style={{
                                                    width: '100%',    // 卡片宽度占满列宽（自适应）
                                                    maxWidth: 192,    // 卡片最大宽度固定（避免超过图片原始尺寸）
                                                    margin: '0 auto', // 卡片在列内居中
                                                    overflow: 'hidden'
                                                }}
                                                cover={
                                                    <div style={{
                                                        height: 256,
                                                        width: '100%',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        overflow: 'hidden'
                                                    }}>
                                                        <img
                                                            alt={nameMap[char.Name] || char.Name}
                                                            src={`/CardImage/${char.Name}.png`}
                                                            style={{
                                                                width: '100%',
                                                                height: '100%',
                                                                objectFit: 'cover'
                                                            }}
                                                            onError={(e) => { e.target.src = '/CardImage/default.png'; }}
                                                        />
                                                    </div>
                                                }
                                            >
                                                {/* 卡片内容（数据展示）保持不变 */}
                                                <Card.Meta
                                                    title={
                                                        <div style={{
                                                            whiteSpace: 'nowrap',
                                                            overflow: 'hidden',
                                                            marginBottom: 8,
                                                        }}>
                                                            <Text strong style={{ fontSize: 16 }}>
                                                                {nameMap[char.Name] || char.Name}
                                                            </Text>
                                                        </div>
                                                    }
                                                />
                                                <Tag style={{ fontSize: 12 }}>
                                                    {typeMap[char.Type] || `类型 ${char.Type}`}
                                                </Tag>
                                                <Tag style={{ fontSize: 12 }} color={weaponTypeMap[char.WeaponType].color || "white"}>
                                                    {weaponTypeMap[char.WeaponType].name || `类型 ${char.WeaponType}`}
                                                </Tag>
                                                <div style={{ marginTop: 8, fontSize: 14, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', whiteSpace: 'nowrap' }}>
                                                        <Text type="secondary">生命值: </Text>
                                                        <Text>{char.MaxHP}</Text>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', whiteSpace: 'nowrap' }}>
                                                        <Text type="secondary">伤害区间: </Text>
                                                        <Text>{char.MinDamage}-{char.MaxDamage}</Text>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', whiteSpace: 'nowrap' }}>
                                                        <Text type="secondary">命中: </Text>
                                                        <Text>{char.Accuracy}</Text>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', whiteSpace: 'nowrap' }}>
                                                        <Text type="secondary">闪避: </Text>
                                                        <Text>{char.MissRate}</Text>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', whiteSpace: 'nowrap' }}>
                                                        <Text type="secondary">攻击范围: </Text>
                                                        <Text>{char.AttackRadius}</Text>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', whiteSpace: 'nowrap' }}>
                                                        <Text type="secondary">侦测范围: </Text>
                                                        <Text>{char.DetectRadius}</Text>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', whiteSpace: 'nowrap' }}>
                                                        <Text type="secondary">移动范围: </Text>
                                                        <Text>{char.MoveRadius}</Text>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', whiteSpace: 'nowrap' }}>
                                                        <Text type="secondary">最大防空伤害: </Text>
                                                        <Text>{char.MaxAADamage}</Text>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', whiteSpace: 'nowrap' }}>
                                                        <Text type="secondary">鱼雷防护系数: </Text>
                                                        <Text>{char.TorpedoProtectCoefficient}</Text>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', whiteSpace: 'nowrap' }}>
                                                        <Text type="secondary">鱼雷伤害: </Text>
                                                        <Text>{char.TorpedoDamage === 0 ? '-' : char.TorpedoDamage}</Text>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', whiteSpace: 'nowrap' }}>
                                                        <Text type="secondary">舰载机生命值: </Text>
                                                        <Text>{char.ChildAircraftHP === 0 ? '-' : char.ChildAircraftHP}</Text>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', whiteSpace: 'nowrap' }}>
                                                        <Text type="secondary">舰载机整备时间: </Text>
                                                        <Text>{char.ChildAircraftHP === 0 ? '-' : char.ChildAircraftServerTime}</Text>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', whiteSpace: 'nowrap' }}>
                                                        <Text type="secondary">暴击概率: </Text>
                                                        <Text>{char.CriticalProbability}</Text>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', whiteSpace: 'nowrap' }}>
                                                        <Text type="secondary">部署成本: </Text>
                                                        <Text>{char.DeployCost}</Text>
                                                    </div>
                                                </div>
                                            </Card>
                                        </Col>
                                    ))}
                            </Row>
                        )}
                    </div>
                </div>
            </Content>
            <Footer />
        </Layout>
    );
};
export default CompendiumPage;