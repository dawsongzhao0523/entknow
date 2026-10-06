import { useCallback, useEffect, useState } from 'react';
import {
  App, Alert, Button, Card, Form, Input, InputNumber, Modal, Popconfirm,
  Select, Space, Table, Tag, Typography,
} from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { api, type MenuNode } from '../../api';
import { useSession } from '../../session';

const { Title, Text } = Typography;

const ICON_OPTIONS = [
  'DatabaseOutlined', 'BookOutlined', 'DeploymentUnitOutlined', 'ApiOutlined', 'BulbOutlined',
  'ExperimentOutlined', 'RocketOutlined', 'SafetyCertificateOutlined', 'SettingOutlined',
].map(v => ({ value: v, label: v }));

interface FlatRow extends MenuNode { key: string }

/** 树转表行（antd Table 树形数据用 children 字段即可，这里仅补 key） */
function toRows(nodes: MenuNode[]): FlatRow[] {
  return (nodes ?? []).map(n => ({ ...n, key: n.id, children: n.children ? toRows(n.children) : undefined }));
}

/** 菜单管理：菜单树入库，排序/显隐/路由可维护；导航即菜单（隐藏 = 从导航移除，路由保留） */
export default function Menus() {
  const { message } = App.useApp();
  const { bumpPerms } = useSession();
  const [tree, setTree] = useState<MenuNode[]>([]);
  const [form] = Form.useForm();
  const [editing, setEditing] = useState<MenuNode | null>(null);
  const [parent, setParent] = useState<MenuNode | null>(null); // 新增子菜单的父节点
  const [open, setOpen] = useState(false);

  const reload = useCallback(() => {
    api.menus().then(setTree).catch(e => message.error(String(e.message)));
  }, [message]);

  useEffect(() => { reload(); }, [reload]);

  const save = async () => {
    const v = await form.validateFields();
    try {
      if (editing) {
        await api.updateMenu(editing.id, { ...editing, ...v });
        message.success(`菜单「${v.name}」已更新（导航即时生效）`);
        bumpPerms();
      } else {
        // id 即权限引用键：一级 = key 本身（角色 perms 引用）；子菜单 = 父id/key，路由同 id
        const id = parent ? `${parent.id}/${v.key}` : v.key;
        await api.createMenu({
          id, parentId: parent?.id ?? '', name: v.name,
          route: parent ? id : '', icon: v.icon ?? '', sort: v.sort ?? 99, visible: true,
        });
        message.success(`菜单「${v.name}」已创建（id：${id}）`);
        bumpPerms();
      }
      setOpen(false);
      reload();
    } catch (e) {
      message.error(String((e as Error).message));
    }
  };

  const toggleVisible = async (m: MenuNode) => {
    try {
      await api.updateMenu(m.id, { ...m, visible: !m.visible });
      message.success(`「${m.name}」已${m.visible ? '隐藏（导航移除，路由保留）' : '恢复显示'}`);
      bumpPerms();
      reload();
    } catch (e) {
      message.error(String((e as Error).message));
    }
  };

  const remove = async (m: MenuNode) => {
    try {
      await api.deleteMenu(m.id);
      message.success(`菜单「${m.name}」已删除`);
      bumpPerms();
      reload();
    } catch (e) {
      message.error(String((e as Error).message)); // 有子菜单 409
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>菜单管理</Title>
          <Text type="secondary">平台菜单树：排序、显隐与路由配置；左侧导航即本表实时渲染（按角色权限过滤）</Text>
        </div>
        <div style={{ flex: 1 }} />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => {
          setEditing(null); setParent(null); form.resetFields(); setOpen(true);
        }}>新增一级菜单</Button>
      </div>
      <Alert type="info" showIcon style={{ marginBottom: 12 }}
        message="隐藏菜单不删除路由，仅从导航中移除；删除一级菜单需先清空其子菜单。菜单变更即时生效，无需发布。" />
      <Card>
        <Table<FlatRow>
          size="middle" pagination={false} dataSource={toRows(tree)}
          defaultExpandAllRows
          columns={[
            { title: '菜单名称', dataIndex: 'name', render: (v: string, r) => <span style={{ fontWeight: r.parentId === '' ? 600 : 400 }}>{v}</span> },
            { title: 'ID', dataIndex: 'id', width: 200, render: (v: string) => <Text className="mono" style={{ fontSize: 12 }}>{v}</Text> },
            { title: '路由', dataIndex: 'route', width: 170, render: (v: string) => v
              ? <Text className="mono" style={{ fontSize: 12 }}>/{v}</Text>
              : <Text type="secondary">—</Text> },
            { title: '图标', dataIndex: 'icon', width: 180, render: (v: string) => v ? <Tag>{v}</Tag> : <Text type="secondary">—</Text> },
            { title: '排序', dataIndex: 'sort', width: 70 },
            { title: '状态', dataIndex: 'visible', width: 80,
              render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? '显示' : '隐藏'}</Tag> },
            { title: '操作', key: 'ops', width: 230, render: (_, r) => (
              <Space size={0}>
                <Button size="small" type="link" icon={<EditOutlined />} onClick={() => {
                  setEditing(r); setParent(null);
                  form.setFieldsValue({ name: r.name, route: r.route, icon: r.icon || undefined, sort: r.sort });
                  setOpen(true);
                }}>编辑</Button>
                {r.parentId === '' && (
                  <Button size="small" type="link" onClick={() => {
                    setEditing(null); setParent(r); form.resetFields(); setOpen(true);
                  }}>新增子菜单</Button>
                )}
                <Button size="small" type="link" onClick={() => toggleVisible(r)}>{r.visible ? '隐藏' : '显示'}</Button>
                <Popconfirm title={`删除菜单「${r.name}」？`} onConfirm={() => remove(r)}>
                  <Button size="small" type="link" danger icon={<DeleteOutlined />}>删除</Button>
                </Popconfirm>
              </Space>
            ) },
          ]}
        />
      </Card>

      <Modal title={editing ? `编辑菜单：${editing.name}` : parent ? `新增子菜单 · ${parent.name}` : '新增一级菜单'}
        open={open} onOk={save} onCancel={() => setOpen(false)} okText="保存" cancelText="取消">
        <Form form={form} layout="vertical">
          {!editing && (
            <Form.Item name="key" label={parent ? '路由 Key（英文）' : '模块 Key（英文）'}
              rules={[{ required: true }, { pattern: /^[a-z][a-z0-9-]*$/, message: '仅小写字母/数字/连字符' }]}
              tooltip={parent ? `子菜单 id/路由 = ${parent.id}/<key>` : '一级模块 id，角色权限（perms）引用此键'}>
              <Input className="mono" placeholder={parent ? '如 quality' : '如 report 或 data'} />
            </Form.Item>
          )}
          <Form.Item name="name" label="菜单名称" rules={[{ required: true }]}>
            <Input placeholder={parent ? '如：数据质量' : '如：数据中心'} />
          </Form.Item>
          {editing && (
            <Form.Item name="route" label="路由"
              tooltip="前端路由路径（不含开头 /）；一级菜单通常留空">
              <Input className="mono" placeholder="如 assets/quality" disabled={editing.parentId === ''} />
            </Form.Item>
          )}
          {(!parent && !editing?.parentId) && (
            <Form.Item name="icon" label="图标">
              <Select allowClear options={ICON_OPTIONS} placeholder="选择图标" />
            </Form.Item>
          )}
          <Form.Item name="sort" label="排序" initialValue={99}>
            <InputNumber min={0} max={999} style={{ width: 120 }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
