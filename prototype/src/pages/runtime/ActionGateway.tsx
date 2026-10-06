import { useState } from 'react';
import { Alert, Button, Card, Descriptions, Drawer, Form, Input, List, Modal, Radio, Select, Space, Statistic, Steps, Table, Tabs, Tag, Typography, message } from 'antd';
import { AuditOutlined, ArrowLeftOutlined, ExperimentOutlined, PlayCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

interface ActionItem {
  id: string; name: string; obj: string; op: 'add' | 'modify' | 'delete';
  unit: string; unitKind: string; triggers: number; status: string; ver: string;
}

const ACTIONS: ActionItem[] = [
  { id: 'freeze', name: '冻结订单', obj: 'PO（采购订单）', op: 'modify', unit: 'ERP.freeze_order', unitKind: 'API 工具', triggers: 4, status: '已发布', ver: 'v1.2' },
  { id: 'unfreeze', name: '解冻订单', obj: 'PO（采购订单）', op: 'modify', unit: 'ERP.unfreeze_order', unitKind: 'API 工具', triggers: 2, status: '已发布', ver: 'v1.0' },
  { id: 'risk-notify', name: '高风险订单通知', obj: 'PO（采购订单）', op: 'add', unit: 'feishu.notify', unitKind: 'API 工具', triggers: 1, status: '已发布', ver: 'v0.9' },
  { id: 'supplier-suspend', name: '暂停供应商准入', obj: 'Supplier（供应商）', op: 'modify', unit: 'SRM.suspend_supplier', unitKind: 'API 工具', triggers: 2, status: '草稿', ver: 'v0.3' },
  { id: 'inv-warn', name: '库存水位预警回写', obj: 'Material（物料）', op: 'modify', unit: 'WMS.adjust_safety_stock', unitKind: '函数', triggers: 1, status: '评审中', ver: 'v0.5' },
];

/** 可选执行单元（引用制）：来自 本体建模 注册中心函数 / 智能应用 能力出口 */
const UNITS = [
  { id: 'fn1', kind: '函数', name: 'freeze_check', ver: 'v3', desc: '冻结前置检查：未发货、未关闭、风险分复核', io: '3 in / 1 out' },
  { id: 'fn2', kind: '函数', name: 'risk_chain_recalc', ver: 'v5', desc: '冻结后交付风险链重算', io: '2 in / 1 out' },
  { id: 'api1', kind: 'API 工具', name: 'ERP.freeze_order', ver: 'v7', desc: '回写 ERP 冻结状态（事务型 Webhook）', io: '2 in / 0 out' },
  { id: 'api2', kind: 'API 工具', name: 'feishu.notify', ver: 'v2', desc: '飞书站内通知发送', io: '3 in / 0 out' },
  { id: 'mcp1', kind: 'MCP 服务', name: 'scm-assistant.apply', ver: 'v1', desc: '供应链助手 Action 调用代理', io: '动态' },
];

const LOGS = [
  { id: 'ACT-1003-1017', po: 'PO20261002091', user: '张三（计划主管）', trigger: 'manual', status: '执行成功', time: '10:17' },
  { id: 'ACT-1003-0952', po: 'PO20261002087', user: '张三（计划主管）', trigger: 'manual', status: '执行成功', time: '09:52' },
  { id: 'ACT-1003-0930', po: 'PO20261002055', user: 'system', trigger: 'event', status: '执行成功', time: '09:30' },
  { id: 'ACT-1003-0911', po: 'PO20261002112', user: '陈曦（计划员）', trigger: 'manual', status: '权限拒绝', time: '09:11' },
  { id: 'ACT-1003-0600', po: 'PO20261002031', user: 'system', trigger: 'schedule', status: '已回滚', time: '06:00' },
];

const TRIGGER_TAG: Record<string, [string, string]> = {
  manual: ['手动', 'blue'], schedule: ['定时', 'purple'], event: ['事件', 'cyan'],
};
const STATUS_COLOR: Record<string, string> = { 执行成功: 'green', 权限拒绝: 'red', 已回滚: 'orange', 待确认: 'gold', 执行中: 'processing', 已发布: 'green', 草稿: 'default', 评审中: 'orange' };

/* ─── 新建/编辑行动类：渐进披露（元枢式简单入口 → 可选触发 → 评审前的影响声明）─── */
function CreateActionDrawer({ open, onClose, editName }: { open: boolean; onClose: () => void; editName?: string }) {
  const [unit, setUnit] = useState<string>();
  const [triggers, setTriggers] = useState<string[]>(['manual']);
  const [impacts, setImpacts] = useState([{ obj: 'PO（采购订单）', op: 'modify', fields: 'status, frozen_by, frozen_at' }]);
  const sel = UNITS.find(u => u.id === unit);
  return (
    <Drawer title={editName ? <>编辑行动类 · <Text code>{editName}</Text></> : '新建行动类'} width={860} open={open} onClose={onClose}
      extra={<Space>
        <Button onClick={() => { message.success('已保存草稿'); onClose(); }}>保存草稿</Button>
        <Button type="primary" onClick={() => { message.warning('影响声明未填写完整：提交评审前必须补齐影响对象类与字段'); }}>提交评审</Button>
      </Space>}>
      <Alert style={{ marginBottom: 16 }} type="info" showIcon
        message="渐进披露：基础信息与执行单元必填；触发器默认手动，可按需添加；影响声明在提交评审时强制校验。" />

      <Card size="small" title="① 基础信息" style={{ marginBottom: 12 }}>
        <Form layout="vertical">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item label="行动类名称" required style={{ marginBottom: 12 }}><Input placeholder="如：冻结订单" /></Form.Item>
            <Form.Item label="绑定对象类" required style={{ marginBottom: 12 }}>
              <Select placeholder="选择对象类" options={['PO（采购订单）', 'Supplier（供应商）', 'Material（物料）', 'WO（生产工单）'].map(v => ({ value: v, label: v }))} />
            </Form.Item>
            <Form.Item label="业务动作" required style={{ marginBottom: 0 }}>
              <Radio.Group defaultValue="modify" options={[{ value: 'add', label: '新增 add' }, { value: 'modify', label: '修改 modify' }, { value: 'delete', label: '删除 delete' }]} optionType="button" />
            </Form.Item>
            <Form.Item label="标签" style={{ marginBottom: 0 }}>
              <Select mode="tags" placeholder="添加标签" options={['风险', '资金占用', '回写'].map(v => ({ value: v, label: v }))} />
            </Form.Item>
          </div>
          <Form.Item label="描述" style={{ marginBottom: 0, marginTop: 12 }}>
            <Input.TextArea rows={2} placeholder="描述行动的适用场景与效果" />
          </Form.Item>
        </Form>
      </Card>

      <Card size="small" title="② 执行单元与参数（引用注册中心已发布的函数/能力，不内嵌实现）" style={{ marginBottom: 12 }}>
        <Form.Item label="执行单元" required style={{ marginBottom: 12 }}>
          <Select placeholder="从注册中心 / 能力出口选择（函数 / API / MCP 服务）" value={unit} onChange={setUnit}
            options={UNITS.map(u => ({ value: u.id, label: <Space size={6}><Tag>{u.kind}</Tag><Text code style={{ fontSize: 12 }}>{u.name}</Text><Tag color="green">{u.ver}</Tag></Space> }))} />
        </Form.Item>
        {sel && <Alert style={{ marginBottom: 12 }} type="success" showIcon message={<span style={{ fontSize: 12 }}>{sel.desc} · 接口 {sel.io}</span>} />}
        <Table rowKey="p" size="small" pagination={false}
          dataSource={[
            { p: 'order', label: '目标订单', from: '对象属性', value: 'PO.order_no' },
            { p: 'reason', label: '操作原因', from: '人工输入', value: '表单文本' },
            { p: 'channel', label: '通知渠道', from: '常量', value: "'feishu_scm'" },
          ]}
          columns={[
            { title: '参数', dataIndex: 'p', render: v => <Text code>{v}</Text> },
            { title: '显示名', dataIndex: 'label', render: () => <Input size="small" variant="borderless" placeholder="显示名" /> },
            { title: '来源', dataIndex: 'from', width: 150, render: v => <Select size="small" defaultValue={v} style={{ width: 110 }} options={['对象属性', '人工输入', '常量', '函数'].map(x => ({ value: x, label: x }))} /> },
            { title: '取值', dataIndex: 'value', render: v => <Input size="small" variant="borderless" defaultValue={v} /> },
          ]} />
      </Card>

      <Card size="small" title="③ 触发器（可选，默认手动）" style={{ marginBottom: 12 }}>
        <Form.Item label="触发方式" style={{ marginBottom: 12 }}>
          <Select mode="multiple" value={triggers} onChange={setTriggers}
            options={[{ value: 'manual', label: '手动（实例 360° / 列表页按钮）' }, { value: 'schedule', label: '定时（CRON / 固定频率）' }, { value: 'event', label: '事件监听（进入集合 / 属性跨阈值）' }]} />
        </Form.Item>
        {triggers.includes('schedule') && (
          <Form.Item label="定时表达式" style={{ marginBottom: 12 }}>
            <Input placeholder="如：0 6 * * *（每日 06:00）或 30m" style={{ width: 260 }} />
          </Form.Item>
        )}
        {triggers.includes('event') && (
          <Form.Item label="监听条件" style={{ marginBottom: 0 }}>
            <Space.Compact style={{ width: '100%' }}>
              <Select defaultValue="PO.risk_score" style={{ width: 180 }} options={['PO.risk_score', 'PO.status', '进入集合「高风险订单」'].map(v => ({ value: v, label: v }))} />
              <Select defaultValue=">" style={{ width: 80 }} options={['>', '>=', '==', 'in'].map(v => ({ value: v, label: v }))} />
              <Input placeholder="阈值 / 值" defaultValue="80" />
            </Space.Compact>
          </Form.Item>
        )}
      </Card>

      <Card size="small" title={<>④ 影响声明 <Tag color="orange" style={{ marginLeft: 4 }}>评审前必填</Tag></>}>
        <Table rowKey={(_, i) => String(i)} size="small" pagination={false}
          dataSource={impacts}
          columns={[
            { title: '影响对象类', dataIndex: 'obj', render: v => <Select size="small" defaultValue={v} style={{ width: 180 }} options={['PO（采购订单）', 'Supplier（供应商）', 'Delivery（交付）', 'ERP 订单（外部系统）'].map(x => ({ value: x, label: x }))} /> },
            { title: '预期操作', dataIndex: 'op', width: 120, render: v => <Select size="small" defaultValue={v} style={{ width: 100 }} options={['add', 'modify', 'delete'].map(x => ({ value: x, label: x }))} /> },
            { title: '影响字段', dataIndex: 'fields', render: v => <Input size="small" variant="borderless" defaultValue={v} /> },
          ]} />
        <Button size="small" type="dashed" icon={<PlusOutlined />} style={{ marginTop: 8 }}
          onClick={() => {
            setImpacts(s => [...s, { obj: 'Supplier（供应商）', op: 'add', fields: '' }]);
            message.success('已追加影响声明行：请选择影响对象类并填写预期字段');
          }}>添加影响声明</Button>
      </Card>
    </Drawer>
  );
}

/* ─── 新建触发器 ─── */
function CreateTriggerModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [type, setType] = useState('event');
  return (
    <Modal title="新增触发器" open={open} onCancel={onClose} width={560}
      onOk={() => { message.success('触发器已创建并启用'); onClose(); }} okText="创建并启用">
      <Form layout="vertical" style={{ marginTop: 12 }}>
        <Form.Item label="触发器名称" required><Input placeholder="如：高风险订单出现即检" /></Form.Item>
        <Form.Item label="类型" required>
          <Radio.Group value={type} onChange={e => setType(e.target.value)} optionType="button"
            options={[{ value: 'manual', label: '手动' }, { value: 'schedule', label: '定时' }, { value: 'event', label: '事件监听' }]} />
        </Form.Item>
        {type === 'schedule' && <Form.Item label="执行频率"><Input placeholder="CRON 如 0 6 * * *，或固定频率 30m / 2h / 1d" /></Form.Item>}
        {type === 'event' && (
          <Form.Item label="监听条件">
            <Space.Compact style={{ width: '100%' }}>
              <Select defaultValue="进入集合" style={{ width: 130 }} options={['进入集合', '离开集合', '属性变化跨阈值'].map(v => ({ value: v, label: v }))} />
              <Select defaultValue="「高风险订单」" style={{ flex: 1 }} options={['「高风险订单」', '「超期未发货」', 'PO.risk_score > 80'].map(v => ({ value: v, label: v }))} />
            </Space.Compact>
          </Form.Item>
        )}
        <Form.Item label="检查频率" style={{ marginBottom: 0 }}>
          <Radio.Group defaultValue="realtime" options={[{ value: 'realtime', label: '实时（变更流）' }, { value: 'minute', label: '每分钟' }, { value: 'hour', label: '每小时' }]} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

/* ─── 详情 Tab 1 · 行动定义 ─── */
function Definition() {
  const nav = useNavigate();
  return (
    <>
      <Card size="small" title="参数（Parameters）" style={{ marginBottom: 12 }}
        extra={<Text type="secondary" style={{ fontSize: 12 }}>参数来源三种：对象属性 / 人工输入 / 常量（OpenBKN value_from）</Text>}>
        <Table rowKey="name" size="small" pagination={false}
          dataSource={[
            { name: 'order', label: '目标订单', from: '对象属性', value: 'PO.order_no', required: true },
            { name: 'risk_score', label: '风险分快照', from: '对象属性', value: 'PO.risk_score', required: true },
            { name: 'reason', label: '冻结原因', from: '人工输入', value: '表单文本', required: true },
            { name: 'notify_channel', label: '通知渠道', from: '常量', value: "'feishu_scm'", required: false },
          ]}
          columns={[
            { title: '参数', dataIndex: 'name', render: v => <Text code>{v}</Text> },
            { title: '显示名', dataIndex: 'label' },
            { title: '来源', dataIndex: 'from', render: v => <Tag color={{ 对象属性: 'blue', 人工输入: 'orange', 常量: 'default' }[v as string]}>{v}</Tag> },
            { title: '取值', dataIndex: 'value', render: v => <Text code style={{ fontSize: 12 }}>{v}</Text> },
            { title: '必填', dataIndex: 'required', width: 60, render: v => v ? <Tag color="red">是</Tag> : '否' },
          ]} />
      </Card>

      <Card size="small" title="本体编辑（Edits · 一次 Action 一次事务）" style={{ marginBottom: 12 }}>
        <Table rowKey="field" size="small" pagination={false}
          dataSource={[
            { field: 'PO.status', from: '常量', value: "'FROZEN'" },
            { field: 'PO.frozen_by', from: '运行时', value: '当前用户' },
            { field: 'PO.frozen_at', from: '函数', value: 'now()' },
            { field: 'PO.risk_snapshot', from: '参数', value: 'risk_score' },
          ]}
          columns={[
            { title: '目标字段', dataIndex: 'field', render: v => <Text code>{v}</Text> },
            { title: '← 值来源', dataIndex: 'from', width: 100, render: v => <Tag>{v}</Tag> },
            { title: '值', dataIndex: 'value', render: v => <Text code style={{ fontSize: 12 }}>{v}</Text> },
          ]} />
        <Alert style={{ marginTop: 10 }} type="info" showIcon
          message="所有编辑在同一事务内提交；Agent 与外部系统不允许绕过 Action 直接写本体（Palantir 原则：Action 是唯一受治理的写入口）。" />
      </Card>

      <Card size="small" title="提交校验（Submission Criteria）" style={{ marginBottom: 12 }}>
        <List size="small"
          dataSource={[
            'risk_score > 80（不满足时表单不可提交）',
            'PO.status ∉ {已发货, 已关闭}',
            '调用者角色 ∈ {计划主管, 供应链总监}（系统管理 权限规则）',
          ]}
          renderItem={(s, i) => <List.Item style={{ padding: '6px 0' }}><Text style={{ fontSize: 13 }}>{i + 1}. <Text code style={{ fontSize: 12 }}>{s}</Text></Text></List.Item>} />
      </Card>

      <Card size="small" title="执行单元引用（实现不内嵌，引用注册中心已发布的函数/能力）" style={{ marginBottom: 12 }}>
        <Descriptions size="small" column={3}
          items={[
            { key: '1', label: '前置检查', children: <Space size={4}><Text code style={{ fontSize: 12 }}>freeze_check</Text><Tag color="green">已发布 v3</Tag></Space> },
            { key: '2', label: '回写接口', children: <Space size={4}><Text code style={{ fontSize: 12 }}>ERP.freeze_order</Text><Tag color="green">已发布 v7</Tag></Space> },
            { key: '3', label: '来源', children: <a onClick={() => nav('/apps/capabilities')}>智能应用 能力出口 →</a> },
          ]} />
      </Card>

      <Card size="small" title="副作用（Side Effects · 事务语义）" style={{ marginBottom: 12 }}>
        <Table rowKey="name" size="small" pagination={false}
          dataSource={[
            { name: '回写 Webhook · ERP 冻结接口', timing: '编辑前', tx: '事务型：失败则整个 Action 不提交', danger: true },
            { name: '站内通知 · 计划员 + 采购员', timing: '编辑后', tx: '内容基于编辑前状态渲染', danger: false },
            { name: '传播引擎重算风险链', timing: '编辑后', tx: '失败可重试，不影响已提交编辑', danger: false },
          ]}
          columns={[
            { title: '副作用', dataIndex: 'name' },
            { title: '时机', dataIndex: 'timing', width: 90, render: v => <Tag color={v === '编辑前' ? 'red' : 'blue'}>{v}</Tag> },
            { title: '语义', dataIndex: 'tx', render: (v, r) => <Text type={r.danger ? 'danger' : 'secondary'} style={{ fontSize: 12 }}>{v}</Text> },
          ]} />
        <Alert style={{ marginTop: 10 }} type="warning" showIcon
          message="每个 Action 最多配置一个事务型回写 Webhook（Palantir 约束），保证本体与业务系统不漂移。" />
      </Card>

      <Card size="small" title="执行流水线（9 步 · 全链路留痕）">
        <Steps size="small" current={4}
          items={[
            { title: '触发' }, { title: '权限校验' }, { title: '提交校验' },
            { title: <Button type="link" size="small" style={{ padding: 0 }} onClick={() => nav('/sandbox/compare')}>沙盘预览影响</Button> },
            { title: '人工确认' }, { title: '回写 ERP（事务）' }, { title: '本体编辑提交' },
            { title: '回执记录' }, { title: '副作用与传播' },
          ]} />
      </Card>
    </>
  );
}

/* ─── 详情 Tab 2 · 触发器 ─── */
function Triggers() {
  const [createOpen, setCreateOpen] = useState(false);
  return (
    <>
      <Alert style={{ marginBottom: 12 }} type="info" showIcon
        message="触发器是独立资源（参考 Palantir Automate），与行动定义解耦：同一行动可被人工、定时、事件监听等多种方式触发，条件变化只需调整触发器。" />
      <Card size="small" title="本行动的触发器" extra={<Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>新增触发器</Button>}>
        <Table rowKey="name" size="small" pagination={false}
          dataSource={[
            { name: '高风险订单出现即检', type: 'event', cond: 'PO 进入集合「风险分 > 80」', freq: '实时（变更流）', status: '启用', last: '09:30 命中 1 次' },
            { name: '每日晨检', type: 'schedule', cond: '风险分 > 75 且未处理', freq: 'CRON 0 6 * * *', status: '启用', last: '06:00 命中 1 次' },
            { name: '风险分上调', type: 'event', cond: 'PO.risk_score 属性变化跨过阈值 80', freq: '实时（变更流）', status: '停用', last: '—' },
            { name: '人工发起', type: 'manual', cond: '实例 360° / 列表页操作按钮', freq: '—', status: '启用', last: '10:17 执行 2 次' },
          ]}
          columns={[
            { title: '触发器', dataIndex: 'name', render: v => <b>{v}</b> },
            { title: '类型', dataIndex: 'type', width: 90, render: v => <Tag color={TRIGGER_TAG[v][1]}>{TRIGGER_TAG[v][0]}</Tag> },
            { title: '条件', dataIndex: 'cond', render: v => <Text code style={{ fontSize: 12 }}>{v}</Text> },
            { title: '频率', dataIndex: 'freq', width: 150, render: v => <Text className="mono" style={{ fontSize: 12 }}>{v}</Text> },
            { title: '状态', dataIndex: 'status', width: 70, render: v => <Tag color={v === '启用' ? 'green' : 'default'}>{v}</Tag> },
            { title: '最近触发', dataIndex: 'last', width: 150, render: v => <Text type="secondary" style={{ fontSize: 12 }}>{v}</Text> },
          ]} />
      </Card>
      <CreateTriggerModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  );
}

/* ─── 详情 Tab 3 · 影响声明 ─── */
function Impact() {
  const nav = useNavigate();
  return (
    <>
      <Alert style={{ marginBottom: 12 }} type="warning" showIcon
        message="影响声明在提交评审时强制校验：声明的对象类/字段必须与实际编辑、回写接口行为一致；发布后作为变更影响分析与沙盘预演的输入。" />
      <Card size="small" title="影响声明（Impact Contracts）"
        extra={<Button size="small" icon={<ExperimentOutlined />} onClick={() => nav('/sandbox/compare')}>沙盘预演影响 →</Button>}>
        <Table rowKey="obj" size="small" pagination={false}
          dataSource={[
            { obj: 'PO（采购订单）', op: 'modify', fields: 'status, frozen_by, frozen_at, risk_snapshot', desc: '冻结目标订单，写入冻结上下文' },
            { obj: 'ERP 订单（外部系统）', op: 'modify', fields: 'order_status', desc: '通过事务型 Webhook 同步冻结状态' },
            { obj: 'Delivery（交付）', op: 'modify', fields: 'risk_score（传播重算）', desc: '冻结后交付风险链重算，预计影响 3 个交付实例' },
          ]}
          columns={[
            { title: '影响对象类', dataIndex: 'obj', render: v => <b>{v}</b> },
            { title: '预期操作', dataIndex: 'op', width: 100, render: v => <Tag color="orange">{v}</Tag> },
            { title: '影响字段', dataIndex: 'fields', render: v => <Text code style={{ fontSize: 12 }}>{v}</Text> },
            { title: '说明', dataIndex: 'desc', render: v => <Text type="secondary" style={{ fontSize: 12 }}>{v}</Text> },
          ]} />
      </Card>
      <Card size="small" title="治理关联" style={{ marginTop: 12 }}>
        <Space size={16} wrap>
          <Button icon={<AuditOutlined />} onClick={() => nav('/governance/release?tab=review')}>评审记录（影响声明为评审依据）</Button>
          <Button onClick={() => nav('/governance/evolution')}>版本与回滚</Button>
          <Button onClick={() => nav('/runtime/instance-360')}>实例 360° 手动触发入口</Button>
        </Space>
      </Card>
    </>
  );
}

/* ─── 详情 Tab 4 · 执行日志 ─── */
function Logs() {
  const [filter, setFilter] = useState('全部');
  const shown = filter === '全部' ? LOGS : LOGS.filter(l => TRIGGER_TAG[l.trigger][0] === filter);
  return (
    <>
      <Card size="small" style={{ marginBottom: 12 }}>
        <Space size={40} wrap>
          <Statistic title="今日触发" value={23} />
          <Statistic title="手动 / 定时 / 事件" value="14 / 3 / 6" valueStyle={{ fontSize: 20 }} />
          <Statistic title="权限拒绝" value={8} valueStyle={{ color: '#c23b3b' }} />
          <Statistic title="执行成功" value={11} valueStyle={{ color: '#2d8a4e' }} />
          <Statistic title="回滚" value={1} valueStyle={{ color: '#c9861a' }} />
        </Space>
      </Card>
      <Card size="small" title="执行日志"
        extra={<Space size={4}>{['全部', '手动', '定时', '事件'].map(t =>
          <Tag key={t} color={filter === t ? 'blue' : 'default'} style={{ cursor: 'pointer' }} onClick={() => setFilter(t)}>{t}</Tag>)}</Space>}>
        <Table rowKey="id" size="small" dataSource={shown} pagination={false}
          columns={[
            { title: '执行 ID', dataIndex: 'id', render: v => <Text code>{v}</Text> },
            { title: '目标订单', dataIndex: 'po', render: v => <Text code>{v}</Text> },
            { title: '调用者', dataIndex: 'user' },
            { title: '触发来源', dataIndex: 'trigger', width: 100, render: v => <Tag color={TRIGGER_TAG[v][1]}>{TRIGGER_TAG[v][0]}</Tag> },
            { title: '结果', dataIndex: 'status', render: v => <Tag color={STATUS_COLOR[v]}>{v}</Tag> },
            { title: '时间', dataIndex: 'time', render: v => <Text code>{v}</Text> },
          ]} />
      </Card>
    </>
  );
}

/* ─── 主组件：列表 → 详情 ─── */
export default function ActionGateway() {
  const [selId, setSelId] = useState<string>();
  const [createOpen, setCreateOpen] = useState(false);
  const [editName, setEditName] = useState<string>();
  const [dryRun, setDryRun] = useState<ActionItem>();
  const sel = ACTIONS.find(a => a.id === selId);

  if (sel) {
    return (
      <>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => setSelId(undefined)} style={{ marginRight: 8 }} />
          <div>
            <Title level={4} style={{ margin: 0 }}>
              行动类 · {sel.name} <Tag color={STATUS_COLOR[sel.status]}>{sel.ver} {sel.status}</Tag>
            </Title>
            <Text type="secondary">
              绑定对象 <Text code>{sel.obj}</Text> · 业务动作 <Tag color="orange">{sel.op}</Tag> · 本体唯一受治理写入口
            </Text>
          </div>
          <div style={{ flex: 1 }} />
          <Button icon={<PlayCircleOutlined />} onClick={() => message.success('测试执行通过：dry-run 完成，提交校验 3/3，预计影响 1 个订单实例')}>测试执行</Button>
        </div>
        <Alert style={{ marginBottom: 12 }} type="info" showIcon
          message={<>设计融合：<b>Palantir</b>（Edits 事务 + 提交校验 + 副作用事务语义 + 独立触发器）· <b>OpenBKN</b>（执行单元引用 + 影响声明 + 触发来源日志）· <b>元枢</b>（对象方法式入口，对象详情页可直接发起）</>} />
        <Tabs items={[
          { key: 'def', label: '行动定义', children: <Definition /> },
          { key: 'trigger', label: `触发器 (${sel.triggers})`, children: <Triggers /> },
          { key: 'impact', label: '影响声明', children: <Impact /> },
          { key: 'log', label: '执行日志', children: <Logs /> },
        ]} />
      </>
    );
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>行动类（Action）</Title>
          <Text type="secondary">本体唯一受治理的写入口：触发规则 + 执行单元 + 影响声明，全链路留痕</Text>
        </div>
        <div style={{ flex: 1 }} />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditName(undefined); setCreateOpen(true); }}>新建行动类</Button>
      </div>

      <Card size="small" style={{ marginBottom: 12 }}>
        <Space size={48} wrap>
          <Statistic title="行动类" value={ACTIONS.length} suffix="个" />
          <Statistic title="已发布" value={ACTIONS.filter(a => a.status === '已发布').length} valueStyle={{ color: '#2d8a4e' }} />
          <Statistic title="今日执行" value={47} />
          <Statistic title="成功率" value={93.6} suffix="%" valueStyle={{ color: '#2d8a4e' }} />
          <Statistic title="待人工确认" value={2} valueStyle={{ color: '#c9861a' }} />
        </Space>
      </Card>

      <Card size="small">
        <Table rowKey="id" size="middle" dataSource={ACTIONS} pagination={false}
          onRow={r => ({ onClick: () => setSelId(r.id), style: { cursor: 'pointer' } })}
          columns={[
            { title: '行动类', dataIndex: 'name', render: (v, r) => <Space size={6}><b>{v}</b><Text code style={{ fontSize: 11 }}>{r.ver}</Text></Space> },
            { title: '绑定对象类', dataIndex: 'obj' },
            { title: '业务动作', dataIndex: 'op', width: 100, render: v => <Tag color={{ add: 'green', modify: 'orange', delete: 'red' }[v as string]}>{v}</Tag> },
            { title: '执行单元', dataIndex: 'unit', render: (v, r) => <Space size={4}><Tag>{r.unitKind}</Tag><Text code style={{ fontSize: 12 }}>{v}</Text></Space> },
            { title: '触发器', dataIndex: 'triggers', width: 80, render: v => <Tag color="blue">{v}</Tag> },
            { title: '状态', dataIndex: 'status', width: 90, render: v => <Tag color={STATUS_COLOR[v]}>{v}</Tag> },
            { title: '操作', key: 'ops', width: 120, render: (_, r) => <Space size={0}>
              <Button size="small" type="link" onClick={e => { e.stopPropagation(); setEditName(r.name); setCreateOpen(true); }}>编辑</Button>
              <Button size="small" type="link" icon={<ExperimentOutlined />} onClick={e => { e.stopPropagation(); setDryRun(r); }}>测试</Button>
            </Space> },
          ]} />
      </Card>
      <CreateActionDrawer open={createOpen} onClose={() => setCreateOpen(false)} editName={editName} />
      <Modal
        title={<>Dry-Run 测试 · <Text code>{dryRun?.name}</Text></>}
        open={!!dryRun} width={680} footer={<Button type="primary" onClick={() => setDryRun(undefined)}>关闭</Button>}
        onCancel={() => setDryRun(undefined)}
      >
        <Alert style={{ marginBottom: 12 }} type="warning" showIcon
          message="Dry-Run 全链路演练：真实校验、真实执行单元调用，但 Edits 不落库、副作用只模拟——对应 Palantir Action 的 dry-run 语义。" />
        <Steps
          size="small" direction="vertical"
          current={9}
          items={[
            '① 鉴权：张三（计划主管）对该对象类有 execute 权限',
            '② 参数解析：order / risk_score 取自对象属性 · reason 待人工输入',
            '③ 提交校验（Submission Criteria）：状态=已下达 ✓ · 无在途编辑 ✓',
            '④ 影响对象锁定：PO×1（modify: status, frozen_by, frozen_at）',
            '⑤ 执行单元：fn1 freeze_check → 通过',
            '⑥ Edits 事务：模拟写入 1 个对象 3 个字段（dry-run 不提交）',
            '⑦ 副作用：api2 feishu.notify 模拟调用成功（非事务）',
            '⑧ 事务型 Webhook：api1 ERP.freeze_order 模拟回写成功',
            '⑨ 审计留痕：dry-run 记录已写入 ACT-DRY-* 日志',
          ].map(t => ({ title: <span style={{ fontSize: 12.5 }}>{t}</span>, status: 'finish' as const }))}
        />
      </Modal>
    </>
  );
}
