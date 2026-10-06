import { useCallback, useEffect, useState } from 'react';
import {
  App, Button, Card, Drawer, Form, Input, Modal, Popconfirm, Select, Space,
  Statistic, Table, Tag, Typography,
} from 'antd';
import { ApiOutlined, DeleteOutlined, EditOutlined, PlayCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { api, type Capability, type CapabilityCall } from '../api';

const { Title, Text } = Typography;

const protoColor = (p: string) => (p.includes('MCP') ? 'purple' : p.includes('REST') ? 'blue' : 'cyan');

/** M7 能力出口：目录（真实计数 base+日志）+ 调用记录 + 注册/编辑 */
export default function CapabilityOutlet() {
  const { message } = App.useApp();
  const [caps, setCaps] = useState<Capability[]>([]);
  const [calls, setCalls] = useState<CapabilityCall[]>([]);
  const [detail, setDetail] = useState<Capability | null>(null);
  const [invokeTarget, setInvokeTarget] = useState<Capability | null>(null);
  const [invokeForm] = Form.useForm();
  const [regOpen, setRegOpen] = useState(false);
  const [editing, setEditing] = useState<Capability | null>(null);
  const [regForm] = Form.useForm();

  const reload = useCallback(() => {
    api.capabilities().then(setCaps).catch(e => message.error(String((e as Error).message)));
    if (detail) api.capabilityCalls(detail.id).then(setCalls).catch(() => setCalls([]));
  }, [detail, message]);

  useEffect(() => { reload(); }, [reload]);

  const invoke = async () => {
    if (!invokeTarget) return;
    const v = await invokeForm.validateFields();
    try {
      const out = await api.invokeCapability(invokeTarget.id, {
        id: `call-${Date.now().toString(36)}`, caller: v.caller,
        status: v.status ?? 'ok', latencyMs: Number(v.latencyMs ?? 30),
      });
      message.success(`调用已记录：${out.name} 累计 ${out.callsTotal} 次（含真实 ${out.realCalls} 次）`);
      setInvokeTarget(null);
      reload();
    } catch (e) {
      message.error(String((e as Error).message));
    }
  };

  const save = async () => {
    const v = await regForm.validateFields();
    try {
      if (editing) {
        await api.updateCapability(editing.id, { ...v, id: editing.id, calls: '', callsTotal: 0, realCalls: 0 });
        message.success('能力已更新');
      } else {
        const id = `c-${Date.now().toString(36)}`;
        await api.createCapability({ ...v, id, calls: '', callsTotal: 0, realCalls: 0 });
        message.success(`能力已注册：${id}（幂等）`);
      }
      setRegOpen(false);
      reload();
    } catch (e) {
      message.error(String((e as Error).message));
    }
  };

  const openDetail = async (c: Capability) => {
    setDetail(c);
    try { setCalls(await api.capabilityCalls(c.id)); } catch { setCalls([]); }
  };

  return (
    <div>
      <Title level={4}>能力出口</Title>
      <Text type="secondary">本体能力的统一出口（MCP/REST/CLI）：调用量 = 历史基数 + 真实调用日志，注册与调用均为真实写路径</Text>

      <Card size="small" style={{ marginTop: 12 }} extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => {
          setEditing(null); regForm.resetFields(); setRegOpen(true);
        }}>注册能力</Button>
      }>
        <Table<Capability> size="small" rowKey="id" pagination={false} dataSource={caps}
          onRow={c => ({ onClick: () => openDetail(c), style: { cursor: 'pointer' } })}
          columns={[
            { title: '能力', dataIndex: 'name', render: (v: string) => <Space size={6}><ApiOutlined style={{ color: '#059669' }} /><b>{v}</b></Space> },
            { title: '协议', dataIndex: 'proto', width: 130,
              render: (v: string) => v.split('/').map((p, i) => <Tag key={i} color={protoColor(p)} style={{ marginInlineEnd: i === 0 ? 4 : 0 }}>{p}</Tag>) },
            { title: '描述', dataIndex: 'desc' },
            { title: '累计调用', dataIndex: 'callsTotal', width: 110, align: 'center',
              render: (_v: number, c) => <span><b>{c.calls}</b>{c.realCalls > 0 && <Tag color="green" style={{ marginInlineStart: 6 }}>真实 +{c.realCalls}</Tag>}</span> },
            { title: '负责方', dataIndex: 'owner', width: 84 },
            { title: '操作', key: 'op', width: 200, render: (_, c) => (
              <Space size={0} onClick={e => e.stopPropagation()}>
                <Button size="small" type="link" icon={<PlayCircleOutlined />}
                  onClick={() => { setInvokeTarget(c); invokeForm.setFieldsValue({ caller: 'scm-assistant', status: 'ok', latencyMs: 30 }); }}>
                  调用
                </Button>
                <Button size="small" type="link" icon={<EditOutlined />} onClick={() => {
                  setEditing(c); regForm.setFieldsValue({ name: c.name, desc: c.desc, proto: c.proto, owner: c.owner }); setRegOpen(true);
                }}>编辑</Button>
                <Popconfirm title={`下线「${c.name}」？（连同调用日志清理）`} onConfirm={async () => {
                  try { await api.deleteCapability(c.id); message.success('已下线'); reload(); }
                  catch (e) { message.error(String((e as Error).message)); }
                }}>
                  <Button size="small" type="link" danger icon={<DeleteOutlined />}>下线</Button>
                </Popconfirm>
              </Space>
            ) },
          ]} />
      </Card>

      <Drawer title={detail ? `${detail.name} · 最近调用` : ''} width={520} open={!!detail} onClose={() => setDetail(null)}>
        {detail && <>
          <Statistic title="累计调用" value={detail.callsTotal}
            suffix={<span style={{ fontSize: 13, color: '#5a5a72' }}>（真实日志 {detail.realCalls} 次）</span>} />
          <Table size="small" rowKey="id" style={{ marginTop: 12 }} pagination={false} dataSource={calls}
            columns={[
              { title: '调用方', dataIndex: 'caller', render: (v: string) => <Text code style={{ fontSize: 12 }}>{v}</Text> },
              { title: '状态', dataIndex: 'status', width: 70,
                render: (v: string) => <Tag color={v === 'ok' ? 'green' : 'red'}>{v}</Tag> },
              { title: '耗时', dataIndex: 'latencyMs', width: 80, render: (v: number) => `${v} ms` },
              { title: '时间', dataIndex: 'calledAt', width: 150 },
            ]} />
        </>}
      </Drawer>

      <Modal title={`调用 · ${invokeTarget?.name ?? ''}`} open={!!invokeTarget} onOk={invoke}
        onCancel={() => setInvokeTarget(null)} okText="记录调用（幂等）" cancelText="取消">
        <Form form={invokeForm} layout="vertical">
          <Form.Item name="caller" label="调用方" rules={[{ required: true }]}>
            <Input placeholder="如 scm-assistant / peng-agent" />
          </Form.Item>
          <Space style={{ display: 'flex' }} size={12}>
            <Form.Item name="latencyMs" label="耗时（ms）" style={{ width: 140 }}><Input type="number" /></Form.Item>
            <Form.Item name="status" label="结果" style={{ width: 140 }} initialValue="ok">
              <Select options={[{ value: 'ok', label: '成功' }, { value: 'error', label: '失败' }]} />
            </Form.Item>
          </Space>
        </Form>
      </Modal>

      <Modal title={editing ? `编辑能力：${editing.name}` : '注册能力'} open={regOpen} onOk={save}
        onCancel={() => setRegOpen(false)} okText="保存" cancelText="取消">
        <Form form={regForm} layout="vertical">
          <Form.Item name="name" label="能力名" rules={[{ required: true }]}><Input placeholder="如 kb_search" /></Form.Item>
          <Form.Item name="desc" label="描述"><Input placeholder="能力语义描述" /></Form.Item>
          <Form.Item name="proto" label="协议" rules={[{ required: true }]}>
            <Select options={['MCP/REST/CLI', 'MCP', 'REST', 'CLI'].map(v => ({ value: v, label: v }))} />
          </Form.Item>
          <Form.Item name="owner" label="负责方" initialValue="平台组"><Input /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
