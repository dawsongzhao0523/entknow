import { useState } from 'react';
import { Card, Table, Tag, Button, Input, Select, Space, Typography, Drawer, Form, message } from 'antd';
import { PlusOutlined, ReloadOutlined, ApiOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { DATASOURCES, fmtStatus, type Datasource } from '../../mock/data';
import { ok } from '../../components/proto';

const { Title, Text } = Typography;

function DsDrawer({ open, editing, onClose }: { open: boolean; editing?: Datasource; onClose: () => void }) {
  const [form] = Form.useForm();
  const test = async () => {
    const v = await form.validateFields(['name', 'url']);
    const key = `t-${v.name}`;
    message.loading({ content: `正在连接 ${v.url || v.name} …`, key, duration: 0 });
    setTimeout(() => message.success({ content: `连接成功（mock）· 握手 42ms · 服务端版本 8.0.36 · 可读写`, key, duration: 4 }), 900);
  };
  return (
    <Drawer
      open={open} onClose={onClose} width={520}
      title={editing ? `编辑数据源 · ${editing.name}` : '注册数据源'}
      extra={<Space>
        <Button icon={<ApiOutlined />} onClick={test}>测试连接</Button>
        <Button type="primary" onClick={() => { message.success(editing ? '数据源已更新' : '数据源已注册（mock）· 建议立即执行「探查」采集元数据'); onClose(); }}>保存</Button>
      </Space>}
    >
      <Form form={form} layout="vertical" initialValues={editing ? {
        type: 'mysql', name: editing.name, url: editing.host, user: 'svc_reader', level: editing.sensitive,
      } : { type: 'mysql', level: 'L2' }}>
        <Form.Item name="type" label="类型" rules={[{ required: true }]}>
          <Select style={{ width: 200 }} options={[
            { value: 'mysql', label: 'MySQL' }, { value: 'pg', label: 'PostgreSQL' }, { value: 'sqlserver', label: 'SQL Server' },
            { value: 'oracle', label: 'Oracle' }, { value: 'ck', label: 'ClickHouse' }, { value: 'api', label: 'REST API' },
          ]} />
        </Form.Item>
        <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入数据源名称' }]}>
          <Input className="mono" placeholder="erp_prod" />
        </Form.Item>
        <Form.Item name="url" label="连接串" rules={[{ required: true, message: '请输入连接串' }]}>
          <Input className="mono" placeholder="jdbc:mysql://host:3306/db" />
        </Form.Item>
        <Form.Item name="user" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
          <Input className="mono" placeholder="svc_reader（建议只读账号）" />
        </Form.Item>
        <Form.Item name="pwd" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
          <Input.Password placeholder="••••••••" autoComplete="new-password" />
        </Form.Item>
        <Form.Item name="level" label="敏感分级">
          <Select style={{ width: 200 }} options={['L1', 'L2', 'L3', 'L4'].map(v => ({ value: v, label: `${v}（${['公开', '内部', '敏感', '机密'][+v[1] - 1]}）` }))} />
        </Form.Item>
      </Form>
    </Drawer>
  );
}

const columns = (nav: (p: string) => void, onEdit: (r: Datasource) => void) => [
  {
    title: '数据源', key: 'name',
    render: (_: unknown, r: Datasource) => (
      <>
        <div style={{ fontWeight: 600 }}>{r.name}</div>
        <Text type="secondary" style={{ fontSize: 12 }}>{r.host ?? '插件接入'}</Text>
      </>
    ),
  },
  { title: '类型', dataIndex: 'type', key: 'type', render: (v: string, r: Datasource) => <Tag color={r.kind === '结构化' ? 'blue' : 'purple'}>{v}</Tag> },
  { title: '状态', dataIndex: 'status', key: 'status', render: (v: string) => <Tag color={fmtStatus(v)}>{v}</Tag> },
  { title: '更新策略', dataIndex: 'mode', key: 'mode' },
  { title: '表/文档', key: 'tables', render: (_: unknown, r: Datasource) => r.tables ?? '—' },
  { title: '敏感级', dataIndex: 'sensitive', key: 'sensitive', render: (v: string) => <Tag color={v >= 'L3' ? 'orange' : 'default'}>{v}</Tag> },
  { title: '负责人', dataIndex: 'owner', key: 'owner' },
  { title: '最近同步', dataIndex: 'lastSync', key: 'lastSync', render: (v: string) => <Text className="mono" style={{ fontSize: 12 }}>{v}</Text> },
  {
    title: '操作', key: 'ops',
    render: (_: unknown, r: Datasource) => (
      <Space size={4}>
        <Button size="small" type="link" onClick={() => nav('/assets/profile-report')}>探查</Button>
        <Button size="small" type="link" onClick={() => nav('/assets/sync-policy')}>策略</Button>
        <Button size="small" type="link" onClick={() => onEdit(r)}>编辑</Button>
      </Space>
    ),
  },
];

export default function DatasourceList() {
  const nav = useNavigate();
  const [drawer, setDrawer] = useState<{ open: boolean; editing?: Datasource }>({ open: false });
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>数据源注册</Title>
          <Text type="secondary">结构化 8 类数据库 + 非结构化插件，统一注册、统一敏感分级</Text>
        </div>
        <div style={{ flex: 1 }} />
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => ok('已刷新：23 个数据源 · 心跳正常 19 · 异常 2')}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setDrawer({ open: true })}>注册数据源</Button>
        </Space>
      </div>
      <Card>
        <Space style={{ marginBottom: 12 }} wrap>
          <Input.Search placeholder="搜索名称 / host" style={{ width: 240 }} allowClear />
          <Select defaultValue="all" style={{ width: 140 }} options={[{ value: 'all', label: '类型：全部' }, { value: 's', label: '结构化' }, { value: 'u', label: '非结构化' }]} />
          <Select defaultValue="all" style={{ width: 140 }} options={[{ value: 'all', label: '状态：全部' }, { value: 'ok', label: '正常' }, { value: 'err', label: '异常' }]} />
        </Space>
        <Table<Datasource> rowKey="id" columns={columns(nav, r => setDrawer({ open: true, editing: r })) as never} dataSource={DATASOURCES} size="middle"
          pagination={{ total: 23, pageSize: 10, showTotal: t => `共 ${t} 个 · 正常 19 · 失败 2` }} />
      </Card>
      <DsDrawer open={drawer.open} editing={drawer.editing} onClose={() => setDrawer({ open: false })} />
    </>
  );
}
