import { useState } from 'react';
import { Button, Card, Descriptions, Drawer, Input, Space, Table, Tabs, Tag, Typography } from 'antd';
import { REVIEWS, fmtStatus } from '../../mock/data';
import { ok, run } from '../../components/proto';

const { Title, Text, Paragraph } = Typography;

type Review = (typeof REVIEWS)[number];

const typeColor = (t: string) => ({ 本体发布: 'blue', 术语归并: 'purple', 冲突裁决: 'red', 自进化补丁: 'cyan' } as Record<string, string>)[t] ?? 'default';

export default function Review() {
  const [current, setCurrent] = useState<Review | null>(null);

  const columns = [
    { title: '单号', dataIndex: 'id', key: 'id', render: (v: string) => <Text className="mono" style={{ fontSize: 12 }}>{v}</Text> },
    { title: '标题', dataIndex: 'title', key: 'title', render: (v: string) => <b>{v}</b> },
    { title: '类型', dataIndex: 'type', key: 'type', render: (v: string) => <Tag color={typeColor(v)}>{v}</Tag> },
    { title: '提交人', dataIndex: 'from', key: 'from' },
    { title: '状态', dataIndex: 'status', key: 'status', render: (v: string) => <Tag color={fmtStatus(v)}>{v}</Tag> },
    { title: 'SLA 倒计时', dataIndex: 'sla', key: 'sla', render: (v: string) => <Text type={v.includes('小时') ? 'danger' : 'secondary'}>{v}</Text> },
    { title: '操作', key: 'ops', render: (_: unknown, r: Review) => <Button size="small" type="link" onClick={e => { e.stopPropagation(); setCurrent(r); }}>处理</Button> },
  ];

  return (
    <>
      <div style={{ marginBottom: 12 }}>
        <Title level={4} style={{ margin: 0 }}>治理评审台</Title>
        <Text type="secondary">本体变更统一评审入口· 双签 / SLA / 证据链</Text>
      </div>
      <Card>
        <Tabs
          defaultActiveKey="todo"
          items={[
            { key: 'todo', label: '待我评审 2' },
            { key: 'mine', label: '我发起的' },
            { key: 'all', label: '全部' },
          ]}
        />
        <Table<Review>
          rowKey="id" columns={columns as never} dataSource={REVIEWS} size="middle" pagination={false}
          onRow={r => ({ onClick: () => setCurrent(r), style: { cursor: 'pointer' } })}
        />
      </Card>
      <Drawer
        title={current ? `${current.id} · ${current.title}` : ''}
        open={!!current} onClose={() => setCurrent(null)} width={520}
      >
        {current && (
          <>
            <Descriptions column={1} size="small" bordered items={[
              { key: '1', label: '类型', children: <Tag color={typeColor(current.type)}>{current.type}</Tag> },
              { key: '2', label: '提交人', children: current.from },
              { key: '3', label: '状态', children: <Tag color={fmtStatus(current.status)}>{current.status}</Tag> },
              { key: '4', label: 'SLA', children: current.sla },
            ]} />
            <Title level={5} style={{ marginTop: 16 }}>变更摘要</Title>
            <Paragraph type="secondary" style={{ fontSize: 13 }}>
              前置条件 风险分 &gt;70 → &gt;80；新增二次确认。影响面：已发布 Skill×2 · Agent×3 · 沙盘场景×5。
            </Paragraph>
            <Title level={5}>Diff 要点</Title>
            <pre className="mono" style={{ background: '#f8fbfa', borderRadius: 8, padding: 12, fontSize: 12, lineHeight: 1.8 }}>
{`- 前置: 风险分 > 70
+ 前置: 风险分 > 80
+ 新增: 二次确认(计划主管)
  证据: ⛓ 近30天误冻结 3 起(风险70-80区间)`}
            </pre>
            <Title level={5}>评论</Title>
            <Input.TextArea rows={3} placeholder="写下评审意见…" />
            <Space style={{ marginTop: 16 }}>
              <Button type="primary" onClick={() => { ok(`${current.id} 已通过 · 变更进入发布流程`); setCurrent(null); }}>通过</Button>
              <Button danger onClick={() => run('退回修改', `退回 ${current.id} 给提交人 ${current.from}，需附评审意见。`, () => setCurrent(null))}>退回</Button>
              <Button onClick={() => ok(`已转交给同角色评审人（SLA 重新计时）`)}>转交</Button>
            </Space>
          </>
        )}
      </Drawer>
    </>
  );
}
