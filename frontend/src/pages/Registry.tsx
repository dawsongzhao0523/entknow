import { useEffect, useState } from 'react';
import { Card, Table, Tabs, Tag, Typography } from 'antd';
import { api, type Edge, type Func, type OntoObject, type Prop } from '../api';

const { Title, Text } = Typography;

const statusColor: Record<string, string> = { PUBLISHED: 'green', DRAFT: 'default', IN_REVIEW: 'orange', DEPRECATED: 'red' };
const propsText = (ps: Prop[] | undefined) =>
  (ps ?? []).map(p => `${p.name}:${p.type}${p.temporal ? `（${p.temporal}/${p.agg}）` : ''}`).join(' · ') || '—';

function ObjectsTab() {
  const [objs, setObjs] = useState<OntoObject[]>([]);
  const [err, setErr] = useState('');
  useEffect(() => { api.objects().then(setObjs).catch(e => setErr(String(e.message ?? e))); }, []);
  if (err) return <Text type="danger">API 异常：{err}</Text>;
  return (
    <Table<OntoObject> size="small" rowKey="id" pagination={false} dataSource={objs}
      columns={[
        { title: '对象', dataIndex: 'name', render: (v: string, r) => <span><b>{v}</b> <Text type="secondary" style={{ fontSize: 12 }}>{r.en}</Text></span> },
        { title: '类型', dataIndex: 'kind', width: 90 },
        { title: '本体', dataIndex: 'ontology', width: 110,
          render: (v: string, r) => <span>{v}{!r.shared && <Tag style={{ marginLeft: 4 }}>私有</Tag>}</span> },
        { title: '版本/状态', key: 'vs', width: 120,
          render: (_, r) => <span>{r.version} <Tag color={statusColor[r.status]} style={{ marginInlineEnd: 0 }}>{r.status}</Tag></span> },
        { title: '数据映射', dataIndex: 'mapping', width: 190 },
        { title: '属性', key: 'props', render: (_, r) => <Text type="secondary" style={{ fontSize: 12 }}>{propsText(r.props)}</Text> },
        { title: '引用', dataIndex: 'refCount', width: 60, align: 'center' },
        { title: '负责', dataIndex: 'owner', width: 70 },
      ]} />
  );
}

function EdgesTab() {
  const [edges, setEdges] = useState<Edge[]>([]);
  const [err, setErr] = useState('');
  useEffect(() => { api.edges().then(setEdges).catch(e => setErr(String(e.message ?? e))); }, []);
  if (err) return <Text type="danger">API 异常：{err}</Text>;
  return (
    <Table<Edge> size="small" rowKey="id" pagination={false} dataSource={edges}
      columns={[
        { title: '关系（一等公民）', dataIndex: 'name', render: (v: string) => <b>{v}</b> },
        { title: '方向', key: 'dir', width: 170, render: (_, r) => `${r.from} → ${r.to}` },
        { title: '版本/状态', key: 'vs', width: 120,
          render: (_, r) => <span>{r.version} <Tag color={statusColor[r.status]} style={{ marginInlineEnd: 0 }}>{r.status}</Tag></span> },
        { title: '边属性（时序/聚合）', key: 'props', render: (_, r) => <Text type="secondary" style={{ fontSize: 12 }}>{propsText(r.props)}</Text> },
        { title: '引用', dataIndex: 'refCount', width: 60, align: 'center' },
        { title: '权限', dataIndex: 'perm', width: 60, render: (v?: string) => v ? <Tag color="orange">{v}</Tag> : <Tag color="green">use</Tag> },
      ]} />
  );
}

function FuncsTab() {
  const [funcs, setFuncs] = useState<Func[]>([]);
  const [err, setErr] = useState('');
  useEffect(() => { api.functions().then(setFuncs).catch(e => setErr(String(e.message ?? e))); }, []);
  if (err) return <Text type="danger">API 异常：{err}</Text>;
  return (
    <Table<Func> size="small" rowKey="id" pagination={false} dataSource={funcs}
      columns={[
        { title: '函数', dataIndex: 'name', render: (v: string) => <b>{v}</b> },
        { title: '类别', dataIndex: 'cat', width: 70,
          render: (v: string) => <Tag color={{ 指标: 'blue', 派生: 'purple', 行动: 'red', 权限: 'gold' }[v]}>{v}</Tag> },
        { title: '签名', key: 'sig', width: 250, render: (_, r) => <Text code style={{ fontSize: 12 }}>{r.signature}</Text> },
        { title: '测试', dataIndex: 'tests', width: 80, render: (v: string) => <Tag color="green" style={{ marginInlineEnd: 0 }}>{v}</Tag> },
        { title: '近 7 天调用', dataIndex: 'calls7d', width: 100, render: (v?: string) => v || '—' },
        { title: '状态', dataIndex: 'status', width: 100, render: (v: string) => <Tag color={statusColor[v]} style={{ marginInlineEnd: 0 }}>{v}</Tag> },
      ]} />
  );
}

export default function Registry() {
  return (
    <div>
      <Title level={4}>注册中心</Title>
      <Text type="secondary">本体元素事实源：对象 / 关系 / 函数（GET /api/v1/objects · edges · functions）</Text>
      <Card size="small" style={{ marginTop: 12 }}>
        <Tabs items={[
          { key: 'objects', label: `对象`, children: <ObjectsTab /> },
          { key: 'edges', label: '关系', children: <EdgesTab /> },
          { key: 'funcs', label: '函数', children: <FuncsTab /> },
        ]} />
      </Card>
    </div>
  );
}
