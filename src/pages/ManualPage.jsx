import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Card, Layout, Spin, Typography } from 'antd';
import { BookOutlined } from '@ant-design/icons';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { gameApi } from '../api';
import './ManualPage.css';

const { Content } = Layout;
const { Title, Text } = Typography;

const TAG_PATTERN = /<\/?(?:size|color)(?:=[^>]+)?>/g;

const parseStyledLine = (line) => {
    const sizeMatch = line.match(/<size=(\d+)>/);
    const colorMatch = line.match(/<color=(#[0-9a-fA-F]{3,8})>/);
    const fontSize = sizeMatch ? Number(sizeMatch[1]) : undefined;

    return {
        text: line.replace(TAG_PATTERN, ''),
        style: {
            ...(fontSize ? { fontSize } : {}),
            ...(colorMatch ? { color: colorMatch[1] } : {}),
        },
        isHeading: fontSize >= 20,
    };
};

const parseTable = (lines) => lines.map((line, rowIndex) => {
    const cells = line.split('\t');
    if (rowIndex === 0 && cells[0] === '') {
        cells[0] = '弹种';
    }
    return cells;
});

const buildManualBlocks = (manualText) => {
    const lines = manualText.replace(/\r\n/g, '\n').split('\n');
    const blocks = [];

    for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];

        if (!line.trim()) {
            blocks.push({ type: 'space', key: `space-${index}` });
            continue;
        }

        if (line.includes('\t') && !line.includes('<')) {
            const tableLines = [];
            let tableIndex = index;

            while (tableIndex < lines.length && lines[tableIndex].includes('\t') && !lines[tableIndex].includes('<')) {
                tableLines.push(lines[tableIndex]);
                tableIndex += 1;
            }

            blocks.push({
                type: 'table',
                key: `table-${index}`,
                rows: parseTable(tableLines),
            });
            index = tableIndex - 1;
            continue;
        }

        blocks.push({
            type: 'text',
            key: `text-${index}`,
            ...parseStyledLine(line),
        });
    }

    return blocks;
};

const ManualTable = ({ rows }) => (
    <div className="acb-manual-table-wrap">
        <table className="acb-manual-table">
            <thead>
                <tr>
                    {rows[0].map((cell, index) => (
                        <th key={`${cell}-${index}`}>{cell}</th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {rows.slice(1).map((row, rowIndex) => (
                    <tr key={`row-${rowIndex}`}>
                        {row.map((cell, cellIndex) => (
                            cellIndex === 0
                                ? <th key={`${cell}-${cellIndex}`} scope="row">{cell}</th>
                                : <td key={`${cell}-${cellIndex}`}>{cell}</td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

const ManualPage = () => {
    const [manualText, setManualText] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadManual = async () => {
            try {
                const response = await gameApi.getManual();
                setManualText(response.data || '');
                setError(null);
            } catch (err) {
                console.error('加载玩家手册失败:', err);
                setError('玩家手册加载失败，请稍后重试');
            } finally {
                setLoading(false);
            }
        };

        loadManual();
    }, []);

    const blocks = useMemo(() => buildManualBlocks(manualText), [manualText]);

    return (
        <Layout className="acb-manual-layout">
            <Header />
            <Content className="acb-manual-content">
                <div className="acb-manual-container">
                    <Title level={2} className="acb-manual-title">
                        <BookOutlined /> 玩家手册
                    </Title>
                    <Text className="acb-manual-subtitle">
                        这里展示当前版本的伤害补正、阵营技能与舰种技能说明。
                    </Text>

                    <Card className="acb-manual-card">
                        {loading ? (
                            <div className="acb-manual-loading">
                                <Spin size="large" tip="加载玩家手册中..." />
                            </div>
                        ) : error ? (
                            <Alert type="error" message={error} showIcon />
                        ) : (
                            <div className="acb-manual-body">
                                {blocks.map((block) => {
                                    if (block.type === 'space') {
                                        return <div key={block.key} className="acb-manual-space" />;
                                    }

                                    if (block.type === 'table') {
                                        return <ManualTable key={block.key} rows={block.rows} />;
                                    }

                                    return (
                                        <p
                                            key={block.key}
                                            className={block.isHeading ? 'acb-manual-line acb-manual-heading' : 'acb-manual-line'}
                                            style={block.style}
                                        >
                                            {block.text}
                                        </p>
                                    );
                                })}
                            </div>
                        )}
                    </Card>
                </div>
            </Content>
            <Footer />
        </Layout>
    );
};

export default ManualPage;
