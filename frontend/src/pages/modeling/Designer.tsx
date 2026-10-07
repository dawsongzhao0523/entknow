import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  App, Button, Card, Input, Modal, Radio, Segmented, Select, Space,
  Table, Tabs, Tag, Tooltip, Typography,
} from 'antd';
import {
  PlusOutlined, SaveOutlined, VerticalLeftOutlined, VerticalRightOutlined,
  VerticalAlignBottomOutlined,
} from '@ant-design/icons';
import { api, type Edge, type Func, type OntoObject, type Ontology, type Prop } from '../../api';
import { useSession } from '../../session';

const { Title, Text } = Typography;
const KIND_COLOR: Record<string, string> = { 静态事实: '#059669', 单体动态: '#ea580c', 立方动态: '#7c3aed' };
const KINDS = ['静态事实', '单体动态', '立方动态'];
const NODE_W = 150, NODE_H = 96;

interface Pos { [id: string]: [number, number] }
const LAYOUTS: Record<string, (ids: string[]) => Pos> = {
  分层: ids => {
    const p: Pos = {};
    const mid = Math.ceil(ids.length / 2);
    ids.forEach((id, i) => { p[id] = i < mid ? [200 + (i % 4) * 250, 60 + Math.floor(i / 4) * 160] : [200 + ((i - mid) % 4) * 250, 320]; });
    return p;
  },
  横向: ids => { const p: Pos = {}; ids.forEach((id, i) => { p[id] = [30 + i * 260, 230]; }); return p; },
  纵向: ids => { const p: Pos = {}; ids.forEach((id, i) => { p[id] = [475, 16 + i * 136]; }); return p; },
};


/** 本体设计器：IDE 式三栏（左对象库 / 中画布 / 右AI占位）+ 底部属性面板（对齐原型） */
export default function Designer() {
  const { message } = App.useApp();
  const { user, onto } = useSession();
  const [objects, setObjects] = useState<OntoObject[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [funcs, setFuncs] = useState<Func[]>([]);
  const [ontos, setOntos] = useState<Ontology[]>([]);
  const [sel, setSel] = useState<{ kind: 'node' | 'edge'; id: string } | null>(null);
  const [layout, setLayout] = useState('分层');
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [bottomOpen, setBottomOpen] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEn, setNewEn] = useState('');
  const [newKind, setNewKind] = useState('静态事实');
  const [chat, setChat] = useState<{ role: 'user' | 'ai'; text: string }[]>([
    { role: 'ai', text: '你好！我可以回答关于当前本体的问题，或执行建模指令。试试输入「列出所有对象」或「SUPPLY 的属性是什么」。' },
  ]);
  const [input, setInput] = useState('');
  const chatRef = useRef<HTMLDivElement>(null);

  const reload = useCallback(() => {
    api.objects().then(setObjects).catch(() => {});
    api.edges().then(setEdges).catch(() => {});
    api.functions().then(setFuncs).catch(() => {});
    api.ontologies(user).then(setOntos).catch(() => {});
  }, [user]);

  useEffect(() => { reload(); }, [reload]);

  const cur = ontos.find(o => o.id === onto);
  const curName = cur?.name ?? '供应链本体';
  const canvasObjs = useMemo(() => objects.filter(o => o.canvas && o.ontology === curName), [objects, curName]);
  const canvasObjNames = useMemo(() => new Set(canvasObjs.map(o => o.name)), [canvasObjs]);
  const canvasEdges = useMemo(() => edges.filter(e => canvasObjNames.has(e.from) && canvasObjNames.has(e.to)), [edges, canvasObjNames]);
  const pos = useMemo(() => LAYOUTS[layout](canvasObjs.map(o => o.name)), [layout, canvasObjs]);

  const objName = (id: string) => objects.find(o => o.id === id)?.name ?? id;

  const selObj = sel?.kind === 'node' ? canvasObjs.find(o => o.id === sel.id) : null;
  const selEdge = sel?.kind === 'edge' ? canvasEdges.find(e => e.id === sel.id) : null;
  const neighbors = useMemo(() => sel?.kind !== 'node' ? null :
    new Set([sel.id, ...canvasEdges.filter(e => e.from === objName(sel.id) || e.to === objName(sel.id)).flatMap(e => [e.from, e.to])]), [sel, canvasEdges]);
  const edgeHot = (e: Edge) =>
    sel?.kind === 'edge' ? e.id === sel.id : sel?.kind === 'node' ? (e.from === sel.id || e.to === sel.id) : false;

  const nodeStyle = (x: number, y: number, color: string, dim: boolean, isSel: boolean): React.CSSProperties => ({
    position: 'absolute', left: `${(x / 1100) * 100}%`, top: `${(y / 560) * 100}%`,
    width: NODE_W, background: '#fff', border: `1px solid ${isSel ? '#059669' : '#dbe4f0'}`, borderRadius: 10,
    padding: '10px 12px', boxShadow: isSel ? '0 0 0 2px rgba(59,130,246,.25)' : '0 1px 3px rgba(15,23,42,.08)',
    borderTop: `3px solid ${color}`, cursor: 'pointer', opacity: dim ? 0.28 : 1, transition: 'opacity .2s',
  });

  const aiReply = (q: string, objs: OntoObject[], eds: Edge[]): string => {
    const lower = q.toLowerCase();
    if (q.includes('对象') || q.includes('列出') || lower.includes('list')) {
      return `当前本体有 ${objs.length} 个对象：\n${objs.map(o => `· ${o.name}（${o.en}）· ${o.kind} · ${o.version}`).join('\n')}`;
    }
    if (q.includes('关系') || q.includes('边') || lower.includes('edge')) {
      return `当前有 ${eds.length} 条关系：\n${eds.map(e => `· ${e.name}：${e.from} → ${e.to}`).join('\n')}`;
    }
    if (q.includes('属性') || lower.includes('prop')) {
      const target = objs.find(o => q.includes(o.name));
      if (target) {
        return `「${target.name}」的属性：\n${(target.props ?? []).map(p => `· ${p.name}（${p.type}）${p.comment ? ' — ' + p.comment : ''}`).join('\n')}`;
      }
      return '请指明对象名，如「采购订单的属性是什么」';
    }
    if (q.includes('状态机') || lower.includes('state')) {
      const sm = objs.filter(o => o.stateMachine);
      return sm.length > 0
        ? `有状态机的对象：\n${sm.map(o => `· ${o.name}：${o.stateMachine!.join(' → ')}`).join('\n')}`
        : '当前本体没有定义状态机的对象';
    }
    if (q.includes('创建') || q.includes('新建') || lower.includes('create')) {
      return '请在左侧面板点击「添加对象」按钮创建新对象，或在「智能建模」使用七步法向导。';
    }
    return `已收到指令「${q}」。当前为确定性规则引擎（可查询对象/关系/属性/状态机），LLM 自由对话为后续提案。`;
  };

  const transition = async (action: string) => {
    if (!selObj) return;
    try {
      const r = await fetch(`/api/v1/elements/object/${selObj.id}/transition`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, by: user }),
      });
      if (!r.ok) throw new Error(((await r.json().catch(() => ({}))) as { error?: string }).error ?? `HTTP ${r.status}`);
      message.success(`${selObj.name} 已${action === 'submit' ? '提交评审' : action === 'publish' ? '发布' : '废弃'}`);
      reload();
    } catch (e) { message.error(String((e as Error).message)); }
  };

  const createObj = async () => {
    if (!newName || !newEn) { message.warning('请填写名称和英文标识'); return; }
    try {
      await api.createObject({
        id: `obj-${Date.now().toString(36)}`, name: newName, en: newEn, kind: newKind,
        version: 'v0.1', status: 'DRAFT', owner: user, ontology: curName, refCount: 0, shared: false,
        props: [{ name: newEn + '_id', type: 'string', comment: '画布新建' }],
      });
      message.success(`对象「${newName}」已创建`);
      setAddOpen(false); setNewName(''); setNewEn('');
      reload();
    } catch (e) { message.error(String((e as Error).message)); }
  };

  // ─── 底部属性面板 ───
  const bottomPanel = (
    <Card size="small" style={{ marginTop: 12 }}
      title={<>属性面板{selObj ? ` · 对象 · ${selObj.name}（${selObj.en}）` : selEdge ? ` · 关系 · ${selEdge.name}` : ''}</>}
      extra={<Space>
        {selObj?.stateMachine && <Tag color="orange">⚡ 状态机对象</Tag>}
        {selObj && <Tag color="blue">{selObj.kind}</Tag>}
        {selEdge && <Tag color="purple">一等公民关系</Tag>}
        {!sel && <Text type="secondary" style={{ fontSize: 12 }}>在画布中点击对象或关系查看详情</Text>}
      </Space>}>
      {selObj && (
        <Tabs size="small" items={[
          { key: 'props', label: `属性 (${(selObj.props ?? []).length})`, children: (
            <Table<Prop> size="small" rowKey="name" pagination={false}
              columns={[
                { title: '字段', dataIndex: 'name', render: (v: string) => <span className="mono" style={{ fontSize: 12 }}>{v}</span> },
                { title: '类型', dataIndex: 'type', width: 90 },
                { title: '备注', dataIndex: 'comment' },
              ]} dataSource={selObj.props ?? []} />
          ) },
          { key: 'sm', label: '状态机', children: selObj.stateMachine ? (
            <Space size={6} wrap align="center">
              {selObj.stateMachine.map((s, i) => (
                <React.Fragment key={s}>
                  {i > 0 && <Text type="secondary">→</Text>}
                  <Tag color={i === selObj.stateMachine!.length - 1 ? 'green' : 'default'}>{s}</Tag>
                </React.Fragment>
              ))}
            </Space>
          ) : <Text type="secondary" style={{ fontSize: 12 }}>静态事实对象无状态机</Text> },
          { key: 'fn', label: '函数', children: funcs.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12.5 }}>
              {funcs.map(f => (
                <div key={f.id} style={{ display: 'flex', gap: 10 }}>
                  <Tag style={{ flex: 'none' }} color={{ 指标: 'blue', 派生: 'purple', 行动: 'orange', 权限: 'default' }[f.cat]}>{f.cat}函数</Tag>
                  <span className="mono" style={{ fontSize: 12 }}>{f.name} {f.signature ?? ''}</span>
                  <Text type="secondary" style={{ fontSize: 12 }}>{f.impl}</Text>
                </div>
              ))}
            </div>
          ) : <Text type="secondary" style={{ fontSize: 12 }}>该对象暂未挂载函数</Text> },
        ]} />
      )}
      {selEdge && (
        <>
          <div style={{ display: 'flex', gap: 24, marginBottom: 10, fontSize: 12.5 }}>
            <span><Text type="secondary">两端　</Text>{objName(selEdge.from)} → {objName(selEdge.to)}</span>
            <span><Text type="secondary">版本　</Text>{selEdge.version}</span>
            <span><Text type="secondary">被引用　</Text>{selEdge.refCount} 处</span>
          </div>
          <Table<Prop> size="small" rowKey="name" pagination={false} style={{ maxWidth: 720 }}
            columns={[
              { title: '属性', dataIndex: 'name', render: (v: string) => <span className="mono" style={{ fontSize: 12 }}>{v}</span> },
              { title: '类型', dataIndex: 'type', width: 90 },
              { title: '备注', dataIndex: 'comment' },
              { title: '时序', dataIndex: 'temporal', width: 70, render: (v?: string) => v ?? '—' },
              { title: '聚合', dataIndex: 'agg', width: 70, render: (v?: string) => v ?? '—' },
            ]} dataSource={selEdge.props ?? []} />
        </>
      )}
      {selObj && (
        <Space style={{ marginTop: 12 }} wrap>
          {selObj.status === 'DRAFT' && <Button type="primary" size="small" onClick={() => transition('submit')}>提交评审</Button>}
          {selObj.status === 'IN_REVIEW' && <Button type="primary" size="small" onClick={() => transition('publish')}>发布</Button>}
          {selObj.status !== 'DEPRECATED' && <Button danger size="small" onClick={() => transition('deprecate')}>废弃</Button>}
        </Space>
      )}
    </Card>
  );

  return (
    <>
      {/* ─── 页头 ─── */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>本体设计器</Title>
          <Text type="secondary">{curName} · {canvasObjs.length} 对象 · {canvasEdges.length} 关系</Text>
        </div>
        <div style={{ flex: 1 }} />
        <Space wrap>
          <Segmented defaultValue="对象" options={['⬤ 对象', '── 关系', 'ƒ 函数', '⛨ 权限']} />
          <Select value={cur?.version ?? '—'} style={{ width: 130 }} disabled
            options={cur ? [{ value: cur.version, label: `${cur.version} · ${cur.status === 'DRAFT' ? '草稿' : '生产中'}` }] : []} />
          <Tooltip title="左侧面板"><Button type={leftOpen ? 'default' : 'text'} icon={<VerticalLeftOutlined />} onClick={() => setLeftOpen(!leftOpen)} /></Tooltip>
          <Tooltip title="底部属性面板"><Button type={bottomOpen ? 'default' : 'text'} icon={<VerticalAlignBottomOutlined />} onClick={() => setBottomOpen(!bottomOpen)} /></Tooltip>
          <Tooltip title="AI 建模助手"><Button type={rightOpen ? 'default' : 'text'} icon={<VerticalRightOutlined />} onClick={() => setRightOpen(!rightOpen)} /></Tooltip>
          <Button icon={<SaveOutlined />} onClick={() => message.success('草稿已保存')}>保存</Button>
          <Button type="primary" onClick={() => message.info('提交评审请进入治理模块')}>提交评审</Button>
        </Space>
      </div>

      {/* 工作区行 */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'stretch', height: 'calc(100vh - 208px)', minHeight: 480 }}>
        {/* ─── 左栏：对象库 ─── */}
        {leftOpen && (
          <div style={{ width: 250, flex: 'none', display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0, overflowY: 'auto' }}>
            <Card size="small" title="对象库" extra={<Text type="secondary" style={{ fontSize: 12 }}>{canvasObjs.length} 对象</Text>}>
              <Button type="dashed" block icon={<PlusOutlined />} style={{ marginBottom: 10 }} onClick={() => setAddOpen(true)}>添加对象</Button>
              {KINDS.map(k => {
                const kindObjs = canvasObjs.filter(o => o.kind === k);
                if (kindObjs.length === 0) return null;
                return (
                  <div key={k} style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#5a5a72', marginBottom: 4 }}>
                      ▾ {k} <Text type="secondary" style={{ fontSize: 11 }}>{kindObjs.length}</Text>
                    </div>
                    {kindObjs.map(o => (
                      <div key={o.id}
                        style={{ padding: '4px 8px 4px 18px', fontSize: 12.5, borderRadius: 6, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', background: sel?.kind === 'node' && sel.id === o.id ? '#ecfdf5' : undefined }}
                        onClick={() => setSel({ kind: 'node', id: o.id })}
                        onMouseEnter={e => (e.currentTarget.style.background = '#f1f3f5')}
                        onMouseLeave={e => (e.currentTarget.style.background = sel?.kind === 'node' && sel.id === o.id ? '#ecfdf5' : 'transparent')}>
                        <span>{o.name}{o.stateMachine ? ' ⚡' : ''}</span>
                        <Text type="secondary" style={{ fontSize: 10.5, fontFamily: 'monospace' }}>{o.en}</Text>
                      </div>
                    ))}
                  </div>
                );
              })}
              <Text type="secondary" style={{ fontSize: 11 }}>⚡ = 状态机对象</Text>
            </Card>

            {selEdge && (
              <Card size="small" title={<>选中：{selEdge.name}</>} extra={<Tag color="purple">边</Tag>}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
                  <div><Text type="secondary">类型　</Text><Tag color="blue">一等公民关系</Tag></div>
                  <div><Text type="secondary">两端　</Text>{objName(selEdge.from)} → {objName(selEdge.to)}</div>
                  <div><Text type="secondary">版本　</Text>{selEdge.version}</div>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* ─── 中间：建模画布 ─── */}
        <Card size="small" style={{ flex: 1, minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column' }}
          styles={{ body: { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' } }}
          title="建模画布"
          extra={<Space>
            <Segmented size="small" value={layout} onChange={v => setLayout(v as string)} options={['分层', '横向', '纵向']} />
            <Button size="small" onClick={() => setSel(null)}>重置视图</Button>
          </Space>}>
          <div style={{ position: 'relative', flex: 1, minHeight: 400, background: '#fbfdfc', borderRadius: 6 }}
            onClick={() => setSel(null)}>
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} viewBox="0 0 1100 560" preserveAspectRatio="none">
              <defs>
                <marker id="arr" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 z" fill="#6b7688" /></marker>
                <marker id="arrSel" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 z" fill="#059669" /></marker>
              </defs>
              {canvasEdges.map(e => {
                const a = pos[e.from] ?? [400, 120];
                const b = pos[e.to] ?? [400, 360];
                const hot = edgeHot(e);
                const dim = !!sel && !hot;
                // 贝塞尔曲线：从源节点底部中心 → 目标节点顶部中心，避开节点卡片
                const [x1, y1] = [a[0] + NODE_W / 2, a[1] + NODE_H];
                const [x2, y2] = [b[0] + NODE_W / 2, b[1]];
                const midY = (y1 + y2) / 2;
                const d = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
                return (
                  <path key={e.id} d={d} fill="none"
                    stroke={hot ? '#059669' : '#b6c2d4'} strokeWidth={hot ? 2.4 : 1.6}
                    strokeOpacity={dim ? 0.25 : 1}
                    markerEnd={hot ? 'url(#arrSel)' : 'url(#arr)'}
                    style={{ cursor: 'pointer', transition: 'stroke-opacity .2s' }}
                    onClick={ev => { ev.stopPropagation(); setSel({ kind: 'edge', id: e.id }); }} />
                );
              })}
            </svg>

            {canvasObjs.map(o => {
              const p = pos[o.name] ?? [400, 200];
              const dim = !!neighbors && !neighbors.has(o.name);
              const isSel = sel?.kind === 'node' && sel.id === o.id;
              return (
                <div key={o.id} style={nodeStyle(p[0], p[1], KIND_COLOR[o.kind] ?? '#64748b', dim, isSel)}
                  onClick={ev => { ev.stopPropagation(); setSel({ kind: 'node', id: o.id }); }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ width: 26, height: 26, borderRadius: 7, background: KIND_COLOR[o.kind] ?? '#64748b', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flex: 'none', fontWeight: 700 }}>{o.en[0]}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 12.5 }}>{o.name}</div>
                      <div style={{ fontSize: 10.5, color: '#6b7688', fontFamily: 'monospace' }}>{o.en}</div>
                    </div>
                  </div>
                  <div style={{ marginTop: 6, borderTop: '1px dashed #e2e4e9', paddingTop: 5, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5 }}>
                      <span style={{ color: '#6b7688' }}>类型</span><span style={{ color: '#5a5a72' }}>{o.kind}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5 }}>
                      <span style={{ color: '#6b7688' }}>版本</span><span style={{ color: '#5a5a72' }}>{o.version}</span>
                    </div>
                    {o.stateMachine && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5 }}>
                        <span style={{ color: '#6b7688' }}>状态机</span><span style={{ color: '#5a5a72' }}>{o.stateMachine.length} 状态</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {canvasEdges.map(e => {
              const a = pos[e.from] ?? [400, 120];
              const b = pos[e.to] ?? [400, 360];
              const x1 = a[0] + NODE_W / 2; const y1 = a[1] + NODE_H;
              const x2 = b[0] + NODE_W / 2; const y2 = b[1];
              const hot = edgeHot(e);
              const dim = !!sel && !hot;
              return (
                <div key={e.id}
                  style={{
                    position: 'absolute',
                    left: `${(((x1 + x2) / 2) / 1100) * 100}%`,
                    top: `${(((y1 + y2) / 2) / 560) * 100}%`,
                    transform: 'translate(-50%,-50%)',
                    background: '#fff', border: `1px solid ${hot ? '#059669' : '#dbe4f0'}`,
                    borderRadius: 8, padding: '3px 10px', fontSize: 11.5, color: '#1a1a2e', cursor: 'pointer',
                    whiteSpace: 'nowrap', textAlign: 'center', opacity: dim ? 0.25 : 1, transition: 'opacity .2s',
                    zIndex: 5,
                  }}
                  onClick={ev => { ev.stopPropagation(); setSel({ kind: 'edge', id: e.id }); }}>
                  <b>{e.name}</b>
                </div>
              );
            })}

            {canvasObjs.length === 0 && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13 }}>
                当前本体暂无画布对象——点左侧「添加对象」或在「智能建模」生成草稿
              </div>
            )}
            <div style={{ position: 'absolute', left: 16, bottom: 16, fontSize: 11, color: '#6b7688', display: 'flex', gap: 14 }}>
              <span>⚡ = 状态机对象</span>
              {sel?.kind === 'node' && <span style={{ color: '#059669' }}>局部高亮：{objName(sel.id)} 的一阶邻居</span>}
            </div>
          </div>
        </Card>

        {/* ─── 右栏：AI 建模助手（Codex 风格对话） ─── */}
        {rightOpen && (
          <div style={{ width: 300, flex: 'none', height: '100%' }}>
            <Card size="small" title="AI 建模助手" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
              styles={{ body: { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: 10, overflow: 'hidden' } }}>
              {/* 消息区（滚动） */}
              <div ref={chatRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 4 }}>
                <div style={{ fontSize: 11, color: '#6b7688', padding: '6px 0', textAlign: 'center', flex: 'none' }}>
                  确定性规则引擎 · LLM 在线对话为后续提案
                </div>
                {chat.map((m, i) => (
                  <div key={i} style={{
                    fontSize: 12, padding: '8px 10px', borderRadius: 8, flex: 'none',
                    alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                    background: m.role === 'user' ? '#059669' : '#f1f3f5',
                    color: m.role === 'user' ? '#fff' : '#1a1a2e',
                    maxWidth: '90%',
                  }}>{m.text}</div>
                ))}
              </div>
              {/* 输入区：固定底部 */}
              <div style={{ flex: 'none', paddingTop: 10, borderTop: '1px solid #f1f3f5', marginTop: 8 }}>
                <Input.Search
                  size="small" placeholder="向 AI 提问 / 下达建模指令" enterButton="发送"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onSearch={v => {
                    if (!v.trim()) return;
                    setChat(c => [...c, { role: 'user', text: v }]);
                    setInput('');
                    // 确定性回复（非 LLM）
                    setTimeout(() => {
                      const reply = aiReply(v, canvasObjs, canvasEdges);
                      setChat(c => [...c, { role: 'ai', text: reply }]);
                    }, 300);
                  }}
                />
                <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 6 }}>
                  当前对象 {canvasObjs.length} · 关系 {canvasEdges.length}
                </Text>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* ─── 底部属性面板 ─── */}
      {bottomOpen && bottomPanel}

      {/* 添加对象弹窗 */}
      <Modal title="添加对象" open={addOpen} onOk={createObj} onCancel={() => setAddOpen(false)} okText="创建" cancelText="取消">
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          <Space>
            <Input placeholder="中文名" value={newName} onChange={e => setNewName(e.target.value)} style={{ width: 160 }} />
            <Input placeholder="英文标识" value={newEn} onChange={e => setNewEn(e.target.value)} style={{ width: 160 }} className="mono" />
          </Space>
          <Radio.Group value={newKind} onChange={e => setNewKind(e.target.value)}>
            {KINDS.map(k => <Radio.Button key={k} value={k}>{k}</Radio.Button>)}
          </Radio.Group>
        </Space>
      </Modal>
    </>
  );
}
