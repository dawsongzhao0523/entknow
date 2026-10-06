import React from 'react';
import { Button, Card, Col, Row, Space, Statistic, Table, Tag, Typography } from 'antd';
import { ReloadOutlined, WarningOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { ok, run, info } from '../../components/proto';

const { Title, Text } = Typography;

const SOURCES = [
  { key: 'naming', source: '表命名规范', detail: 'dwd_/dws_/ads_ 分层语义碎片', count: 402, confidence: '高' },
  { key: 'metric', source: '指标口径（指标平台）', detail: '度量碎片', count: 318, confidence: '高' },
  { key: 'mdm', source: '主数据（供应商/物料/客户）', detail: '核心对象碎片', count: 205, confidence: '高' },
  { key: 'lineage', source: '血缘（任务依赖）', detail: '关系碎片', count: 361, confidence: '中' },
];

const sourceColumns = [
  { title: '碎片来源', dataIndex: 'source', key: 'source', render: (v: string, r: typeof SOURCES[number]) => (
    <>
      <div style={{ fontWeight: 600 }}>{v}</div>
      <Text type="secondary" style={{ fontSize: 12 }}>{r.detail}</Text>
    </>
  ) },
  { title: '碎片数', dataIndex: 'count', key: 'count', width: 110, render: (v: number) => <Text className="mono" strong>{v}</Text> },
  { title: '置信度', dataIndex: 'confidence', key: 'confidence', width: 100,
    render: (v: string) => <Tag color={v === '高' ? 'green' : 'orange'}>{v}</Tag> },
];

interface Candidate {
  key: string; kind: '对象候选' | '关系候选' | '冲突'; title: React.ReactNode;
  evidence: React.ReactNode; badge?: React.ReactNode;
}

export default function Convergence() {
  const nav = useNavigate();

  const candidates: Candidate[] = [
    {
      key: 'c1', kind: '对象候选',
      title: <>「供应商」 <Tag color="green">三源互证一致 ✓</Tag></>,
      evidence: <>证据：主数据 MDM ＋ <Text className="mono" style={{ fontSize: 12 }}>dwd_supplier</Text> ＋ 指标「供应商数」×3 源 · 建议：建为【静态对象】，属性草稿 12 个</>,
    },
    {
      key: 'c2', kind: '关系候选',
      title: <>「供应商—供应—物料」 <Tag>置信度 0.86</Tag></>,
      evidence: <>证据：血缘 <Text className="mono" style={{ fontSize: 12 }}>po_line→supplier</Text> ×14 任务</>,
    },
    {
      key: 'c3', kind: '冲突',
      title: <>「客户」在 CRM 与数仓 <Text className="mono" style={{ fontSize: 13 }}>dwd_customer</Text> 口径不一致（会员≠客户）</>,
      evidence: '需专家裁决统一口径后，方可候选化 · 裁决入口在评审台（M2-F03）',
    },
  ];

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>隐式本体收敛器</Title>
          <Text type="secondary">从表命名 / 指标口径 / 主数据 / 血缘中识别本体碎片，收敛为对象与关系候选（M2-F04）</Text>
        </div>
        <div style={{ flex: 1 }} />
        <Button icon={<ReloadOutlined />} onClick={() => run('重新扫描', '重扫 4 类碎片来源（表命名 / 指标口径 / 主数据 / 血缘），预计 6 分钟。')}>重新扫描</Button>
      </div>
      <Row gutter={12} style={{ marginBottom: 12 }}>
        <Col span={6}><Card><Statistic title="已识别本体碎片" value={1286} /></Card></Col>
        <Col span={6}><Card><Statistic title="已候选化" value={312} valueStyle={{ color: '#059669' }} /></Card></Col>
        <Col span={6}><Card><Statistic title="已入本体" value={87} valueStyle={{ color: '#2d8a4e' }} /></Card></Col>
        <Col span={6}><Card><Statistic title="冲突待裁决" value={24} valueStyle={{ color: '#c23b3b' }} prefix={<WarningOutlined />} /></Card></Col>
      </Row>
      <Card title="碎片来源分布" style={{ marginBottom: 12 }}
        extra={<Text type="secondary" style={{ fontSize: 12 }}>已识别 1,286 个碎片 · 按来源聚合</Text>}>
        <Table rowKey="key" columns={sourceColumns as never} dataSource={SOURCES} size="middle" pagination={false} />
      </Card>
      <Card title="候选列表" extra={<Text type="secondary" style={{ fontSize: 12 }}>共 312 组 · 优先展示高置信</Text>}>
        {candidates.map(c => (
          <div key={c.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 0', borderBottom: '1px solid #f1f3f5' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Space size={8} wrap>
                <Tag color={c.kind === '对象候选' ? 'blue' : c.kind === '关系候选' ? 'purple' : 'orange'}>{c.kind === '冲突' ? '⚠ 冲突' : c.kind}</Tag>
                <b>{c.title}</b>
              </Space>
              <div style={{ marginTop: 6 }}><Text type="secondary" style={{ fontSize: 12 }}>{c.evidence}</Text></div>
            </div>
            <Space size={8} style={{ flex: 'none' }}>
              {c.kind === '冲突' ? (
                <>
                  <Button size="small" onClick={() => info('口径差异 · 「客户」', [
                    ['CRM 定义', '签约主体（有合同关系），共 3,208 家'],
                    ['数仓定义', '注册账号（dwd_customer），共 18,450 个'],
                    ['交集', <span key="i" className="mono">2,974（签约且注册）· 口径差 = 会员未签约部分</span>],
                    ['裁决建议', '以「客户 = 签约主体」为准，注册账号归入「潜在客户」'],
                  ])}>查看差异</Button>
                  <Button size="small" type="primary" onClick={() => run('发起评审', '将「客户」口径冲突提交评审台（M2-F03），指派数据治理委员会裁决。')}>发起评审</Button>
                </>
              ) : (
                <>
                  <Button size="small" onClick={() => ok(`预览 ${c.kind}：属性草稿 / 关系草稿已生成（原型示意）`)}>预览</Button>
                  <Button size="small" type="primary" onClick={() => nav('/m3/designer')}>采纳 → 建模</Button>
                  {c.kind === '关系候选' && <Button size="small" onClick={() => ok('已忽略该候选，可在「已忽略列表」中恢复')}>忽略</Button>}
                </>
              )}
            </Space>
          </div>
        ))}
      </Card>
    </>
  );
}
