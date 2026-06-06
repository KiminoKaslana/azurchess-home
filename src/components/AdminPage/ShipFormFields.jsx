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

import { SHIP_TYPES, SHIP_WEAPON_TYPES } from "../../pages/AdminPage"

const { Title, Text } = Typography;
const { Option } = Select;

// ────────────────────────────────────────────────
// 子组件：舰船表单字段（单/批量 Modal 共用）
// ────────────────────────────────────────────────
const ShipFormFields = () => (
    <>
        <Row gutter={16}>
            <Col span={8}>
                <Form.Item name="Name" label="Name（舰船标识）" rules={[{ required: true, message: '必填' }]}>
                    <Input placeholder="如 guandao" />
                </Form.Item>
            </Col>
            <Col span={8}>
                <Form.Item name="Type" label="Type（舰种）">
                    <Select>
                        {SHIP_TYPES.map(t => <Option key={t.value} value={t.value}>{t.label}</Option>)}
                    </Select>
                </Form.Item>
            </Col>
            <Col span={8}>
                <Form.Item name="AssetPath" label="AssetPath（资源路径）">
                    <Input placeholder="如 America" />
                </Form.Item>
            </Col>
        </Row>
        <Row gutter={16}>
            <Col span={8}>
                <Form.Item name="WeaponType" label="WeaponType（武器类型）">
                    <Select>
                        {SHIP_WEAPON_TYPES.map(t => (
                            <Option key={t.value} value={t.value}>
                                <Tag color={t.color}>{t.label}</Tag>
                            </Option>
                        ))}
                    </Select>
                </Form.Item>
            </Col>
            <Col span={8}>
                <Form.Item name="SkillType" label="SkillType（技能）">
                    <Input placeholder="如 SCA" />
                </Form.Item>
            </Col>
            <Col span={8}>
                <Form.Item name="DeployCost" label="DeployCost（费用）">
                    <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
            </Col>
        </Row>
        <Divider orientation="left" plain>生命与战斗</Divider>
        <Row gutter={16}>
            <Col span={6}><Form.Item name="MaxHP" label="MaxHP（血量）"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={6}><Form.Item name="MaxDamage" label="MaxDamage"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={6}><Form.Item name="MinDamage" label="MinDamage"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={6}><Form.Item name="MaxAADamage" label="MaxAADamage（防空）"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
        </Row>
        <Row gutter={16}>
            <Col span={6}><Form.Item name="TorpedoDamage" label="TorpedoDamage"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={6}><Form.Item name="CriticalProbability" label="CriticalProbability（暴击率）"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={6}><Form.Item name="MissRate" label="MissRate（%）"><InputNumber min={0} max={100} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={6}><Form.Item name="Accuracy" label="Accuracy（%）"><InputNumber min={0} max={100} style={{ width: '100%' }} /></Form.Item></Col>
        </Row>
        <Divider orientation="left" plain>范围与机动</Divider>
        <Row gutter={16}>
            <Col span={6}><Form.Item name="AttackRadius" label="AttackRadius"><InputNumber min={0} step={0.1} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={6}><Form.Item name="DetectRadius" label="DetectRadius"><InputNumber min={0} step={0.1} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={6}><Form.Item name="MoveRadius" label="MoveRadius"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={6}><Form.Item name="TorpedoProtectCoefficient" label="TorpedoProtect（%）"><InputNumber min={0} max={100} style={{ width: '100%' }} /></Form.Item></Col>
        </Row>
        <Divider orientation="left" plain>舰载机</Divider>
        <Row gutter={16}>
            <Col span={8}><Form.Item name="ChildAircraftHP" label="ChildAircraftHP"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={8}><Form.Item name="ChildAircraftServerTime" label="ChildAircraftServerTime（s）"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
        </Row>
    </>
);

export default ShipFormFields