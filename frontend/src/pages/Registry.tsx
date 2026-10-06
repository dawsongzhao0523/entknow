import { useCallback, useEffect, useState } from 'react';
import {
  App, Button, Card, Form, Input, Modal, Popconfirm, Select, Space, Table,
  Tabs, Tag, Typography,
} from 'antd';
import { CheckOutlined, EditOutlined, SendOutlined, StopOutlined } from '@ant-design/icons';
import { api, type Edge, type Func, type OntoObject } from '../api';

const { Title, Text } = Typography;

const statusColor: Record<string, string> = { PUBLISHED: 'green', DRAFT: 'default', IN_REVIEW: 'orange', DEPRECATED: 'red' };
const statusText: Record<string, string> = { PUBLISHED: '已发布', DRAFT: '草稿', IN_REVIEW: '评审中', DEPRECATED: '已废弃' };
const propsText = (ps: { name: string; type: string; temporal?: string; agg?: string }[] | undefined) =>
  (ps ?? []).map(p => `${p.name}:${p.type}${p.temporal ? `（${p.temporal}/${p.agg}）` : ''}`).join(' · ') || '—';

/** 流转动作（按当前状态显示） */
function actions(status: string): { action: string; label: string; danger?: boolean }[] {
  const out: { action: string; label: string; danger?: boolean }[] = [];
  if (status === 'DRAFT') out.push({ action: 'submit', label: '提交评审' }, { action: 'publish', label: '发布' });
  if (status === 'IN_REVIEW') out.push({ action: 'publish', label: '发布' });
  if (status === 'PUBLISHED') out.push({ action: 'deprecate', label: '废弃', danger: true });
  return out;
}

/** M3 注册中心 · 设计器写路径：元素新建/编辑 + 生命周期流转（DRAFT→IN_REVIEW→PUBLISHED） */
export default function Registry() {
  const { message } = App.useApp();
  const [objects, setObjects] = useState<OntoObject[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [funcs, setFuncs] = useState<Func[]>([]);
  const [objForm] = Form.useForm();
  const [objOpen, setObjOpen] = useState(false);
  const [editingObj, setEditingObj] = useState<OntoObject | null>(null);

  const reload = useCallback(() => {
    api.objects().then(setObjects).catch(e => message.error(String((e as Error).message)));
    api.edges().then(setEdges).catch(() => {});
    api.functions().then(setFuncs).catch(() => {});
  }, [message]);

  useEffect(() => { reload(); }, [reload]);

  const transition = async (type: string, id: string, action: string, label: string) => {
    try {
      await fetch(`/api/v1/elements/${type}/${id}/transition`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, by: '张三' }),
      }).then(async r => {
        if (!r.ok) throw new Error(((await r.json().catch(() => ({}))) as { error?: string }).error ?? `HTTP ${r.status}`);
      });
      message.success(`已${label}（重放幂等）`);
      reload();
    } catch (e) {
      message.error(String((e as Error).message)); // 非法迁移 409 直达
    }
  };

  const saveObject = async () => {
    const v = await objForm.validateFields();
    const payload = {
      ...v, props: editingObj?.props ?? [], stateMachine: editingObj?.stateMachine,
      ontology: v.ontology || '供应链本体', owner: v.owner || '张三',
    };
    try {
      if (editingObj) {
        await fetch(`/api/v1/objects/${editingObj.id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
        }).then(async r => { if (!r.ok) throw new Error(((await r.json()) as { error?: string }).error); });
        message.success('对象已更新');
      } else {
        await api.createObject({ ...payload, id: `o-${Date.now().toString(36)}` } as OntoObject);
        message.success('对象已创建（DRAFT，幂等）');
      }
      setObjOpen(false);
      reload();
    } catch (e) {
      message.error(String((e as Error).message));
    }
  };

  const opColumn = (type: string) => ({
    title: '操作', key: 'op', width: 260,
    render: (_v: unknown, r: { id: string; status: string }) => {
      const { id, status } = r;
      return (
        <Space size={0}>
          {actions(status).map(a => (
            <Popconfirm key={a.action} title={`确认${a.label}？`}
              onConfirm={() => transition(type, id, a.action, a.label)}>
              <Button size="small" type="link" danger={a.danger}
                icon={a.action === 'publish' ? <CheckOutlined /> : a.action === 'submit' ? <SendOutlined /> : <StopOutlined />}>
                {a.label}
              </Button>
            </Popconfirm>
          ))}
          {type === 'objects' && (
            <Button size="small" type="link" icon={<EditOutlined />} onClick={() => {
              const o = r as unknown as OntoObject;
              setEditingObj(o);
              objForm.setFieldsValue({ name: o.name, en: o.en, kind: o.kind, mapping: o.mapping, ontology: o.ontology });
              setObjOpen(true);
            }}>编辑</Button>
          )}
        </Space>
      );
    },
  });

  return (
    <div>
      <Title level={4}>注册中心 · 设计器</Title>
      <Text type="secondary">本体元素事实源与生命周期：仅 PUBLISHED 可被引用，关系创建自动联动两端对象引用计数</Text>

      <Card size="small" style={{ marginTop: 12 }}>
        <Tabs items={[
          {
            key: 'objects', label: `对象（${objects.length}）`,
            children: (
              <>
                <Button type="primary" size="small" style={{ marginBottom: 8 }} onClick={() => {
                  setEditingObj(null); objForm.resetFields(); setObjOpen(true);
                }}>新建对象</Button>
                <Table<OntoObject> size="small" rowKey="id" pagination={false} dataSource={objects}
                  columns={[
                    { title: '对象', dataIndex: 'name', render: (v: string, r) => <span><b>{v}</b> <Text type="secondary" style={{ fontSize: 12 }}>{r.en}</Text></span> },
                    { title: '类型', dataIndex: 'kind', width: 90 },
                    { title: '本体', dataIndex: 'ontology', width: 100 },
                    { title: '状态', dataIndex: 'status', width: 84,
                      render: (v: string) => <Tag color={statusColor[v]}>{statusText[v] ?? v}</Tag> },
                    { title: '数据映射', dataIndex: 'mapping', width: 180 },
                    { title: '属性', key: 'props', render: (_, r) => <Text type="secondary" style={{ fontSize: 12 }}>{propsText(r.props)}</Text> },
                    { title: '引用', dataIndex: 'refCount', width: 56, align: 'center' },
                    { title: '版本', dataIndex: 'version', width: 60 },
                    opColumn('objects'),
                  ]} />
              </>
            ),
          },
          {
            key: 'edges', label: `关系（${edges.length}）`,
            children: (
              <Table<Edge> size="small" rowKey="id" pagination={false} dataSource={edges}
                columns={[
                  { title: '关系（一等公民）', dataIndex: 'name', render: (v: string) => <b>{v}</b> },
                  { title: '方向', key: 'dir', width: 170, render: (_, r) => `${r.from} → ${r.to}` },
                  { title: '状态', dataIndex: 'status', width: 84,
                    render: (v: string) => <Tag color={statusColor[v]}>{statusText[v] ?? v}</Tag> },
                  { title: '边属性（时序/聚合）', key: 'props', render: (_, r) => <Text type="secondary" style={{ fontSize: 12 }}>{propsText(r.props)}</Text> },
                  { title: '引用', dataIndex: 'refCount', width: 56, align: 'center' },
                  opColumn('edges'),
                ]} />
            ),
          },
          {
            key: 'funcs', label: `函数（${funcs.length}）`,
            children: (
              <Table<Func> size="small" rowKey="id" pagination={false} dataSource={funcs}
                columns={[
                  { title: '函数', dataIndex: 'name', render: (v: string) => <b>{v}</b> },
                  { title: '类别', dataIndex: 'cat', width: 70,
                    render: (v: string) => <Tag color={{ 指标: 'blue', 派生: 'purple', 行动: 'red', 权限: 'gold' }[v]}>{v}</Tag> },
                  { title: '签名', key: 'sig', width: 240, render: (_, r) => <Text code style={{ fontSize: 12 }}>{r.signature}</Text> },
                  { title: '状态', dataIndex: 'status', width: 84,
                    render: (v: string) => <Tag color={statusColor[v]}>{statusText[v] ?? v}</Tag> },
                  { title: '测试', dataIndex: 'tests', width: 76, render: (v: string) => <Tag color="green" style={{ marginInlineEnd: 0 }}>{v}</Tag> },
                  opColumn('functions'),
                ]} />
            ),
          },
        ]} />
      </Card>

      <Modal title={editingObj ? `编辑对象：${editingObj.name}` : '新建对象（DRAFT）'} open={objOpen}
        onOk={saveObject} onCancel={() => setObjOpen(false)} okText="保存" cancelText="取消">
        <Form form={objForm} layout="vertical">
          <Space style={{ display: 'flex' }} size={12}>
            <Form.Item name="name" label="名称" rules={[{ required: true }]} style={{ width: 140 }}><Input placeholder="如 客户投诉" /></Form.Item>
            <Form.Item name="en" label="英文名" rules={[{ required: true }]} style={{ width: 140 }}><Input placeholder="Complaint" /></Form.Item>
            <Form.Item name="kind" label="类型" initialValue="静态事实" style={{ width: 130 }}>
              <Select options={['静态事实', '单体动态', '立方动态'].map(v => ({ value: v, label: v }))} />
            </Form.Item>
          </Space>
          <Form.Item name="mapping" label="数据映射"><Input placeholder="如 ods_complaint（物理表）" /></Form.Item>
          <Form.Item name="ontology" label="所属本体" initialValue="供应链本体"><Input /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
