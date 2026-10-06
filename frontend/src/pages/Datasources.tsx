import { useCallback, useEffect, useState } from 'react';
import { App, Button, Card, Form, Input, Modal, Popconfirm, Select, Space, Table, Tag, Typography } from 'antd';
import { EditOutlined, PlusOutlined } from '@ant-design/icons';
import { api, type Datasource } from '../api';

const { Title, Text } = Typography;

const statusColor: Record<string, string> = { 正常: 'green', 异常: 'red', 停用: 'default' };
const modeText: Record<string, string> = { NONE: '不更新', CRON: '定时', CDC: 'CDC', EVENT: '事件' };
const MODES = ['NONE', 'CRON', 'CDC', 'EVENT'];
const SENS = ['L1', 'L2', 'L3', 'L4'];

const empty = { name: '', type: 'MySQL', kind: '结构化', host: '', status: '正常', mode: 'CRON', sensitive: 'L2', owner: '张三', tables: 0 };

/** 数据源中心：注册 / 编辑 / 同步策略 / 停用（真实写路径） */
export default function Datasources() {
  const { message } = App.useApp();
  const [dss, setDss] = useState<Datasource[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Datasource | null>(null);
  const [form] = Form.useForm();

  const reload = useCallback(() => {
    api.datasources().then(setDss).catch(e => message.error(String((e as Error).message)));
  }, [message]);

  useEffect(() => { reload(); }, [reload]);

  const save = async () => {
    const v = await form.validateFields();
    try {
      if (editing) {
        await api.updateDatasource(editing.id, { ...v, id: editing.id, tables: Number(v.tables ?? 0), lastSync: editing.lastSync });
        message.success('数据源已更新');
      } else {
        const id = `ds-${Date.now().toString(36)}`;
        await api.createDatasource({ ...v, id, tables: Number(v.tables ?? 0), lastSync: '' });
        message.success(`数据源已注册：${id}（幂等；重名会被拒绝）`);
      }
      setOpen(false);
      reload();
    } catch (e) {
      message.error(String((e as Error).message)); // 重名 409 / 非法 mode 400
    }
  };

  return (
    <div>
      <Title level={4}>数据源中心</Title>
      <Text type="secondary">业务数据连接的注册、同步策略与生命周期（POST/PUT /api/v1/datasources）</Text>

      <Card size="small" style={{ marginTop: 12 }} extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => {
          setEditing(null); form.resetFields(); setOpen(true);
        }}>注册数据源</Button>
      }>
        <Table<Datasource> size="small" rowKey="id" pagination={false} dataSource={dss}
          columns={[
            { title: '数据源', dataIndex: 'name', render: (v: string) => <b>{v}</b> },
            { title: '类型', dataIndex: 'type', width: 110 },
            { title: '形态', dataIndex: 'kind', width: 80 },
            { title: '连接', dataIndex: 'host', render: (v?: string) => <Text code style={{ fontSize: 12 }}>{v || '—'}</Text> },
            { title: '状态', dataIndex: 'status', width: 70, render: (v: string) => <Tag color={statusColor[v]}>{v}</Tag> },
            { title: '同步', dataIndex: 'mode', width: 70, render: (v: string) => modeText[v] },
            { title: '表数', dataIndex: 'tables', width: 60, align: 'center', render: (v?: number) => v ?? '—' },
            { title: '敏感级', dataIndex: 'sensitive', width: 70, align: 'center' },
            { title: '负责人', dataIndex: 'owner', width: 70 },
            { title: '最近同步', dataIndex: 'lastSync', width: 130 },
            { title: '操作', key: 'op', width: 140, render: (_, d) => (
              <Space size={0}>
                <Button size="small" type="link" icon={<EditOutlined />} onClick={() => {
                  setEditing(d);
                  form.setFieldsValue({ name: d.name, type: d.type, kind: d.kind, host: d.host ?? '',
                    status: d.status, mode: d.mode, sensitive: d.sensitive, owner: d.owner, tables: d.tables ?? 0 });
                  setOpen(true);
                }}>编辑</Button>
                {d.status !== '停用' && (
                  <Popconfirm title={`停用「${d.name}」？`} onConfirm={async () => {
                    try {
                      await api.updateDatasource(d.id, { ...d, status: '停用' });
                      message.success('已停用'); reload();
                    } catch (e) { message.error(String((e as Error).message)); }
                  }}>
                    <Button size="small" type="link" danger>停用</Button>
                  </Popconfirm>
                )}
              </Space>
            ) },
          ]} />
      </Card>

      <Modal title={editing ? `编辑数据源：${editing.name}` : '注册数据源'} open={open} onOk={save}
        onCancel={() => setOpen(false)} okText="保存" cancelText="取消">
        <Form form={form} layout="vertical" initialValues={empty}>
          <Space style={{ display: 'flex' }} size={12}>
            <Form.Item name="name" label="名称" rules={[{ required: true }]} style={{ width: 180 }}>
              <Input placeholder="如 crm_prod" />
            </Form.Item>
            <Form.Item name="type" label="类型" style={{ width: 140 }}>
              <Select options={['MySQL', 'PostgreSQL', 'SQLServer', 'Oracle', 'ClickHouse', '飞书知识库'].map(v => ({ value: v, label: v }))} />
            </Form.Item>
            <Form.Item name="kind" label="形态" style={{ width: 110 }} initialValue="结构化">
              <Select options={[{ value: '结构化', label: '结构化' }, { value: '非结构化', label: '非结构化' }]} />
            </Form.Item>
          </Space>
          <Form.Item name="host" label="连接串"><Input placeholder="mysql://192.0.2.x:3306/db（示例地址）" /></Form.Item>
          <Space style={{ display: 'flex' }} size={12}>
            <Form.Item name="mode" label="同步策略" style={{ width: 130 }}>
              <Select options={MODES.map(m => ({ value: m, label: modeText[m] }))} />
            </Form.Item>
            <Form.Item name="sensitive" label="敏感级" style={{ width: 90 }}>
              <Select options={SENS.map(s => ({ value: s, label: s }))} />
            </Form.Item>
            <Form.Item name="status" label="状态" style={{ width: 110 }} initialValue="正常">
              <Select options={['正常', '异常', '停用'].map(s => ({ value: s, label: s }))} />
            </Form.Item>
          </Space>
          <Space style={{ display: 'flex' }} size={12}>
            <Form.Item name="owner" label="负责人" style={{ width: 140 }} initialValue="张三"><Input /></Form.Item>
            <Form.Item name="tables" label="表数" style={{ width: 120 }} initialValue={0}><Input type="number" /></Form.Item>
          </Space>
        </Form>
      </Modal>
    </div>
  );
}
