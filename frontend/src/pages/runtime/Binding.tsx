import { useCallback, useEffect, useState } from 'react';
import {
  App, Button, Card, Form, Input, Modal, Popconfirm, Select, Space,
  Table, Tabs, Tag, Typography,
} from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, SyncOutlined } from '@ant-design/icons';
import { api, type Binding, type BindingRun, type LogicalView, type OntoObject } from '../../api';
import { useSession } from '../../session';

const { Title, Text } = Typography;

const MODES = ['FULL', 'CDC', 'CRON'];
const empty = { objectId: '', viewId: '', pkField: '', fieldMap: {} as Record<string, string>, syncMode: 'FULL', status: '正常', owner: '' };

/** 数据绑定：对象 ↔ 视图绑定（字段映射 + 同步模式）与手动同步（运行历史落库） */
export default function Binding() {
  const { message } = App.useApp();
  const { user } = useSession();
  const [list, setList] = useState<Binding[]>([]);
  const [objects, setObjects] = useState<OntoObject[]>([]);
  const [views, setViews] = useState<LogicalView[]>([]);
  const [runs, setRuns] = useState<BindingRun[]>([]);
  const [form] = Form.useForm();
  const [editing, setEditing] = useState<Binding | null>(null);
  const [open, setOpen] = useState(false);
  const [mapText, setMapText] = useState('{}');

  const reload = useCallback(() => {
    api.bindings().then(setList).catch(e => message.error(String(e.message)));
    api.objects().then(setObjects).catch(() => {});
    api.viewsList().then(setViews).catch(() => {});
    api.bindingRuns().then(setRuns).catch(() => {});
  }, [message]);

  useEffect(() => { reload(); }, [reload]);

  const openForm = (b: Binding | null) => {
    setEditing(b);
    const fm = b ? b.fieldMap : {};
    setMapText(JSON.stringify(fm, null, 0));
    form.setFieldsValue(b
      ? { objectId: b.objectId, viewId: b.viewId, pkField: b.pkField, syncMode: b.syncMode, status: b.status, owner: b.owner || user }
      : { ...empty, owner: user });
    setOpen(true);
  };

  const save = async () => {
    const v = await form.validateFields();
    let fieldMap: Record<string, string>;
    try {
      fieldMap = JSON.parse(mapText || '{}');
      if (typeof fieldMap !== 'object' || Array.isArray(fieldMap)) throw new Error();
    } catch {
      message.error('字段映射必须是 {"视图字段":"对象属性"} 形式的 JSON 对象');
      return;
    }
    try {
      if (editing) {
        await api.updateBinding(editing.id, { ...v, fieldMap, id: editing.id });
        message.success('绑定已更新');
      } else {
        await api.createBinding({ ...v, fieldMap, id: `bd-${Date.now().toString(36)}` });
        message.success('绑定已创建（可手动同步）');
      }
      setOpen(false); reload();
    } catch (e) { message.error(String((e as Error).message)); }
  };

  const sync = async (b: Binding) => {
    try {
      const run = await api.syncBinding(b.id);
      message.success(run.detail);
      reload();
    } catch (e) { message.error(String((e as Error).message)); }
  };

  const objName = (id: string) => objects.find(o => o.id === id)?.name ?? id;
  const viewName = (id: string) => views.find(v => v.id === id)?.name ?? id;

  return (
    <div>
      <Title level={4}>数据绑定与同步</Title>
      <Text type="secondary">本体对象 ↔ 物理视图：字段映射、同步模式与运行历史（绑定引用完整：对象/视图不存在 400，重复绑定 409）</Text>
      <div style={{ marginTop: 12 }}>
        <Tabs items={[
          { key: 'list', label: `绑定（${list.length}）`, children: (
            <Card size="small" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => openForm(null)}>新建绑定</Button>}>
              <Table<Binding> size="small" rowKey="id" dataSource={list} pagination={false}
                columns={[
                  { title: '对象', dataIndex: 'objectId', render: (v: string) => <b>{objName(v)}</b> },
                  { title: '视图', dataIndex: 'viewId', render: (v: string) => <span className="mono">{viewName(v)}</span> },
                  { title: '主键', dataIndex: 'pkField', width: 110, render: (v: string) => <span className="mono">{v}</span> },
                  { title: '映射', dataIndex: 'fieldMap', render: (m: Record<string, string>) => (
                    <Space size={4} wrap>{Object.entries(m).slice(0, 3).map(([k, v2]) => <Tag key={k}>{k}→{v2}</Tag>)}
                      {Object.keys(m).length > 3 && <Tag>+{Object.keys(m).length - 3}</Tag>}</Space>
                  ) },
                  { title: '模式', dataIndex: 'syncMode', width: 76, render: (v: string) => <Tag>{v}</Tag> },
                  { title: '状态', dataIndex: 'status', width: 76, render: (v: string) => (
                    <Tag color={v === '正常' ? 'green' : v === '告警' ? 'orange' : 'default'}>{v}</Tag>) },
                  { title: '最近同步', dataIndex: 'lastSync', width: 130, render: (v: string) => <span className="mono" style={{ fontSize: 12 }}>{v || '—'}</span> },
                  { title: '操作', key: 'op', width: 190, render: (_, b) => (
                    <Space size={0}>
                      <Button size="small" type="link" icon={<SyncOutlined />} onClick={() => sync(b)}>同步</Button>
                      <Button size="small" type="link" icon={<EditOutlined />} onClick={() => openForm(b)}>编辑</Button>
                      <Popconfirm title={`删除「${objName(b.objectId)}」的绑定？`} onConfirm={async () => {
                        try { await api.deleteBinding(b.id); message.success('已删除（含运行历史）'); reload(); }
                        catch (e) { message.error(String((e as Error).message)); }
                      }}>
                        <Button size="small" type="link" danger icon={<DeleteOutlined />}>删除</Button>
                      </Popconfirm>
                    </Space>
                  ) },
                ]} />
            </Card>
          ) },
          { key: 'runs', label: `同步历史（${runs.length}）`, children: (
            <Card size="small">
              <Table<BindingRun> size="small" rowKey="id" dataSource={runs} pagination={false}
                columns={[
                  { title: '绑定', dataIndex: 'bindingId', width: 90, render: (v: string) => <span className="mono">{v}</span> },
                  { title: '状态', dataIndex: 'status', width: 76, render: (v: string) => <Tag color={v === '成功' ? 'green' : 'red'}>{v}</Tag> },
                  { title: '详情', dataIndex: 'detail' },
                  { title: '时间', dataIndex: 'at', width: 130, render: (v: string) => <span className="mono" style={{ fontSize: 12 }}>{v}</span> },
                ]} />
            </Card>
          ) },
        ]} />
      </div>

      <Modal title={editing ? `编辑绑定：${objName(editing.objectId)}` : '新建绑定'} open={open}
        onOk={save} onCancel={() => setOpen(false)} okText="保存" cancelText="取消" width={520}>
        <Form form={form} layout="vertical">
          <Space style={{ display: 'flex' }} size={12}>
            <Form.Item name="objectId" label="本体对象" rules={[{ required: true }]} style={{ width: 220 }}>
              <Select showSearch optionFilterProp="label"
                options={objects.map(o => ({ value: o.id, label: `${o.name}（${o.id}）` }))} />
            </Form.Item>
            <Form.Item name="viewId" label="绑定视图" rules={[{ required: true }]} style={{ width: 220 }}>
              <Select showSearch optionFilterProp="label"
                options={views.map(v => ({ value: v.id, label: `${v.name}（${v.id}）` }))} />
            </Form.Item>
          </Space>
          <Space style={{ display: 'flex' }} size={12}>
            <Form.Item name="pkField" label="主键字段" style={{ width: 180 }}>
              <Input className="mono" placeholder="如 po_id" />
            </Form.Item>
            <Form.Item name="syncMode" label="同步模式" style={{ width: 120 }}>
              <Select options={MODES.map(v => ({ value: v }))} />
            </Form.Item>
            <Form.Item name="status" label="状态" style={{ width: 110 }}>
              <Select options={['正常', '告警', '停用'].map(v => ({ value: v }))} />
            </Form.Item>
          </Space>
          <Form.Item label="字段映射（JSON：视图字段 → 对象属性）" required>
            <Input.TextArea className="mono" rows={5} value={mapText}
              onChange={e => setMapText(e.target.value)}
              placeholder='{"po_id":"订单号","amount":"金额"}' />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
