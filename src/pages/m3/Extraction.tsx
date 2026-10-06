import { useState } from 'react';
import { Alert, Button, Card, Col, Row, Space, Statistic, Steps, Table, Tabs, Tag, Typography, message } from 'antd';
import { CheckOutlined, CloseOutlined, MergeCellsOutlined, UploadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

/** 本体生长提案：提取时遇到本体词表之外的术语，保留原词进入提案队列（Utopia proposed_type / proposed_predicate） */
const PROPOSALS = [
  { id: 'p1', term: '战略供应商', kind: '新类', suggest: '新建类，父类 Supplier', sig: '—', evidence: '《供应商分级管理办法》§3.2', conf: 0.91 },
  { id: 'p2', term: 'strategicSupplies', kind: '新关系', suggest: '映射为 SUPPLY 的子属性', sig: 'Supplier → Material ✓', evidence: '《年度采购协议》 块 #12', conf: 0.88 },
  { id: 'p3', term: '齐套检查', kind: '新类', suggest: '新建类，父类 QualityEvent', sig: '—', evidence: '《生产执行 SOP》§5', conf: 0.76 },
  { id: 'p4', term: 'qualification_score', kind: '新属性', suggest: '挂到 Supplier 类（数值型）', sig: 'domain=Supplier ✓', evidence: '《供应商准入细则》 块 #4', conf: 0.84 },
  { id: 'p5', term: '备库协议', kind: '新类', suggest: '候选：Agreement 子类 / Contract 同义', sig: '—', evidence: '《VMI 合作备忘录》', conf: 0.57 },
];

/** 实体消歧评审对：两阈值三档（≥0.55 自动归并；0.35~0.55 新建并入队；<0.35 直接新建），宁拆勿并，合并可逆 */
const PAIRS = [
  { id: 'm1', a: '启明 X7 加速卡', b: '启明 X7 推理加速卡', sim: 0.48, route: '包含召回', status: '待裁决' },
  { id: 'm2', a: '华南仓', b: '华南中心仓', sim: 0.52, route: '别名召回', status: '待裁决' },
  { id: 'm3', a: '王氏精密', b: '王氏精密制造（东莞）', sim: 0.44, route: '包含召回', status: '待裁决' },
];

/** 事实写入的签名检查：本体是契约——主语违反 domain 且宾语符合则交换并记录，交换仍非法则谓词留空不硬造 */
const FACTS = [
  { id: 'f1', s: '华为技术', p: 'employee', o: '任正非', check: 'direction_corrected', note: '签名 employee(org→person)，主宾已交换并记录', color: 'orange' },
  { id: 'f2', s: '王氏精密', p: 'SUPPLY', o: 'MLCC-0402 电容', check: '通过', note: '签名 Supplier→Material ✓', color: 'green' },
  { id: 'f3', s: 'OpenAI', p: 'affectedBy', o: '启明 X7', check: 'domain_mismatch', note: '交换仍非法 → 谓词留空，主宾与证据保留', color: 'red' },
  { id: 'f4', s: '华南仓', p: 'located_in', o: '东莞市', check: '通过', note: '签名 Warehouse→Region ✓', color: 'green' },
];

/** 丢弃必记录：extraction_drops 的 11 类原因码 */
const DROPS = [
  { reason: 'attr_domain_mismatch', desc: '属性挂在 domain 之外的类上（沿父类 DAG 上溯后仍不符）', count: 9, note: '最昂贵：写时丢弃，改类型也无法找回，只能重新提取' },
  { reason: 'low_confidence', desc: '模型自报置信度低于阈值', count: 6, note: '' },
  { reason: 'malformed_item', desc: '单条事实畸形，只丢该条不丢整块', count: 4, note: '' },
  { reason: 'not_an_entity_name', desc: '“实体名”是整句话（按词数与限定动词判定）', count: 2, note: '' },
  { reason: 'truncated_reply', desc: '模型输出被截断，整块丢弃', count: 2, note: '' },
  { reason: 'direction_corrected', desc: '非丢弃：主宾按签名交换，记录留痕绝不静默', count: 14, note: '' },
];

/** 一致性检查：只指问题不写数据；三层处置由人决策 */
const VIOLATIONS = [
  { id: 'v1', kind: 'asymmetric', path: '王氏精密 —SUPPLY→ MLCC-0402 —SUPPLY→ 王氏精密', desc: 'SUPPLY 声明为反对称，但存在双向事实', decision: '待决策' },
  { id: 'v2', kind: 'cardinality', path: 'WO-2026103 —produced_in→ 东莞一厂 / 苏州二厂', desc: 'produced_in 声明为函数型（单值），存在两个值', decision: '待决策' },
  { id: 'v3', kind: 'derived_contradiction', path: '派生: PO20261002112 deliverable_by 10-05 ↔ 断言: 10-03', desc: '派生事实与台账断言冲突，未写入', decision: '待决策' },
];

export default function Extraction() {
  const nav = useNavigate();
  const [done, setDone] = useState<Set<string>>(new Set());
  const act = (id: string, msg: string) => { setDone(s => new Set(s).add(id)); message.success(msg); };

  const tabs = [
    {
      key: 'proposal', label: `本体提案 (${PROPOSALS.length - [...done].filter(d => d.startsWith('p')).length})`,
      children: (
        <>
          <Alert style={{ marginBottom: 12 }} type="success" showIcon
            message="本体生长闭环：提取使用本体；遇到词表外的术语保留原词进提案 → 评审入库 → 下一批语料带着扩展后的本体重新提取。提案只进草稿，永不直发。" />
          <Card size="small">
            <Table rowKey="id" size="small" pagination={false} dataSource={PROPOSALS}
              columns={[
                { title: '原词（语料中的说法）', dataIndex: 'term', render: v => <Text code>{v}</Text> },
                { title: '类别', dataIndex: 'kind', width: 90, render: v => <Tag color={({ 新类: 'blue', 新关系: 'purple', 新属性: 'cyan' } as Record<string, string>)[v]}>{v}</Tag> },
                { title: '建议映射', dataIndex: 'suggest' },
                { title: '签名检查', dataIndex: 'sig', width: 170, render: v => v === '—' ? <Text type="secondary">—</Text> : <Text code style={{ fontSize: 12 }}>{v}</Text> },
                { title: '证据', dataIndex: 'evidence', render: v => <Text type="secondary" style={{ fontSize: 12 }}>{v}</Text> },
                { title: '置信', dataIndex: 'conf', width: 70, render: v => <Text className="mono">{v}</Text> },
                {
                  title: '操作', key: 'ops', width: 150, render: (_, r) => done.has(r.id)
                    ? <Tag color="green">已处理</Tag>
                    : <Space size={0}>
                        <Button size="small" type="link" icon={<CheckOutlined />} onClick={() => act(r.id, `「${r.term}」已入库为注册中心草稿，下一批语料将按新本体重新提取`)}>采纳</Button>
                        <Button size="small" type="link" danger icon={<CloseOutlined />} onClick={() => act(r.id, '已拒绝并记录原因（拒绝原因会用于改进后续提取）')}>拒绝</Button>
                      </Space>,
                },
              ]} />
          </Card>
        </>
      ),
    },
    {
      key: 'merge', label: `实体消歧 (${PAIRS.length - [...done].filter(d => d.startsWith('m')).length})`,
      children: (
        <>
          <Alert style={{ marginBottom: 12 }} type="info" showIcon
            message="两阈值三档：相似度 ≥0.55 自动归并；0.35~0.55 新建实体并入队裁决；<0.35 直接新建不打扰。宁拆勿并——错并的代价远大于多一个实体；合并全程可逆（entity_merges 快照）；人工判定过的实体对永不再问。" />
          <Card size="small">
            <Table rowKey="id" size="small" pagination={false} dataSource={PAIRS}
              columns={[
                { title: '实体 A', dataIndex: 'a', render: v => <b>{v}</b> },
                { title: '实体 B', dataIndex: 'b', render: v => <b>{v}</b> },
                { title: '相似度', dataIndex: 'sim', width: 80, render: v => <Text className="mono">{v}</Text> },
                { title: '召回路径', dataIndex: 'route', width: 100, render: v => <Tag>{v}</Tag> },
                {
                  title: '操作', key: 'ops', width: 170, render: (_, r) => done.has(r.id)
                    ? <Tag color="green">已裁决</Tag>
                    : <Space size={0}>
                        <Button size="small" type="link" icon={<MergeCellsOutlined />} onClick={() => act(r.id, '已合并：名称进入别名、事实迁移、其余待裁决对重定向到合并目标（可撤销）')}>合并</Button>
                        <Button size="small" type="link" onClick={() => act(r.id, '保持分开：该实体对已记录，不再询问')}>保持分开</Button>
                      </Space>,
                },
              ]} />
          </Card>
        </>
      ),
    },
    {
      key: 'facts', label: '事实与签名检查',
      children: (
        <>
          <Alert style={{ marginBottom: 12 }} type="warning" showIcon
            message="本体是契约不是建议：关系带签名（domain → range）。写入时主语违反 domain 而宾语符合 → 交换并记录 direction_corrected；交换仍非法 → 谓词留空（不硬造「相关」这种假断言），主宾与证据全部保留。" />
          <Card size="small">
            <Table rowKey="id" size="small" pagination={false} dataSource={FACTS}
              columns={[
                { title: '主语', dataIndex: 's', render: v => <b>{v}</b> },
                { title: '谓词', dataIndex: 'p', render: v => <Text code style={{ fontSize: 12 }}>{v}</Text> },
                { title: '宾语', dataIndex: 'o' },
                { title: '检查结果', dataIndex: 'check', width: 160, render: (v, r) => <Tag color={r.color}>{v}</Tag> },
                { title: '说明', dataIndex: 'note', render: v => <Text type="secondary" style={{ fontSize: 12 }}>{v}</Text> },
              ]} />
          </Card>
        </>
      ),
    },
    {
      key: 'drops', label: `丢弃记录 (${DROPS.reduce((a, b) => a + b.count, 0)})`,
      children: (
        <>
          <Alert style={{ marginBottom: 12 }} type="info" showIcon
            message="丢弃必记录：提取链路上每一条被丢弃的内容都带原因码落库（extraction_drops），可计数、可回放、可定位是检索问题还是裁决问题——静默丢弃是提取系统最大的坑。" />
          <Card size="small">
            <Table rowKey="reason" size="small" pagination={false} dataSource={DROPS}
              columns={[
                { title: '原因码', dataIndex: 'reason', render: v => <Text code style={{ fontSize: 12 }}>{v}</Text> },
                { title: '含义', dataIndex: 'desc' },
                { title: '条数', dataIndex: 'count', width: 70, render: v => <Text className="mono">{v}</Text> },
                { title: '备注', dataIndex: 'note', render: v => v ? <Text type="warning" style={{ fontSize: 12 }}>{v}</Text> : <Text type="secondary">—</Text> },
              ]} />
          </Card>
        </>
      ),
    },
    {
      key: 'consistency', label: `一致性检查 (${VIOLATIONS.length})`,
      children: (
        <>
          <Alert style={{ marginBottom: 12 }} type="info" showIcon
            message="公理检查只指问题、不写数据；派生事实写入独立表（图上金色边），断言严格优先于派生。违反由人三选一处置：撤回事实 / 放宽公理（改本体）/ 接受共存。" />
          <Card size="small">
            <Table rowKey="id" size="small" pagination={false} dataSource={VIOLATIONS}
              columns={[
                { title: '类型', dataIndex: 'kind', width: 160, render: v => <Tag color="red">{v}</Tag> },
                { title: '完整路径', dataIndex: 'path', render: v => <Text code style={{ fontSize: 12 }}>{v}</Text> },
                { title: '说明', dataIndex: 'desc', render: v => <Text type="secondary" style={{ fontSize: 12 }}>{v}</Text> },
                {
                  title: '处置', key: 'ops', width: 230, render: (_, r) => done.has(r.id)
                    ? <Tag color="green">已处置</Tag>
                    : <Space size={0}>
                        <Button size="small" type="link" onClick={() => act(r.id, '已撤回该事实（撤回留痕，可恢复）')}>撤回事实</Button>
                        <Button size="small" type="link" onClick={() => act(r.id, '已放宽公理：进入本体变更评审')}>放宽公理</Button>
                        <Button size="small" type="link" onClick={() => act(r.id, '接受共存：事实与公理都保留，标记为已知例外')}>接受</Button>
                      </Space>,
                },
              ]} />
          </Card>
        </>
      ),
    },
  ];

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>语料提取 · 本体生长</Title>
          <Text type="secondary">本体设计前置步骤：非结构化语料 → 实体/关系/事实提取 → 评审入库（参考 Utopia 知识工程流水线）</Text>
        </div>
        <div style={{ flex: 1 }} />
        <Space>
          <Button icon={<UploadOutlined />} onClick={() => message.success('已加入解析队列：分块 1200 字 · 重叠 150；向量化完成即可检索，提取在后台排队')}>上传语料</Button>
          <Button type="primary" onClick={() => nav('/m3/ontology')}>提案已齐，去建本体 →</Button>
        </Space>
      </div>

      {/* 流水线：两阶段——向量化完成即可检索问答，提取后台排队；本体生长形成闭环 */}
      <Card size="small" style={{ marginBottom: 12 }}>
        <Steps size="small" current={5}
          items={[
            { title: '解析' }, { title: '分块', description: '1200 字 · 重叠 150' },
            { title: '向量化', description: '即可检索/问答' }, { title: 'LLM 抽取', description: '本体随提示词下发' },
            { title: '实体消歧', description: '两阈值三档' }, { title: '类型解析', description: '子树内自动/跨轴人审' },
            { title: '本体提案', description: '生长闭环' }, { title: '一致性检查', description: '只查不写' },
          ]} />
        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
          本体超预算时按块向量检索约 40 类 / 30 关系 / 30 属性（含命中类祖先）随提示词下发；空本体也能提取——无类型也是一种类型，不硬猜。
        </Text>
      </Card>

      <Row gutter={12} style={{ marginBottom: 12 }}>
        {[
          { t: '语料文档', v: 12, s: '份' }, { t: '分块', v: 486, s: '块' },
          { t: '提取实体', v: 138, s: '个' }, { t: '事实', v: 1204, s: '条' },
          { t: '待评审', v: 8, s: '项' }, { t: '丢弃记录', v: 35, s: '条' },
        ].map(c => <Col span={4} key={c.t}><Card size="small"><Statistic title={c.t} value={c.v} suffix={c.s} /></Card></Col>)}
      </Row>

      <Tabs items={tabs} />
    </>
  );
}
