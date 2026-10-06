import React, { useMemo, useRef, useState } from 'react';
import { Alert, Button, Card, Input, Modal, Radio, Segmented, Select, Space, Table, Tabs, Tag, Tooltip, Tree, Typography, message } from 'antd';
import { PlusOutlined, SaveOutlined, VerticalLeftOutlined, VerticalRightOutlined, VerticalAlignBottomOutlined, WarningOutlined } from '@ant-design/icons';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { OBJECTS, EDGES, FUNCS, REGISTRY_OBJECTS, REGISTRY_TREE, filterRegistry, fmtStatus, type ObjKind, type RegistryObject } from '../../mock/data';
import { ObjectDetailDrawer } from './Registry';
import type { ShellCtx } from '../../layouts/AppShell';

const { Title, Text } = Typography;

const KINDS: ObjKind[] = ['静态事实', '单体动态', '立方动态'];

// ─── 画布数据（mock，后续迁移 React Flow）─────────────────────────
interface CNode { id: string; icon: string; color: string; en: string; lines: [string, string][] }
const CANVAS_NODES: CNode[] = [
  { id: '供应商', icon: '🏢', color: '#059669', en: 'Supplier', lines: [['类型', '静态事实'], ['出边', 'SUPPLY·QUALIFIES']] },
  { id: '工厂', icon: '🏭', color: '#059669', en: 'Plant', lines: [['类型', '静态事实'], ['出边', 'PRODUCES']] },
  { id: '准入评估', icon: '🛡', color: '#059669', en: 'QualAssessment', lines: [['类型', '单体动态'], ['出边', 'FULFILLS']] },
  { id: '采购订单', icon: '📄', color: '#ea580c', en: 'PO ⚡', lines: [['类型', '单体动态'], ['状态机', '5 状态'], ['交付风险分', '派生函数']] },
];
const CANVAS_EDGES: { id: string; from: string; to: string; label: React.ReactNode }[] = [
  { id: 'e1', from: '供应商', to: '工厂', label: <><b>SUPPLY（供应）</b><br />供货量 / 时延 / 成本〔时序·月度〕</> },
  { id: 'e2', from: '供应商', to: '准入评估', label: 'QUALIFIES（准入）' },
  { id: 'e4', from: '工厂', to: '采购订单', label: 'PRODUCES' },
  { id: 'e3', from: '准入评估', to: '采购订单', label: 'FULFILLS' },
];
// 三套布局：分层 / 横向 / 纵向（坐标系 1100×560）
const LAYOUTS: Record<string, Record<string, [number, number]>> = {
  分层: { 供应商: [230, 60], 工厂: [800, 60], 准入评估: [230, 350], 采购订单: [800, 350] },
  横向: { 供应商: [30, 230], 准入评估: [330, 230], 采购订单: [630, 230], 工厂: [920, 230] },
  纵向: { 供应商: [475, 16], 准入评估: [475, 152], 采购订单: [475, 288], 工厂: [475, 424] },
};
const NODE_W = 150, NODE_H = 96;
const center = (p: [number, number]): [number, number] => [p[0] + NODE_W / 2, p[1] + NODE_H / 2];

const nodeStyle = (x: number, y: number, color: string, dim: boolean, sel: boolean): React.CSSProperties => ({
  position: 'absolute', left: `${(x / 1100) * 100}%`, top: `${(y / 560) * 100}%`,
  width: NODE_W, background: '#fff', border: `1px solid ${sel ? '#059669' : '#dbe4f0'}`, borderRadius: 10,
  padding: '10px 12px', boxShadow: sel ? '0 0 0 2px rgba(59,130,246,.25)' : '0 1px 3px rgba(15,23,42,.08)',
  borderTop: `3px solid ${color}`, cursor: 'pointer', opacity: dim ? 0.28 : 1, transition: 'opacity .2s',
});

export default function Designer() {
  const nav = useNavigate();
  // 当前本体与我的角色（顶栏上下文）：查看者/评审者进入为只读模式
  const { role, onto } = useOutletContext<ShellCtx>();
  const readonly = role === '查看者' || role === '评审者';
  const ontoName = { scm: '供应链本体', quality: '质量追溯本体', equipment: '设备运维本体' }[onto];
  // IDE 三区折叠
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [bottomOpen, setBottomOpen] = useState(true);
  // 画布选中（对象 or 边）与布局
  const [sel, setSel] = useState<{ kind: 'node' | 'edge'; id: string } | null>({ kind: 'edge', id: 'e1' });
  const [layout, setLayout] = useState('分层');
  // 选对象弹窗
  const [modalOpen, setModalOpen] = useState(false);
  const [treeKey, setTreeKey] = useState('scm');
  const [kw, setKw] = useState('');
  const [kind, setKind] = useState('all');
  const [status, setStatus] = useState('all');
  const [checked, setChecked] = useState<React.Key[]>([]);
  const [detail, setDetail] = useState<RegistryObject | null>(null);
  const candidates = useMemo(() => filterRegistry(REGISTRY_OBJECTS, { treeKey, kw, kind, status }), [treeKey, kw, kind, status]);
  // AI 助手
  const [suggestOn, setSuggestOn] = useState(true);
  const [chat, setChat] = useState<{ role: 'user' | 'ai'; text: string }[]>([
    { role: 'ai', text: '已学习 12 条建模决策（采纳率 78%）。可输入自然语言指令，如「为 SUPPLY 增加成本属性」。' },
  ]);
  // AI 助手宽度（拖拽左缘调宽，260–760px）
  const [aiWidth, setAiWidth] = useState(320);
  const dragging = useRef(false);
  const startDrag = (e: React.PointerEvent) => {
    e.preventDefault();
    dragging.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onDrag = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const w = window.innerWidth - e.clientX - 24;
    setAiWidth(Math.min(760, Math.max(260, w)));
  };
  const endDrag = () => { dragging.current = false; };

  const pos = LAYOUTS[layout];
  // 局部高亮：选中对象时，只保留其一阶邻居与关联边
  const neighbors = useMemo(() => sel?.kind !== 'node' ? null :
    new Set([sel.id, ...CANVAS_EDGES.filter(e => e.from === sel.id || e.to === sel.id).flatMap(e => [e.from, e.to])]), [sel]);
  const edgeHot = (e: (typeof CANVAS_EDGES)[number]) =>
    sel?.kind === 'edge' ? e.id === sel.id : sel?.kind === 'node' ? (e.from === sel.id || e.to === sel.id) : false;

  const selObj = sel?.kind === 'node' ? OBJECTS.find(o => o.name === sel.id) : null;
  const selObjReg = sel?.kind === 'node' ? REGISTRY_OBJECTS.find(o => o.name === sel.id) : null;
  const selEdge = sel?.kind === 'edge' ? EDGES.find(e => e.id === sel.id) : null;

  // ─── 底部属性面板内容 ───
  const bottomPanel = (
    <Card size="small" style={{ marginTop: 12 }}
      title={<>属性面板{selObj ? ` · 对象 · ${selObj.name}（${selObj.en}）` : selEdge ? ` · 关系 · ${selEdge.name}` : ''}</>}
      extra={<Space>
        {selObj?.stateMachine && <Tag color="orange">⚡ 状态机对象</Tag>}
        {selObj && <Tag color="blue">{selObj.kind}</Tag>}
        {selEdge && <Tag color="purple">一等公民关系</Tag>}
        {!sel && <Text type="secondary" style={{ fontSize: 12 }}>在画布中点击对象或关系查看详情</Text>}
      </Space>}>
      {selObj && selObjReg && (
        <Tabs size="small" items={[
          {
            key: 'props', label: `属性 (${selObjReg.props.length})`, children: (
              <Table size="small" rowKey="name" pagination={false}
                columns={[
                  { title: '字段', dataIndex: 'name', render: (v: string) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v}</span> },
                  { title: '类型', dataIndex: 'type', width: 90 },
                  { title: '备注', dataIndex: 'comment' },
                ]} dataSource={selObjReg.props} />
            ),
          },
          {
            key: 'sm', label: '状态机', children: selObj.stateMachine ? (
              <Space size={6} wrap align="center">
                {selObj.stateMachine.map((s, i) => (
                  <React.Fragment key={s}>
                    {i > 0 && <Text type="secondary">→</Text>}
                    <Tag color={i === selObj.stateMachine!.length - 1 ? 'green' : 'default'}>{s}</Tag>
                  </React.Fragment>
                ))}
                <Text type="secondary" style={{ margin: '0 6px' }}>│ 异常:</Text>
                <Tag color="red">已取消</Tag><Tag color="red">已冻结</Tag>
              </Space>
            ) : <Text type="secondary" style={{ fontSize: 12 }}>静态事实对象无状态机</Text>,
          },
          {
            key: 'fn', label: '函数', children: selObj.name === '采购订单' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12.5 }}>
                {FUNCS.map(f => (
                  <div key={f.id} style={{ display: 'flex', gap: 10 }}>
                    <Tag style={{ flex: 'none' }} color={{ 指标: 'blue', 派生: 'purple', 行动: 'orange', 权限: 'default' }[f.cat]}>{f.cat}函数</Tag>
                    <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{f.name} {f.signature ?? ''}</span>
                    <Text type="secondary" style={{ fontSize: 12 }}>{f.impl}</Text>
                  </div>
                ))}
              </div>
            ) : <Text type="secondary" style={{ fontSize: 12 }}>该对象暂未挂载函数，可在注册中心为其注册指标/派生/行动/权限函数</Text>,
          },
        ]} />
      )}
      {selEdge && (
        <>
          <div style={{ display: 'flex', gap: 24, marginBottom: 10, fontSize: 12.5 }}>
            <span><Text type="secondary">两端　</Text>{selEdge.from} → {selEdge.to}</span>
            <span><Text type="secondary">版本　</Text>{selEdge.version}</span>
            <span><Text type="secondary">被引用　</Text>{selEdge.refCount} 处</span>
            <span><Text type="secondary">传播　</Text>delay 变化 → 下游 PO 风险重算</span>
          </div>
          <Table size="small" rowKey="name" pagination={false} style={{ maxWidth: 720 }}
            columns={[
              { title: '属性', dataIndex: 'name', render: (v: string) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v}</span> },
              { title: '类型', dataIndex: 'type', width: 90 },
              { title: '备注', dataIndex: 'comment' },
              { title: '时序', dataIndex: 'temporal', width: 70, render: (v?: string) => v ?? '—' },
              { title: '聚合', dataIndex: 'agg', width: 70, render: (v?: string) => v ?? '—' },
            ]} dataSource={selEdge.props}
            footer={() => <Button size="small" onClick={() => nav('/modeling/edge-editor')}>打开关系编辑器 →</Button>} />
        </>
      )}
    </Card>
  );

  return (
    <>
      {/* ─── 页头：标题 + 工具条 + 面板开关 ─── */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>本体设计器</Title>
          <Text type="secondary">{ontoName} · 逆向路径：从数据资产反向推导本体</Text>
        </div>
        <div style={{ flex: 1 }} />
        <Space wrap>
          <Segmented defaultValue="对象" options={['⬤ 对象', '── 关系', 'ƒ 函数', '⛨ 权限']} />
          <Radio.Group defaultValue="rev" optionType="button" buttonStyle="solid" size="middle"
            options={[{ value: 'rev', label: '逆向 ✓' }, { value: 'fwd', label: '正向' }]} />
          <Select defaultValue="v0.4" style={{ width: 130 }}
            options={[{ value: 'v0.4', label: 'v0.4 · 草稿' }, { value: 'v0.3', label: 'v0.3 · 生产中' }]} />
          <Tooltip title="左侧面板"><Button type={leftOpen ? 'default' : 'text'} icon={<VerticalLeftOutlined />} onClick={() => setLeftOpen(!leftOpen)} /></Tooltip>
          <Tooltip title="底部属性面板"><Button type={bottomOpen ? 'default' : 'text'} icon={<VerticalAlignBottomOutlined />} onClick={() => setBottomOpen(!bottomOpen)} /></Tooltip>
          <Tooltip title="AI 建模助手"><Button type={rightOpen ? 'default' : 'text'} icon={<VerticalRightOutlined />} onClick={() => setRightOpen(!rightOpen)} /></Tooltip>
          <Button icon={<SaveOutlined />} disabled={readonly} onClick={() => message.success('草稿已保存')}>保存</Button>
          <Button icon={<WarningOutlined />} onClick={() => message.warning('3 个命名建议类警告')}>Lint: 3⚠</Button>
          <Button type="primary" disabled={readonly} onClick={() => nav('/governance/review')}>提交评审</Button>
        </Space>
      </div>

      {readonly && (
        <Alert style={{ marginBottom: 12 }} type="warning" showIcon
          message={`你在「${ontoName}」中的角色是 ${role}，设计器为只读模式`}
          description={<>可查看画布、检索注册中心全量元素，但不能编辑草稿或引用元素。需要建模权限？<a onClick={() => message.success('已向本体所有者发起建模者角色申请')}>申请建模者角色 →</a></>} />
      )}

      {/* 工作区行：占满视口剩余高度（画布与 AI 助手变高，属性面板随之下移） */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'stretch', height: 'calc(100vh - 208px)', minHeight: 540 }}>
        {/* ─── 左栏：对象库 + 选中速览 ─── */}
        {leftOpen && (
          <div style={{ width: 250, flex: 'none', display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
            <Card size="small" title="对象库" extra={<Text type="secondary" style={{ fontSize: 12 }}>{OBJECTS.length} 对象</Text>}>
              <Button type="dashed" block icon={<PlusOutlined />} disabled={readonly} style={{ marginBottom: 10 }} onClick={() => setModalOpen(true)}>添加对象</Button>
              {KINDS.map(k => (
                <div key={k} style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#5a5a72', marginBottom: 4 }}>
                    ▾ {k} <Text type="secondary" style={{ fontSize: 11 }}>{OBJECTS.filter(o => o.kind === k).length}</Text>
                  </div>
                  {OBJECTS.filter(o => o.kind === k).map(o => (
                    <div key={o.id}
                      style={{ padding: '4px 8px 4px 18px', fontSize: 12.5, borderRadius: 6, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', background: sel?.kind === 'node' && sel.id === o.name ? '#ecfdf5' : undefined }}
                      onClick={() => setSel({ kind: 'node', id: o.name })}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f1f3f5')}
                      onMouseLeave={e => (e.currentTarget.style.background = sel?.kind === 'node' && sel.id === o.name ? '#ecfdf5' : 'transparent')}>
                      <span>{o.name}{o.stateMachine ? ' ⚡' : ''}</span>
                      <Text type="secondary" style={{ fontSize: 10.5, fontFamily: 'monospace' }}>{o.en}</Text>
                    </div>
                  ))}
                </div>
              ))}
              <Text type="secondary" style={{ fontSize: 11 }}>⚡ = 状态机对象</Text>
            </Card>

            {selEdge && (
              <Card size="small" title={<>选中：{selEdge.name}</>} extra={<Tag color="purple">边</Tag>}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
                  <div><Text type="secondary">类型　</Text><Tag color="blue">一等公民关系</Tag></div>
                  <div><Text type="secondary">属性　</Text><span style={{ fontFamily: 'monospace' }}>{selEdge.props.map(p => p.name).join(' · ') || '—'}</span>
                    {selEdge.props.some(p => p.temporal) && <div style={{ fontSize: 11, color: '#6b7688' }}>〔时序 · 月度〕</div>}</div>
                  <div><Text type="secondary">两端　</Text>{selEdge.from} → {selEdge.to}</div>
                  <Button size="small" onClick={() => nav('/modeling/edge-editor')}>打开关系编辑器 →</Button>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* ─── 中间：建模画布（flex 填满行高） ─── */}
        <Card size="small" style={{ flex: 1, minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column' }}
          styles={{ body: { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' } }}
          title="建模画布"
          extra={<Space>
            <Segmented size="small" value={layout} onChange={v => setLayout(v as string)} options={['分层', '横向', '纵向']} />
            <Button size="small" onClick={() => setSel(null)}>重置视图</Button>
            <Text type="secondary" style={{ fontSize: 12 }}>4 对象 · 4 关系 · 拖拽节点调整布局</Text>
          </Space>}>
          <div style={{ position: 'relative', flex: 1, minHeight: 500 }} onClick={() => setSel(null)}>
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} viewBox="0 0 1100 560" preserveAspectRatio="none">
              <defs>
                <marker id="arr" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 z" fill="#6b7688" /></marker>
                <marker id="arrSel" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 z" fill="#059669" /></marker>
              </defs>
              {CANVAS_EDGES.map(e => {
                const [x1, y1] = center(pos[e.from]);
                const [x2, y2] = center(pos[e.to]);
                const hot = edgeHot(e);
                const dim = !!sel && !hot;
                return (
                  <line key={e.id} x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke={hot ? '#059669' : '#b6c2d4'} strokeWidth={hot ? 2.4 : 1.6}
                    strokeOpacity={dim ? 0.25 : 1}
                    markerEnd={hot ? 'url(#arrSel)' : 'url(#arr)'}
                    style={{ cursor: 'pointer', transition: 'stroke-opacity .2s' }}
                    onClick={ev => { ev.stopPropagation(); setSel({ kind: 'edge', id: e.id }); }} />
                );
              })}
            </svg>

            {CANVAS_NODES.map(n => {
              const [x, y] = pos[n.id];
              const dim = !!neighbors && !neighbors.has(n.id);
              const isSel = sel?.kind === 'node' && sel.id === n.id;
              return (
                <div key={n.id} style={nodeStyle(x, y, n.color, dim, isSel)}
                  onClick={ev => { ev.stopPropagation(); setSel({ kind: 'node', id: n.id }); }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ width: 26, height: 26, borderRadius: 7, background: n.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flex: 'none' }}>{n.icon}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 12.5 }}>{n.id}</div>
                      <div style={{ fontSize: 10.5, color: '#6b7688', fontFamily: 'monospace' }}>{n.en}</div>
                    </div>
                  </div>
                  <div style={{ marginTop: 6, borderTop: '1px dashed #e2e4e9', paddingTop: 5, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {n.lines.map(([k, v]) => (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5 }}>
                        <span style={{ color: '#6b7688' }}>{k}</span><span style={{ color: '#5a5a72' }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {CANVAS_EDGES.map(e => {
              const [x1, y1] = center(pos[e.from]);
              const [x2, y2] = center(pos[e.to]);
              const hot = edgeHot(e);
              const dim = !!sel && !hot;
              const wide = e.id === 'e1';
              return (
                <div key={e.id}
                  style={{
                    position: 'absolute', left: `${(((x1 + x2) / 2) / 1100) * 100}%`, top: `${(((y1 + y2) / 2) / 560) * 100}%`,
                    transform: 'translate(-50%,-50%)', background: '#fff', border: `1px solid ${hot ? '#059669' : '#dbe4f0'}`,
                    borderRadius: 8, padding: '3px 10px', fontSize: 11.5, color: '#1a1a2e', cursor: 'pointer',
                    whiteSpace: wide ? 'normal' : 'nowrap', width: wide ? 200 : undefined, textAlign: 'center',
                    opacity: dim ? 0.25 : 1, transition: 'opacity .2s',
                  }}
                  onClick={ev => { ev.stopPropagation(); setSel({ kind: 'edge', id: e.id }); }}>
                  {e.label}
                </div>
              );
            })}

            <div style={{ position: 'absolute', left: 16, bottom: 16, fontSize: 11, color: '#6b7688', display: 'flex', gap: 14 }}>
              <span>⚡ = 状态机对象</span><span>⬡ = 立方动态</span>
              {sel?.kind === 'node' && <span style={{ color: '#059669' }}>局部高亮：{sel.id} 的一阶邻居</span>}
            </div>
          </div>
        </Card>

        {/* ─── 右栏：AI 建模助手（左缘可拖拽调宽；消息区滚动、输入框固定底部） ─── */}
        {rightOpen && (
          <div style={{ width: aiWidth, flex: 'none', position: 'relative', height: '100%' }}>
            {/* 拖拽手柄：左右拉动调整助手宽度 */}
            <div
              onPointerDown={startDrag} onPointerMove={onDrag} onPointerUp={endDrag} onPointerCancel={endDrag}
              title="拖拽调整宽度"
              style={{ position: 'absolute', left: -7, top: 0, width: 12, height: '100%', cursor: 'col-resize', zIndex: 20 }}>
              <div style={{ position: 'absolute', left: 5, top: '50%', transform: 'translateY(-50%)',
                width: 2, height: 40, borderRadius: 2, background: '#cbd5e1' }} />
            </div>
            <Card size="small" title="AI 建模助手" style={{ height: '100%' }}
              styles={{ body: { height: '100%', padding: 10, display: 'flex', flexDirection: 'column', overflow: 'hidden' } }}>
              {/* 消息区（滚动） */}
              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 2 }}>
                {suggestOn && (
                  <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 8, padding: 10, flex: 'none' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>💡 建模建议</div>
                    <div style={{ fontSize: 12, marginBottom: 8 }}>
                      检测到「供应商 → 工厂」缺少时延约束，建议为 SUPPLY 增加 <span style={{ fontFamily: 'monospace' }}>max_delay</span> 约束函数
                    </div>
                    <Space>
                      <Button size="small" type="primary" onClick={() => { message.success('已采纳：max_delay 约束已加入草稿'); setSuggestOn(false); }}>采纳</Button>
                      <Button size="small" onClick={() => setSuggestOn(false)}>忽略</Button>
                    </Space>
                  </div>
                )}
                {chat.map((m, i) => (
                  <div key={i} style={{
                    fontSize: 12, padding: '8px 10px', borderRadius: 8, maxWidth: '92%', flex: 'none',
                    alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                    background: m.role === 'user' ? '#059669' : '#f1f3f5', color: m.role === 'user' ? '#fff' : '#1a1a2e',
                  }}>{m.text}</div>
                ))}
              </div>
              {/* 输入区：固定最底部（codex 问答式） */}
              <div style={{ flex: 'none', paddingTop: 10, borderTop: '1px solid #f1f3f5', marginTop: 8 }}>
                <Input.Search
                  size="small" placeholder="向 AI 提问 / 下达建模指令" enterButton="发送"
                  onSearch={v => {
                    if (!v.trim()) return;
                    setChat(c => [...c, { role: 'user', text: v }, { role: 'ai', text: '已理解。该变更将以草稿形式加入画布，提交评审后生效（mock 应答）。' }]);
                  }}
                />
                <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 6 }}>
                  建模决策回流至「智能建模 · 强化学习」，持续提升建议质量
                </Text>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* ─── 底部：属性面板 ─── */}
      {bottomOpen && bottomPanel}

      {/* ─── 从注册中心选择对象：左树 + 右表 + 快速筛选 + 详情预览 ─── */}
      <Modal
        title="从注册中心选择对象" open={modalOpen} onCancel={() => setModalOpen(false)} width={940}
        footer={
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>对象在 <a onClick={() => { setModalOpen(false); nav('/modeling/ontology/detail?onto=scm&sec=objects'); }}>注册中心</a> 统一维护；私有跨本体对象需申请共享 · 已选 {checked.length} 个</Text>
            <Button type="primary" disabled={!checked.length}
              onClick={() => { setModalOpen(false); message.success(`已添加 ${checked.length} 个对象到画布`); setChecked([]); }}>添加选中</Button>
          </Space>
        }
      >
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ width: 190, flex: 'none', borderRight: '1px solid #f1f3f5', paddingRight: 10 }}>
            <Tree
              treeData={[{ title: `全部 (${REGISTRY_OBJECTS.length})`, key: 'all' }, ...REGISTRY_TREE]}
              defaultExpandAll selectedKeys={[treeKey]}
              onSelect={k => setTreeKey(String(k[0] ?? 'all'))}
            />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Space style={{ marginBottom: 8 }} wrap>
              <Input.Search allowClear placeholder="搜索 名称 / 英文标识" style={{ width: 200 }} size="middle"
                onSearch={setKw} onChange={e => !e.target.value && setKw('')} />
              <Select value={kind} onChange={setKind} style={{ width: 120 }}
                options={[{ value: 'all', label: '类型：全部' }, ...KINDS.map(k => ({ value: k, label: k }))]} />
              <Select value={status} onChange={setStatus} style={{ width: 130 }}
                options={[{ value: 'all', label: '状态：全部' }, ...['PUBLISHED', 'IN_REVIEW', 'DRAFT'].map(s => ({ value: s, label: s })), { value: 'PRIVATE', label: '私有（跨本体）' }]} />
              <Text type="secondary" style={{ fontSize: 12 }}>{candidates.length} 个候选</Text>
            </Space>
            <Table<RegistryObject>
              rowKey="id" size="small" scroll={{ y: 300 }} pagination={false}
              rowSelection={{
                selectedRowKeys: checked, onChange: setChecked,
                // 可见 ≠ 可用：无引用权限/私有对象可检索查看（防重复创建），但不可勾选引用
                getCheckboxProps: (r: RegistryObject) => ({ disabled: !r.shared || r.perm === 'view' }),
              }}
              onRow={r => ({ onClick: () => setDetail(r), style: { cursor: 'pointer' } })}
              columns={[
                { title: '对象', key: 'name', render: (_: unknown, r: RegistryObject) => <><b>{r.name}</b> <Text type="secondary" style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.en}</Text></> },
                { title: '类型', dataIndex: 'kind', width: 84 },
                { title: '被引用', dataIndex: 'refCount', width: 70 },
                {
                  title: '状态', key: 'status', width: 120, render: (_: unknown, r: RegistryObject) =>
                    !r.shared ? <Tag>私有 · 需申请共享</Tag>
                      : r.perm === 'view' ? <Tag color="warning">仅可见 · 无引用权限</Tag>
                        : <Tag color={fmtStatus(r.status)}>{r.status}</Tag>,
                },
                { title: '', key: 'op', width: 56, render: (_: unknown, r: RegistryObject) => <Button size="small" type="link" onClick={e => { e.stopPropagation(); setDetail(r); }}>详情</Button> },
              ]}
              dataSource={candidates}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>点击行可预览对象详情（属性 / 状态机 / 数据映射 / 被引用）；「仅可见」对象可申请引用权限，防止重复建模</Text>
          </div>
        </div>
      </Modal>
      <ObjectDetailDrawer obj={detail} onClose={() => setDetail(null)} />
    </>
  );
}
