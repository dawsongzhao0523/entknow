import React from 'react';
import { Alert, Button, Card, Space, Table, Tag, Typography } from 'antd';
import { SwapOutlined } from '@ant-design/icons';
import { run, info } from '../../components/proto';

const { Title, Text } = Typography;

const SOURCES = [
  { label: 'KB 词条', name: '「供应商」', count: 9, unit: '属性', highlight: true, mono: false },
  { label: '代码类', name: 'Supplier.java', count: 14, unit: '属性', highlight: false, mono: true },
  { label: '数仓表', name: 'dwd_supplier', count: 12, unit: '字段', highlight: false, mono: true },
];

const CONFLICTS = [
  { key: 'd1', ought: 'KB 定义「供应商需准入评审」', actual: <>表含 <Text className="mono" strong>214</Text> 家无评审记录</>, op: '差异清单' },
  { key: 'd2', ought: <>代码 <Text className="mono">Supplier.level</Text> 五级</>, actual: '表只有三级', op: '发起评审' },
];

const conflictColumns = [
  { title: '应然', dataIndex: 'ought', key: 'ought', render: (v: React.ReactNode) => <Space><Tag>应然</Tag><span>{v}</span></Space> },
  { title: '实然', dataIndex: 'actual', key: 'actual', render: (v: React.ReactNode) => <Space><Tag color="red">实然</Tag><span>{v}</span></Space> },
  { title: '操作', dataIndex: 'op', key: 'op', width: 110, render: (v: string) => (
    <Button size="small" onClick={() => v === '差异清单'
      ? info('差异清单 · 无评审记录供应商', [
        ['应然', 'KB 定义「供应商需准入评审」'],
        ['实然', <span key="a">214 家无评审记录，其中 <b>37</b> 家为活跃供应商</span>],
        ['建议', '对 37 家活跃供应商补录准入评审，其余标记「历史供应商·豁免」'],
      ])
      : run('发起评审', '将「供应商分级口径」差异提交评审台，通知 KB / 代码 / 数仓三方负责人。')}>{v}</Button>
  ) },
];

const REFS = [
  { kind: '本体对象', name: '[供应商]', color: 'blue' },
  { kind: '指标', name: '[供应商数]', color: 'cyan' },
  { kind: '视图', name: 'lv_supplier', color: 'default', mono: true },
];

export default function Crosslink() {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>跨源融合与交叉校验</Title>
          <Text type="secondary">概念锚三源对齐：KB ⇄ 代码 ⇄ 数仓表，应然 vs 实然差异校验（M2-F06）</Text>
        </div>
        <div style={{ flex: 1 }} />
        <Tag color="blue">概念锚「供应商」</Tag>
      </div>

      <Card title="三源对齐 · 概念锚「供应商」" size="small" style={{ marginBottom: 12 }}
        extra={<Tag color="blue">KB ⇄ 代码 ⇄ 数仓表</Tag>}>
        <div style={{ display: 'flex', alignItems: 'stretch', gap: 12 }}>
          {SOURCES.map((s, i) => (
            <React.Fragment key={s.label}>
              {i > 0 && <SwapOutlined style={{ alignSelf: 'center', fontSize: 20, color: '#059669' }} />}
              <div style={{
                flex: 1, textAlign: 'center', borderRadius: 10, padding: '13px 14px',
                border: s.highlight ? '1px solid #a7f3d0' : '1px solid #f1f3f5',
                background: s.highlight ? '#e6f4ff' : '#fafbfd',
              }}>
                <Text type="secondary" style={{ fontSize: 12 }}>{s.label}</Text>
                <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}
                  className={s.mono ? 'mono' : undefined}>{s.name}</div>
                <div style={{ marginTop: 8 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>{s.unit} <Text className="mono" strong>{s.count}</Text> 个</Text>
                </div>
              </div>
            </React.Fragment>
          ))}
        </div>
        <div style={{ marginTop: 14 }}>
          <Space size={8} wrap>
            <Text type="secondary" style={{ fontSize: 12 }}>互证结果：</Text>
            <Tag color="green">定义一致 ✓</Tag>
            <Text type="secondary" style={{ fontSize: 12 }}>属性覆盖：</Text>
            <Tag color="blue">KB 9</Tag><Tag color="blue">代码 14</Tag><Tag color="blue">表 12</Tag><Tag color="purple">交集 8</Tag>
          </Space>
        </div>
      </Card>

      <Card title="冲突与差异（应然 vs 实然）" size="small" style={{ marginBottom: 12 }}
        extra={<Tag color="orange">2 项</Tag>}>
        <Table rowKey="key" columns={conflictColumns as never} dataSource={CONFLICTS} size="middle" pagination={false} />
      </Card>

      <Card title="crosslink 引用" size="small" extra={<Tag color="purple">3 处引用</Tag>}>
        <Space size={8} wrap>
          <Text type="secondary" style={{ fontSize: 12 }}>被引用：</Text>
          {REFS.map(r => <Tag key={r.name} color={r.color}>{r.kind} {r.mono ? <Text className="mono" style={{ fontSize: 12 }}>{r.name}</Text> : r.name}</Tag>)}
        </Space>
        <Alert type="info" showIcon style={{ marginTop: 12 }}
          message="锚点价值：改任何一源，锚点自动重校验并通知其余两源负责人。" />
      </Card>
    </>
  );
}
