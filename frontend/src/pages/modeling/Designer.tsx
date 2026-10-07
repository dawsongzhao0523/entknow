import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  App, Button, Card, Input, Modal, Radio, Select, Space,
  Table, Tabs, Tag, Tooltip, Typography,
} from 'antd';
import {
  PlusOutlined, SaveOutlined, VerticalLeftOutlined, VerticalRightOutlined,
  VerticalAlignBottomOutlined,
} from '@ant-design/icons';
import {
  ReactFlow, Background, BackgroundVariant, Controls, MiniMap,
  type Edge as FlowEdge, type Node as FlowNode, type NodeProps,
  Handle, Position, MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { api, type Edge, type Func, type OntoObject, type Ontology, type Prop } from '../../api';
import { useSession } from '../../session';

const { Title, Text } = Typography;
const KIND_COLOR: Record<string, string> = { 静态事实: '#059669', 单体动态: '#ea580c', 立方动态: '#7c3aed' };
const KINDS = ['静态事实', '单体动态', '立方动态'];

/* ─── 自定义节点：与原型卡片样式一致 ─── */
function OntoNode({ data, selected }: NodeProps) {
  const d = data as { name: string; en: string; kind: string; version: string; smCount?: number };
  const color = KIND_COLOR[d.kind] ?? '#64748b';
  return (
    <div style={{
      width: 150, background: '#fff', border: `1px solid ${selected ? '#059669' : '#dbe4f0'}`,
      borderRadius: 10, padding: '10px 12px',
      boxShadow: selected ? '0 0 0 2px rgba(59,130,246,.25)' : '0 1px 3px rgba(15,23,42,.08)',
      borderTop: `3px solid ${color}`,
    }}>
      <Handle type="target" position={Position.Top} style={{ background: color }} />
      <Handle type="source" position={Position.Bottom} style={{ background: color }} />
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ width: 26, height: 26, borderRadius: 7, background: color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flex: 'none', fontWeight: 700 }}>
          {d.en[0]}
        </span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 12.5 }}>{d.name}</div>
          <div style={{ fontSize: 10.5, color: '#6b7688', fontFamily: 'monospace' }}>{d.en}</div>
        </div>
      </div>
      <div style={{ marginTop: 6, borderTop: '1px dashed #e2e4e9', paddingTop: 5, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5 }}>
          <span style={{ color: '#6b7688' }}>类型</span><span>{d.kind}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5 }}>
          <span style={{ color: '#6b7688' }}>版本</span><span>{d.version}</span>
        </div>
        {d.smCount && d.smCount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5 }}>
            <span style={{ color: '#6b7688' }}>状态机</span><span>{d.smCount} 状态</span>
          </div>
        )}
      </div>
    </div>
  );
}
const nodeTypes = { onto: OntoNode };

/* ─── 设计器主组件 ─── */
export default function Designer() {
  const { message } = App.useApp();
  const { user, onto } = useSession();
  const [objects, setObjects] = useState<OntoObject[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [funcs, setFuncs] = useState<Func[]>([]);
  const [ontos, setOntos] = useState<Ontology[]>([]);
  const [sel, setSel] = useState<{ kind: 'node' | 'edge'; id: string } | null>(null);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [bottomOpen, setBottomOpen] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEn, setNewEn] = useState('');
  const [newKind, setNewKind] = useState('静态事实');
  const [chat, setChat] = useState<{ role: 'user' | 'ai'; text: string }[]>([
    { role: 'ai', text: '你好！试试「列出所有对象」「SUPPLY 的属性」「状态机」。' },
  ]);
  const [input, setInput] = useState('');

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

  const objName = (id: string) => objects.find(o => o.id === id)?.name ?? id;

  /* ─── React Flow 节点/边 ─── */
  const flowNodes: FlowNode[] = useMemo(() => {
    const cols = Math.ceil(Math.sqrt(canvasObjs.length));
    return canvasObjs.map((o, i) => ({
      id: o.id,
      type: 'onto' as const,
      position: { x: (i % cols) * 220 + 50, y: Math.floor(i / cols) * 180 + 40 },
      data: { name: o.name, en: o.en, kind: o.kind, version: o.version, smCount: o.stateMachine?.length ?? 0 },
      selected: sel?.kind === 'node' && sel.id === o.id,
    }));
  }, [canvasObjs, sel]);

  const flowEdges: FlowEdge[] = useMemo(() => {
    return canvasEdges.map(e => {
      const fromObj = canvasObjs.find(o => o.name === e.from);
      const toObj = canvasObjs.find(o => o.name === e.to);
      if (!fromObj || !toObj) return null;
      const hot = sel?.kind === 'edge' ? sel.id === e.id : sel?.kind === 'node' ? (e.from === objName(sel.id) || e.to === objName(sel.id)) : false;
      return {
        id: e.id,
        source: fromObj.id,
        target: toObj.id,
        type: 'default' as const,
        animated: !!hot,
        style: { stroke: hot ? '#059669' : '#b6c2d4', strokeWidth: hot ? 2.4 : 1.6 },
        label: e.name,
        labelStyle: { fontSize: 11, fontWeight: 600, fill: '#1a1a2e' },
        labelBgStyle: { fill: '#fff', stroke: hot ? '#059669' : '#dbe4f0', strokeWidth: 1 },
        labelBgPadding: [6, 3] as [number, number],
        labelBgBorderRadius: 6,
        markerEnd: { type: MarkerType.ArrowClosed, color: hot ? '#059669' : '#6b7688', width: 18, height: 18 },
      };
    }).filter(Boolean) as FlowEdge[];
  }, [canvasEdges, canvasObjs, sel, objects]);

  const selObj = sel?.kind === 'node' ? canvasObjs.find(o => o.id === sel.id) : null;
  const selEdge = sel?.kind === 'edge' ? canvasEdges.find(e => e.id === sel.id) : null;

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

  const aiReply = (q: string): string => {
    if (q.includes('对象') || q.includes('列出')) {
      return `当前本体有 ${canvasObjs.length} 个对象：\n${canvasObjs.map(o => `· ${o.name}（${o.en}）· ${o.kind}`).join('\n')}`;
    }
    if (q.includes('关系') || q.includes('边')) {
      return `当前有 ${canvasEdges.length} 条关系：\n${canvasEdges.map(e => `· ${e.name}：${e.from} → ${e.to}`).join('\n')}`;
    }
    if (q.includes('属性')) {
      const target = canvasObjs.find(o => q.includes(o.name));
      if (target) return `「${target.name}」的属性：\n${(target.props ?? []).map(p => `· ${p.name}（${p.type}）`).join('\n')}`;
      return '请指明对象名，如「采购订单的属性是什么」';
    }
    if (q.includes('状态机')) {
      const sm = canvasObjs.filter(o => o.stateMachine);
      return sm.length > 0 ? `有状态机的对象：\n${sm.map(o => `· ${o.name}：${o.stateMachine!.join(' → ')}`).join('\n')}` : '当前本体没有定义状态机的对象';
    }
    return `已收到「${q}」。当前为确定性规则引擎，LLM 自由对话为后续提案。`;
  };

  /* ─── 底部属性面板 ─── */
  const bottomPanel = (
    <Card size="small" style={{ marginTop: 12 }}
      title={<>属性面板{selObj ? ` · 对象 · ${selObj.name}（${selObj.en}）` : selEdge ? ` · 关系 · ${selEdge.name}` : ''}</>}
      extra={<Space>
        {selObj?.stateMachine && <Tag color="orange">⚡ 状态机</Tag>}
        {selObj && <Tag color="blue">{selObj.kind}</Tag>}
        {selEdge && <Tag color="purple">一等公民关系</Tag>}
        {!sel && <Text type="secondary" style={{ fontSize: 12 }}>点击节点或连线查看详情</Text>}
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
            <Space size={6} wrap>{selObj.stateMachine.map((s, i) => (
              <React.Fragment key={s}>{i > 0 && <Text type="secondary">→</Text>}<Tag color={i === selObj.stateMachine!.length - 1 ? 'green' : 'default'}>{s}</Tag></React.Fragment>
            ))}</Space>
          ) : <Text type="secondary" style={{ fontSize: 12 }}>静态事实对象无状态机</Text> },
          { key: 'fn', label: '函数', children: funcs.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12.5 }}>
              {funcs.map(f => (
                <div key={f.id} style={{ display: 'flex', gap: 10 }}>
                  <Tag style={{ flex: 'none' }} color={{ 指标: 'blue', 派生: 'purple', 行动: 'orange', 权限: 'default' }[f.cat]}>{f.cat}</Tag>
                  <span className="mono" style={{ fontSize: 12 }}>{f.name}</span>
                  <Text type="secondary" style={{ fontSize: 12 }}>{f.impl}</Text>
                </div>
              ))}
            </div>
          ) : <Text type="secondary" style={{ fontSize: 12 }}>暂未挂载函数</Text> },
        ]} />
      )}
      {selEdge && (
        <>
          <div style={{ display: 'flex', gap: 24, marginBottom: 10, fontSize: 12.5 }}>
            <span><Text type="secondary">两端　</Text>{selEdge.from} → {selEdge.to}</span>
            <span><Text type="secondary">版本　</Text>{selEdge.version}</span>
            <span><Text type="secondary">被引用　</Text>{selEdge.refCount}</span>
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
      {/* 页头 */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>本体设计器</Title>
          <Text type="secondary">{curName} · {canvasObjs.length} 对象 · {canvasEdges.length} 关系 · React Flow</Text>
        </div>
        <div style={{ flex: 1 }} />
        <Space wrap>
          <Select value={cur?.version ?? '—'} style={{ width: 130 }} disabled
            options={cur ? [{ value: cur.version, label: `${cur.version} · ${cur.status === 'DRAFT' ? '草稿' : '生产中'}` }] : []} />
          <Tooltip title="左侧面板"><Button type={leftOpen ? 'default' : 'text'} icon={<VerticalLeftOutlined />} onClick={() => setLeftOpen(!leftOpen)} /></Tooltip>
          <Tooltip title="底部属性面板"><Button type={bottomOpen ? 'default' : 'text'} icon={<VerticalAlignBottomOutlined />} onClick={() => setBottomOpen(!bottomOpen)} /></Tooltip>
          <Tooltip title="AI 助手"><Button type={rightOpen ? 'default' : 'text'} icon={<VerticalRightOutlined />} onClick={() => setRightOpen(!rightOpen)} /></Tooltip>
          <Button icon={<SaveOutlined />} onClick={() => message.success('草稿已保存')}>保存</Button>
          <Button type="primary" onClick={() => message.info('提交评审请进入治理模块')}>提交评审</Button>
        </Space>
      </div>

      {/* 工作区 */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'stretch', height: 'calc(100vh - 208px)', minHeight: 480 }}>
        {/* 左栏 */}
        {leftOpen && (
          <div style={{ width: 250, flex: 'none', display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0, overflowY: 'auto' }}>
            <Card size="small" title="对象库" extra={<Text type="secondary" style={{ fontSize: 12 }}>{canvasObjs.length} 对象</Text>}>
              <Button type="dashed" block icon={<PlusOutlined />} style={{ marginBottom: 10 }} onClick={() => setAddOpen(true)}>添加对象</Button>
              {KINDS.map(k => {
                const ko = canvasObjs.filter(o => o.kind === k);
                if (ko.length === 0) return null;
                return (
                  <div key={k} style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#5a5a72', marginBottom: 4 }}>▾ {k} <Text type="secondary" style={{ fontSize: 11 }}>{ko.length}</Text></div>
                    {ko.map(o => (
                      <div key={o.id} style={{ padding: '4px 8px 4px 18px', fontSize: 12.5, borderRadius: 6, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', background: sel?.kind === 'node' && sel.id === o.id ? '#ecfdf5' : undefined }}
                        onClick={() => setSel({ kind: 'node', id: o.id })}>
                        <span>{o.name}{o.stateMachine ? ' ⚡' : ''}</span>
                        <Text type="secondary" style={{ fontSize: 10.5, fontFamily: 'monospace' }}>{o.en}</Text>
                      </div>
                    ))}
                  </div>
                );
              })}
            </Card>
          </div>
        )}

        {/* 中间：React Flow 画布 */}
        <Card size="small" style={{ flex: 1, minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column' }}
          styles={{ body: { flex: 1, minHeight: 0, padding: 0 } }}
          title="建模画布"
          extra={<Text type="secondary" style={{ fontSize: 12 }}>拖拽节点 · 滚轮缩放 · 空白处拖拽平移</Text>}>
          <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            nodeTypes={nodeTypes}
            onNodeClick={(_, node) => setSel({ kind: 'node', id: node.id })}
            onEdgeClick={(_, edge) => setSel({ kind: 'edge', id: edge.id })}
            onPaneClick={() => setSel(null)}
            fitView
            minZoom={0.3}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e2e4e9" />
            <Controls showInteractive={false} />
            <MiniMap pannable zoomable nodeColor={(n) => KIND_COLOR[(n.data as { kind: string }).kind] ?? '#64748b'} />
          </ReactFlow>
        </Card>

        {/* 右栏：AI 助手 */}
        {rightOpen && (
          <div style={{ width: 300, flex: 'none', height: '100%' }}>
            <Card size="small" title="AI 建模助手" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
              styles={{ body: { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: 10, overflow: 'hidden' } }}>
              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 11, color: '#6b7688', textAlign: 'center', flex: 'none' }}>确定性规则引擎 · LLM 为后续提案</div>
                {chat.map((m, i) => (
                  <div key={i} style={{
                    fontSize: 12, padding: '8px 10px', borderRadius: 8, flex: 'none',
                    alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                    background: m.role === 'user' ? '#059669' : '#f1f3f5',
                    color: m.role === 'user' ? '#fff' : '#1a1a2e', maxWidth: '90%',
                    whiteSpace: 'pre-wrap',
                  }}>{m.text}</div>
                ))}
              </div>
              <div style={{ flex: 'none', paddingTop: 10, borderTop: '1px solid #f1f3f5', marginTop: 8 }}>
                <Input.Search size="small" placeholder="向 AI 提问 / 建模指令" enterButton="发送"
                  value={input} onChange={e => setInput(e.target.value)}
                  onSearch={v => {
                    if (!v.trim()) return;
                    setChat(c => [...c, { role: 'user', text: v }]);
                    setInput('');
                    setTimeout(() => setChat(c => [...c, { role: 'ai', text: aiReply(v) }]), 300);
                  }} />
                <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 6 }}>
                  对象 {canvasObjs.length} · 关系 {canvasEdges.length}
                </Text>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* 底部属性面板 */}
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
