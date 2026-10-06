import { useCallback, useEffect, useState } from 'react';
import {
  App, Alert, Button, Card, Form, Input, Modal, Popconfirm, Select, Space,
  Table, Tabs, Tag, Tooltip, Typography,
} from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { api, type DataRule, type Role, type SensRow } from '../../api';
import { useSession } from '../../session';

const { Title, Text } = Typography;

/** 矩阵列兜底（菜单 API 不可用时） */
const FALLBACK_MODULES: [string, string][] = [
  ['m1', '数据资产'], ['m2', '知识运营'], ['m3', '本体建模'], ['m4', '本体运行时'], ['m5', '推理演绎'],
  ['m6', '推演沙盘'], ['m7', '智能应用'], ['m8', '治理演化'], ['m9', '系统管理'],
];

const emptyRule = { id: '', target: '', rule: '', role: '', effect: '', updatedBy: '', updatedAt: '' };

/** M9 权限管理：功能矩阵（roles.perms 派生，点击切换）· 行级规则 CRUD · 敏感级继承（只读推导） */
export default function Permissions() {
  const { message } = App.useApp();
  const { user, bumpPerms } = useSession();
  const [roles, setRoles] = useState<Role[]>([]);
  const [rules, setRules] = useState<DataRule[]>([]);
  const [sens, setSens] = useState<SensRow[]>([]);
  const [modules, setModules] = useState<[string, string][]>(FALLBACK_MODULES);
  const [form] = Form.useForm();
  const [editing, setEditing] = useState<DataRule | null>(null);
  const [open, setOpen] = useState(false);

  const reload = useCallback(() => {
    api.roles().then(setRoles).catch(e => message.error(String(e.message)));
    api.dataRules().then(setRules).catch(e => message.error(String(e.message)));
    api.sensitivity().then(setSens).catch(() => {});
    api.menus().then(tree => {
      if (tree.length) setModules(tree.map(m => [m.id, m.name] as [string, string]));
    }).catch(() => {});
  }, [message]);

  useEffect(() => { reload(); }, [reload]);

  // 矩阵点击切换角色模块权限（内置角色在角色管理中调整，防误操作锁死管理入口）
  const togglePerm = async (r: Role, m: string) => {
    const perms = r.perms.includes(m) ? r.perms.filter(p => p !== m) : [...r.perms, m];
    try {
      await api.updateRole(r.id, { ...r, perms });
      message.success(`「${r.name}」${perms.includes(m) ? '授予' : '移除'}${modules.find(([k]) => k === m)?.[1]}（即时生效于该用户导航）`);
      bumpPerms();
      reload();
    } catch (e) {
      message.error(String((e as Error).message));
    }
  };

  const save = async () => {
    const v = await form.validateFields();
    try {
      if (editing) {
        await api.updateDataRule(editing.id, { ...v, id: editing.id, updatedBy: user });
        message.success('行级规则已更新');
      } else {
        await api.createDataRule({ ...emptyRule, ...v, id: `rls-${Date.now().toString(36)}`, updatedBy: user });
        message.success('行级规则已创建');
      }
      setOpen(false);
      reload();
    } catch (e) {
      message.error(String((e as Error).message)); // 角色不存在 400 / 未知 404
    }
  };

  const matrixTab = (
    <Card size="small">
      <Alert type="info" showIcon style={{ marginBottom: 12 }}
        message="矩阵由角色表实时派生：点击单元格授予/移除模块权限，切换后该角色用户的导航立即变化（切到对应用户即可观察）。内置角色请在「组织与权限」中调整。" />
      <Table<Role> size="small" rowKey="id" pagination={false} dataSource={roles} scroll={{ x: 980 }}
        columns={[
          { title: '角色', dataIndex: 'name', fixed: 'left', render: (v: string, r) => (
            <Space size={6}><b>{v}</b>{r.builtIn && <Tag color="gold">内置</Tag>}</Space>
          ) },
          ...modules.map(([k, label]) => ({
            title: label, key: k, align: 'center' as const,
            render: (_: unknown, r: Role) => {
              const has = r.perms.includes(k);
              const cell = (
                <Tag style={{ cursor: r.builtIn ? 'not-allowed' : 'pointer', marginInlineEnd: 0 }}
                  color={has ? 'green' : 'default'}>{has ? '✓' : '—'}</Tag>
              );
              return r.builtIn
                ? <Tooltip title="内置角色请在「组织与权限」中调整">{cell}</Tooltip>
                : <a onClick={() => togglePerm(r, k)}>{cell}</a>;
            },
          })),
        ]} />
    </Card>
  );

  const dataTab = (
    <Card size="small" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => {
      setEditing(null); form.resetFields(); setOpen(true);
    }}>新增规则</Button>}>
      <Table<DataRule> size="small" rowKey="id" pagination={false} dataSource={rules}
        columns={[
          { title: '作用对象', dataIndex: 'target', render: (v: string) => <b>{v}</b> },
          { title: '行级规则', dataIndex: 'rule', render: (v: string) => <Text className="mono" style={{ fontSize: 12 }}>{v}</Text> },
          { title: '绑定角色', dataIndex: 'role', render: (v: string) => <Tag color="blue">{v}</Tag> },
          { title: '效果', dataIndex: 'effect' },
          { title: '更新', key: 'upd', render: (_, r: DataRule) => (
            <Text type="secondary" style={{ fontSize: 12 }}>{r.updatedBy} · <span className="mono">{r.updatedAt}</span></Text>
          ) },
          { title: '操作', key: 'ops', width: 130, render: (_, r: DataRule) => (
            <Space size={0}>
              <Button size="small" type="link" icon={<EditOutlined />} onClick={() => {
                setEditing(r);
                form.setFieldsValue({ target: r.target, rule: r.rule, role: r.role, effect: r.effect });
                setOpen(true);
              }}>编辑</Button>
              <Popconfirm title={`删除「${r.target}」的行级规则？绑定角色将立即失去对应数据范围。`} onConfirm={async () => {
                try {
                  await api.deleteDataRule(r.id);
                  message.success('规则已删除'); reload();
                } catch (e) { message.error(String((e as Error).message)); }
              }}>
                <Button size="small" type="link" danger icon={<DeleteOutlined />}>删除</Button>
              </Popconfirm>
            </Space>
          ) },
        ]} />
    </Card>
  );

  const inheritTab = (
    <>
      <Alert type="info" showIcon style={{ marginBottom: 12 }}
        message="敏感级继承规则"
        description="逻辑视图的敏感级取其上游依赖数据源的最高等级；敏感级只能升不能降，降敏需治理评审通过。下表由视图上游 × 数据源敏感级实时推导。" />
      <Card size="small">
        <Table<SensRow> size="small" rowKey="asset" pagination={false} dataSource={sens}
          columns={[
            { title: '下游资产', dataIndex: 'asset', render: (v: string) => <span className="mono" style={{ fontSize: 12 }}>{v}</span> },
            { title: '上游依赖', dataIndex: 'upstream', render: (v: string[], r) => (
              <Space size={4} wrap>{v.map((u, i) => <Tag key={u}>{u}（{r.levels[i] ?? '?'}）</Tag>)}</Space>
            ) },
            { title: '继承敏感级', dataIndex: 'inherited', width: 100, render: (v: string) => <Tag color={v === 'L3' ? 'orange' : 'default'}>{v}</Tag> },
            { title: '存量标注', dataIndex: 'stored', width: 90 },
            { title: '规则说明', dataIndex: 'note' },
            { title: '来源', dataIndex: 'by', width: 100 },
          ]} />
      </Card>
    </>
  );

  return (
    <div>
      <Title level={4}>权限管理</Title>
      <Text type="secondary">功能权限矩阵（角色 × 模块，点击切换）· 行级数据权限 · 敏感级继承（实时推导）</Text>
      <div style={{ marginTop: 12 }}>
        <Tabs items={[
          { key: 'matrix', label: '功能权限矩阵', children: matrixTab },
          { key: 'data', label: `数据权限（${rules.length}）`, children: dataTab },
          { key: 'inherit', label: '敏感级继承', children: inheritTab },
        ]} />
      </div>

      <Modal title={editing ? `编辑行级规则：${editing.target}` : '新增行级规则'} open={open}
        onOk={save} onCancel={() => setOpen(false)} okText="保存" cancelText="取消">
        <Form form={form} layout="vertical">
          <Form.Item name="target" label="作用对象" rules={[{ required: true }]}>
            <Input placeholder="如 对象[采购订单] / 视图[lv_order_delivery]" />
          </Form.Item>
          <Form.Item name="rule" label="行级规则" rules={[{ required: true }]}>
            <Input className="mono" placeholder="如 plant_id IN ('RCBJ-YK', 'RCBJ-BSE')" />
          </Form.Item>
          <Form.Item name="role" label="绑定角色" rules={[{ required: true }]}>
            <Select options={roles.map(r => ({ value: r.name, label: r.name }))} />
          </Form.Item>
          <Form.Item name="effect" label="效果说明">
            <Input placeholder="如 仅可见 2 个工厂行" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
