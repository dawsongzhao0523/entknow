import { Alert, Button, Card, Col, Progress, Row, Space, Statistic, Table, Tabs, Tag, Typography } from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined, WarningOutlined } from '@ant-design/icons';
import { fmtStatus } from '../../mock/data';
import { ok, run } from '../../components/proto';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

interface Task {
  id: string; title: string; type: '术语词典' | '指标口径' | '业务流程';
  priority: '高' | '中' | '低'; sla: string; status: string; from: string;
}

const TASKS: Task[] = [
  { id: 'RV-2026-1002-001', title: '术语归并：供应商 ≈ 供货商 ≈ Vendor', type: '术语词典', priority: '中', sla: '剩 2 天', status: '待评审', from: '王五' },
  { id: 'RV-2026-1001-007', title: '概念锚「客户」口径冲突裁决', type: '术语词典', priority: '高', sla: '剩 4 小时', status: '待评审', from: '系统' },
  { id: 'RV-2026-1002-003', title: '供应链本体 v0.4：+交付风险分函数', type: '指标口径', priority: '高', sla: '剩 1 天', status: '评审中', from: '张三' },
  { id: 'RV-2026-1002-005', title: '指标口径确认：交付及时率 v1.3', type: '指标口径', priority: '中', sla: '剩 3 天', status: '待评审', from: '王五' },
  { id: 'RV-2026-1002-006', title: '流程卡草稿签核：采购订单下达 PROC-000062', type: '业务流程', priority: '中', sla: '剩 2 天', status: '待评审', from: '孙七' },
  { id: 'RV-2026-1001-009', title: '流程梳理：供应商准入 PROC-000031 变更', type: '业务流程', priority: '低', sla: '剩 5 天', status: '待评审', from: '赵六' },
];

const DOMAINS = [
  { domain: '供应链', coverage: 72, reviewed: 41, total: 57, overdue: 2 },
  { domain: '生产域', coverage: 45, reviewed: 18, total: 40, overdue: 5 },
  { domain: '质量域', coverage: 31, reviewed: 9, total: 29, overdue: 1 },
];

const priorityColor = (p: string) => ({ 高: 'red', 中: 'orange', 低: 'default' } as Record<string, string>)[p];

const taskColumns = (nav: (p: string) => void) => [
  { title: '任务', dataIndex: 'title', key: 'title', render: (v: string, r: Task) => (
    <>
      <div style={{ fontWeight: 600 }}>{v}</div>
      <Text type="secondary" style={{ fontSize: 12 }} className="mono">{r.id} · 来自 {r.from}</Text>
    </>
  ) },
  { title: '类型', dataIndex: 'type', key: 'type', width: 110,
    render: (v: string) => <Tag color={v === '术语词典' ? 'blue' : v === '指标口径' ? 'purple' : 'cyan'}>{v}</Tag> },
  { title: '优先级', dataIndex: 'priority', key: 'priority', width: 90, render: (v: string) => <Tag color={priorityColor(v)}>{v}</Tag> },
  { title: 'SLA', dataIndex: 'sla', key: 'sla', width: 110,
    render: (v: string) => <Text type={v.includes('小时') ? 'danger' : 'secondary'} style={{ fontSize: 12 }}><ClockCircleOutlined /> {v}</Text> },
  { title: '状态', dataIndex: 'status', key: 'status', width: 100, render: (v: string) => <Tag color={fmtStatus(v)}>{v}</Tag> },
  { title: '操作', key: 'ops', width: 140, render: (_: unknown, r: Task) => (
    <Space size={4}>
      <Button size="small" type="link" onClick={() => nav('/governance/release?tab=review')}>去评审</Button>
      <Button size="small" type="link" onClick={() => run('转派任务', `将 ${r.id} 转派给其他领域评审人（当前处理人将收到通知）。`)}>转派</Button>
    </Space>
  ) },
];

const domainColumns = [
  { title: '业务领域', dataIndex: 'domain', key: 'domain', render: (v: string) => <b>{v}</b> },
  { title: '治理进度', key: 'progress', render: (_: unknown, r: typeof DOMAINS[number]) => (
    <Progress percent={r.coverage} size="small" style={{ minWidth: 220 }}
      status={r.coverage >= 60 ? 'active' : 'normal'} format={p => `${p}%（${r.reviewed}/${r.total}）`} />
  ) },
  { title: '逾期任务', dataIndex: 'overdue', key: 'overdue', width: 110,
    render: (v: number) => v > 0 ? <Tag color="red">{v} 项</Tag> : <Tag color="green">0</Tag> },
  { title: '操作', key: 'ops', width: 120, render: (_: unknown, r: typeof DOMAINS[number]) => <Button size="small" type="link" onClick={() => ok(`${r.domain} 域明细：已评审 ${r.reviewed} · 总量 ${r.total} · 逾期 ${r.overdue}（原型示意）`)}>下钻明细</Button> },
];

const PersonalView = () => {
  const nav = useNavigate();
  return (
  <>
    <Alert type="info" showIcon style={{ marginBottom: 12 }}
      message="评审动作即 G 轴治理事件"
      description="每次通过 / 驳回 / 裁决都会作为治理事件写入版本轴，可追溯、可回滚。" />
    <Row gutter={12} style={{ marginBottom: 12 }}>
      <Col span={8}><Card><Statistic title="待办任务" value={14} suffix="项" prefix={<WarningOutlined style={{ color: '#c9861a' }} />} /></Card></Col>
      <Col span={8}><Card><Statistic title="本周已评审" value={9} suffix="项" prefix={<CheckCircleOutlined style={{ color: '#2d8a4e' }} />} /></Card></Col>
      <Col span={8}><Card><Statistic title="平均响应" value={1.2} suffix="天" /></Card></Col>
    </Row>
    <Card title="待梳理 / 待评审任务" extra={<Text type="secondary" style={{ fontSize: 12 }}>术语词典 · 指标口径 · 业务流程</Text>}>
      <Table<Task> rowKey="id" columns={taskColumns(nav) as never} dataSource={TASKS} size="middle" pagination={false} />
    </Card>
  </>
);
};

const ManagerView = () => (
  <>
    <Alert type="warning" showIcon style={{ marginBottom: 12 }}
      message="2 项任务已逾期（供应链域）"
      description="逾期评审将阻塞下游本体发布；处置结果同样记入 G 轴治理事件流。" />
    <Row gutter={12} style={{ marginBottom: 12 }}>
      <Col span={8}><Card><Statistic title="领域覆盖率" value={49.3} suffix="%" precision={1} /></Card></Col>
      <Col span={8}><Card><Statistic title="评审通过率" value={92.4} suffix="%" precision={1} valueStyle={{ color: '#2d8a4e' }} /></Card></Col>
      <Col span={8}><Card><Statistic title="逾期任务" value={8} suffix="项" valueStyle={{ color: '#c23b3b' }} /></Card></Col>
    </Row>
    <Card title="按领域的治理进度" extra={<Text type="secondary" style={{ fontSize: 12 }}>覆盖 = 已评审知识 / 领域知识总量</Text>}>
      <Table rowKey="domain" columns={domainColumns as never} dataSource={DOMAINS} size="middle" pagination={false} />
    </Card>
  </>
);

export default function Workbench() {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>知识工作台</Title>
          <Text type="secondary">待梳理 / 待评审任务聚合，评审动作即治理事件</Text>
        </div>
      </div>
      <Tabs defaultActiveKey="personal" items={[
        { key: 'personal', label: '个人视角', children: <PersonalView /> },
        { key: 'manager', label: '管理者视角', children: <ManagerView /> },
      ]} />
    </>
  );
}
