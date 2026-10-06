import { useState } from 'react';
import { Alert, Badge, Button, Card, Checkbox, Col, Descriptions, Form, Input, List, Modal, Row, Select, Space, Statistic, Table, Tag, Tree, TreeSelect, Typography, Upload, message } from 'antd';
import { AuditOutlined, CloudSyncOutlined, FileTextOutlined, FolderOpenOutlined, ImportOutlined, PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { DataNode } from 'antd/es/tree';

const { Title, Text, Paragraph } = Typography;

/* ─── 来源体系：知识条目的四大来源（大多数来自 M1 定时任务自动生成） ─── */
type Source = '定时任务' | 'OneData' | 'CSV 导入' | '手工';
const SRC_COLOR: Record<string, string> = { 定时任务: 'blue', OneData: 'purple', 'CSV 导入': 'cyan', 手工: 'green', 表字段: 'cyan', 'KB 词条': 'default', 'AI 候选': 'orange' };
const SRC_DESC: Record<Source, string> = {
  定时任务: 'M1 数据加工 · 元数据探查流水线（每日 02:00）自动生成',
  OneData: 'OneData 指标体系定时同步（每日 02:30）',
  'CSV 导入': '人工 CSV 批量导入',
  手工: '业务专家手工维护',
};

interface KbNode {
  title: string; status: string; source: Source; onto?: string;
  data: string; flow: string; roles: string[];
  mode: string; terms: { term: string; en: string; def: string; source: string }[]; sops: string[];
}
const KB: Record<string, KbNode> = {
  po: {
    title: '采购订单', status: '已评审', source: '定时任务', onto: 'PO',
    data: 'scm_prod.purchase_order', flow: 'PROC-000062 采购订单下达', roles: ['采购员（创建）', '采购主管（审批）', '财务（超5万复核）'],
    mode: '## 业务模式 · 采购订单\n\n企业向**供应商**发出的正式采购要约，经审批后生效。\n\n- 创建：采购员按采购计划创建，关联物料与工厂\n- 审批：采购主管审批，金额 > 5 万需财务复核\n- 履约：供应商确认 → 发货 → 收货，全程回写状态机',
    terms: [
      { term: '采购订单', en: 'Purchase Order', def: '企业向供应商发出的正式采购要约，经审批后生效', source: 'KB 词条' },
      { term: '承诺交期', en: 'promise_dt', def: '供应商承诺的最晚交付时间', source: '表字段' },
      { term: '齐套率', en: 'kit_rate', def: '齐套物料行数 / 总物料行数（AI 候选 · 证据 3 条）', source: 'AI 候选' },
    ],
    sops: ['金额 > 5 万 → 财务复核', '紧急订单可走绿色通道（总监特批）', '供应商未准入 → 禁止下达采购订单', '订单状态机：草稿 → 已下达 → 已发货 → 已收货 → 已关闭'],
  },
  qualify: {
    title: '供应商准入', status: '已评审', source: 'OneData', onto: 'QualAssessment',
    data: 'mdm.supplier_qualification', flow: 'PROC-000015 供应商准入评估', roles: ['SQE（评估）', '采购主管（审批）', '质量经理（会签）'],
    mode: '## 业务模式 · 供应商准入\n\n新供应商引入前的资质与能力评估流程。\n\n- 发起：采购员提交准入申请，附资质文件\n- 评估：SQE 现场审核 + 样品验证\n- 生效：评分 ≥ 80 准入，进入合格供应商名录',
    terms: [
      { term: '准入评分', en: 'qual_score', def: '资质 30% + 产能 30% + 质量 40%（OneData 指标口径）', source: 'OneData' },
      { term: '合格供应商', en: 'approved_supplier', def: '准入评分 ≥80 且在有效期内的供应商', source: 'OneData' },
    ],
    sops: ['准入评分 < 80 → 禁止下达订单', '资质文件有效期 < 30 天 → 预警并冻结下单', '年度复审：评分下降 >10 分触发重评'],
  },
  'price-rule': {
    title: '价格审批规则', status: '待评审', source: 'CSV 导入',
    data: 'scm_prod.po_price_line', flow: 'PROC-000070 价格审批', roles: ['采购员（发起）', '成本工程师（核价）', '采购总监（终审）'],
    mode: '## 业务模式 · 价格审批\n\n采购价格的核价与分层审批。\n\n- 单价偏离基准价 >5% 触发核价\n- 金额分层：≤5万主管审批，>5万总监终审',
    terms: [{ term: '基准价', en: 'baseline_price', def: '最近一次中标价或框架协议价', source: 'KB 词条' }],
    sops: ['偏离基准价 >5% → 成本工程师核价', '单笔 > 5 万 → 总监终审'],
  },
  'demand-plan': {
    title: '需求计划', status: '已评审', source: '定时任务',
    data: 'aps_prod.demand_plan', flow: 'PROC-000003 需求计划编制', roles: ['计划员（编制）', '计划主管（评审）'],
    mode: '## 业务模式 · 需求计划\n\n滚动 13 周需求预测与计划编制。\n\n- 来源：销售预测 + 客户订单 + 安全库存补齐\n- 冻结期：未来 2 周需求冻结，变更需审批',
    terms: [
      { term: '滚动周期', en: 'rolling_weeks', def: '13 周滚动窗口，每周一刷新', source: '表字段' },
      { term: '需求冻结期', en: 'freeze_zone', def: '未来 2 周，冻结期内变更需计划主管审批', source: '定时任务' },
    ],
    sops: ['冻结期内变更 → 计划主管审批', '预测偏差 >20% → 复盘并修正模型'],
  },
  mps: {
    title: '主生产计划', status: '待评审', source: '手工',
    data: 'aps_prod.mps', flow: 'PROC-000008 主生产排程', roles: ['计划主管（编制）', '生产厂长（确认）'],
    mode: '## 业务模式 · 主生产计划\n\n需求计划展开为工厂维度的主生产计划。\n\n- 按周分解到工厂/产线\n- 产能校验：超负荷 → 外协或延期建议',
    terms: [{ term: '产能负荷率', en: 'load_rate', def: '计划工时 / 可用工时（OneData 口径）', source: '手工' }],
    sops: ['负荷率 >95% → 触发外协评估'],
  },
  'safety-stock': {
    title: '安全库存', status: '已评审', source: '定时任务', onto: 'Material',
    data: 'wms_prod.safety_stock_cfg', flow: 'PROC-000031 安全库存维护', roles: ['物控员（维护）', '计划主管（审批）'],
    mode: '## 业务模式 · 安全库存\n\n物料维度的安全库存策略与预警。\n\n- 策略：A 类物料服务水平 99%，C 类 90%\n- 低于安全库存 → 自动生成补货建议',
    terms: [
      { term: '安全库存量', en: 'safety_qty', def: '日均需求 × 补货周期 × 波动系数', source: '定时任务' },
      { term: '补货点', en: 'reorder_point', def: '安全库存 + 在途需求', source: '定时任务' },
    ],
    sops: ['库存 < 安全库存 → 自动补货建议', 'A 类物料每周复核策略参数'],
  },
  turnover: {
    title: '库存周转', status: '待评审', source: 'OneData',
    data: 'dw.dws_inventory_turn', flow: '—', roles: ['物控主管（监控）'],
    mode: '## 业务模式 · 库存周转\n\n库存周转效率的监控与改善。\n\n- 周转天数 = 平均库存 / 日均出库\n- 呆滞料：90 天无动态 → 呆滞预警',
    terms: [
      { term: '库存周转天数', en: 'turn_days', def: '平均库存金额 / 日均出库金额（OneData 指标 ID: INV_TURN_D）', source: 'OneData' },
      { term: '呆滞料', en: 'sluggish', def: '90 天无出入库动态的物料', source: 'OneData' },
    ],
    sops: ['呆滞 > 30 万 → 月度呆滞评审会处理'],
  },
  wo: {
    title: '生产工单', status: '已评审', source: '定时任务', onto: 'WO',
    data: 'mes_prod.work_order', flow: 'PROC-000101 工单下达', roles: ['计划员（下达）', '车间主任（接收）', '操作工（报工）'],
    mode: '## 业务模式 · 生产工单\n\n主生产计划分解为车间执行工单。\n\n- 状态机：待排产 → 生产中 → 已完工\n- 齐套检查通过才允许下达',
    terms: [
      { term: '工单优先级', en: 'priority', def: '1-5，交付风险高的关联订单自动 +1', source: '定时任务' },
      { term: '报工', en: 'report', def: '工序完工数量与工时的回报', source: '表字段' },
    ],
    sops: ['齐套率 <100% → 禁止下达', '优先级变更 → 通知车间主任'],
  },
  kitted: {
    title: '齐套检查', status: '待评审', source: '定时任务',
    data: 'mes_prod.kitting_check', flow: 'PROC-000102 齐套检查', roles: ['物控员（检查）'],
    mode: '## 业务模式 · 齐套检查\n\n工单下达前的物料齐套性校验。\n\n- 逐项核对 BOM 物料可用量\n- 缺料明细自动生成追料单',
    terms: [{ term: '齐套率', en: 'kit_rate', def: '齐套物料行数 / 总物料行数', source: 'AI 候选' }],
    sops: ['齐套率 <80% → SUPPLY 边标记「风险」'],
  },
  iqc: {
    title: '来料检验', status: '待评审', source: 'CSV 导入',
    data: 'qms_prod.iqc_record', flow: 'PROC-000201 来料检验', roles: ['IQC 检验员（检验）', '质量工程师（判定）'],
    mode: '## 业务模式 · 来料检验\n\n供应商来料的检验与判定。\n\n- 抽检方案：GB/T 2828.1 正常检验 II 级\n- 不合格 → MRB 评审（退/拣/让步）',
    terms: [{ term: '批合格率', en: 'lot_pass_rate', def: '合格批数 / 检验批数（月度）', source: 'KB 词条' }],
    sops: ['同供应商连续 2 批不合格 → 加严检验', 'MRB 让步接收 → 质量经理审批'],
  },
  '8d': {
    title: '8D 报告', status: '草稿', source: '手工',
    data: 'qms_prod.d8_report', flow: 'PROC-000210 8D 改善', roles: ['质量工程师（主导）', '供应商（整改）'],
    mode: '## 业务模式 · 8D 报告\n\n重大质量问题的八步改善法。\n\n- D3 围堵 → D4 根因 → D5 永久对策 → D7 预防\n- 逾期 14 天未关闭 → 升级质量总监',
    terms: [{ term: '8D 周期', en: 'd8_cycle', def: '从发起到关闭的天数，目标 ≤14 天', source: '手工' }],
    sops: ['客诉级问题 → 强制 8D', '对策验证有效才可关闭'],
  },
};

const cov = (v: number) => (
  <Badge count={`覆盖 ${v}%`} color={v >= 60 ? '#2d8a4e' : v >= 40 ? '#c9861a' : '#ff4d4f'}
    style={{ fontSize: 11, boxShadow: 'none' }} />
);
const leaf = (key: string, title: string): DataNode => ({
  key, icon: <FileTextOutlined />,
  title: <Space>{title}<Tag color={{ 已评审: 'green', 待评审: 'orange', 草稿: 'default' }[KB[key].status]} style={{ marginRight: 0 }}>{KB[key].status}</Tag></Space>,
});

const TREE: DataNode[] = [
  {
    key: 'scm', title: <Space>供应链 {cov(72)}</Space>, icon: <FolderOpenOutlined />, children: [
      {
        key: 'plan', title: <Space>计划管理 {cov(64)}</Space>, icon: <FolderOpenOutlined />, children: [
          leaf('demand-plan', '需求计划'), leaf('mps', '主生产计划'),
        ],
      },
      {
        key: 'procure', title: <Space>采购管理 {cov(81)}</Space>, icon: <FolderOpenOutlined />, children: [
          leaf('po', '采购订单'), leaf('qualify', '供应商准入'), leaf('price-rule', '价格审批规则'),
        ],
      },
      {
        key: 'inventory', title: <Space>库存管理 {cov(58)}</Space>, icon: <FolderOpenOutlined />, children: [
          leaf('safety-stock', '安全库存'), leaf('turnover', '库存周转'),
        ],
      },
    ],
  },
  {
    key: 'prod', title: <Space>生产域 {cov(45)}</Space>, icon: <FolderOpenOutlined />, children: [
      leaf('wo', '生产工单'), leaf('kitted', '齐套检查'),
    ],
  },
  {
    key: 'quality', title: <Space>质量域 {cov(31)}</Space>, icon: <FolderOpenOutlined />, children: [
      leaf('iqc', '来料检验'), leaf('8d', '8D 报告'),
    ],
  },
];

const TREE_SELECT = [
  { value: 'scm', title: '供应链', children: [
    { value: 'plan', title: '计划管理' }, { value: 'procure', title: '采购管理' }, { value: 'inventory', title: '库存管理' },
  ] },
  { value: 'prod', title: '生产域' },
  { value: 'quality', title: '质量域' },
];

export default function KnowledgeTree() {
  const nav = useNavigate();
  const [selected, setSelected] = useState('po');
  const [csvOpen, setCsvOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [odOpen, setOdOpen] = useState(false);
  const [submitted, setSubmitted] = useState<Set<string>>(new Set());
  const node = KB[selected] ? { ...KB[selected], status: submitted.has(selected) ? '评审中' : KB[selected].status } : undefined;

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>业务领域知识库</Title>
          <Text type="secondary">按业务领域组织的知识树：业务模式 / 术语口径 / SOP 与规则 / 岗位职责（M2-F02）</Text>
        </div>
        <div style={{ flex: 1 }} />
        <Space>
          <Button icon={<CloudSyncOutlined />} onClick={() => setOdOpen(true)}>OneData 同步</Button>
          <Button icon={<ImportOutlined />} onClick={() => setCsvOpen(true)}>CSV 导入</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>手动创建</Button>
        </Space>
      </div>

      {/* 来源分布：显性化「大部分知识来自 M1 定时任务」的关联 */}
      <Row gutter={12} style={{ marginBottom: 12 }}>
        {([['定时任务 · M1 自动生成', 62, 'blue', '来自 M1 数据加工流水线（元数据探查 / 收敛任务）'], ['OneData 同步', 21, 'purple', '指标口径从 OneData 每日同步'], ['CSV 导入', 9, 'cyan', '人工批量导入'], ['手工维护', 8, 'green', '业务专家维护']] as const).map(([label, pct, color, desc]) => (
          <Col span={6} key={label}>
            <Card size="small">
              <Statistic title={label} value={pct} suffix="%" valueStyle={{ color: `var(--ant-color-${color}, #059669)` }} />
              <Text type="secondary" style={{ fontSize: 11 }}>{desc}</Text>
            </Card>
          </Col>
        ))}
      </Row>
      <Alert style={{ marginBottom: 12 }} type="info" showIcon
        message={<>知识条目主要由 M1 数据资产的定时任务自动生成（元数据探查 / 隐式本体收敛），每个条目标注来源；由定时任务生成的条目可跳转 <a onClick={() => nav('/m1/processing?tab=pipeline')}>M1 数据加工流水线</a> 查看生成它的任务与调度。</>} />

      <Row gutter={12}>
        <Col span={7}>
          <Card title="业务领域" size="small">
            <Tree treeData={TREE} showIcon defaultExpandAll selectedKeys={[selected]}
              onSelect={keys => keys[0] && setSelected(String(keys[0]))} />
          </Card>
        </Col>
        <Col span={17}>
          {node ? (
            <Card size="small" style={{ marginBottom: 12 }}
              title={<Space><FileTextOutlined /> {node.title}</Space>}
              extra={<Space>
                <Tag color={{ 已评审: 'green', 待评审: 'orange', 草稿: 'default', 评审中: 'blue' }[node.status]}>{node.status}</Tag>
                {node.onto && <Tag color="blue">关联本体对象 {node.onto}</Tag>}
                {(node.status === '待评审' || node.status === '草稿') && (
                  <Button size="small" type="primary" ghost icon={<AuditOutlined />}
                    onClick={() => Modal.confirm({
                      title: `发起评审 · ${node.title}`,
                      width: 520,
                      content: (
                        <Form layout="vertical" style={{ marginTop: 12 }}>
                          <Form.Item label="评审人" required style={{ marginBottom: 12 }}>
                            <Select mode="multiple" defaultValue={['李四（供应链总监）']}
                              options={['李四（供应链总监）', '张三（数据架构师）', '赵六（质量专家）'].map(v => ({ value: v, label: v }))} />
                          </Form.Item>
                          <Form.Item label="评审说明" style={{ marginBottom: 0 }}>
                            <Input.TextArea rows={2} placeholder="说明本条目的来源、口径依据与希望评审关注的点（可选）" />
                          </Form.Item>
                        </Form>
                      ),
                      okText: '提交评审',
                      onOk: () => {
                        setSubmitted(s => new Set(s).add(selected));
                        message.success('已发起评审，评审人将收到站内通知；可在「M8 评审与发布」跟踪进度');
                      },
                    })}>发起评审</Button>
                )}
                {node.status === '评审中' && <Button size="small" onClick={() => nav('/m8/release?tab=review')}>跟踪评审进度 →</Button>}
              </Space>}>
              {/* 来源血缘：该条目是怎么来的 */}
              <Alert style={{ marginBottom: 12 }} type={node.source === '定时任务' ? 'info' : 'success'} showIcon
                message={<Space size={6}><Tag color={SRC_COLOR[node.source]}>{node.source}</Tag><span style={{ fontSize: 12 }}>{SRC_DESC[node.source]}</span></Space>}
                action={node.source === '定时任务'
                  ? <Button size="small" type="link" onClick={() => nav('/m1/processing?tab=pipeline')}>查看生成任务 →</Button>
                  : node.source === 'OneData'
                    ? <Button size="small" type="link" onClick={() => setOdOpen(true)}>同步配置 →</Button>
                    : undefined} />
              <Descriptions size="small" column={2} style={{ marginBottom: 12 }}
                items={[
                  { key: '1', label: '关联数据', children: <Text className="mono" style={{ fontSize: 12 }}>{node.data}</Text> },
                  { key: '2', label: '关联流程', children: <Text className="mono" style={{ fontSize: 12 }}>{node.flow}</Text> },
                  { key: '3', label: '岗位职责', children: <Space size={4} wrap>{node.roles.map(r => <Tag key={r}>{r}</Tag>)}</Space>, span: 2 },
                ]} />
              <Card size="small" type="inner" title="业务模式" style={{ marginBottom: 12 }}>
                <Paragraph style={{ fontSize: 13, whiteSpace: 'pre-wrap', marginBottom: 0 }}>{node.mode}</Paragraph>
              </Card>
              <Card size="small" type="inner" title="术语口径" style={{ marginBottom: 12 }}>
                <Table rowKey="term" size="small" pagination={false} dataSource={node.terms}
                  columns={[
                    { title: '术语', dataIndex: 'term', render: (v: string) => <b>{v}</b> },
                    { title: '英文/字段', dataIndex: 'en', render: (v: string) => <Text className="mono" style={{ fontSize: 12 }}>{v}</Text> },
                    { title: '口径定义', dataIndex: 'def' },
                    { title: '来源', dataIndex: 'source', width: 100, render: (v: string) => <Tag color={SRC_COLOR[v] ?? 'default'}>{v}</Tag> },
                  ] as never} />
              </Card>
              <Card size="small" type="inner" title="SOP 与规则约束">
                <List size="small" dataSource={node.sops}
                  renderItem={(item, i) => <List.Item style={{ padding: '6px 0' }}><Text style={{ fontSize: 13 }}>{i + 1}. {item}</Text></List.Item>} />
              </Card>
            </Card>
          ) : (
            <Card size="small">
              <Alert type="info" showIcon message="领域节点"
                description="该领域下包含多条知识条目，展开左侧树选择具体条目查看详情（业务模式 / 术语口径 / SOP / 岗位职责）。" />
            </Card>
          )}
        </Col>
      </Row>

      {/* OneData 同步 */}
      <Modal title="OneData 指标同步" open={odOpen} onCancel={() => setOdOpen(false)} width={720}
        onOk={() => { setOdOpen(false); message.success('已创建 OneData 同步任务：每日 02:30 增量同步，首批 12 个指标口径将进入「待评审」'); }} okText="确认同步">
        <Form layout="vertical" size="middle" style={{ marginTop: 8 }}>
          <Space.Compact block>
            <Form.Item label="OneData 服务地址" style={{ flex: 1, marginRight: 8 }}><Input defaultValue="https://onedata.corp.internal" /></Form.Item>
            <Form.Item label="凭证" style={{ flex: 1 }}><Input.Password defaultValue="mock-token-****" /></Form.Item>
          </Space.Compact>
          <Form.Item label="同步指标域">
            <Checkbox.Group defaultValue={['scm', 'inv']}
              options={[{ value: 'scm', label: '供应链指标域（准时交付率/齐套率等 8 个）' }, { value: 'inv', label: '库存指标域（周转天数/呆滞金额等 4 个）' }, { value: 'fin', label: '财务指标域（12 个）' }]} />
          </Form.Item>
          <Form.Item label="同步策略">
            <Select defaultValue="daily" style={{ width: 260 }}
              options={[{ value: 'daily', label: '每日 02:30 增量同步' }, { value: 'hourly', label: '每小时' }, { value: 'manual', label: '仅手动触发' }]} />
          </Form.Item>
        </Form>
        <Table size="small" rowKey="m" pagination={false} title={() => <b style={{ fontSize: 13 }}>同步预览（前 4 个指标）</b>}
          columns={[
            { title: '指标', dataIndex: 'm' },
            { title: 'OneData 口径', dataIndex: 'def' },
            { title: '落入知识域', dataIndex: 'kb' },
            { title: '冲突', dataIndex: 'conflict', width: 110, render: (v: string) => v === '无' ? <Tag color="green">无</Tag> : <Tag color="orange">{v}</Tag> },
          ]}
          dataSource={[
            { m: '准时交付率', def: '按期收货行数 / 应收货行数', kb: '供应链/采购管理', conflict: '无' },
            { m: '齐套率', def: '齐套物料行数 / 总物料行数', kb: '生产域/齐套检查', conflict: '已有 AI 候选，需裁决' },
            { m: '库存周转天数', def: '平均库存 / 日均出库', kb: '供应链/库存管理', conflict: '无' },
            { m: '呆滞金额', def: '90 天无动态物料金额', kb: '供应链/库存管理', conflict: '无' },
          ]} />
      </Modal>

      {/* CSV 导入 */}
      <Modal title="CSV 导入知识条目" open={csvOpen} onCancel={() => setCsvOpen(false)} width={680}
        onOk={() => { setCsvOpen(false); message.success('导入完成：新增 18 条术语口径（进入「待评审」），3 条与现有词条冲突已标记'); }} okText="开始导入">
        <Upload.Dragger beforeUpload={() => false} maxCount={1} accept=".csv" style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 28, margin: '8px 0' }}>📄</p>
          <p style={{ fontWeight: 600 }}>点击或拖拽 CSV 文件到此上传</p>
          <Text type="secondary" style={{ fontSize: 12 }}>模板列：领域路径 / 术语 / 英文字段 / 口径定义 / 类型（术语/SOP/模式）<a style={{ marginLeft: 8 }} onClick={() => {
            const csv = '领域路径,术语,英文字段,口径定义,类型\n供应链/采购,承诺交期,promise_dt,供应商承诺的到货日期,术语\n生产/齐套,齐套率,kitted_rate,齐套物料行数/总物料行数,术语\n供应链/库存,呆滞金额,obsolete_amt,90天无动态物料金额,术语';
            const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
            const a = document.createElement('a');
            a.href = url; a.download = 'kb_import_template.csv'; a.click();
            URL.revokeObjectURL(url);
            message.success('模板已下载（CSV · UTF-8 BOM）');
          }}>下载模板</a></Text>
        </Upload.Dragger>
        <Table size="small" rowKey="c" pagination={false} title={() => <b style={{ fontSize: 13 }}>字段映射</b>}
          columns={[
            { title: 'CSV 列', dataIndex: 'c', render: (v: string) => <Text className="mono" style={{ fontSize: 12 }}>{v}</Text> },
            { title: '映射到', dataIndex: 'm', render: (v: string) => <Select size="small" defaultValue={v} style={{ width: 150 }} options={[v, '忽略'].map(x => ({ value: x, label: x }))} /> },
            { title: '示例', dataIndex: 'e', render: (v: string) => <Text type="secondary" style={{ fontSize: 12 }}>{v}</Text> },
          ]}
          dataSource={[
            { c: 'domain_path', m: '领域路径', e: '供应链/采购管理' },
            { c: 'term', m: '术语', e: '承诺交期' },
            { c: 'en_field', m: '英文字段', e: 'promise_dt' },
            { c: 'definition', m: '口径定义', e: '供应商承诺的最晚交付时间' },
          ]} />
        <Alert style={{ marginTop: 10 }} type="info" showIcon message="导入后条目为「待评审」状态，与现有词条同名时标记冲突、进入 M2 知识治理裁决，不会直接覆盖" />
      </Modal>

      {/* 手动创建 */}
      <Modal title="手动创建知识条目" open={createOpen} onCancel={() => setCreateOpen(false)} width={640}
        onOk={() => { setCreateOpen(false); message.success('已创建（草稿态），提交评审后进入正式知识库'); }} okText="创建">
        <Form layout="vertical" size="middle" style={{ marginTop: 8 }}>
          <Space.Compact block>
            <Form.Item label="所属领域" required style={{ flex: 1, marginRight: 8 }}>
              <TreeSelect treeData={TREE_SELECT} defaultValue="procure" placeholder="选择领域节点" treeDefaultExpandAll />
            </Form.Item>
            <Form.Item label="知识类型" required style={{ flex: 1 }}>
              <Select defaultValue="term" options={[{ value: 'term', label: '术语口径' }, { value: 'mode', label: '业务模式' }, { value: 'sop', label: 'SOP / 规则' }, { value: 'role', label: '岗位职责' }]} />
            </Form.Item>
          </Space.Compact>
          <Space.Compact block>
            <Form.Item label="标题" required style={{ flex: 1, marginRight: 8 }}><Input placeholder="如：紧急订单" /></Form.Item>
            <Form.Item label="英文 / 字段" style={{ flex: 1 }}><Input placeholder="如：urgent_order" /></Form.Item>
          </Space.Compact>
          <Form.Item label="内容（口径定义 / 业务描述）" required>
            <Input.TextArea rows={4} placeholder="用业务语言描述口径或规则，保存后 AI 会自动关联相关数据表与本体对象" />
          </Form.Item>
          <Form.Item label="关联本体对象（可选）">
            <Select allowClear placeholder="如：采购订单 PO" options={['采购订单 PO', '供应商 Supplier', '生产工单 WO'].map(o => ({ value: o, label: o }))} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
