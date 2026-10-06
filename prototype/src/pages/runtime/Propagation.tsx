import { useState } from 'react';
import { Alert, Button, Card, Drawer, Dropdown, Form, Input, Modal, Select, Space, Statistic, Table, Tag, Typography, message } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { RULES, fmtStatus } from '../../mock/data';
import { ok } from '../../components/proto';

const { Title, Text } = Typography;

const KIND_COLOR: Record<string, string> = { 'V→V': 'blue', 'V→E': 'purple', 'E→V': 'cyan', 'E→E': 'orange' };
const KIND_OPTIONS = ['V→V', 'V→E', 'E→V', 'E→E'].map(v => ({ value: v, label: v }));
const KIND_HELP: Record<string, string> = {
  'V→V': '对象属性变更 → 写入另一对象的派生属性（如 供应商评级 → 采购订单风险分）',
  'V→E': '对象变更 → 写入关联边属性（如 生产工单延期 → SUPPLY.delay）',
  'E→V': '边属性变更 → 回写对象状态（如 FULFILLS 完成率 → 生产工单状态迁移）',
  'E→E': '边 → 边级联（如 SUPPLY.delay 超阈值 → QUALIFIES 降级标记）',
};

interface RuleDef { id: string; def: string; kind: string; fired: number; status: string }

const QUEUE = [
  { key: 'q1', rule: 'R1', target: '订单 PO20260930001', action: '冻结订单 · 写入 frozen=true', status: '重试中', reason: 'Action 网关限流' },
  { key: 'q2', rule: 'R2', target: '供应商 SUP-0142', action: '评级降级 C→D', status: '重试中', reason: '目标实例写入冲突（源为准）' },
  { key: 'q3', rule: 'R3', target: '生产工单 WO-88213', action: '状态迁移 执行中→延期', status: '待处理', reason: '—' },
];

export default function Propagation() {
  const nav = useNavigate();
  const [rules, setRules] = useState<RuleDef[]>(RULES as RuleDef[]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<RuleDef | null>(null);
  const [queueOpen, setQueueOpen] = useState(false);
  const [form] = Form.useForm();

  const openEditor = (r?: RuleDef) => {
    setEditing(r ?? null);
    if (r) form.setFieldsValue({ kind: r.kind, def: r.def, status: r.status });
    else form.resetFields();
    setEditorOpen(true);
  };

  const save = () => {
    form.validateFields().then(v => {
      if (editing) {
        setRules(rs => rs.map(r => r.id === editing.id ? { ...r, ...v } : r));
        message.success(`规则 ${editing.id} 已更新 · 需沙盘验证后发布`);
      } else {
        const id = `R${rules.length + 1}`;
        setRules(rs => [...rs, { id, fired: 0, status: 'DRAFT', ...v }]);
        message.success(`规则 ${id} 已创建（草稿）· 发布前需 推演沙盘 沙盘验证`);
      }
      setEditorOpen(false);
    });
  };

  const editor = (
    <Drawer
      title={editing ? `编辑传播规则 · ${editing.id}` : '新建传播规则'}
      width={560} open={editorOpen} onClose={() => setEditorOpen(false)}
      extra={<Space><Button onClick={() => setEditorOpen(false)}>取消</Button><Button type="primary" onClick={save}>保存草稿</Button></Space>}
    >
      <Alert type="info" showIcon style={{ marginBottom: 16 }}
        message="传播规则在运行时对每次写入即时求值（写入即计算）；变更发布前必须在 推演沙盘 沙盘完成影响验证。" />
      <Form form={form} layout="vertical" initialValues={{ kind: 'V→V', status: 'ENABLED' }}>
        <Form.Item name="def" label="规则定义（触发条件 → 目标动作）" rules={[{ required: true, message: '请输入规则定义' }]}>
          <Input.TextArea rows={2} className="mono" placeholder="例：供应商.评级变更(→D) → 采购订单[状态=已下达].frozen=true + 冻结订单 Action" />
        </Form.Item>
        <Form.Item name="kind" label="传播类型" rules={[{ required: true }]}>
          <Select options={KIND_OPTIONS} />
        </Form.Item>
        <Form.Item noStyle shouldUpdate={(a, b) => a.kind !== b.kind}>
          {({ getFieldValue }) => (
            <Alert type="info" showIcon style={{ marginBottom: 16 }}
              message={<span><b>{getFieldValue('kind')}</b>：{KIND_HELP[getFieldValue('kind') as string]}</span>} />
          )}
        </Form.Item>
        <Form.Item label="触发器（Trigger）" required>
          <Select defaultValue="write" options={[
            { value: 'write', label: '写入触发 · 每次属性写入即时求值' },
            { value: 'state', label: '状态迁移触发 · 对象状态机迁移时' },
            { value: 'schedule', label: '定时触发 · CRON 表达式' },
          ]} />
        </Form.Item>
        <Form.Item label="目标动作" required>
          <Select mode="multiple" defaultValue={['prop']} options={[
            { value: 'prop', label: '写入派生属性（同事务）' },
            { value: 'action', label: '触发 Action（行动类，走 本体运行时 行动网关）' },
            { value: 'notify', label: '发送通知（副作用 · 非事务）' },
          ]} />
        </Form.Item>
        <Form.Item name="status" label="保存后状态">
          <Select options={[{ value: 'DRAFT', label: '草稿（待沙盘验证）' }, { value: 'ENABLED', label: '启用' }, { value: 'DISABLED', label: '停用' }]} />
        </Form.Item>
      </Form>
    </Drawer>
  );

  const queue = (
    <Modal title="传播队列（今日）" open={queueOpen} width={760} footer={null} onCancel={() => setQueueOpen(false)}>
      <Table
        rowKey="key" size="small" pagination={false} dataSource={QUEUE}
        columns={[
          { title: '规则', dataIndex: 'rule', width: 60, render: v => <Text code>{v}</Text> },
          { title: '目标实例', dataIndex: 'target' },
          { title: '动作', dataIndex: 'action' },
          { title: '状态', dataIndex: 'status', width: 80, render: v => <Tag color={v === '重试中' ? 'orange' : 'blue'}>{v}</Tag> },
          { title: '原因', dataIndex: 'reason', render: v => <Text type="secondary" style={{ fontSize: 12 }}>{v}</Text> },
          { title: '', width: 70, render: () => <Button size="small" type="link" onClick={() => ok('已重新入队，传播引擎将按退避策略重试')}>重试</Button> },
        ]}
      />
      <Alert style={{ marginTop: 12 }} type="info" showIcon
        message="失败任务保留 7 天，超过 5 次重试转入死信队列并通知规则 Owner。" />
    </Modal>
  );

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>传播引擎 · 供应链本体</Title>
          <Text type="secondary">发布即约束 · 写入即计算</Text>
        </div>
        <div style={{ flex: 1 }} />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openEditor()}>新建规则</Button>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Space style={{ marginBottom: 12 }} wrap>
          <Input.Search placeholder="搜索规则 / 触发条件" style={{ width: 260 }} allowClear />
          <Select defaultValue="all" style={{ width: 160 }} options={[{ value: 'all', label: '传播类型：全部' }, { value: 'vv', label: 'V→V' }, { value: 've', label: 'V→E' }, { value: 'ev', label: 'E→V' }, { value: 'ee', label: 'E→E' }]} />
          <Button icon={<ReloadOutlined />} onClick={() => ok('已刷新：4 条规则 · 今日触发 1,842 次')}>刷新</Button>
        </Space>
        <Table
          rowKey="id"
          size="middle"
          dataSource={rules}
          pagination={{ total: 4, pageSize: 10, showTotal: t => `共 ${t} 条传播规则` }}
          columns={[
            { title: '编号', dataIndex: 'id', width: 70, render: v => <Text code>{v}</Text> },
            { title: '触发条件 → 目标动作', dataIndex: 'def' },
            { title: '传播类型', dataIndex: 'kind', width: 110, render: v => <Tag color={KIND_COLOR[v]}>{v}</Tag> },
            { title: '今日触发', dataIndex: 'fired', width: 100, align: 'right', render: v => <Text code>{v}</Text> },
            { title: '状态', dataIndex: 'status', width: 90, render: v => <Tag color={fmtStatus(v)}>{v}</Tag> },
            {
              title: '操作', key: 'ops', width: 100, align: 'right', render: (_: unknown, r: RuleDef) => (
                <Space size={4}>
                  <Button size="small" type="link" onClick={() => openEditor(r)}>编辑</Button>
                  <Dropdown menu={{
                    items: [
                      { key: 'toggle', label: r.status === 'ENABLED' ? '停用' : '启用' },
                      { key: 'sandbox', label: '沙盘验证 → 推演沙盘' },
                      { key: 'history', label: '触发历史' },
                      { type: 'divider' },
                      { key: 'del', label: '删除', danger: true },
                    ],
                    onClick: ({ key }) => {
                      if (key === 'toggle') {
                        const s = r.status === 'ENABLED' ? 'DISABLED' : 'ENABLED';
                        setRules(rs => rs.map(x => x.id === r.id ? { ...x, status: s } : x));
                        message.success(`规则 ${r.id} 已${s === 'ENABLED' ? '启用' : '停用'}`);
                      }
                      else if (key === 'sandbox') nav('/sandbox/compare');
                      else if (key === 'history') ok(`规则 ${r.id} 今日触发 ${r.fired} 次 · 近 7 日 ${r.fired * 5} 次（原型示意）`);
                      else if (key === 'del') Modal.confirm({
                        title: `删除规则 ${r.id}？`, content: '删除后不可恢复；生产实例上由该规则写入的派生值保留。',
                        okText: '删除', okButtonProps: { danger: true }, cancelText: '取消',
                        onOk: () => { setRules(rs => rs.filter(x => x.id !== r.id)); message.success(`规则 ${r.id} 已删除`); },
                      });
                    },
                  }}>
                    <Button size="small" type="link">⋯</Button>
                  </Dropdown>
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <Card title={<Space>运行时<Tag color="purple">发布即约束</Tag><Tag color="purple">写入即计算</Tag></Space>} extra={<Button type="link" onClick={() => setQueueOpen(true)}>队列</Button>}>
        <Space size={48} wrap>
          <Statistic title="今日触发" value={1842} suffix="次" />
          <Statistic title="失败" value={2} suffix={<Button type="link" size="small" onClick={() => setQueueOpen(true)}>重试中 · 查看队列</Button>} valueStyle={{ color: '#c9861a' }} />
          <Statistic title="平均延迟" value={120} suffix="ms" />
        </Space>
        <Alert
          style={{ marginTop: 16 }}
          type="info"
          showIcon
          message={<span><b>发布即约束·写入即计算</b>：规则变更需先沙盘验证（→ 推演沙盘）再发布</span>}
          action={<Button size="small" onClick={() => nav('/sandbox/compare')}>去验证</Button>}
        />
      </Card>
      {editor}
      {queue}
    </>
  );
}
