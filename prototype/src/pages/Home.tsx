import { useState } from 'react';
import { Card, Col, Row, Space, Statistic, Table, Tabs, Tag, Typography } from 'antd';
import { ArrowDownOutlined, ArrowUpOutlined, CheckCircleFilled, ExperimentOutlined, QuestionCircleOutlined, RightOutlined, SearchOutlined, SlidersOutlined } from '@ant-design/icons';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { REVIEWS } from '../mock/data';
import { PERSONAS, type ShellCtx } from '../layouts/AppShell';

const { Title, Text, Paragraph } = Typography;

interface Stage { no: number; title: string; desc: string; actions: { name: string; optional?: boolean; desc: string; to: string; done?: boolean }[] }

const STAGES: Stage[] = [
  { no: 1, title: '环境准备', desc: '准备用户权限与模型能力', actions: [
    { name: '配置用户与权限', desc: '配置用户、角色和操作权限，建立可审计的协作边界。', to: '/admin/org?tab=users', done: true },
    { name: '配置模型服务', desc: '设置默认大模型与本地小模型，支撑语义理解与抽取。', to: '/admin/settings' },
  ]},
  { no: 2, title: '数据准备', desc: '接入业务数据并沉淀为数据资产', actions: [
    { name: '注册数据源', desc: '建立平台访问业务数据的连接并完成连通性验证。', to: '/assets/sources', done: true },
    { name: '执行元数据探查', desc: '将库表结构与字段备注同步为数据资产画像。', to: '/assets/sources?tab=profile', done: true },
    { name: '隐式本体收敛', optional: true, desc: '把表命名、指标口径、血缘识别为本体碎片并候选化。', to: '/knowledge/governance?tab=convergence' },
    { name: '构建逻辑视图', optional: true, desc: '在联邦层沉淀跨源视图，对象绑定视图而非裸表。', to: '/assets/logical-view' },
  ]},
  { no: 3, title: '本体建模', desc: '组织业务语义并配置可调用能力', actions: [
    { name: '七步法建模向导', desc: '从范围、术语到约束，方法论引导完成最小可行本体。', to: '/modeling/ai-modeling?tab=wizard' },
    { name: '配置对象与关系', desc: '定义业务对象、一等公民关系及其数据映射。', to: '/modeling/designer' },
    { name: '配置函数与行动', optional: true, desc: '指标/派生/行动/权限四类函数，固化业务度量与动作。', to: '/runtime/rules?tab=action' },
    { name: '组织知识库', optional: true, desc: '按业务领域组织术语、口径与 SOP，收敛隐式知识。', to: '/knowledge/tree' },
  ]},
  { no: 4, title: '验证与交付', desc: '验证效果并开放调用', actions: [
    { name: '数据绑定与同步', desc: '将本体对象实例化，绑定联邦层视图并持续同步。', to: '/runtime/binding' },
    { name: '语义查询验证', desc: '用业务语言提问，验证本体语义是否正确表达。', to: '/reasoning/workbench?tab=query' },
    { name: '沙盘推演验证', optional: true, desc: '在克隆世界中验证行动效果，生产隔离。', to: '/sandbox/compare' },
    { name: '评审与发布', desc: '评审 + 发布门禁（K 等级），通过后上线。', to: '/governance/release' },
    { name: '开放能力调用', desc: 'MCP/REST/CLI 统一出口，供智能体与系统调用。', to: '/apps/capabilities' },
  ]},
];

const AI_SKILLS = [
  { no: 1, name: '需求澄清 Skill：ent-requirement', scene: '访谈纪要、PRD、流程说明或初步想法尚未整理，需要先明确业务目标、范围、规则和验收标准。', output: '场景中心 PRD、验收用例和建模交接摘要。' },
  { no: 2, name: '本体设计 Skill：ent-ontology-builder', scene: '已有 PRD、流程说明或业务材料，需要在正式创建前确认本体如何表达业务语义。', output: '业务可评审的本体建模方案，明确对象、关系、指标和行动设计。' },
  { no: 3, name: '本体构建 & 验证 Skill：ent-creator', scene: '已确认需求或建模方案，需要创建、更新、绑定数据、校验、测试、发布或根据反馈持续改进。', output: '可运行的本体、数据绑定与校验结果、交付报告。' },
];

/* ─── 管理层首页：管辖范围内的运营看板 + 待办审批 + 分析工具入口 ─── */
function ManagerHome() {
  const nav = useNavigate();
  return (
    <>
      <div style={{ background: 'linear-gradient(90deg,#ecfdf5,#f8fbfa)', borderRadius: 10, padding: '24px 28px', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>早上好，李四</Title>
        <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
          供应链总监 · 管辖范围：供应链域（采购 / 库存 / 物流）· 3 个本体 · 12 个数据资产域
        </Paragraph>
      </div>

      {/* 管辖范围运营看板 */}
      <Row gutter={12} style={{ marginBottom: 12 }}>
        {[
          { t: '数据资产', v: 86, s: '张表 · 12 逻辑视图', extra: '探查覆盖 91%', to: '/assets/sources' },
          { t: '本体运营', v: '21,254', s: '周调用次数', extra: '3 本体 · v0.3 生产中', to: '/modeling/ontology' },
          { t: '知识库', v: 214, s: '知识条目', extra: '领域覆盖 72%', to: '/knowledge/tree' },
          { t: '指标建设', v: 38, s: '项指标', extra: '达成率 84%', to: '/reasoning/workbench?tab=query' },
        ].map(c => (
          <Col span={6} key={c.t}>
            <Card size="small" hoverable onClick={() => nav(c.to)}>
              <Statistic title={c.t} value={c.v} suffix={<span style={{ fontSize: 13, fontWeight: 400, color: '#5a5a72' }}> {c.s}</span>} />
              <Text type="secondary" style={{ fontSize: 12 }}>{c.extra}</Text>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={12} style={{ marginBottom: 12 }}>
        {/* 指标达成 */}
        <Col span={14}>
          <Card size="small" title="关键指标达成（管辖范围）" extra={<a onClick={() => nav('/reasoning/workbench?tab=query')}>语义问答深入分析 →</a>}>
            <Table size="small" rowKey="m" pagination={false}
              columns={[
                { title: '指标', dataIndex: 'm', render: (v: string) => <b>{v}</b> },
                { title: '目标', dataIndex: 'target', width: 90 },
                { title: '当前', dataIndex: 'cur', width: 90 },
                {
                  title: '趋势', key: 'trend', width: 110, render: (_: unknown, r: { m: string; target: string; cur: string; bad?: boolean; by: string }) =>
                    r.bad
                      ? <Tag color="red" icon={<ArrowDownOutlined />}>未达成</Tag>
                      : <Tag color="green" icon={<ArrowUpOutlined />}>达成</Tag>,
                },
                { title: '支撑本体/函数', dataIndex: 'by', render: (v: string) => <Text type="secondary" style={{ fontSize: 12 }}>{v}</Text> },
              ]}
              dataSource={[
                { m: '准时交付率', target: '95%', cur: '92.3%', bad: true, by: '供应链本体 · SUPPLY.delay' },
                { m: '齐套率', target: '98%', cur: '96.1%', bad: true, by: '生产域 · 齐套检查规则' },
                { m: '库存周转天数', target: '≤35 天', cur: '38 天', bad: true, by: '库存域 · turn_days' },
                { m: '8D 关闭周期', target: '≤14 天', cur: '11 天', bad: false, by: '质量追溯本体' },
                { m: '高风险订单处置时长', target: '≤4h', cur: '2.6h', bad: false, by: '冻结订单 Action' },
              ]} />
          </Card>
        </Col>
        {/* 待处理审批（下级提交） */}
        <Col span={10}>
          <Card size="small" title={<>待处理审批 <Tag color="red">4</Tag></>} extra={<a onClick={() => nav('/governance/release?tab=review')}>全部 →</a>}>
            {REVIEWS.map(r => (
              <div key={r.id} onClick={() => nav('/governance/release?tab=review')}
                style={{ padding: '10px 4px', borderTop: '1px solid #f1f3f5', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</div>
                  <Text type="secondary" style={{ fontSize: 12 }}>{r.from} 提交 · {r.type} · SLA {r.sla}</Text>
                </div>
                <Tag color={r.status === '待评审' ? 'blue' : 'orange'}>{r.status}</Tag>
              </div>
            ))}
            <div style={{ padding: '10px 4px', borderTop: '1px solid #f1f3f5', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
              onClick={() => nav('/governance/release?tab=review')}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>供应商准入规则变更：评分阈值 80→82</div>
                <Text type="secondary" style={{ fontSize: 12 }}>王五 提交 · 规则变更 · SLA 剩 6 小时</Text>
              </div>
              <Tag color="blue">待评审</Tag>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 分析工具快捷入口 */}
      <Row gutter={12}>
        {[
          { icon: <QuestionCircleOutlined />, t: '智能问答', d: '用业务语言提问：本月华南区交付风险最高的 10 个订单？', to: '/reasoning/workbench?tab=query' },
          { icon: <SearchOutlined />, t: '推理演绎', d: '多跳推理：供应商断供会影响哪些订单与产线？', to: '/reasoning/workbench?tab=rule' },
          { icon: <ExperimentOutlined />, t: '推演沙盘', d: '克隆世界模拟：切换备选供应商后风险分如何变化？', to: '/sandbox/compare' },
          { icon: <SlidersOutlined />, t: '实例 360°', d: '下钻任意订单/供应商实例的完整事实与传播链', to: '/runtime/instance-360' },
        ].map(c => (
          <Col span={6} key={c.t}>
            <Card size="small" hoverable onClick={() => nav(c.to)}>
              <Space align="start">
                <span style={{ fontSize: 18, color: '#059669' }}>{c.icon}</span>
                <div>
                  <b>{c.t}</b>
                  <div><Text type="secondary" style={{ fontSize: 12 }}>{c.d}</Text></div>
                </div>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>
    </>
  );
}

/* ─── 构建者首页：构建引导旅程 ─── */
export default function Home() {
  const nav = useNavigate();
  const { persona } = useOutletContext<ShellCtx>();
  const [stage, setStage] = useState(2); // 当前进行中的阶段
  const cur = STAGES[stage];

  if (persona === 'manager') return <ManagerHome />;
  const me = PERSONAS[persona];

  const manual = (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {STAGES.map((s, i) => (
          <Card key={s.no} hoverable onClick={() => setStage(i)}
            style={{ borderColor: i === stage ? '#059669' : undefined, boxShadow: i === stage ? '0 0 0 1px #059669 inset' : undefined }}
            styles={{ body: { padding: '14px 16px' } }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                width: 22, height: 22, borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                background: i < stage ? '#2d8a4e' : i === stage ? '#059669' : '#e2e4e9', color: '#fff', fontSize: 12, fontWeight: 600,
              }}>{i < stage ? <CheckCircleFilled /> : s.no}</span>
              <b>{s.title}</b>
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>{s.desc}</Text>
          </Card>
        ))}
      </div>
      <Card title={<b>本阶段操作 · {cur.title}</b>} styles={{ body: { paddingTop: 4 } }}>
        <Paragraph type="secondary" style={{ fontSize: 12 }}>{cur.desc}。以下操作按顺序完成，可选步骤按需执行。</Paragraph>
        {cur.actions.map((a, i) => (
          <div key={a.name} onClick={() => nav(a.to)}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 8px', borderTop: i ? '1px solid #f1f3f5' : undefined, cursor: 'pointer' }}>
            <span style={{ width: 20, height: 20, borderRadius: '50%', border: '1px solid #cbd5e1', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#5a5a72' }}>{i + 1}</span>
            <div style={{ flex: 1 }}>
              <span style={{ fontWeight: 600 }}>{a.name}</span>
              {a.optional && <Tag style={{ marginLeft: 8 }}>可选</Tag>}
              {a.done && <Tag color="success" style={{ marginLeft: 8 }}>已完成</Tag>}
              <div><Text type="secondary" style={{ fontSize: 12 }}>{a.desc}</Text></div>
            </div>
            <RightOutlined style={{ color: '#6b7688' }} />
          </div>
        ))}
      </Card>
    </>
  );

  const ai = (
    <Card title={<b>AI Skills 辅助构建本体</b>} extra={<a onClick={() => nav('/modeling/designer')}>进入 AI 协作建模（设计器右栏）→</a>}>
      <Paragraph type="secondary" style={{ fontSize: 12 }}>
        从业务材料出发，使用 AI Skills 完成需求澄清、设计和构建验证，形成可持续迭代的企业本体。
      </Paragraph>
      {AI_SKILLS.map(s => (
        <div key={s.no} style={{ display: 'flex', gap: 12, padding: '14px 8px', borderTop: s.no > 1 ? '1px solid #f1f3f5' : undefined }}>
          <span style={{ width: 20, height: 20, borderRadius: '50%', border: '1px solid #cbd5e1', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#5a5a72', flexShrink: 0 }}>{s.no}</span>
          <div style={{ flex: 1 }}>
            <b>{s.name}</b>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 6 }}>
              <div><Text type="secondary" style={{ fontSize: 12 }}>适用场景</Text><div style={{ fontSize: 12 }}>{s.scene}</div></div>
              <div><Text type="secondary" style={{ fontSize: 12 }}>主要产物</Text><div style={{ fontSize: 12 }}>{s.output}</div></div>
            </div>
          </div>
        </div>
      ))}
    </Card>
  );

  return (
    <>
      <div style={{ background: 'linear-gradient(90deg,#ecfdf5,#f8fbfa)', borderRadius: 10, padding: '24px 28px', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>早上好，{me.name}</Title>
        <Paragraph type="secondary" style={{ marginTop: 8, maxWidth: 900 }}>
          欢迎使用 entKnow。以本体驱动构建企业知识网络，统一组织企业的数据、逻辑、行动与风险，
          让智能体的创造性与企业业务的确定性相结合，支撑准确、安全、可靠的分析、执行与决策。
        </Paragraph>
      </div>
      <Card styles={{ body: { paddingTop: 8 } }}>
        <Tabs items={[
          { key: 'ai', label: 'AI 辅助构建', children: ai },
          { key: 'manual', label: '手动构建', children: manual },
        ]} />
      </Card>
    </>
  );
}
