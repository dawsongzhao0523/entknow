import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  App, Button, Card, Drawer, Form, Input, Modal, Popconfirm, Select, Space,
  Table, Tag, Typography,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { api, type Edge, type OntoObject, type Ontology, type Prop } from '../../api';
import { useSession } from '../../session';

const { Title, Text } = Typography;

const KIND_COLOR: Record<string, string> = { 静态事实: '#2563eb', 单体动态: '#059669', 立方动态: '#7c3aed' };
const LAYOUT_KEY = 'entknow.canvas.';

interface Pos { x: number; y: number }

/** 建模画布：当前本体的画布对象（节点）与关系（连线），单选查看/流转/拖拽布局，新建走真实写路径 */
export default function Designer() {
  const { message } = App.useApp();
  const { user, onto, chooseOnto } = useSession();
  const [ontos, setOntos] = useState<Ontology[]>([]);
  const [objects, setObjects] = useState<OntoObject[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selObj, setSelObj] = useState<OntoObject | null>(null);
  const [selEdge, setSelEdge] = useState<Edge | null>(null);
  const [pos, setPos] = useState<Record<string, Pos>>({});
  const dragRef = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const [objForm] = Form.useForm();
  const [objOpen, setObjOpen] = useState(false);

  const cur = ontos.find(o => o.id === onto);
  const canvasObjs = useMemo(() => objects.filter(o => o.canvas && (!cur || o.ontology === cur.name)), [objects, cur]);

  const reload = useCallback(() => {
    api.ontologies(user).then(setOntos).catch(() => {});
    api.objects().then(setObjects).catch(() => {});
    api.edges().then(setEdges).catch(() => {});
  }, [user]);

  useEffect(() => { reload(); }, [reload]);

  // 布局：localStorage 优先，缺省环形自动布局
  const layoutKey = LAYOUT_KEY + (onto || 'default');
  useEffect(() => {
    try { setPos(JSON.parse(localStorage.getItem(layoutKey) || '{}')); } catch { setPos({}); }
  }, [layoutKey]);
  useEffect(() => {
    if (canvasObjs.length === 0) return;
    setPos(prev => {
      const next = { ...prev };
      const R = 190, CX = 400, CY = 240;
      canvasObjs.forEach((o, i) => {
        if (!next[o.id]) {
          const a = (2 * Math.PI * i) / canvasObjs.length - Math.PI / 2;
          next[o.id] = { x: CX + R * Math.cos(a), y: CY + R * Math.sin(a) };
        }
      });
      return next;
    });
  }, [canvasObjs]);

  const saveLayout = () => {
    localStorage.setItem(layoutKey, JSON.stringify(pos));
    message.success('布局已保存（本地）');
  };

  const onSvgMouseDown = (e: React.MouseEvent, id: string) => {
    const p = pos[id];
    dragRef.current = { id, dx: e.clientX - p.x, dy: e.clientY - p.y };
    e.preventDefault();
  };
  const onSvgMouseMove = (e: React.MouseEvent) => {
    const d = dragRef.current;
    if (!d) return;
    setPos(prev => ({ ...prev, [d.id]: { x: e.clientX - d.dx, y: e.clientY - d.dy } }));
  };
  const endDrag = () => { dragRef.current = null; };

  const objName = (id: string) => objects.find(o => o.id === id)?.name ?? id;
  const edgePath = (e: Edge) => {
    const a = pos[e.from] ?? { x: 400, y: 120 };
    const b = pos[e.to] ?? { x: 400, y: 360 };
    const mx = (a.x + b.x) / 2;
    return `M ${a.x} ${a.y} C ${mx} ${a.y}, ${mx} ${b.y}, ${b.x} ${b.y}`;
  };

  const transition = async (o: OntoObject, action: string) => {
    try {
      const r = await fetch(`/api/v1/elements/object/${o.id}/transition`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, by: user }),
      });
      if (!r.ok) throw new Error(((await r.json().catch(() => ({}))) as { error?: string }).error ?? `HTTP ${r.status}`);
      message.success(`${o.name} ${action === 'submit' ? '已提交评审' : action === 'publish' ? '已发布' : '已废弃'}（重放幂等）`);
      reload();
    } catch (err) { message.error(String((err as Error).message)); }
  };

  const createObj = async () => {
    const v = await objForm.validateFields();
    try {
      await api.createObject({
        id: `obj-${Date.now().toString(36)}`, name: v.name, en: v.en, kind: v.kind,
        version: 'v0.1', status: 'DRAFT', owner: user, ontology: cur?.name ?? '供应链本体',
        refCount: 0, shared: false,
        props: [{ name: v.en + '编码', type: 'string', comment: '画布新建，待补全' }],
      });
      message.success(`对象「${v.name}」草稿已创建`);
      setObjOpen(false); objForm.resetFields(); reload();
    } catch (err) { message.error(String((err as Error).message)); }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>建模画布 · {cur?.name ?? '未选择本体'}</Title>
          <Text type="secondary">
            {canvasObjs.length} 对象 · {edges.length} 关系 · 拖拽节点调整布局（本地保存）；
            {!onto && <a onClick={() => chooseOnto('')}> 未选择工作本体，展示供应链默认画布</a>}
          </Text>
        </div>
        <div style={{ flex: 1 }} />
        <Space>
          <Button onClick={saveLayout}>保存布局</Button>
          <Button onClick={() => {
            localStorage.removeItem(layoutKey);
            setPos({});
            message.success('已恢复自动布局');
          }}>重排</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { objForm.resetFields(); setObjOpen(true); }}>新建对象</Button>
        </Space>
      </div>

      <Card size="small" bodyStyle={{ padding: 0, position: 'relative', overflow: 'hidden' }}>
        <svg viewBox="0 0 800 480" style={{ width: '100%', height: 520, display: 'block', background: '#fbfdfc' }}
          onMouseMove={onSvgMouseMove} onMouseUp={endDrag} onMouseLeave={endDrag}>
          <defs>
            <marker id="arrow" markerWidth="8" markerHeight="8" refX="26" refY="3" orient="auto">
              <path d="M0,0 L0,6 L7,3 z" fill="#94a3b8" />
            </marker>
          </defs>
          {edges.map(e => (
            <g key={e.id} onClick={() => { setSelEdge(e); setSelObj(null); }} style={{ cursor: 'pointer' }}>
              <path d={edgePath(e)} fill="none" stroke={selEdge?.id === e.id ? '#059669' : '#94a3b8'}
                strokeWidth={selEdge?.id === e.id ? 2.4 : 1.6} markerEnd="url(#arrow)" />
              <text x={(pos[e.from]?.x ?? 400) + ((pos[e.to]?.x ?? 400) - (pos[e.from]?.x ?? 400)) / 2}
                y={(pos[e.from]?.y ?? 120) + ((pos[e.to]?.y ?? 360) - (pos[e.from]?.y ?? 120)) / 2 - 6}
                textAnchor="middle" fontSize="11" fill="#5a5a72">{e.name}</text>
            </g>
          ))}
          {canvasObjs.map(o => {
            const p = pos[o.id] ?? { x: 400, y: 240 };
            const selected = selObj?.id === o.id;
            return (
              <g key={o.id} transform={`translate(${p.x},${p.y})`}
                onClick={() => { setSelObj(o); setSelEdge(null); }}
                onMouseDown={e => onSvgMouseDown(e, o.id)} style={{ cursor: 'grab' }}>
                <rect x={-64} y={-22} width={128} height={44} rx={9}
                  fill="#fff" stroke={selected ? '#059669' : KIND_COLOR[o.kind] ?? '#64748b'}
                  strokeWidth={selected ? 2.6 : 1.6} />
                <circle cx={-48} cy={0} r={5} fill={KIND_COLOR[o.kind] ?? '#64748b'} />
                <text x={6} y={-2} textAnchor="middle" fontSize="13" fontWeight="600" fill="#1a1a2e">{o.name}</text>
                <text x={6} y={13} textAnchor="middle" fontSize="10" fill="#8a94a6">{o.en} · {o.version}</text>
              </g>
            );
          })}
          {canvasObjs.length === 0 && (
            <text x={400} y={240} textAnchor="middle" fontSize="13" fill="#94a3b8">
              当前本体暂无画布对象——点右上「新建对象」或在「智能建模」生成草稿
            </text>
          )}
        </svg>
      </Card>

      <Drawer title={selObj ? `对象 · ${selObj.name}` : selEdge ? `关系 · ${selEdge.name}` : ''} width={430}
        open={!!selObj || !!selEdge} onClose={() => { setSelObj(null); setSelEdge(null); }}>
        {selObj && <>
          <Space size={6} wrap style={{ marginBottom: 12 }}>
            <Tag color={selObj.status === 'PUBLISHED' ? 'green' : selObj.status === 'IN_REVIEW' ? 'orange' : 'default'}>{selObj.status}</Tag>
            <Tag>{selObj.kind}</Tag><Tag>{selObj.version}</Tag><Tag>引用 {selObj.refCount}</Tag>
          </Space>
          {selObj.stateMachine?.length ? (
            <div style={{ marginBottom: 12 }}><Text type="secondary">状态机：</Text>{selObj.stateMachine.map(s => <Tag key={s}>{s}</Tag>)}</div>
          ) : null}
          <Table<Prop> size="small" rowKey="name" pagination={false} dataSource={selObj.props ?? []}
            columns={[
              { title: '属性', dataIndex: 'name' },
              { title: '类型', dataIndex: 'type', width: 90 },
              { title: '说明', dataIndex: 'comment' },
            ]} />
          <Space style={{ marginTop: 16 }} wrap>
            {selObj.status === 'DRAFT' && (
              <Popconfirm title={`提交「${selObj.name}」评审？`} onConfirm={() => transition(selObj, 'submit')}>
                <Button type="primary">提交评审</Button>
              </Popconfirm>
            )}
            {selObj.status === 'IN_REVIEW' && (
              <Popconfirm title={`发布「${selObj.name}」？`} onConfirm={() => transition(selObj, 'publish')}>
                <Button type="primary">发布</Button>
              </Popconfirm>
            )}
            {selObj.status !== 'DEPRECATED' && (
              <Button danger onClick={() => transition(selObj, 'deprecate')}>废弃</Button>
            )}
          </Space>
        </>}
        {selEdge && <>
          <Space size={6} wrap style={{ marginBottom: 12 }}>
            <Tag color={selEdge.status === 'PUBLISHED' ? 'green' : 'default'}>{selEdge.status}</Tag>
            <Tag>{selEdge.version}</Tag><Tag>引用 {selEdge.refCount}</Tag>
          </Space>
          <Text>{objName(selEdge.from)} <b> —{selEdge.name}→ </b> {objName(selEdge.to)}</Text>
          {selEdge.props?.length ? (
            <Table size="small" rowKey="name" pagination={false} dataSource={selEdge.props}
              columns={[
                { title: '边属性', dataIndex: 'name' },
                { title: '类型', dataIndex: 'type', width: 90 },
              ]} style={{ marginTop: 12 }} />
          ) : <div style={{ marginTop: 12 }}><Text type="secondary">该关系暂无边属性（时序/聚合可在注册中心补充）</Text></div>}
        </>}
      </Drawer>

      <Modal title="新建对象（画布草稿）" open={objOpen} onOk={createObj} onCancel={() => setObjOpen(false)} okText="创建" cancelText="取消">
        <Form form={objForm} layout="vertical">
          <Space style={{ display: 'flex' }} size={12}>
            <Form.Item name="name" label="中文名" rules={[{ required: true }]} style={{ width: 180 }}>
              <Input placeholder="如 来料检验记录" />
            </Form.Item>
            <Form.Item name="en" label="英文名" rules={[{ required: true }]} style={{ width: 180 }}>
              <Input className="mono" placeholder="如 IncomingInspection" />
            </Form.Item>
          </Space>
          <Form.Item name="kind" label="对象类型" initialValue="静态事实" style={{ width: 160 }}>
            <Select options={['静态事实', '单体动态', '立方动态'].map(v => ({ value: v }))} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
