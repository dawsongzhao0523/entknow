import React from 'react';
import { Alert, Button, Card, Col, Progress, Row, Select, Space, Statistic, Table, Tag, Typography, message } from 'antd';
import { PlayCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

interface Candidate {
  id: string; kind: string; content: React.ReactNode; check: React.ReactNode;
  conf?: number; actions: string[];
}

const CANDIDATES: Candidate[] = [
  {
    id: 'c1', kind: '术语',
    content: <span><b>「齐套率」</b> <span style={{ fontFamily: 'monospace' }}>= 已齐套行 / 总行数</span></span>,
    check: <Space size={6}><Tag color="green" style={{ fontSize: 11 }}>校验 ✓ 与指标平台一致</Tag><Tag style={{ fontSize: 11 }}>⛓ 指标平台同名指标</Tag></Space>,
    actions: ['入库', '编辑'],
  },
  {
    id: 'c2', kind: '规则',
    content: <span><b>规则候选:</b> 当 在库 {'<'} 安全库存 则 触发补货 <Tag color="orange">置信度 0.62</Tag></span>,
    check: (
      <Space size={6} wrap>
        <Text type="secondary" style={{ fontSize: 12 }}>符号校验:</Text>
        <Tag color="green" style={{ fontSize: 11 }}>类型 ✓</Tag>
        <Tag color="green" style={{ fontSize: 11 }}>端点 ✓</Tag>
        <Text type="warning" style={{ fontSize: 12, color: '#c9861a' }}>需业务专家确认阈值来源</Text>
      </Space>
    ),
    conf: 0.62, actions: ['确认', '退回'],
  },
];

export default function Learning() {
  const nav = useNavigate();

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>本体学习辅助</Title>
          <Text type="secondary">LLM 生成 + 符号校验 → 专家确认入库，抽取只产候选、永不直发（M3-F06）</Text>
        </div>
      </div>

      <Card size="small" style={{ marginBottom: 12 }}>
        <Space wrap>
          <Text strong style={{ fontSize: 12, color: '#5a5a72' }}>语料</Text>
          <Select defaultValue="kb" style={{ width: 180 }} options={[{ value: 'kb', label: '📚 KB-供应链' }]} />
          <Text type="secondary">+</Text>
          <Select defaultValue="scm" style={{ width: 200 }} options={[{ value: 'scm', label: '🗄 scm_prod schema' }]} />
          <Button type="primary" icon={<PlayCircleOutlined />} onClick={() => message.success('抽取任务已启动（mock）')}>开始抽取</Button>
        </Space>
      </Card>

      <Card size="small" style={{ marginBottom: 12 }} title="抽取进度" extra={<Tag color="blue">LLM 生成 + 符号校验</Tag>}>
        <Row gutter={16}>
          <Col span={6}><Statistic title="术语" value={412} /></Col>
          <Col span={6}><Statistic title="分类" value={38} /></Col>
          <Col span={6}><Statistic title="关系候选" value={96} suffix={<Text type="secondary" style={{ fontSize: 12 }}>待审核</Text>} /></Col>
          <Col span={6}><Statistic title="规则公理（瓶颈 ⚠）" value={12} valueStyle={{ color: '#c9861a' }} /></Col>
        </Row>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
          <Text type="secondary" style={{ fontSize: 12, width: 160, textAlign: 'right' }}>规则/公理抽取准确率</Text>
          <Progress percent={58} style={{ flex: 1 }} strokeColor="#c9861a" format={p => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{p}%</span>} />
        </div>
      </Card>

      <Card size="small" style={{ marginBottom: 12 }} title="候选审核"
        extra={
          <Space>
            <Select size="small" defaultValue="all" style={{ width: 120 }} options={[{ value: 'all', label: '类型：全部' }, { value: 't', label: '术语' }, { value: 'r', label: '规则' }]} />
            <Select size="small" defaultValue="all" style={{ width: 120 }} options={[{ value: 'all', label: '校验：全部' }, { value: 'ok', label: '已通过' }, { value: 'warn', label: '待确认' }]} />
          </Space>
        }>
        <Table<Candidate>
          rowKey="id" size="small" pagination={false}
          columns={[
            { title: '类型', dataIndex: 'kind', width: 70, render: (v: string) => <Tag color={v === '术语' ? 'blue' : 'purple'}>{v}</Tag> },
            { title: '候选内容', dataIndex: 'content' },
            { title: '校验 / 证据', dataIndex: 'check', width: 320 },
            {
              title: '操作', key: 'ops', width: 140,
              render: (_: unknown, r: Candidate) => (
                <Space size={4}>
                  <Button size="small" type="primary" onClick={() => message.success(`候选已${r.actions[0]}`)}>{r.actions[0]}</Button>
                  <Button size="small" onClick={() => message.success(`候选已${r.actions[1]}`)}>{r.actions[1]}</Button>
                </Space>
              ),
            },
          ]}
          dataSource={CANDIDATES}
        />
        <Text type="secondary" style={{ fontSize: 12 }}>第 1 批 · 每批由专家确认后批量入库</Text>
      </Card>

      <Alert
        type="warning" showIcon
        message={<span><b>规则/公理抽取准确率最低（58%）</b>：建议配合七步法向导人工补齐</span>}
        action={<Button size="small" onClick={() => nav('/m3/wizard')}>打开七步法向导 →</Button>}
      />
    </>
  );
}
