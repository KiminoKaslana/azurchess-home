import React, { useCallback, useEffect, useState } from 'react';
import { Alert, App as AntdApp, Button, Card, Input, Space, Typography } from 'antd';
import { CloudUploadOutlined, ReloadOutlined } from '@ant-design/icons';
import { gameApi } from '../../api';

const { Text } = Typography;

const ManualEditorPanel = ({ token }) => {
    const { message: messageApi } = AntdApp.useApp();
    const [content, setContent] = useState('');
    const [originalContent, setOriginalContent] = useState('');
    const [fetchLoading, setFetchLoading] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);

    const isDirty = content !== originalContent;

    const loadManual = useCallback(async () => {
        setFetchLoading(true);
        try {
            const res = await gameApi.getManual();
            const text = res.data || '';
            setContent(text);
            setOriginalContent(text);
            messageApi.success('已加载 OSS 中的玩家手册');
        } catch (err) {
            const status = err.response?.status;
            if (status === 503) messageApi.error('OSS 未启用，无法读取玩家手册');
            else if (status === 404) messageApi.error('OSS 中未找到 Common/Manual.txt');
            else messageApi.error('玩家手册加载失败');
        } finally {
            setFetchLoading(false);
        }
    }, [messageApi]);

    useEffect(() => {
        loadManual();
    }, [loadManual]);

    const handleSubmit = async () => {
        if (!content.trim()) {
            messageApi.warning('玩家手册内容不能为空');
            return;
        }

        const toastKey = 'manual-update';
        messageApi.loading({ content: '正在发布玩家手册到 OSS...', key: toastKey, duration: 0 });
        setSubmitLoading(true);
        try {
            const res = await gameApi.updateManual(content, token);
            setOriginalContent(content);
            messageApi.success({ content: res.data || '玩家手册发布成功', key: toastKey });
        } catch (err) {
            const status = err.response?.status;
            const msg = err.response?.data;
            if (status === 400) messageApi.error({ content: msg || '玩家手册内容无效', key: toastKey });
            else if (status === 401 || status === 403) messageApi.error({ content: '权限不足或 Token 无效', key: toastKey });
            else messageApi.error({ content: msg || '玩家手册发布失败', key: toastKey });
        } finally {
            setSubmitLoading(false);
        }
    };

    return (
        <Card
            title="玩家手册编辑"
            extra={
                <Space>
                    <Text type={isDirty ? 'warning' : 'secondary'}>
                        {isDirty ? '有未提交修改' : '已同步'}
                    </Text>
                    <Button icon={<ReloadOutlined />} loading={fetchLoading} onClick={loadManual}>
                        重新加载
                    </Button>
                    <Button type="primary" icon={<CloudUploadOutlined />} loading={submitLoading} onClick={handleSubmit}>
                        提交并发布
                    </Button>
                </Space>
            }
        >
            <Alert
                type="info"
                showIcon
                message="保存后会覆盖 OSS 的 azur-chess-beta:Common/Manual.txt，并同步更新服务器 ResourceInfo 中的 Manual.txt 哈希。"
                style={{ marginBottom: 12 }}
            />
            <Input.TextArea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="请输入玩家手册内容"
                autoSize={{ minRows: 24, maxRows: 36 }}
                spellCheck={false}
                style={{ fontFamily: 'monospace' }}
            />
        </Card>
    );
};

export default ManualEditorPanel;
