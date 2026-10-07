import { useCallback, useEffect, useState } from 'react';
import {
  App, Button, Card, Descriptions, Form, Input, Modal, Popconfirm, Select,
  Space, Table, Tabs, Tag, Typography,
} from 'antd';
import { EditOutlined, PlusOutlined } from '@ant-design/icons';
import { api, type Datasource, type FieldProfile, type TableProfile, type User } from '../api';

const { Title, Text } = Typography;

const statusColor: Record<string, string> = { 正常: 'green', 异常: 'red', 停用: 'default' };
const modeText: Record<string, string> = { NONE: '不更新', CRON: '定时', CDC: 'CDC', EVENT: '事件' };
const MODES = ['NONE', 'CRON', 'CDC', 'EVENT'];
const SENS = ['L1', 'L2', 'L3', 'L4'];

const empty = { name: '', type: 'MySQL', kind: '结构化', host: '', status: '正常', mode: 'CRON', sensitive: 'L2', owner: '张三', tables: 0 };

/** 数据源中心：注册 / 编辑 / 同步策略 / 停用（真实写路径） */

/** 元数据探查：按表名取真实 table_profiles */
function ProfilePanel() {
  const { message } = App.useApp();
  const [name, setName] = useState('purchase_order');
  const [profile, setProfile] = useState<TableProfile | null>(null);
  const search = async () => {
    try {
      setProfile(await api.tableProfile(name.trim()));
    } catch (e) {
      setProfile(null);
      message.error(String((e as Error).message));
    }
  };
  useEffect(() => { search(); /* eslint-disable-next-line */ }, []);
  return (
    <Card size="small">
      <Space style={{ marginBottom: 12 }}>
        <Input className="mono" style={{ width: 240 }} value={name} onChange={e => setName(e.target.value)}
          placeholder="表名，如 purchase_order" onPressEnter={search} />
        <Button type="primary" onClick={search}>探查</Button>
      </Space>
      {profile && <>
        <Descriptions size="small" bordered column={4}>
          <Descriptions.Item label="表名"><span className="mono">{profile.name}</span></Descriptions.Item>
          <Descriptions.Item label="注释">{profile.comment}</Descriptions.Item>
          <Descriptions.Item label="行数">{profile.rows}</Descriptions.Item>
          <Descriptions.Item label="字段数">{profile.fields}</Descriptions.Item>
          <Descriptions.Item label="主键"><span className="mono">{profile.pk}</span></Descriptions.Item>
          <Descriptions.Item label="外键" span={3}>{profile.fks.join(' · ')}</Descriptions.Item>
        </Descriptions>
        <Table size="small" rowKey="name" style={{ marginTop: 12 }} pagination={false}
          dataSource={profile.profileFields}
          columns={[
            { title: '字段', dataIndex: 'name', render: (v: string) => <span className="mono">{v}</span> },
            { title: '类型', dataIndex: 'type', width: 130 },
            { title: '空值率', dataIndex: 'nullRate', width: 90 },
            { title: '示例', dataIndex: 'sample', width: 200 },
            { title: '注释', dataIndex: 'comment', render: (v: string, r: FieldProfile) => v || (r.aiFilled ? <Tag color="purple">AI 补全</Tag> : '—') },
          ]} />
      </>}
    </Card>
  );
}

export default function Datasources() {
  const { message } = App.useApp();
  const [dss, setDss] = useState<Datasource[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Datasource | null>(null);
  const [testing, setTesting] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [form] = Form.useForm();

  const reload = useCallback(() => {
    api.datasources().then(setDss).catch(e => message.error(String((e as Error).message)));
    api.users().then(setUsers).catch(() => {});
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

      <div style={{ marginTop: 12 }}>
      <Tabs items={[
        { key: 'list', label: `结构化数据源（${dss.filter(d => d.kind === '结构化').length}）`, children: (
      <Card size="small" extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => {
          setEditing(null); form.resetFields(); setOpen(true);
        }}>注册数据源</Button>
      }>
        <Table<Datasource> size="small" rowKey="id" pagination={false} dataSource={dss.filter(d => d.kind === '结构化')}
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
        ) },
        { key: 'docs', label: `文档源（${dss.filter(d => d.kind === '非结构化').length}）`, children: (
          <Card size="small">
            <Table<Datasource> size="small" rowKey="id" pagination={false}
              dataSource={dss.filter(d => d.kind === '非结构化')}
              columns={[
                { title: '数据源', dataIndex: 'name', render: (v: string) => <b>{v}</b> },
                { title: '类型', dataIndex: 'type', width: 110 },
                { title: '同步', dataIndex: 'mode', width: 70, render: (v: string) => modeText[v] },
                { title: '状态', dataIndex: 'status', width: 70 },
                { title: '负责人', dataIndex: 'owner', width: 80 },
                { title: '最近同步', dataIndex: 'lastSync', width: 130 },
              ]} />
          </Card>
        ) },
        { key: 'profile', label: '元数据探查', children: <ProfilePanel /> },
        { key: 'policy', label: '更新策略', children: (
          <Card size="small">
            <Table<Datasource> size="small" rowKey="id" pagination={false} dataSource={dss}
              columns={[
                { title: '数据源', dataIndex: 'name', render: (v: string) => <b>{v}</b> },
                { title: '类型', dataIndex: 'type', width: 110 },
                { title: '状态', dataIndex: 'status', width: 80, render: (v: string) => (
                  <Tag color={statusColor[v]}>{v}</Tag>) },
                { title: '表数', dataIndex: 'tables', width: 70, align: 'center', render: (v?: number) => v ?? '—' },
                { title: '更新策略', key: 'mode', width: 220, render: (_, d) => (
                  <Select size="small" value={d.mode} style={{ width: 150 }}
                    options={MODES.map(m => ({ value: m, label: modeText[m] }))}
                    onChange={async mode => {
                      try {
                        await api.updateDatasource(d.id, { ...d, mode });
                        message.success(`「${d.name}」更新策略 → ${modeText[mode]}`);
                        reload();
                      } catch (e) { message.error(String((e as Error).message)); }
                    }} />) },
                { title: '最近同步', dataIndex: 'lastSync', width: 130 },
              ]} />
          </Card>
        ) },
      ]} />
      </div>

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
          <Form.Item label="连接串" style={{ marginBottom: 8 }}>
            <Space.Compact style={{ display: 'flex' }}>
              <Form.Item name="host" noStyle><Input placeholder="mysql://用户名:密码@192.0.2.x:3306/数据库名" /></Form.Item>
              <Button loading={testing} onClick={async () => {
                const host = form.getFieldValue('host');
                const type = form.getFieldValue('type') || 'MySQL';
                if (!host) { message.warning('请先填写连接串'); return; }
                setTesting(true);
                try {
                  const res = await api.testDatasource(host, type);
                  message.success(`连接成功 · ${res.tables} 张表 · 延迟 ${res.latency}`);
                  form.setFieldsValue({ tables: res.tables });
                } catch (e) { message.error(String((e as Error).message)); }
                finally { setTesting(false); }
              }}>测试连接</Button>
            </Space.Compact>
          </Form.Item>
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
            <Form.Item name="owner" label="负责人" style={{ width: 180 }}>
              <Select showSearch optionFilterProp="label" placeholder="选择负责人"
                options={users.map(u => ({ value: u.name, label: `${u.name} · ${u.post}` }))} />
            </Form.Item>
            <Form.Item name="tables" label="表数" style={{ width: 120 }} initialValue={0}><Input type="number" /></Form.Item>
          </Space>
        </Form>
      </Modal>
    </div>
  );
}
