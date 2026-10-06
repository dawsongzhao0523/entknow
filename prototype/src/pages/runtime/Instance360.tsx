import { useState } from 'react';
import type { Dayjs } from 'dayjs';
import { Button, Card, DatePicker, Descriptions, Input, Select, Space, Steps, Tabs, Tag, Timeline, Typography } from 'antd';
import { ArrowUpOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { INSTANCE_PO } from '../../mock/data';
import { ok, info, edit } from '../../components/proto';

const { Title, Text } = Typography;

const RelGraph = () => (
  <svg width="100%" height={220} viewBox="0 0 640 220">
    <defs>
      <marker id="arr" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
        <path d="M0,0 L8,4 L0,8 z" fill="#6b7688" />
      </marker>
    </defs>
    <line x1={230} y1={110} x2={90} y2={50} stroke="#6b7688" strokeWidth={1.5} markerEnd="url(#arr)" />
    <line x1={230} y1={110} x2={100} y2={180} stroke="#6b7688" strokeWidth={1.5} markerEnd="url(#arr)" />
    <line x1={410} y1={110} x2={540} y2={110} stroke="#6b7688" strokeWidth={1.5} markerEnd="url(#arr)" />
    <text x={130} y={70} fontSize={11} fill="#8b5cf6">FULFILLS</text>
    <text x={140} y={165} fontSize={11} fill="#5a5a72">SUPPLY</text>
    <text x={450} y={98} fontSize={11} fill="#059669">LOCATED_AT</text>
    <g>
      <rect x={230} y={86} width={180} height={48} rx={8} fill="#ecfdf5" stroke="#059669" />
      <text x={320} y={106} fontSize={12} fontWeight={700} textAnchor="middle" fill="#1e40af">采购订单</text>
      <text x={320} y={124} fontSize={11} textAnchor="middle" fill="#059669" fontFamily="monospace">{INSTANCE_PO.id}</text>
    </g>
    <g>
      <rect x={20} y={26} width={120} height={44} rx={8} fill="#faf5ff" stroke="#a855f7" />
      <text x={80} y={52} fontSize={12} textAnchor="middle" fill="#8b5cf6">准入评估 QA-118</text>
    </g>
    <g>
      <rect x={20} y={158} width={150} height={44} rx={8} fill="#f8fbfa" stroke="#6b7688" />
      <text x={95} y={178} fontSize={12} textAnchor="middle">供应商</text>
      <text x={95} y={195} fontSize={11} textAnchor="middle" fill="#5a5a72" fontFamily="monospace">S-0012 华兴电子</text>
    </g>
    <g>
      <rect x={540} y={88} width={90} height={44} rx={8} fill="#f8fbfa" stroke="#6b7688" />
      <text x={585} y={108} fontSize={12} textAnchor="middle">工厂</text>
      <text x={585} y={125} fontSize={11} textAnchor="middle" fill="#5a5a72" fontFamily="monospace">RCBJ-YK</text>
    </g>
  </svg>
);

export default function Instance360() {
  const nav = useNavigate();
  const [tsPick, setTsPick] = useState<Dayjs | null>(null);
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>实例 360° · 采购订单 <Text code>{INSTANCE_PO.id}</Text></Title>
          <Text type="secondary">运行时实例 · 时态查询与关联图谱</Text>
        </div>
        <div style={{ flex: 1 }} />
        <Space>
          <Tag color="processing">运行时实例</Tag>
          <Tag color="blue">v0.3 本体</Tag>
        </Space>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          <div style={{ flex: 1.4, minWidth: 320 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>状态机 order.status</Text>
            <Steps
              style={{ marginTop: 12 }}
              size="small"
              current={2}
              items={['草稿', '已下达', '已发货', '已收货', '已关闭'].map(t => ({ title: t }))}
            />
            <Descriptions style={{ marginTop: 20 }} size="small" column={2} bordered
              items={[
                { key: '1', label: '供应商', children: INSTANCE_PO.supplier },
                { key: '2', label: '工厂', children: INSTANCE_PO.plant },
                { key: '3', label: '物料', children: INSTANCE_PO.material },
                { key: '4', label: '金额', children: <Text strong code>{INSTANCE_PO.amount}</Text> },
                { key: '5', label: '下单时间', children: <Text code>{INSTANCE_PO.orderDt}</Text> },
                { key: '6', label: '承诺交期', children: <Text code>{INSTANCE_PO.promiseDt}</Text> },
              ]} />
          </div>
          <div style={{ width: 220 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>交付风险分</Text>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 4 }}>
              <span style={{ fontSize: 36, fontWeight: 800, color: '#c9861a' }}>{INSTANCE_PO.riskScore}</span>
              <Text type="danger" style={{ fontSize: 12 }}><ArrowUpOutlined /> 上升趋势</Text>
            </div>
            <div style={{ height: 8, borderRadius: 4, background: '#f1f3f5', marginTop: 8 }}>
              <div style={{ width: `${INSTANCE_PO.riskScore}%`, height: '100%', borderRadius: 4, background: '#f59e0b' }} />
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 20, borderTop: '1px solid #f1f3f5', paddingTop: 16, alignItems: 'center' }}>
          <Text type="secondary">时态查询 · 时间点</Text>
          <DatePicker showTime placeholder="选择时间点" onChange={d => setTsPick(d)} />
          <Button onClick={() => info(`该时点状态 · ${INSTANCE_PO.id}`, [
            ['查询时点', tsPick ? tsPick.format('YYYY-MM-DD HH:mm') : '当前时间（未选择则返回最新）'],
            ['状态', '已下达（事务时间 09-28 14:32 · 有效时间 09-28 00:00）'],
            ['承诺交期', <span key="p"><Text code>{INSTANCE_PO.promiseDt}</Text>（09-25 由 10-15 调整而来）</span>],
            ['风险分', <span key="r"><Text code>{INSTANCE_PO.riskScore}</Text>（该时点为 62）</span>],
            ['冻结', '否'],
          ])}>查询该时点状态</Button>
        </div>
      </Card>

      <Card>
        <Tabs
          items={[
            {
              key: 'timeline',
              label: '时态时间线',
              children: (
                <Timeline
                  items={INSTANCE_PO.timeline.map((t, i) => ({
                    color: i === INSTANCE_PO.timeline.length - 1 ? 'orange' : 'blue',
                    children: <><Text code style={{ fontSize: 12 }}>{t.t}</Text><div>{t.e}</div></>,
                  }))}
                />
              ),
            },
            { key: 'graph', label: '关联图谱', children: <RelGraph /> },
            {
              key: 'actions',
              label: '相关 Action',
              children: (
                <Space wrap>
                  <Button onClick={() => edit('催货 · 催供应商交货', [
                    ['目标订单', <span key="o"><Text code>{INSTANCE_PO.id}</Text></span>],
                    ['催货说明', <Input.TextArea key="m" rows={2} defaultValue="订单已临近承诺交期，请确认发货计划并回复预计发货时间。" />],
                    ['通知渠道', <Select key="c" defaultValue="feishu" style={{ width: 160 }} options={[{ value: 'feishu', label: '飞书 + 站内' }, { value: 'mail', label: '邮件' }]} />],
                  ], () => ok('催货 Action 已提交 · 副作用（通知）将异步送达'))}>📣 催货</Button>
                  <Button danger icon={<LockOutlined />} onClick={() => nav('/runtime/action-gateway')}>冻结订单（需计划主管 + 二次确认）</Button>
                  <Button onClick={() => edit('调整承诺日期', [
                    ['目标订单', <span key="o"><Text code>{INSTANCE_PO.id}</Text></span>],
                    ['新承诺交期', <DatePicker key="d" />],
                    ['调整原因', <Input key="r" defaultValue="供应商产能受限，协商延期" />],
                  ], () => ok('Edits 已提交 · 承诺交期变更写入单一事务，时间线已追加'))}>📅 调整承诺日期</Button>
                </Space>
              ),
            },
          ]}
        />
      </Card>
    </>
  );
}
