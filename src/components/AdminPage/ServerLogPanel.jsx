import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Alert, App as AntdApp, Button, Card, Space, Switch, Typography,
} from 'antd';
import { ClearOutlined, DisconnectOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { gameServerBaseUrl } from '../../api';

const { Text } = Typography;

const STREAM_ENDPOINT = `${gameServerBaseUrl}/StreamServerLog`;
const MAX_LOG_LENGTH = 512 * 1024;

const appendLogText = (current, next) => {
    const merged = `${current}${next}`;
    return merged.length > MAX_LOG_LENGTH ? merged.slice(merged.length - MAX_LOG_LENGTH) : merged;
};

const parseSseChunk = (chunk) => {
    const events = [];
    const normalized = chunk.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    for (const block of normalized.split('\n\n')) {
        if (!block.trim()) continue;

        let eventName = 'message';
        const dataLines = [];
        for (const line of block.split('\n')) {
            if (line.startsWith(':')) continue;
            if (line.startsWith('event:')) {
                eventName = line.slice(6).trim();
            } else if (line.startsWith('data:')) {
                dataLines.push(line.slice(5).replace(/^ /, ''));
            }
        }

        if (dataLines.length > 0) {
            events.push({ eventName, data: dataLines.join('\n') });
        }
    }

    return events;
};

const ServerLogPanel = ({ token }) => {
    const { message: messageApi } = AntdApp.useApp();
    const [logText, setLogText] = useState('');
    const [connected, setConnected] = useState(false);
    const [autoScroll, setAutoScroll] = useState(true);
    const abortRef = useRef(null);
    const logContainerRef = useRef(null);

    const stopStream = useCallback(() => {
        abortRef.current?.abort();
        abortRef.current = null;
        setConnected(false);
    }, []);

    const startStream = useCallback(async () => {
        if (!token) {
            messageApi.error('请先登录 Admin 账号');
            return;
        }

        stopStream();
        const abortController = new AbortController();
        abortRef.current = abortController;
        setConnected(true);

        try {
            const response = await fetch(STREAM_ENDPOINT, {
                method: 'POST',
                headers: {
                    Token: token,
                    Accept: 'text/event-stream',
                },
                signal: abortController.signal,
            });

            if (!response.ok || !response.body) {
                throw new Error(`日志流连接失败：${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let buffer = '';

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lastBoundary = buffer.lastIndexOf('\n\n');
                if (lastBoundary < 0) continue;

                const completeChunk = buffer.slice(0, lastBoundary + 2);
                buffer = buffer.slice(lastBoundary + 2);

                for (const event of parseSseChunk(completeChunk)) {
                    if (event.eventName === 'error') {
                        messageApi.error(event.data);
                    } else {
                        setLogText(current => appendLogText(current, event.data));
                    }
                }
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                messageApi.error(err.message || '日志流连接已断开');
            }
        } finally {
            if (abortRef.current === abortController) {
                abortRef.current = null;
                setConnected(false);
            }
        }
    }, [messageApi, stopStream, token]);

    useEffect(() => {
        startStream();
        return () => stopStream();
    }, [startStream, stopStream]);

    useEffect(() => {
        if (!autoScroll || !logContainerRef.current) return;
        logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }, [autoScroll, logText]);

    return (
        <Space direction="vertical" style={{ width: '100%' }} size="large">
            <Card
                title="服务器日志"
                extra={
                    <Space>
                        <Text type={connected ? 'success' : 'secondary'}>
                            {connected ? '已连接' : '未连接'}
                        </Text>
                        <Switch
                            checked={autoScroll}
                            onChange={setAutoScroll}
                            checkedChildren="自动滚动"
                            unCheckedChildren="手动查看"
                        />
                        <Button icon={<ClearOutlined />} onClick={() => setLogText('')}>
                            清空显示
                        </Button>
                        {connected ? (
                            <Button icon={<DisconnectOutlined />} onClick={stopStream}>
                                断开
                            </Button>
                        ) : (
                            <Button type="primary" icon={<PlayCircleOutlined />} onClick={startStream}>
                                连接
                            </Button>
                        )}
                    </Space>
                }
            >
                <Alert
                    message="实时读取 /var/log/manjuu/azurchesscloud/output.log，仅显示最近约 512KB 内容。"
                    type="info"
                    showIcon
                    style={{ marginBottom: 12 }}
                />
                <pre
                    ref={logContainerRef}
                    style={{
                        height: '64vh',
                        overflow: 'auto',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        margin: 0,
                        padding: 16,
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: 8,
                        background: 'rgba(0, 0, 0, 0.32)',
                    }}
                >
                    {logText || '正在等待日志输出...'}
                </pre>
            </Card>
        </Space>
    );
};

export default ServerLogPanel;
