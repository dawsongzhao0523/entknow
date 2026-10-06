import { useCallback, useEffect, useState } from 'react';
import {
  App, Button, Card, Checkbox, Form, Input, InputNumber, Modal, Popconfirm,
  Select, Space, Table, Tabs, Tag, TreeSelect, Typography,
} from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, SyncOutlined } from '@ant-design/icons';
import { api, type MenuNode, type OrgUnit, type Post, type Role, type User } from '../api';
import { useSession } from '../session';

const { Title, Text } = Typography;

/** 模块权限选项兜底（菜单 API 不可用时） */
const FALLBACK_MODULES: [string, string][] = [
  ['assets', '数据资产'], ['knowledge', '知识运营'], ['modeling', '本体建模'], ['runtime', '本体运行时'],
  ['reasoning', '推理演绎'], ['sandbox', '推演沙盘'], ['apps', '智能应用'], ['governance', '治理演化'], ['admin', '系统管理'],
];

const emptyUser = { account: '', name: '', dept: '', post: '', roles: [] as string[], status: '正常' };
const emptyRole = { name: '', desc: '', perms: [] as string[] };

/** antd TreeSelect 数据形状（value/title = 组织全路径，后端组树时已计算） */
function toTreeData(nodes: OrgUnit[]): { value: string; title: string; children?: ReturnType<typeof toTreeData> }[] {
  return nodes.map(n => ({ value: n.path ?? n.name, title: n.path ?? n.name, children: n.children ? toTreeData(n.children) : undefined }));
}

/** 组织与权限：用户 / 角色 / 组织维护 / 岗位维护（组织为树选择，岗位可搜索；同步各归各 tab） */
export default function OrgAdmin() {
  const { message } = App.useApp();
  const { bumpPerms } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [modules, setModules] = useState<[string, string][]>(FALLBACK_MODULES);
  const [orgTree, setOrgTree] = useState<OrgUnit[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [userForm] = Form.useForm();
  const [roleForm] = Form.useForm();
  const [orgForm] = Form.useForm();
  const [postForm] = Form.useForm();
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [editingOrg, setEditingOrg] = useState<OrgUnit | null>(null);
  const [orgParent, setOrgParent] = useState<OrgUnit | null>(null); // 新增子组织的父节点
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [userOpen, setUserOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const [orgOpen, setOrgOpen] = useState(false);
  const [postOpen, setPostOpen] = useState(false);
  const [syncing, setSyncing] = useState('');

  const reload = useCallback(() => {
    api.users().then(setUsers).catch(e => message.error(String(e.message)));
    api.roles().then(setRoles).catch(() => {});
    api.orgUnits().then(setOrgTree).catch(() => {});
    api.posts().then(setPosts).catch(() => {});
    api.menus().then((tree: MenuNode[]) => {
      if (tree.length) setModules(tree.map(m => [m.id, m.name] as [string, string]));
    }).catch(() => {});
  }, [message]);

  useEffect(() => { reload(); }, [reload]);

  // ─── 用户 ───
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
      setUserOpen(false); reload();
    } catch (e) {
      message.error(String((e as Error).message)); // 账号冲突 409 / 角色不存在 400
    }
  };

  // ─── 角色 ───
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
      setRoleOpen(false); bumpPerms(); reload();
    } catch (e) {
      message.error(String((e as Error).message));
    }
  };

  const removeRole = async (r: Role) => {
    try {
      await api.deleteRole(r.id);
      message.success(`角色「${r.name}」已删除`);
      bumpPerms(); reload();
    } catch (e) {
      message.error(String((e as Error).message)); // 内置 400 / 被引用 409
    }
  };

  // ─── 组织 ───
  const saveOrg = async () => {
    const v = await orgForm.validateFields();
    try {
      if (editingOrg) {
        await api.updateOrgUnit(editingOrg.id, {
          ...editingOrg, name: v.name, sort: v.sort ?? editingOrg.sort, parentId: v.parentId ?? editingOrg.parentId,
        });
        message.success(`组织已更新（引用该组织的用户部门已联动）`);
      } else {
        const id = `org-${Date.now().toString(36)}`;
        await api.createOrgUnit({ id, parentId: orgParent?.id ?? '', name: v.name, sort: v.sort ?? 99 });
        message.success(`组织「${v.name}」已创建`);
      }
      setOrgOpen(false); reload();
    } catch (e) {
      message.error(String((e as Error).message)); // 父不存在 400
    }
  };

  const syncOrg = async () => {
    setSyncing('org');
    try {
      const res = await api.syncOrgUnits();
      message.success(`组织同步完成：从 ${res.sources} 个用户部门归集，新增 ${res.added} 个组织（幂等合并）`);
      reload();
    } catch (e) { message.error(String((e as Error).message)); }
    finally { setSyncing(''); }
  };

  // ─── 岗位 ───
  const savePost = async () => {
    const v = await postForm.validateFields();
    try {
      if (editingPost) {
        await api.updatePost(editingPost.id, { ...editingPost, ...v });
        message.success('岗位已更新（引用用户的岗位已联动）');
      } else {
        await api.createPost({ id: `post-${Date.now().toString(36)}`, ...v, sort: v.sort ?? 99 });
        message.success(`岗位「${v.name}」已创建`);
      }
      setPostOpen(false); reload();
    } catch (e) {
      message.error(String((e as Error).message)); // 同名 409
    }
  };

  const syncPost = async () => {
    setSyncing('post');
    try {
      const res = await api.syncPosts();
      message.success(`岗位同步完成：从 ${res.sources} 个用户岗位归集，新增 ${res.added} 个岗位（幂等合并）`);
      reload();
    } catch (e) { message.error(String((e as Error).message)); }
    finally { setSyncing(''); }
  };

  // ─── Tabs 内容 ───
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
            <Tag key={p} color="green" style={{ marginInlineEnd: 4 }}>{modules.find(([k]) => k === p)?.[1] ?? p}</Tag>
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

  interface OrgRow extends OrgUnit { key: string }
  const toOrgRows = (nodes: OrgUnit[]): OrgRow[] =>
    (nodes ?? []).map(n => ({ ...n, key: n.id, children: n.children ? toOrgRows(n.children) : undefined }));

  const orgTab = (
    <Card size="small" extra={
      <Space>
        <Button icon={<SyncOutlined />} loading={syncing === 'org'} onClick={syncOrg}>同步组织架构</Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => {
          setEditingOrg(null); setOrgParent(null); orgForm.resetFields(); setOrgOpen(true);
        }}>新增一级组织</Button>
      </Space>}>
      <Table<OrgRow> size="small" rowKey="key" pagination={false} dataSource={toOrgRows(orgTree)}
        defaultExpandAllRows
        columns={[
          { title: '组织名称', dataIndex: 'name', render: (v: string, r) => (
            <span style={{ fontWeight: r.parentId === '' ? 600 : 400 }}>{v}</span>) },
          { title: '全路径', dataIndex: 'path', render: (v: string) => <Text className="mono" style={{ fontSize: 12 }}>{v}</Text> },
          { title: '排序', dataIndex: 'sort', width: 70 },
          { title: '操作', key: 'ops', width: 220, render: (_, r) => (
            <Space size={0}>
              <Button size="small" type="link" icon={<EditOutlined />} onClick={() => {
                setEditingOrg(r); setOrgParent(null);
                orgForm.setFieldsValue({ name: r.name, sort: r.sort, parentId: r.parentId || undefined });
                setOrgOpen(true);
              }}>编辑</Button>
              <Button size="small" type="link" onClick={() => {
                setEditingOrg(null); setOrgParent(r); orgForm.resetFields(); setOrgOpen(true);
              }}>新增子组织</Button>
              <Popconfirm title={`删除组织「${r.name}」？`} onConfirm={async () => {
                try { await api.deleteOrgUnit(r.id); message.success('已删除'); reload(); }
                catch (e) { message.error(String((e as Error).message)); } // 有子组织/被引用 409
              }}>
                <Button size="small" type="link" danger icon={<DeleteOutlined />}>删除</Button>
              </Popconfirm>
            </Space>
          ) },
        ]} />
    </Card>
  );

  const postTab = (
    <Card size="small" extra={
      <Space>
        <Button icon={<SyncOutlined />} loading={syncing === 'post'} onClick={syncPost}>同步岗位</Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => {
          setEditingPost(null); postForm.resetFields(); setPostOpen(true);
        }}>新增岗位</Button>
      </Space>}>
      <Table<Post> size="small" rowKey="id" pagination={false} dataSource={posts}
        columns={[
          { title: '岗位', dataIndex: 'name', render: (v: string) => <b>{v}</b> },
          { title: '说明', dataIndex: 'descr' },
          { title: '在岗人数', key: 'n', width: 90, align: 'center',
            render: (_, p) => users.filter(u => u.post === p.name).length },
          { title: '排序', dataIndex: 'sort', width: 70 },
          { title: '操作', key: 'ops', width: 150, render: (_, p) => (
            <Space size={0}>
              <Button size="small" type="link" icon={<EditOutlined />} onClick={() => {
                setEditingPost(p);
                postForm.setFieldsValue({ name: p.name, descr: p.descr, sort: p.sort });
                setPostOpen(true);
              }}>编辑</Button>
              <Popconfirm title={`删除岗位「${p.name}」？`} onConfirm={async () => {
                try { await api.deletePost(p.id); message.success('已删除'); reload(); }
                catch (e) { message.error(String((e as Error).message)); } // 被引用 409
              }}>
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
      <Text type="secondary">用户 / 角色 / 组织架构（树） / 岗位 · 字典治理与归集同步（重命名联动用户、引用保护）</Text>
      <div style={{ marginTop: 12 }}>
        <Tabs items={[
          { key: 'users', label: `用户（${users.length}）`, children: usersTab },
          { key: 'roles', label: `角色（${roles.length}）`, children: rolesTab },
          { key: 'org', label: `组织维护（${orgTree.length}）`, children: orgTab },
          { key: 'posts', label: `岗位维护（${posts.length}）`, children: postTab },
        ]} />
      </div>

      <Modal title={editingUser ? `编辑用户：${editingUser.name}` : '新建用户'} open={userOpen}
        onOk={saveUser} onCancel={() => setUserOpen(false)} okText="保存" cancelText="取消">
        <Form form={userForm} layout="vertical" initialValues={emptyUser}>
          <Form.Item name="account" label="账号" rules={[{ required: true }]}>
            <Input placeholder="如 wangwu" disabled={!!editingUser} />
          </Form.Item>
          <Form.Item name="name" label="姓名" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="dept" label="组织架构" rules={[{ required: true, message: '请选择组织' }]}>
            <TreeSelect
              showSearch treeNodeFilterProp="title" allowClear
              treeDefaultExpandAll placeholder="搜索并选择组织（树）"
              treeData={toTreeData(orgTree)} />
          </Form.Item>
          <Form.Item name="post" label="岗位" rules={[{ required: true, message: '请选择岗位' }]}>
            <Select showSearch optionFilterProp="label" allowClear
              placeholder="搜索并选择岗位"
              options={posts.map(p => ({ value: p.name, label: p.name }))} />
          </Form.Item>
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
            <Checkbox.Group options={modules.map(([k, label]) => ({ value: k, label }))} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title={editingOrg ? `编辑组织：${editingOrg.name}` : orgParent ? `新增子组织 · ${orgParent.name}` : '新增一级组织'}
        open={orgOpen} onOk={saveOrg} onCancel={() => setOrgOpen(false)} okText="保存" cancelText="取消">
        <Form form={orgForm} layout="vertical">
          <Form.Item name="name" label="组织名称" rules={[{ required: true }]}>
            <Input placeholder={orgParent ? '如：数据质量组' : '如：质量管理部'} />
          </Form.Item>
          <Form.Item name="sort" label="排序" initialValue={99}>
            <InputNumber min={0} max={999} style={{ width: 120 }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title={editingPost ? `编辑岗位：${editingPost.name}` : '新增岗位'} open={postOpen}
        onOk={savePost} onCancel={() => setPostOpen(false)} okText="保存" cancelText="取消">
        <Form form={postForm} layout="vertical">
          <Form.Item name="name" label="岗位名称" rules={[{ required: true }]}>
            <Input placeholder="如：质量工程师" />
          </Form.Item>
          <Form.Item name="descr" label="说明"><Input placeholder="职责说明" /></Form.Item>
          <Form.Item name="sort" label="排序" initialValue={99}>
            <InputNumber min={0} max={999} style={{ width: 120 }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
