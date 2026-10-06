import { useState } from 'react';
import { Alert, Avatar, Button, Card, Checkbox, Col, Descriptions, Form, Input, Menu, Modal, Popover, Progress, Radio, Row, Select, Space, Statistic, Steps, Table, Tag, Typography, message } from 'antd';
import { AppstoreOutlined, ArrowLeftOutlined, HistoryOutlined, PlusOutlined, TeamOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Registry from './Registry';
import Versions from './Versions';
import { FUNCS, ONTOLOGIES, ROLE_MATRIX, VERSIONS, fmtStatus, type Ontology, type OntoRole } from '../../mock/data';

const { Title, Text } = Typography;

/* ─── 新建本体向导：三种初始化路径（数据资产逆向 / 行业模板 / 空白画布） ─── */

// 可选数据资产（来自 数据资产：结构化/非结构化治理后的数据对象、推荐关系、规则、数据实体）
const ASSET_GROUPS: { group: string; hint: string; items: { id: string; name: string; meta: string }[] }[] = [
  {
    group: '数据对象', hint: '逻辑视图 / 物理表（结构化治理产物）', items: [
      { id: 'lv_order_delivery', name: 'lv_order_delivery · 订单交付视图', meta: '逻辑视图 · scm_prod · 10 字段' },
      { id: 'lv_supplier', name: 'lv_supplier · 供应商视图', meta: '逻辑视图 · mdm · 8 字段' },
      { id: 'ods_work_order', name: 'ods_work_order · 工单表', meta: '物理表 · mes_prod · 14 字段' },
      { id: 'doc_sop', name: 'SOP-订单履约手册', meta: '非结构化文档 · 已切片 46 段' },
    ],
  },
  {
    group: '推荐数据关系', hint: 'AI 从主外键/血缘/同名实体推荐', items: [
      { id: 'rel_supply', name: '供应商 → 工厂（供货）', meta: 'AI 推荐 · 置信 0.92 · 月度时序' },
      { id: 'rel_fulfills', name: '准入评估 → 采购订单（履约）', meta: 'AI 推荐 · 置信 0.87' },
      { id: 'rel_produces', name: '工厂 → 生产工单（生产）', meta: 'AI 推荐 · 置信 0.95' },
    ],
  },
  {
    group: '业务规则', hint: '治理后的口径/阈值规则', items: [
      { id: 'rule_delay', name: 'SUPPLY.delay 月均值变化>20% → 风险重算', meta: '来自指标平台口径' },
      { id: 'rule_qitao', name: '齐套率<80% → 标记风险', meta: '来自 SOP 文档解析' },
    ],
  },
  {
    group: '数据实体', hint: '主数据/维度实体', items: [
      { id: 'ent_supplier', name: '供应商主数据', meta: 'MDM · 1,204 条' },
      { id: 'ent_material', name: '物料主数据', meta: 'MDM · 36,882 条' },
    ],
  },
];

// 资产 → 本体约束结构 的映射预览
const MAPPING_ROWS = [
  { asset: 'lv_order_delivery（数据对象）', to: '单体动态对象', name: '采购订单 PO', note: '字段一一映射为属性；status 列识别为状态机（5 状态）' },
  { asset: '供应商主数据（数据实体）', to: '静态事实对象', name: '供应商 Supplier', note: 'MDM 主键作为对象标识，视图 lv_supplier 绑定' },
  { asset: '供应商 → 工厂（推荐关系）', to: '一等公民关系', name: 'SUPPLY（供应）', note: '时序属性 qty/delay/cost〔月度〕· 聚合 SUM/AVG' },
  { asset: 'SUPPLY.delay 规则（业务规则）', to: '传播规则 + 派生函数', name: '交付风险分', note: '规则表达式编译为 BKN Lang，进入函数目录' },
  { asset: 'SOP-订单履约手册（文档）', to: '知识条目', name: '履约 SOP', note: '挂接 知识运营 知识库，供推理检索引用' },
];

const TEMPLATES = [
  { id: 'scm', name: '供应链交付模板', desc: '供应商/工厂/订单/物流 + 交付风险函数包', count: '7 对象 · 4 关系 · 5 函数' },
  { id: 'quality', name: '质量追溯模板', desc: '来料-制程-出货全链追溯 + 8D 报告动作', count: '12 对象 · 9 关系 · 6 函数' },
  { id: 'equipment', name: '设备运维模板', desc: '设备/工单/备件 + 故障预测与派单动作', count: '5 对象 · 4 关系 · 3 函数' },
  { id: 'finance', name: '财务核算模板', desc: '成本中心/凭证/预算 + 归集指标包', count: '8 对象 · 5 关系 · 7 函数' },
];

function CreateWizard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<'reverse' | 'template' | 'blank'>('reverse');
  const [assets, setAssets] = useState<string[]>(['lv_order_delivery', 'rel_supply', 'rule_delay', 'ent_supplier']);
  const [tpl, setTpl] = useState('scm');
  // 资产筛选（大量资产时快速定位）
  const [akw, setAkw] = useState('');
  const [asrc, setAsrc] = useState('all');
  // AI 辅助生成（可选）：开启后才出现提示词编辑框；点下一步先跑 AI 推荐
  const [aiOn, setAiOn] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [aiRun, setAiRun] = useState(0);      // 0=未运行，1-100=进度
  const [aiStage, setAiStage] = useState('');
  const [aiApplied, setAiApplied] = useState(false);

  /** 下一步：若开启 AI 且填写了提示词，先执行 AI 推荐（耗时操作，带进度条），否则直接进入下一步 */
  const next = () => {
    if (step === 0 && aiOn && prompt.trim() && !aiApplied) {
      const stages = ['解析业务目标与范围…', '检索 数据资产并语义匹配…', '推荐初始化方式与资产清单…', '生成资产→本体映射建议…'];
      let p = 1;
      setAiRun(1);
      const timer = setInterval(() => {
        p += 6 + Math.random() * 9;
        setAiStage(stages[Math.min(3, Math.floor(p / 26))]);
        if (p >= 100) {
          clearInterval(timer);
          // 应用推荐：逆向模式 + 预选 7 项相关资产
          setMode('reverse');
          setAssets(['lv_order_delivery', 'lv_supplier', 'rel_supply', 'rel_fulfills', 'rule_delay', 'rule_qitao', 'ent_supplier']);
          setAiApplied(true);
          setAiRun(100);
          setTimeout(() => { setAiRun(0); setStep(1); }, 500);
        } else setAiRun(Math.round(p));
      }, 220);
      return;
    }
    setStep(step + 1);
  };
  const filteredGroups = ASSET_GROUPS
    .map(g => ({
      ...g,
      items: g.items.filter(i =>
        (!akw || i.name.toLowerCase().includes(akw.toLowerCase()) || i.meta.toLowerCase().includes(akw.toLowerCase())) &&
        (asrc === 'all' || g.group !== '数据对象' || i.meta.includes(asrc))),
    }))
    .filter(g => g.items.length > 0);

  const stepItems = [
    { title: '基本信息' },
    { title: '选择来源' },
    { title: mode === 'reverse' ? '映射与确认' : '内容确认' },
    { title: '成员与完成' },
  ];

  const stepSource = mode === 'reverse' ? (
    <>
      {aiApplied && (
        <Alert style={{ marginBottom: 10 }} type="success" showIcon
          message="AI 已根据你的描述完成推荐"
          description="初始化方式 = 从数据资产逆向；预选 7 项相关资产（订单交付视图、供应商视图、2 条高置信关系、2 条业务规则、供应商主数据）。可在此基础上增删。" />
      )}
      <Alert style={{ marginBottom: 10 }} type="info" showIcon
        message="从 数据资产中选择：结构化/非结构化治理后的数据对象、推荐数据关系、业务规则与数据实体，向导将把这些资产结构映射为本体约束结构（对象/关系/函数/知识）" />
      {/* 快速筛选工具条 */}
      <Space style={{ marginBottom: 10 }} wrap>
        <Input.Search allowClear placeholder="搜索资产名称 / 描述" style={{ width: 240 }} size="middle"
          onSearch={setAkw} onChange={e => !e.target.value && setAkw('')} />
        <Select value={asrc} onChange={setAsrc} style={{ width: 150 }}
          options={[{ value: 'all', label: '数据源：全部' }, ...['scm_prod', 'mdm', 'mes_prod', '文档'].map(s => ({ value: s, label: s }))]} />
        <Button size="small" type="link" onClick={() => setAssets(ASSET_GROUPS.flatMap(g => g.items.map(i => i.id)))}>全选</Button>
        <Button size="small" type="link" onClick={() => setAssets(ASSET_GROUPS.flatMap(g => g.items.filter(i => i.meta.includes('置信') && parseFloat(i.meta.split('置信 ')[1] ?? '0') >= 0.9).map(i => i.id)))}>仅选 AI 高置信（≥0.9）</Button>
        <Button size="small" type="link" danger onClick={() => setAssets([])}>清空</Button>
        <Text type="secondary" style={{ fontSize: 12 }}>已选 {assets.length} 项资产</Text>
      </Space>
      {filteredGroups.length === 0 && <Alert type="warning" showIcon message="无匹配资产，请调整筛选条件" />}
      {filteredGroups.map(g => (
        <Card key={g.group} size="small" style={{ marginBottom: 10 }}
          title={<Space>{g.group}<Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>{g.hint}</Text></Space>}
          extra={<a onClick={() => setAssets([...new Set([...assets, ...g.items.map(i => i.id)])])}>全选本组</a>}>
          <Checkbox.Group
            style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
            value={assets.filter(a => g.items.some(i => i.id === a))}
            onChange={vals => setAssets([...assets.filter(a => !g.items.some(i => i.id === a)), ...(vals as string[])])}
            options={g.items.map(i => ({
              value: i.id,
              label: <span><b>{i.name}</b> <Text type="secondary" style={{ fontSize: 12 }}>{i.meta}</Text></span>,
            }))}
          />
        </Card>
      ))}
    </>
  ) : mode === 'template' ? (
    <Row gutter={[10, 10]}>
      {TEMPLATES.map(t => (
        <Col span={12} key={t.id}>
          <Card size="small" hoverable onClick={() => setTpl(t.id)}
            style={{ borderColor: tpl === t.id ? '#059669' : undefined, boxShadow: tpl === t.id ? '0 0 0 1px #059669 inset' : undefined }}>
            <b>{t.name}</b>
            <div><Text type="secondary" style={{ fontSize: 12 }}>{t.desc}</Text></div>
            <Tag style={{ marginTop: 6 }}>{t.count}</Tag>
          </Card>
        </Col>
      ))}
    </Row>
  ) : (
    <Alert type="info" showIcon message="空白画布：仅创建本体元数据（名称/场景/成员），不包含任何对象与关系"
      description="适合业务语义尚无数据承载、需要自顶向下设计的场景。创建后可在设计器中从零建模，或通过「智能建模 · 七步法向导」逐步补齐。" />
  );

  const stepConfirm = mode === 'reverse' ? (
    <>
      <Alert style={{ marginBottom: 10 }} type="success" showIcon
        message={`AI 已将 ${assets.length} 项数据资产映射为本体约束结构，请确认（创建后均为 DRAFT，可编辑）`} />
      <Table size="small" rowKey="name" pagination={false}
        columns={[
          { title: '数据资产', dataIndex: 'asset' },
          { title: '映射为', dataIndex: 'to', width: 150, render: (v: string) => <Tag color="blue">{v}</Tag> },
          { title: '本体元素', dataIndex: 'name', render: (v: string) => <b>{v}</b> },
          { title: '说明', dataIndex: 'note', render: (v: string) => <Text type="secondary" style={{ fontSize: 12 }}>{v}</Text> },
        ]}
        dataSource={MAPPING_ROWS} />
    </>
  ) : mode === 'template' ? (
    <>
      <Alert style={{ marginBottom: 10 }} type="success" showIcon
        message={`将克隆「${TEMPLATES.find(t => t.id === tpl)!.name}」（${TEMPLATES.find(t => t.id === tpl)!.count}）为新本体草稿`} />
      <Table size="small" rowKey="n" pagination={false}
        columns={[
          { title: '将创建', dataIndex: 'n', render: (v: string) => <b>{v}</b> },
          { title: '类型', dataIndex: 't', width: 130, render: (v: string) => <Tag color="blue">{v}</Tag> },
          { title: '说明', dataIndex: 'd' },
        ]}
        dataSource={[
          { n: '供应商 / 工厂 / 物料 / 采购订单 / 生产工单…', t: '对象定义', d: '含属性、状态机与数据映射占位，需绑定你的数据源' },
          { n: 'SUPPLY / FULFILLS / PRODUCES…', t: '关系定义', d: '一等公民关系，带时序属性模板' },
          { n: '交付风险分 / 冻结订单…', t: '函数定义', d: '指标/派生/行动函数包，测试用例随模板附带' },
        ]} />
    </>
  ) : (
    <Descriptions size="small" bordered column={1}
      items={[
        { key: '1', label: '创建内容', children: '空本体（仅元数据）' },
        { key: '2', label: '后续动作', children: '进入设计器画布建模 / 七步法向导 / AI 建模助手' },
      ]} />
  );

  const stepFinish = (
    <>
      <Form layout="vertical" size="middle">
        <Form.Item label="初始成员（你将自动成为所有者）">
          <Select mode="multiple" defaultValue={['张三']} options={['张三', '王五', '孙七', '赵六'].map(u => ({ value: u, label: u }))} />
        </Form.Item>
      </Form>
      <Alert type="info" showIcon message="创建后"
        description={<Space direction="vertical" size={2} style={{ fontSize: 12 }}>
          <span>· 本体出现在本体列表与顶栏「当前本体」下拉（状态：构建中）</span>
          <span>· 所有元素为 DRAFT，经评审 + 发布门禁后进入生产</span>
          <span>· 点击「创建并进入设计器」直接开始建模</span>
        </Space>} />
    </>
  );

  const STEP_CONTENT = [
    <Form key="f" layout="vertical" size="middle">
      <Form.Item label="本体名称" required><Input placeholder="如：仓储物流本体" /></Form.Item>
      <Form.Item label="业务场景" required><Input placeholder="如：库存周转与库位优化" /></Form.Item>
      <Form.Item label="初始化方式" required>
        <Radio.Group value={mode} onChange={e => setMode(e.target.value)}
          options={[
            { value: 'reverse', label: '从数据资产逆向（推荐）' },
            { value: 'template', label: '从行业模板' },
            { value: 'blank', label: '空白画布' },
          ]} />
      </Form.Item>
      {/* AI 辅助：可选，默认手动；开启后才出现提示词编辑框 */}
      <Form.Item label="AI 辅助生成（可选）" style={{ marginBottom: aiOn ? 12 : 0 }}>
        <Radio.Group value={aiOn} onChange={e => setAiOn(e.target.value)}
          options={[{ value: false, label: '手动配置' }, { value: true, label: 'AI 辅助生成' }]} />
      </Form.Item>
      {aiOn && (
        <>
          <Form.Item label="提示词（你的想法、需求、目标、约束，越具体推荐越准）">
            <Input.TextArea rows={4} value={prompt} onChange={e => setPrompt(e.target.value)}
              placeholder="如：我们是 3C 制造企业，采购交付经常延期。希望基于 SCM 库的订单、供应商、工单数据建一个订单交付风险本体，能算交付风险分、支持冻结高风险订单，后续还要接入质量数据……" />
          </Form.Item>
          <Text type="secondary" style={{ fontSize: 12 }}>
            点击「下一步」后 AI 将分析提示词并推荐初始化方式、预选数据资产与映射建议，耗时约数秒；不填写则直接进入下一步手动配置。
          </Text>
        </>
      )}
    </Form>,
    stepSource, stepConfirm, stepFinish,
  ];

  return (
    <Modal title="新建本体" open={open} onCancel={onClose} width={1180}
      styles={{ body: { maxHeight: '68vh', overflowY: 'auto' } }}
      footer={
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>第 {step + 1} / 4 步</Text>
          <Space>
            <Button disabled={step === 0 || aiRun > 0} onClick={() => setStep(step - 1)}>上一步</Button>
            {step < 3
              ? <Button type="primary" loading={aiRun > 0} onClick={next}
                  disabled={(step === 1 && mode === 'reverse' && !assets.length) || aiRun > 0}>
                  {step === 0 && aiOn && prompt.trim() && !aiApplied ? '下一步（AI 推荐）' : '下一步'}
                </Button>
              : <Button type="primary" onClick={() => { onClose(); message.success('本体已创建（草稿态），你是所有者'); nav('/modeling/designer'); }}>创建并进入设计器</Button>}
          </Space>
        </Space>
      }>
      <div style={{ display: 'flex', gap: 20, marginTop: 8 }}>
        <Steps direction="vertical" size="small" current={step} items={stepItems} style={{ width: 130, flex: 'none' }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          {STEP_CONTENT[step]}
          {aiRun > 0 && (
            <div style={{ marginTop: 14, padding: '12px 14px', background: '#f8fbfa', borderRadius: 8 }}>
              <Progress percent={aiRun} status="active" strokeColor="#059669" />
              <Text type="secondary" style={{ fontSize: 12 }}>🤖 AI 辅助生成中：{aiStage}</Text>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

const ROLE_COLOR: Record<OntoRole, string> = { 所有者: 'gold', 建模者: 'blue', 评审者: 'purple', 查看者: 'default' };
const ONTO_ICON: Record<string, string> = { scm: '🚚', quality: '🔍', equipment: '⚙️' };

/* ──────────────────────────── 本体列表（卡片式，参考元枢） ──────────────────────────── */
export default function Ontology() {
  const nav = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [kw, setKw] = useState('');
  const list = ONTOLOGIES.filter(o => !kw || o.name.includes(kw) || o.scene.includes(kw));

  return (
    <>
      {/* 头图横幅 */}
      <div style={{ background: 'linear-gradient(90deg,#ecfdf5,#f8fbfa)', borderRadius: 10, padding: '22px 26px', marginBottom: 16, display: 'flex', alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <Title level={3} style={{ margin: 0 }}>本体列表</Title>
          <Text type="secondary" style={{ display: 'block', marginTop: 6, maxWidth: 720 }}>
            本体是企业语义的载体：提供本体设计器，支持以人机协同方式基于 AI 快速自动化构建本体，也支持手动定义、自顶向下建模。
            本体由管理员在此集中创建与授权，顶栏「当前本体」下拉即来源于此。
          </Text>
        </div>
        <Button type="primary" size="large" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>新建本体</Button>
      </div>

      <Input.Search allowClear placeholder="搜索本体（名称 / 场景）" style={{ width: 280, marginBottom: 14 }}
        onSearch={setKw} onChange={e => !e.target.value && setKw('')} />

      <Row gutter={[14, 14]}>
        {list.map(o => (
          <Col key={o.id} xs={24} sm={12} lg={8} xxl={6}>
            <Card hoverable onClick={() => nav(`/modeling/ontology/detail?onto=${o.id}`)}
              styles={{ body: { padding: '16px 18px' } }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <Avatar shape="square" size={40} style={{ background: '#ecfdf5', fontSize: 20 }}>{ONTO_ICON[o.id] ?? '🧩'}</Avatar>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b style={{ fontSize: 15 }}>{o.name}</b>
                  <div><Text type="secondary" style={{ fontSize: 12 }}>{o.scene}</Text></div>
                </div>
                <Tag color={o.status === 'DRAFT' ? 'default' : 'green'}>{o.status === 'DRAFT' ? '构建中' : '已构建'}</Tag>
              </div>
              <Space split="·" size={4} style={{ fontSize: 12, color: '#5a5a72' }}>
                <span>📦 {o.objects} 对象</span><span>🔗 {o.edges} 关系</span>
                <span>ƒ {FUNCS.length} 函数</span><span>{o.members} 成员</span>
              </Space>
              <div style={{ display: 'flex', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTop: '1px solid #f1f3f5' }}>
                <Tag color={ROLE_COLOR[o.myRole]} style={{ marginRight: 6 }}>{o.myRole}</Tag>
                <Text type="secondary" style={{ fontSize: 12 }}>更新 {o.created} · {o.version}</Text>
                <div style={{ flex: 1 }} />
                <Button size="small" type="link" onClick={e => { e.stopPropagation(); nav(`/modeling/ontology/detail?onto=${o.id}`); }}>详情 →</Button>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <CreateWizard open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  );
}

/* ──────────────────────────── 本体详情（页内二级导航，参考元枢） ──────────────────────────── */
type SecKey = 'overview' | 'objects' | 'edges' | 'funcs' | 'versions' | 'members';

export function OntologyDetail() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const o = ONTOLOGIES.find(x => x.id === sp.get('onto')) ?? ONTOLOGIES[0];
  const secParam = sp.get('sec') as SecKey | null;
  const [sec, setSec] = useState<SecKey>(secParam ?? 'overview');
  const [roleMember, setRoleMember] = useState<string>();

  const overview = (
    <>
      <Row gutter={14} style={{ marginBottom: 14 }}>
        {[
          ['对象', o.objects], ['关系', o.edges], ['函数', FUNCS.length], ['版本', VERSIONS.length],
        ].map(([label, v]) => (
          <Col span={6} key={label as string}><Card size="small"><Statistic title={label} value={v as number} /></Card></Col>
        ))}
      </Row>
      <Card size="small" title="基础信息" style={{ marginBottom: 14 }}>
        <Descriptions size="small" column={4}
          items={[
            { key: '1', label: '中文名', children: o.name },
            { key: '2', label: '业务场景', children: o.scene },
            { key: '3', label: '状态', children: <Tag color={fmtStatus(o.status)}>{o.status === 'DRAFT' ? '构建中' : '生产中'}</Tag> },
            { key: '4', label: '当前版本', children: o.version },
            { key: '5', label: '负责人', children: o.owner },
            { key: '6', label: '创建', children: o.created },
            { key: '7', label: '成员', children: `${o.members} 人` },
            { key: '8', label: '我的角色', children: <Tag color={ROLE_COLOR[o.myRole]}>{o.myRole}</Tag> },
          ]} />
      </Card>
      <Alert type="info" showIcon message="进入本体设计器的准备条件"
        description={<Space direction="vertical" size={2} style={{ fontSize: 12 }}>
          <span>① 已是该本体成员且角色为 <Tag color="blue">建模者</Tag> 及以上（查看者进入为只读模式）</span>
          <span>② 顶栏「当前本体」已选中本本体（画布、注册中心引用均作用于该上下文）</span>
          <span>③ 逆向路径需先在「数据资产 数据源中心」完成数据源注册与元数据探查</span>
        </Space>} />
    </>
  );

  const members = (
    <>
      <Card size="small" title="成员与授权" style={{ marginBottom: 14 }}>
        <Table rowKey="u" size="small" pagination={false}
          columns={[
            { title: '成员', dataIndex: 'u' },
            { title: '角色', dataIndex: 'r', width: 110, render: (v: OntoRole) => <Tag color={ROLE_COLOR[v]}>{v}</Tag> },
            { title: '加入时间', dataIndex: 't', width: 120 },
            { title: '操作', key: 'op', width: 120, render: (_: unknown, row: { u: string; r: OntoRole; t: string }) => (
              <Popover content={o.myRole !== '所有者' ? '仅「所有者」可调整成员角色' : undefined}>
                <Button size="small" type="link" disabled={o.myRole !== '所有者'} onClick={() => setRoleMember(row.u)}>调整角色</Button>
              </Popover>
            ) },
          ]}
          dataSource={[
            { u: `${o.owner}（负责人）`, r: '所有者' as OntoRole, t: o.created },
            { u: '张三', r: o.myRole, t: o.created },
            { u: '赵六', r: '评审者' as OntoRole, t: '2026-09-01' },
          ]} />
      </Card>
      <Card size="small" title="角色权限矩阵">
        <Table rowKey="cap" size="small" pagination={false}
          columns={[
            { title: '能力', dataIndex: 'cap' },
            ...(['所有者', '建模者', '评审者', '查看者'] as OntoRole[]).map(r => ({
              title: r, key: r, width: 90, align: 'center' as const,
              render: (_: unknown, row: (typeof ROLE_MATRIX)[number]) => row.roles[r] ? <Tag color="green">✓</Tag> : <Text type="secondary">—</Text>,
            })),
          ]}
          dataSource={ROLE_MATRIX} />
        <Text type="secondary" style={{ fontSize: 12 }}>
          所有角色（含无引用权限者）都能检索全量对象/关系/函数以避免重复创建；「引用到画布」要求元素 PUBLISHED 且具备引用权限。
        </Text>
      </Card>
    </>
  );

  const SEC_CONTENT: Record<SecKey, React.ReactNode> = {
    overview,
    objects: <Registry embedded tab="obj" key="obj" />,
    edges: <Registry embedded tab="edge" key="edge" />,
    funcs: <Registry embedded tab="func" key="func" />,
    versions: <Versions embedded />,
    members,
  };

  return (
    <>
      {/* 顶部操作条 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => nav('/modeling/ontology')}>返回列表</Button>
        <Title level={4} style={{ margin: 0 }}>{o.name}</Title>
        <Tag color={o.status === 'DRAFT' ? 'default' : 'green'}>{o.status === 'DRAFT' ? '构建中' : '生产中'}</Tag>
        <Tag color={ROLE_COLOR[o.myRole]}>我的角色: {o.myRole}</Tag>
        <div style={{ flex: 1 }} />
        <Space>
          <Button onClick={() => message.success('Excel 模板已解析：识别对象 3 / 关系 2，已导入草稿')}>导入 Excel</Button>
          <Button onClick={() => message.success('本体测试通过：12/12 用例')}>测试</Button>
          <Button onClick={() => nav('/sandbox/compare')}>仿真</Button>
          <Button type="primary" onClick={() => nav('/governance/release')}>发布</Button>
          <Button onClick={() => message.success('已保存')}>保存</Button>
        </Space>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        {/* 页内二级导航 */}
        <Card size="small" style={{ width: 190, flex: 'none' }} styles={{ body: { padding: 8 } }}>
          <Menu mode="inline" selectedKeys={[sec]} style={{ border: 'none' }}
            onClick={({ key }) => key === 'graph' ? nav('/modeling/designer') : setSec(key as SecKey)}
            items={[
              { key: 'overview', icon: <AppstoreOutlined />, label: '总览' },
              {
                key: 'res', label: '本体资源', children: [
                  { key: 'objects', label: `对象定义 (${o.objects})` },
                  { key: 'edges', label: `关系定义 (${o.edges})` },
                  { key: 'funcs', label: `函数定义 (${FUNCS.length})` },
                ],
              },
              { key: 'versions', icon: <HistoryOutlined />, label: '版本历史' },
              { key: 'members', icon: <TeamOutlined />, label: '成员与权限' },
              { key: 'graph', label: '本体图谱 →' },
            ]} />
        </Card>
        <div style={{ flex: 1, minWidth: 0 }}>{SEC_CONTENT[sec]}</div>
      </div>

      <Modal title={<>调整成员角色 · {roleMember}</>} open={!!roleMember} width={420} onCancel={() => setRoleMember(undefined)}
        onOk={() => { message.success(`${roleMember} 的角色已调整（成员变更将通知所有者并记入本体审计日志）`); setRoleMember(undefined); }} okText="确认调整">
        <Form layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item label="新角色">
            <Select defaultValue="评审者" options={(['所有者', '建模者', '评审者', '查看者'] as OntoRole[]).map(r => ({ value: r, label: <Tag color={ROLE_COLOR[r]}>{r}</Tag> }))} />
          </Form.Item>
          <Form.Item label="调整说明" style={{ marginBottom: 0 }}><Input.TextArea rows={2} placeholder="记录授权原因，随本体版本留痕" /></Form.Item>
        </Form>
      </Modal>
    </>
  );
}
