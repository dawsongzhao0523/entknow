import { useEffect, useState } from 'react';
import { Card, Tag, Tabs, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { CheckCircleFilled, RightOutlined } from '@ant-design/icons';
import { api } from '../api';
import { useSession } from '../session';

const { Title, Paragraph, Text } = Typography;

function greeting() {
  const h = new Date().getHours();
  if (h < 6) return '夜深了';
  if (h < 12) return '早上好';
  if (h < 14) return '中午好';
  if (h < 18) return '下午好';
  return '晚上好';
}

const AI_SKILLS = [
  { no: 1, name: '需求澄清 Skill：ent-requirement', scene: '访谈纪要、PRD、流程说明或初步想法尚未整理，需要先明确业务目标、范围、规则和验收标准。', output: '场景中心 PRD、验收用例和建模交接摘要。' },
  { no: 2, name: '本体设计 Skill：ent-ontology-builder', scene: '已有 PRD、流程说明或业务材料，需要在正式创建前确认本体如何表达业务语义。', output: '业务可评审的本体建模方案，明确对象、关系、指标和行动设计。' },
  { no: 3, name: '本体构建 & 验证 Skill：ent-creator', scene: '已确认需求或建模方案，需要创建、更新、绑定数据、校验、测试、发布或根据反馈持续改进。', output: '可运行的本体、数据绑定与校验结果、交付报告。' },
];

interface StageAction { name: string; desc: string; to: string; optional?: boolean; done?: boolean }
interface Stage { no: number; title: string; desc: string; actions: StageAction[]; complete?: boolean }

/** 首页：构建引导旅程（对齐原型 BuilderHome——AI 辅助 | 手动构建 四阶段） */
export default function Home() {
  const nav = useNavigate();
  const { user, prefs, prefsLoaded } = useSession();
  const [stages, setStages] = useState<Stage[]>([]);
  const [stage, setStage] = useState(0);
  const [me, setMe] = useState<string>('');

  useEffect(() => {
    if (prefsLoaded && prefs.landingPage && !sessionStorage.getItem('entknow.landed')) {
      sessionStorage.setItem('entknow.landed', '1');
      nav('/' + prefs.landingPage);
    }
  }, [prefsLoaded, prefs.landingPage, nav]);

  useEffect(() => {
    Promise.all([
      api.users(), api.datasources(), api.viewsList(), api.candidates(),
      api.kbEntries(), api.synonyms(), api.objects(), api.functions(),
      api.bindings(), api.queries(), api.sandboxBranches(), api.reviews(), api.capabilities(),
    ]).then(([users, dss, views, cands, kbs, syns, objs, funcs, bds, qs, brs, rvs, caps]) => {
      const u = users.find(x => x.account === user);
      setMe(u?.name ?? user);
      const n = (a: unknown[]) => a.length;
      const st: Stage[] = [
        { no: 1, title: '连接数据资产', desc: '把数据接入并理解', actions: [
          { name: '注册数据源', desc: '结构化库表 / 非结构化文档库统一注册。', to: '/assets/datasources', done: n(dss) > 0 },
          { name: '元数据探查', desc: '自动画像与关联推荐，形成数据资产地图。', to: '/assets/datasources', optional: true, done: n(dss) > 0 },
          { name: '隐式本体收敛', desc: '把表命名、指标口径、血缘识别为本体碎片并候选化。', to: '/knowledge/convergence', optional: true, done: n(cands) > 0 },
          { name: '构建逻辑视图', desc: '在联邦层沉淀跨源视图，对象绑定视图而非裸表。', to: '/assets/views', optional: true, done: n(views) > 0 },
        ]},
        { no: 2, title: '组织知识', desc: '沉淀领域知识与术语', actions: [
          { name: '业务领域知识库', desc: '按业务领域组织术语、口径与 SOP。', to: '/knowledge/entries', done: n(kbs) > 0 },
          { name: '同义词治理', desc: '统一表达，跨源同义与近义归并。', to: '/knowledge/synonyms', done: n(syns) > 0 },
        ]},
        { no: 3, title: '本体建模', desc: '组织业务语义并配置可调用能力', actions: [
          { name: '七步法建模向导', desc: '从范围、术语到约束，方法论引导完成最小可行本体。', to: '/modeling/ai-modeling' },
          { name: '配置对象与关系', desc: '定义业务对象、一等公民关系及其数据映射。', to: '/modeling/designer', done: n(objs) > 0 },
          { name: '配置函数与行动', desc: '指标/派生/行动/权限四类函数。', to: '/runtime/rules', optional: true, done: n(funcs) > 0 },
          { name: '组织知识库', desc: '按业务领域组织术语、口径与 SOP。', to: '/knowledge/entries', optional: true, done: n(kbs) > 0 },
        ]},
        { no: 4, title: '验证与交付', desc: '验证效果并开放调用', actions: [
          { name: '数据绑定与同步', desc: '将本体对象实例化并持续同步。', to: '/runtime/binding', done: n(bds) > 0 },
          { name: '语义查询验证', desc: '用业务语言提问验证本体语义。', to: '/reasoning/query', done: n(qs) > 0 },
          { name: '沙盘推演验证', desc: '在克隆世界中验证行动效果。', to: '/sandbox/compare', optional: true, done: n(brs) > 0 },
          { name: '评审与发布', desc: '评审 + 发布门禁，通过后上线。', to: '/governance/reviews', done: n(rvs) > 0 },
          { name: '开放能力调用', desc: 'MCP/REST/CLI 统一出口。', to: '/apps/capabilities', done: n(caps) > 0 },
        ]},
      ];
      st.forEach(s => { s.complete = s.actions.filter(a => !a.optional).every(a => a.done); });
      setStages(st);
      const first = st.findIndex(s => !s.complete);
      setStage(first === -1 ? st.length - 1 : first);
    }).catch(() => setStages([]));
  }, [user]);

  const cur = stages[stage];

  const manual = stages.length > 0 && (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {stages.map((s, i) => (
          <Card key={s.no} hoverable onClick={() => setStage(i)}
            style={{ borderColor: i === stage ? '#059669' : undefined, boxShadow: i === stage ? '0 0 0 1px #059669 inset' : undefined }}
            styles={{ body: { padding: '14px 16px' } }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                width: 22, height: 22, borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                background: s.complete ? '#2d8a4e' : i === stage ? '#059669' : '#e2e4e9',
                color: '#fff', fontSize: 12, fontWeight: 600,
              }}>{s.complete ? <CheckCircleFilled /> : s.no}</span>
              <b>{s.title}</b>
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>{s.desc}</Text>
          </Card>
        ))}
      </div>
      {cur && (
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
      )}
    </>
  );

  const ai = (
    <Card title={<b>AI Skills 辅助构建本体</b>} extra={<a onClick={() => nav('/modeling/designer')}>进入建模画布 →</a>}>
      <Paragraph type="secondary" style={{ fontSize: 12 }}>
        从业务材料出发，使用 AI Skills 完成需求澄清、设计和构建验证，形成可持续迭代的企业本体。
        （LLM 在线对话为后续提案，当前进入确定性建模工具链）
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
        <Title level={3} style={{ margin: 0 }}>{greeting()}，{me || user}</Title>
        <Paragraph type="secondary" style={{ marginTop: 8, maxWidth: 900, marginBottom: 0 }}>
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
