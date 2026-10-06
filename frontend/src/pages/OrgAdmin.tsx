import { useCallback, useEffect, useState } from 'react';
import {
  App, Button, Card, Checkbox, Form, Input, Modal, Popconfirm, Select, Space,
  Table, Tabs, Tag, Typography,
} from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { api, type Role, type User } from '../api';

const { Title, Text } = Typography;

const MODULES: [string, string][] = [
  ['m1', '数据资产'], ['m2', '知识运营'], ['m3', '本体建模'], ['m4', '本体运行时'], ['m5', '推理演绎'],
  ['m6', '推演沙盘'], ['m7', '智能应用'], ['m8', '治理演化'], ['m9', '系统管理'],
];

const emptyUser = { account: '', name: '', dept: '', post: '', roles: [] as string[], status: '正常' };
const emptyRole = { name: '', desc: '', perms: [] as string[] };

/** M9 组织与权限：用户 / 角色 管理（内置角色保护、引用保护、账号唯一） */
export default function OrgAdmin() {
  const { message } = App.useApp();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [userForm] = Form.useForm();
  const [roleForm] = Form.useForm();
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [userOpen, setUserOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);

  const reload = useCallback(() => {
    api.users().then(setUsers).catch(e => message.error(String((e as Error).message)));
    api.roles().then(setRoles).catch(() => {});
  }, [message]);

  useEffect(() => { reload(); }, [reload]);

  const saveUser = async () => {
    const v = await userForm.validateFields();
    try {
      if (editingUser) {
        await api.updateUser(editingUser.id, { ...v, id: editingUser.id });
        message.success('用户已更新');
      } else {
        const id = `u-${Date.now().toString(36)}`;
        await api.createUser({ ...v, id });
        message.success(`用户已创建：${id}（幂等）`);
      }
      setUserOpen(false);
      reload();
    } catch (e) {
      message.error(String((e as Error).message)); // 账号冲突 409 / 角色不存在 400
    }
  };

  const saveRole = async () => {
    const v = await roleForm.validateFields();
    try {
      if (editingRole) {
        await api.updateRole(editingRole.id, { ...v, id: editingRole.id, builtIn: editingRole.builtIn });
        message.success('角色已更新');
      } else {
        const id = `role-${Date.now().toString(36)}`;
        await api.createRole({ ...v, id, builtIn: false });
        message.success(`角色已创建：${id}（幂等）`);
      }
      setRoleOpen(false);
      reload();
    } catch (e) {
      message.error(String((e as Error).message));
    }
  };

  const removeRole = async (r: Role) => {
    try {
      await api.deleteRole(r.id);
      message.success(`角色「${r.name}」已删除`);
      reload();
    } catch (e) {
      message.error(String((e as Error).message)); // 内置 400 / 被引用 409
    }
  };

  const usersTab = (
    <Card size="small" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => {
      setEditingUser(null); userForm.resetFields(); setUserOpen(true);
    }}>新建用户</Button>}>
      <Table<User> size="small" rowKey="id" pagination={false} dataSource={users}
        columns={[
          { title: '账号', dataIndex: 'account', render: (v: string) => <Text code>{v}</Text> },
          { title: '姓名', dataIndex: 'name', render: (v: string) => <b>{v}</b> },
          { title: '部门', dataIndex: 'dept' },
          { title: '岗位', dataIndex: 'post' },
          { title: '角色', dataIndex: 'roles', render: (rs: string[]) => rs.map(r => <Tag key={r} color="blue">{r}</Tag>) },
          { title: '状态', dataIndex: 'status', width: 76,
            render: (v: string) => <Tag color={v === '正常' ? 'green' : 'default'}>{v}</Tag> },
          { title: '最近变更', dataIndex: 'lastLogin', width: 140 },
          { title: '操作', key: 'op', width: 150, render: (_, u) => (
            <Space size={0}>
              <Button size="small" type="link" icon={<EditOutlined />} onClick={() => {
                setEditingUser(u);
                userForm.setFieldsValue({ account: u.account, name: u.name, dept: u.dept, post: u.post, roles: u.roles, status: u.status });
                setUserOpen(true);
              }}>编辑</Button>
              {u.status === '正常' && (
                <Popconfirm title={`停用「${u.name}」？`} onConfirm={async () => {
                  try {
                    await api.updateUser(u.id, { ...u, status: '停用' });
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
  );

  const rolesTab = (
    <Card size="small" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => {
      setEditingRole(null); roleForm.resetFields(); setRoleOpen(true);
    }}>新建角色</Button>}>
      <Table<Role> size="small" rowKey="id" pagination={false} dataSource={roles}
        columns={[
          { title: '角色', dataIndex: 'name', render: (v: string, r) => <Space size={6}><b>{v}</b>{r.builtIn && <Tag color="gold">内置</Tag>}</Space> },
          { title: '说明', dataIndex: 'desc' },
          { title: '模块权限', dataIndex: 'perms', render: (ps: string[]) => ps.map(p => (
            <Tag key={p} color="green" style={{ marginInlineEnd: 4 }}>{MODULES.find(([k]) => k === p)?.[1] ?? p}</Tag>
          )) },
          { title: '操作', key: 'op', width: 150, render: (_, r) => (
            <Space size={0}>
              <Button size="small" type="link" icon={<EditOutlined />} onClick={() => {
                setEditingRole(r);
                roleForm.setFieldsValue({ name: r.name, desc: r.desc ?? '', perms: r.perms });
                setRoleOpen(true);
              }}>编辑</Button>
              <Popconfirm title={`删除角色「${r.name}」？`} onConfirm={() => removeRole(r)}>
                <Button size="small" type="link" danger icon={<DeleteOutlined />}>删除</Button>
              </Popconfirm>
            </Space>
          ) },
        ]} />
    </Card>
  );

  return (
    <div>
      <Title level={4}>组织与权限</Title>
      <Text type="secondary">用户与角色的真实管理写路径：账号唯一（409）· 角色引用完整（400）· 内置/被引用角色保护</Text>
      <div style={{ marginTop: 12 }}>
        <Tabs items={[
          { key: 'users', label: `用户（${users.length}）`, children: usersTab },
          { key: 'roles', label: `角色（${roles.length}）`, children: rolesTab },
        ]} />
      </div>

      <Modal title={editingUser ? `编辑用户：${editingUser.name}` : '新建用户'} open={userOpen}
        onOk={saveUser} onCancel={() => setUserOpen(false)} okText="保存" cancelText="取消">
        <Form form={userForm} layout="vertical" initialValues={emptyUser}>
          <Form.Item name="account" label="账号" rules={[{ required: true }]}>
            <Input placeholder="如 wangwu" disabled={!!editingUser} />
          </Form.Item>
          <Form.Item name="name" label="姓名" rules={[{ required: true }]}><Input /></Form.Item>
          <Space style={{ display: 'flex' }} size={12}>
            <Form.Item name="dept" label="部门" style={{ width: 220 }}><Input placeholder="平台部 / 数据AI部" /></Form.Item>
            <Form.Item name="post" label="岗位" style={{ width: 180 }}><Input /></Form.Item>
          </Space>
          <Form.Item name="roles" label="角色" rules={[{ required: true, message: '至少一个角色' }]}>
            <Select mode="multiple" options={roles.map(r => ({ value: r.name, label: r.name }))} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title={editingRole ? `编辑角色：${editingRole.name}` : '新建角色'} open={roleOpen}
        onOk={saveRole} onCancel={() => setRoleOpen(false)} okText="保存" cancelText="取消">
        <Form form={roleForm} layout="vertical" initialValues={emptyRole}>
          <Form.Item name="name" label="角色名" rules={[{ required: true }]}><Input placeholder="如 计划主管" /></Form.Item>
          <Form.Item name="desc" label="说明"><Input placeholder="职责说明" /></Form.Item>
          <Form.Item name="perms" label="模块权限">
            <Checkbox.Group options={MODULES.map(([k, label]) => ({ value: k, label }))} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
