import { useState } from 'react';
import { Alert, Button, Card, Col, Descriptions, Drawer, Form, Input, List, Modal, Radio, Row, Select, Space, Statistic, Steps, Table, Tabs, Tag, Typography, message } from 'antd';
import { CheckCircleFilled, CloseCircleFilled, ExperimentOutlined, PlayCircleOutlined, PlusOutlined, WarningFilled } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { ok } from '../../components/proto';

const { Title, Text } = Typography;

/* ─── 规则 = 一等治理资源：草稿→评审→发布→版本，与行动类/函数同一生命周期 ─── */
interface Rule {
  id: string; name: string; kind: '一致性约束' | '推理规则' | '派生规则';
  obj: string; when: string; then: string; action?: string;
  status: '已发布' | '草稿' | '停用' | '评审中'; ver: string; fired: number;
}

const RULES: Rule[] = [
  { id: 'R-001', name: '高风险供应商传导', kind: '推理规则', obj: 'PO（采购订单）', when: 'supplier.on_time_rate < 85% 且 supplier.sole_source = true', then: '写入 PO.risk_level ≥ 高，并通知传播引擎', action: '高风险订单通知', status: '已发布', ver: 'v3', fired: 128 },
  { id: 'R-002', name: '承诺交期时序一致', kind: '一致性约束', obj: 'PO（采购订单）', when: 'promise_dt < order_dt', then: '标记违例，生成治理工单（阻断发布）', status: '已发布', ver: 'v5', fired: 17 },
  { id: 'R-003', name: '齐套率派生', kind: '派生规则', obj: 'WO（生产工单）', when: '按 BOM 层级聚合物料齐套状态', then: '计算 WO.kitted_rate 并写回派生属性', status: '已发布', ver: 'v8', fired: 4210 },
  { id: 'R-004', name: '冻结前置检查', kind: '一致性约束', obj: 'PO（采购订单）', when: 'status ∈ {已发货, 已关闭}', then: '拒绝冻结（提交校验不通过）', action: '冻结订单', status: '已发布', ver: 'v2', fired: 6 },
  { id: 'R-005', name: '安全库存联动', kind: '派生规则', obj: 'Material（物料）', when: 'turnover_days > 90 且 abc_class = A', then: '建议上调 safety_stock 并触发行动类', action: '库存水位预警回写', status: '评审中', ver: 'v1', fired: 0 },
  { id: 'R-006', name: '独家供应风险升级', kind: '推理规则', obj: 'Supplier（供应商）', when: 'sole_source = true 且 risk_level = 中', then: 'risk_level 升级为 高（多跳传播）', status: '已发布', ver: 'v4', fired: 33 },
  { id: 'R-007', name: '超期未发货预警', kind: '推理规则', obj: 'PO（采购订单）', when: 'today - order_dt > 14 天 且 status = 已下达', then: '进入集合「超期未发货」，触发晨检行动', status: '停用', ver: 'v1', fired: 0 },
  { id: 'R-008', name: '供应商准入完整性', kind: '一致性约束', obj: 'Supplier（供应商）', when: '缺准入记录 且 被 PO 引用', then: '标记 ⚠ 准入缺失（多跳链路检查）', status: '草稿', ver: 'v0.2', fired: 0 },
];

const KIND_COLOR: Record<Rule['kind'], string> = { 一致性约束: 'red', 推理规则: 'blue', 派生规则: 'purple' };
const STATUS_COLOR: Record<string, string> = { 已发布: 'green', 草稿: 'default', 停用: 'default', 评审中: 'orange' };

/* ─── 新建/编辑规则：渐进披露（条件 when → 结论 then → 校验与测试）─── */
function CreateRuleDrawer({ open, onClose, editRule }: { open: boolean; onClose: () => void; editRule?: Rule }) {
  const [kind, setKind] = useState<Rule['kind']>(editRule?.kind ?? '推理规则');
  const [thenType, setThenType] = useState('标记');
  const [conds, setConds] = useState([{ f: 'supplier.on_time_rate', op: '<', v: '85' }]);
  return (
    <Drawer title={editRule ? <>编辑规则 · <Text code>{editRule.id}</Text> {editRule.name}</> : '新建规则'} width={820} open={open} onClose={onClose}
      extra={<Space>
        <Button onClick={() => { message.success('已保存草稿（DRAFT）'); onClose(); }}>保存草稿</Button>
        <Button type="primary" onClick={() => { message.success('已提交评审（IN_REVIEW）：规则将随本体版本一起过发布门禁'); onClose(); }}>提交评审</Button>
      </Space>}>
      <Alert style={{ marginBottom: 16 }} type="info" showIcon
        message="规则与行动类、函数同构：草稿 → 评审 → 发布 → 版本化；规则结论可以链到行动类，但写入本体必须经由 Action（唯一受治理写入口）。" />

      <Card size="small" title="① 基础信息" style={{ marginBottom: 12 }}>
        <Form layout="vertical">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item label="规则名称" required style={{ marginBottom: 12 }}><Input placeholder="如：高风险供应商传导" /></Form.Item>
            <Form.Item label="绑定对象类" required style={{ marginBottom: 12 }}>
              <Select defaultValue={editRule?.obj ?? 'PO（采购订单）'} options={['PO（采购订单）', 'Supplier（供应商）', 'Material（物料）', 'WO（生产工单）', 'Delivery（交付）'].map(v => ({ value: v, label: v }))} />
            </Form.Item>
          </div>
          <Form.Item label="规则类型" style={{ marginBottom: 0 }}>
            <Radio.Group value={kind} onChange={e => setKind(e.target.value)} optionType="button"
              options={(['一致性约束', '推理规则', '派生规则'] as const).map(k => ({ value: k, label: <span><Tag color={KIND_COLOR[k]} style={{ marginRight: 4 }} />{k}</span> }))} />
          </Form.Item>
        </Form>
      </Card>

      <Card size="small" title="② 条件（when · 全部满足 AND）" style={{ marginBottom: 12 }}
        extra={<Button size="small" type="dashed" icon={<PlusOutlined />}
          onClick={() => { setConds(c => [...c, { f: 'PO.risk_score', op: '>', v: '80' }]); message.success('已追加条件行（AND 语义）'); }}>添加条件</Button>}>
        {conds.map((c, i) => (
          <Space.Compact key={i} style={{ width: '100%', marginBottom: 8 }}>
            <Select value={c.f} style={{ flex: 2 }} options={['supplier.on_time_rate', 'supplier.sole_source', 'PO.risk_score', 'PO.status', 'PO.promise_dt', 'WO.kitted_rate'].map(v => ({ value: v, label: v }))} />
            <Select value={c.op} style={{ width: 90 }} options={['<', '<=', '>', '>=', '==', '∈', '缺'].map(v => ({ value: v, label: v }))} />
            <Input defaultValue={c.v} style={{ flex: 1 }} placeholder="阈值 / 值" />
            <Button danger disabled={conds.length <= 1} onClick={() => setConds(cs => cs.filter((_, j) => j !== i))}>删</Button>
          </Space.Compact>
        ))}
        <Text type="secondary" style={{ fontSize: 12 }}>字段来自注册中心已发布对象属性；一致性约束建议覆盖时序 / 枚举 / 引用完整性。</Text>
      </Card>

      <Card size="small" title="③ 结论（then）" style={{ marginBottom: 12 }}>
        <Radio.Group value={thenType} onChange={e => setThenType(e.target.value)} style={{ marginBottom: 12 }} optionType="button"
          options={['标记', '派生写入', '触发行动类', '生成治理工单'].map(v => ({ value: v, label: v }))} />
        {thenType === '标记' && <Form.Item label="写入标记" style={{ marginBottom: 0 }}><Input defaultValue="risk_level ≥ 高" style={{ width: 320 }} /></Form.Item>}
        {thenType === '派生写入' && <Form.Item label="目标派生属性" style={{ marginBottom: 0 }}><Input defaultValue="WO.kitted_rate" style={{ width: 320 }} addonAfter="由派生函数计算" /></Form.Item>}
        {thenType === '触发行动类' && (
          <Form.Item label="链到行动类（写入仍走 Action 网关）" style={{ marginBottom: 0 }}>
            <Select defaultValue="高风险订单通知" style={{ width: 320 }} options={['高风险订单通知', '冻结订单', '库存水位预警回写', '暂停供应商准入'].map(v => ({ value: v, label: v }))} />
          </Form.Item>
        )}
        {thenType === '生成治理工单' && <Alert type="warning" showIcon style={{ marginTop: 4 }} message="命中将生成 M2 治理工单并通知规则负责人；约束类规则可阻断本体发布。" />}
      </Card>

      <Card size="small" title="④ 提交校验与测试">
        <List size="small" style={{ marginBottom: 8 }}
          dataSource={['对象类属性必须已发布（引用钉住版本）', '规则结论引用的行动类必须为 PUBLISHED', '一致性约束须先通过全量校验（0 冲突）']}
          renderItem={(s, i) => <List.Item style={{ padding: '4px 0' }}><Text style={{ fontSize: 12.5 }}>{i + 1}. {s}</Text></List.Item>} />
        <Button icon={<ExperimentOutlined />} onClick={() => message.success('测试运行：样本实例 214 万行 · 命中 33 · 误报 0 · 耗时 1.8s（dry-run 不写库）')}>测试运行（dry-run）</Button>
      </Card>
    </Drawer>
  );
}

/* ─── 单规则 dry-run 弹窗 ─── */
function RuleDryRun({ rule, onClose }: { rule: Rule | undefined; onClose: () => void }) {
  return (
    <Modal title={<>规则 Dry-Run · <Text code>{rule?.id}</Text> {rule?.name}</>} open={!!rule} width={620}
      footer={<Button type="primary" onClick={onClose}>关闭</Button>} onCancel={onClose}>
      <Alert style={{ marginBottom: 12 }} type="warning" showIcon message="真实数据求值、不写库；结论中若链到行动类，仅模拟触发。" />
      <Steps size="small" direction="vertical" current={4}
        items={[
          { title: <span style={{ fontSize: 12.5 }}>装载规则 {rule?.ver}（引用属性版本已钉住）</span>, status: 'finish' as const },
          { title: <span style={{ fontSize: 12.5 }}>扫描绑定对象类 {rule?.obj} · 214 万实例</span>, status: 'finish' as const },
          { title: <span style={{ fontSize: 12.5 }}>when 求值：命中 <b>33</b> 个实例</span>, status: 'finish' as const },
          { title: <span style={{ fontSize: 12.5 }}>then 模拟：{rule?.then}</span>, status: 'finish' as const },
          { title: <span style={{ fontSize: 12.5 }}>冲突检查：与已发布规则无矛盾</span>, status: 'finish' as const },
        ]} />
      <Table size="small" style={{ marginTop: 8 }} rowKey={(_, i) => String(i)} pagination={false}
        title={() => <Text type="secondary" style={{ fontSize: 12 }}>命中样例（前 3）</Text>}
        dataSource={[['S-0012 华兴电子', 82.1, '高'], ['S-0047 隆平机电', 79.4, '高'], ['S-0102 恒信五金', 83.8, '高']]}
        columns={[
          { title: '供应商', dataIndex: 0, render: (v: string) => <Text code style={{ fontSize: 12 }}>{v}</Text> },
          { title: 'on_time_rate', dataIndex: 1 },
          { title: '结论 risk_level', dataIndex: 2, render: (v: string) => <Tag color="red">{v}</Tag> },
        ]} />
    </Modal>
  );
}

export default function RuleReasoning() {
  const nav = useNavigate();
  const [rules, setRules] = useState(RULES);
  const [createOpen, setCreateOpen] = useState(false);
  const [editRule, setEditRule] = useState<Rule>();
  const [dry, setDry] = useState<Rule>();
  const [detail, setDetail] = useState<Rule>();
  const [filter, setFilter] = useState('全部');

  const shown = filter === '全部' ? rules : rules.filter(r => r.status === filter);

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>规则库 · 治理与推理</Title>
          <Text type="secondary">规则是一等治理资源（草稿→评审→发布→版本）· 全量校验 · 输入规则 → 输出结论（M5-F02）</Text>
        </div>
        <div style={{ flex: 1 }} />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditRule(undefined); setCreateOpen(true); }}>新建规则</Button>
      </div>

      <Card size="small" style={{ marginBottom: 12 }}>
        <Space size={40} wrap>
          <Statistic title="规则总数" value={rules.length} suffix="条" />
          <Statistic title="已发布" value={rules.filter(r => r.status === '已发布').length} valueStyle={{ color: '#2d8a4e' }} />
          <Statistic title="评审中 / 草稿" value={rules.filter(r => r.status === '评审中' || r.status === '草稿').length} valueStyle={{ color: '#c9861a' }} />
          <Statistic title="今日命中" value={47} />
          <Statistic title="违例（约束）" value={2} valueStyle={{ color: '#c23b3b' }} />
          <span style={{ flex: 1 }} />
          <Button type="primary" ghost icon={<PlayCircleOutlined />} onClick={() => ok('全量校验完成：23 条规则 × 214 万实例 · 违例 2 条（已生成治理工单）· 耗时 42s')}>▶ 运行全量校验</Button>
        </Space>
      </Card>

      <Card size="small" title="规则库"
        extra={<Space size={4}>{['全部', '已发布', '评审中', '草稿', '停用'].map(t =>
          <Tag key={t} color={filter === t ? 'blue' : 'default'} style={{ cursor: 'pointer' }} onClick={() => setFilter(t)}>{t}</Tag>)}</Space>}
        style={{ marginBottom: 16 }}>
        <Table rowKey="id" size="middle" dataSource={shown} pagination={false}
          onRow={r => ({ onClick: () => setDetail(r), style: { cursor: 'pointer' } })}
          columns={[
            { title: '规则', key: 'n', render: (_: unknown, r: Rule) => <Space size={6}><Text code style={{ fontSize: 11 }}>{r.id}</Text><b>{r.name}</b></Space> },
            { title: '类型', dataIndex: 'kind', width: 110, render: (v: Rule['kind']) => <Tag color={KIND_COLOR[v]}>{v}</Tag> },
            { title: '绑定对象类', dataIndex: 'obj', width: 150, render: v => <Text code style={{ fontSize: 12 }}>{v}</Text> },
            { title: 'when → then', key: 'expr', render: (_: unknown, r: Rule) => (
              <div style={{ fontSize: 12 }}>
                <div style={{ fontFamily: 'monospace' }}>IF {r.when}</div>
                <div style={{ fontFamily: 'monospace', color: '#5a5a72' }}>THEN {r.then}{r.action && <> · ⚡ {r.action}</>}</div>
              </div>
            ) },
            { title: '版本', dataIndex: 'ver', width: 60 },
            { title: '状态', dataIndex: 'status', width: 90, render: (v: string) => <Tag color={STATUS_COLOR[v]}>{v}</Tag> },
            { title: '命中', dataIndex: 'fired', width: 70, render: v => v > 999 ? `${(v / 1000).toFixed(1)}k` : v },
            { title: '操作', key: 'op', width: 130, render: (_: unknown, r: Rule) => (
              <Space size={0} onClick={e => e.stopPropagation()}>
                <Button size="small" type="link" icon={<ExperimentOutlined />} onClick={() => setDry(r)}>测试</Button>
                <Button size="small" type="link" onClick={() => { setEditRule(r); setCreateOpen(true); }}>编辑</Button>
                <Button size="small" type="link" danger={r.status !== '停用'}
                  onClick={() => {
                    const next = r.status === '停用' ? '已发布' : '停用';
                    setRules(rs => rs.map(x => x.id === r.id ? { ...x, status: next as Rule['status'] } : x));
                    message.success(`规则 ${r.id} 已${next === '停用' ? '停用' : '重新启用'}`);
                  }}>{r.status === '停用' ? '启用' : '停用'}</Button>
              </Space>
            ) },
          ]} />
      </Card>

      <Card
        title="全量校验结果"
        extra={<Space><Tag color="orange">警告 1</Tag><Tag color="red">违反 1</Tag></Space>}
        style={{ marginBottom: 16 }}
      >
        <List
          itemLayout="horizontal"
          dataSource={[
            {
              icon: <CheckCircleFilled style={{ color: '#2d8a4e', fontSize: 20 }} />,
              title: <span><b>一致性</b> — 对象 / 关系 / 约束 无冲突</span>,
              desc: '全量规则校验通过，未发现逻辑矛盾',
              action: null as React.ReactNode,
            },
            {
              icon: <WarningFilled style={{ color: '#c9861a', fontSize: 20 }} />,
              title: <span><b>多跳传递</b> — 链路存在 <b>2</b> 家供应商无准入记录</span>,
              desc: '命中规则 R-008（草稿）：可先在沙盘验证再发布',
              extra: <Space><Tag>供应商A</Tag>→<Tag>工厂B</Tag>→<Tag>物料C</Tag><Tag color="orange">⚠ 准入缺失</Tag></Space>,
              action: <Button size="small" onClick={() => nav('/m6/sandbox')}>沙盘验证</Button>,
            },
            {
              icon: <CloseCircleFilled style={{ color: '#ff4d4f', fontSize: 20 }} />,
              title: <span><b>约束违反</b> — <Text code>采购订单 × 17</Text> <Text code>promise_dt &lt; order_dt</Text>（时序矛盾）</span>,
              desc: '命中规则 R-002：已生成治理工单并通知负责人',
              action: <Button size="small" onClick={() => nav('/m4/instance-360')}>定位实例</Button>,
            },
          ]}
          renderItem={item => (
            <List.Item actions={item.action ? [item.action] : []}>
              <List.Item.Meta avatar={item.icon} title={item.title} description={item.desc || undefined} />
              {'extra' in item ? item.extra : null}
            </List.Item>
          )}
        />
      </Card>

      <Card title="推理示例" extra={<Text type="secondary" style={{ fontSize: 12 }}>输入规则 → 输出结论</Text>}>
        <Row gutter={16}>
          <Col span={12}>
            <Text type="secondary" style={{ fontSize: 12 }}>输入</Text>
            <pre style={{ background: '#f8fbfa', padding: 12, borderRadius: 8, fontSize: 13 }}>{`若 供应商.准时率 < 85% 且 独家供应
→ 风险等级 ≥ 高`}</pre>
          </Col>
          <Col span={12}>
            <Text type="secondary" style={{ fontSize: 12 }}>输出</Text>
            <pre style={{ background: '#f8fbfa', padding: 12, borderRadius: 8, fontSize: 13 }}>{`命中供应商 3 家
→ 写入风险标记 并通知传播引擎`}</pre>
          </Col>
        </Row>
      </Card>

      <CreateRuleDrawer open={createOpen} onClose={() => setCreateOpen(false)} editRule={editRule} />
      <RuleDryRun rule={dry} onClose={() => setDry(undefined)} />
      <Modal title={<>规则详情 · <Text code>{detail?.id}</Text></>} open={!!detail} width={640}
        footer={<Space>
          <Button icon={<ExperimentOutlined />} onClick={() => { setDry(detail); setDetail(undefined); }}>测试运行</Button>
          <Button type="primary" onClick={() => { setEditRule(detail); setDetail(undefined); setCreateOpen(true); }}>编辑规则</Button>
        </Space>}
        onCancel={() => setDetail(undefined)}>
        {detail && <>
          <Descriptions size="small" column={2} bordered style={{ marginBottom: 12 }}
            items={[
              { key: '1', label: '类型', children: <Tag color={KIND_COLOR[detail.kind]}>{detail.kind}</Tag> },
              { key: '2', label: '状态', children: <Tag color={STATUS_COLOR[detail.status]}>{detail.status}</Tag> },
              { key: '3', label: '绑定对象类', children: <Text code>{detail.obj}</Text> },
              { key: '4', label: '版本', children: detail.ver },
              { key: '5', label: '条件 when', children: <Text code style={{ fontSize: 12 }}>{detail.when}</Text> },
              { key: '6', label: '结论 then', children: <Text code style={{ fontSize: 12 }}>{detail.then}</Text> },
              { key: '7', label: '链到行动类', children: detail.action ? <Tag color="orange">⚡ {detail.action}</Tag> : '—' },
              { key: '8', label: '累计命中', children: `${detail.fired} 次` },
            ]} />
          <Tabs size="small" items={[
            { key: 'ver', label: '版本历史', children: (
              <Table size="small" rowKey="v" pagination={false}
                dataSource={[
                  { v: detail.ver, d: '2026-09-28', u: '张三', note: detail.status === '已发布' ? '当前生产版本' : '当前草稿' },
                  { v: 'v' + Math.max(1, parseInt(detail.ver.slice(1)) - 1), d: '2026-08-15', u: '张三', note: '调整阈值 90→85' },
                  { v: 'v1', d: '2026-06-02', u: '系统迁移', note: '初始导入' },
                ]}
                columns={[
                  { title: '版本', dataIndex: 'v', width: 70, render: (v: string) => <Text code>{v}</Text> },
                  { title: '时间', dataIndex: 'd', width: 110 },
                  { title: '操作人', dataIndex: 'u', width: 100 },
                  { title: '说明', dataIndex: 'note' },
                ]} />
            ) },
            { key: 'hit', label: '命中统计', children: (
              <Space size={32}>
                <Statistic title="近 7 日" value={detail.fired ? Math.round(detail.fired / 5) : 0} suffix="次" />
                <Statistic title="近 30 日" value={detail.fired} suffix="次" />
                <Statistic title="平均耗时" value={1.8} suffix="s" precision={1} />
              </Space>
            ) },
          ]} />
        </>}
      </Modal>
    </>
  );
}
