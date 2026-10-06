import { useCallback, useEffect, useState } from 'react';
import { App, Button, Card, Form, Input, Modal, Popconfirm, Select, Space, Table, Tag, Typography } from 'antd';
import { EditOutlined, PlusOutlined } from '@ant-design/icons';
import { api, type LogicalView } from '../api';

const { Title, Text } = Typography;

const statusColor: Record<string, string> = { PUBLISHED: 'green', DRAFT: 'default', DEPRECATED: 'red' };
const empty = { name: '', kind: 'LOGICAL', domain: '供应链', sensitive: 'L2', owner: '张三', refresh: '', upstream: '', boundBy: '' };

/** M1 逻辑视图：联邦层视图管理（对象绑定视图而非裸表） */
export default function LogicalViews() {
  const { message } = App.useApp();
  const [views, setViews] = useState<LogicalView[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<LogicalView | null>(null);
  const [form] = Form.useForm();

  const reload = useCallback(() => {
    api.viewsList().then(setViews).catch(e => message.error(String((e as Error).message)));
  }, [message]);

  useEffect(() => { reload(); }, [reload]);

  const save = async (statusOverride?: string) => {
    const v = await form.validateFields();
    const payload = {
      name: v.name.trim(), kind: v.kind, domain: v.domain, sensitive: v.sensitive, owner: v.owner,
      refresh: v.refresh ?? '', status: statusOverride ?? (editing?.status ?? 'DRAFT'),
      version: editing?.version ?? 'v1',
      upstream: (v.upstream ?? '').split('\n').map((s: string) => s.trim()).filter(Boolean),
      boundBy: editing?.boundBy ?? [],
    };
    try {
      if (editing) {
        await api.updateView(editing.id, { ...payload, id: editing.id });
        message.success('视图已更新');
      } else {
        const id = `v-${Date.now().toString(36)}`;
        await api.createView({ ...payload, id });
        message.success(`视图已创建：${id}（幂等）`);
      }
      setOpen(false);
      reload();
    } catch (e) {
      message.error(String((e as Error).message));
    }
  };

  return (
    <div>
      <Title level={4}>逻辑视图</Title>
      <Text type="secondary">联邦层跨源视图：对象绑定视图而非裸表（POST/PUT /api/v1/views，下线即 DEPRECATED）</Text>

      <Card size="small" style={{ marginTop: 12 }} extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => {
          setEditing(null); form.resetFields(); setOpen(true);
        }}>新建视图</Button>
      }>
        <Table<LogicalView> size="small" rowKey="id" pagination={false} dataSource={views}
          columns={[
            { title: '视图', dataIndex: 'name', render: (v: string) => <Text code>{v}</Text> },
            { title: '类型', dataIndex: 'kind', width: 120,
              render: (v: string) => <Tag color={v === 'LOGICAL' ? 'blue' : 'purple'}>{v === 'LOGICAL' ? '逻辑' : '物化'}</Tag> },
            { title: '版本/状态', key: 'vs', width: 150,
              render: (_, r) => <span>{r.version} <Tag color={statusColor[r.status]} style={{ marginInlineEnd: 0 }}>{r.status}</Tag></span> },
            { title: '上游', dataIndex: 'upstream', render: (us: string[]) => us.map(u => <Tag key={u} style={{ marginInlineEnd: 4 }}>{u}</Tag>) },
            { title: '被绑定', dataIndex: 'boundBy', render: (bs: string[]) => bs.length ? bs.join(' · ') : <Text type="secondary">—</Text> },
            { title: '敏感级', dataIndex: 'sensitive', width: 70, align: 'center' },
            { title: '刷新', dataIndex: 'refresh', width: 120, render: (v?: string) => v || '—' },
            { title: '负责人', dataIndex: 'owner', width: 70 },
            { title: '操作', key: 'op', width: 150, render: (_, v) => (
              <Space size={0}>
                <Button size="small" type="link" icon={<EditOutlined />} onClick={() => {
                  setEditing(v);
                  form.setFieldsValue({ name: v.name, kind: v.kind, domain: v.domain, sensitive: v.sensitive,
                    owner: v.owner, refresh: v.refresh ?? '', upstream: v.upstream.join('\n'), boundBy: v.boundBy.join('\n') });
                  setOpen(true);
                }}>编辑</Button>
                {v.status !== 'DEPRECATED' && (
                  <Popconfirm title={`下线「${v.name}」？（DEPRECATED，记录保留）`} onConfirm={async () => {
                    try {
                      await api.updateView(v.id, { ...v, status: 'DEPRECATED' });
                      message.success('已下线'); reload();
                    } catch (e) { message.error(String((e as Error).message)); }
                  }}>
                    <Button size="small" type="link" danger>下线</Button>
                  </Popconfirm>
                )}
              </Space>
            ) },
          ]} />
      </Card>

      <Modal title={editing ? `编辑视图：${editing.name}` : '新建逻辑视图'} open={open}
        onOk={() => save()} onCancel={() => setOpen(false)} okText="保存" cancelText="取消">
        <Form form={form} layout="vertical" initialValues={empty}>
          <Space style={{ display: 'flex' }} size={12}>
            <Form.Item name="name" label="视图名" rules={[{ required: true }]} style={{ width: 200 }}>
              <Input placeholder="如 lv_order_delivery" />
            </Form.Item>
            <Form.Item name="kind" label="类型" style={{ width: 110 }}>
              <Select options={[{ value: 'LOGICAL', label: '逻辑' }, { value: 'MATERIALIZED', label: '物化' }]} />
            </Form.Item>
          </Space>
          <Space style={{ display: 'flex' }} size={12}>
            <Form.Item name="domain" label="域" style={{ width: 130 }}><Input /></Form.Item>
            <Form.Item name="sensitive" label="敏感级" style={{ width: 90 }}>
              <Select options={['L1', 'L2', 'L3', 'L4'].map(s => ({ value: s, label: s }))} />
            </Form.Item>
            <Form.Item name="owner" label="负责人" style={{ width: 150 }}><Input /></Form.Item>
          </Space>
          <Form.Item name="upstream" label="上游（每行一条，如 purchase_order(scm_prod)）">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="refresh" label="刷新策略（物化视图，如 CRON 0 3 * * *）"><Input /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
