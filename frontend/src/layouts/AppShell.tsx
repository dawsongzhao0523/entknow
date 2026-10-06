import { useEffect, useMemo, useState } from 'react';
import { App, Avatar, Badge, Button, Layout, Menu, Popover, Select, Space, Tag } from 'antd';
import {
  HomeOutlined, DatabaseOutlined, BookOutlined, DeploymentUnitOutlined, ApiOutlined,
  BulbOutlined, ExperimentOutlined, RocketOutlined, SafetyCertificateOutlined, SettingOutlined,
  MenuFoldOutlined, MenuUnfoldOutlined, BellOutlined,
} from '@ant-design/icons';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { api, type MenuNode, type Notification, type Ontology } from '../api';
import { useSession } from '../session';

const { Sider, Header, Content } = Layout;

/** 图标注册表：菜单表 icon 字段名 → 组件（新增菜单可填写表中列出的名字） */
const ICONS: Record<string, React.ReactNode> = {
  HomeOutlined: <HomeOutlined />,
  DatabaseOutlined: <DatabaseOutlined />,
  BookOutlined: <BookOutlined />,
  DeploymentUnitOutlined: <DeploymentUnitOutlined />,
  ApiOutlined: <ApiOutlined />,
  BulbOutlined: <BulbOutlined />,
  ExperimentOutlined: <ExperimentOutlined />,
  RocketOutlined: <RocketOutlined />,
  SafetyCertificateOutlined: <SafetyCertificateOutlined />,
  SettingOutlined: <SettingOutlined />,
};

/** 菜单 API 不可用时的回退导航（与 seed 菜单树一致） */
const FALLBACK: { key: string; label: string; icon?: React.ReactNode; children?: [string, string][] }[] = [
  { key: 'home', label: '首页', icon: <HomeOutlined /> },
  { key: 'assets', label: '数据资产', icon: <DatabaseOutlined />, children: [
    ['assets/datasources', '数据源中心'], ['assets/views', '逻辑视图'], ['assets/pipelines', '数据加工'], ['assets/market', '数据集市'], ['assets/workbench', '数据工作台'],
  ]},
  { key: 'knowledge', label: '知识运营', icon: <BookOutlined />, children: [
    ['knowledge/entries', '知识库'], ['knowledge/synonyms', '同义词治理'], ['knowledge/convergence', '隐式收敛'],
  ]},
  { key: 'modeling', label: '本体建模', icon: <DeploymentUnitOutlined />, children: [
    ['modeling/ontologies', '本体管理'], ['modeling/registry', '注册中心'], ['modeling/ai-modeling', '智能建模'], ['modeling/version-ops', '版本与导出'],
  ]},
  { key: 'runtime', label: '本体运行时', icon: <ApiOutlined />, children: [
    ['runtime/binding', '数据绑定'], ['runtime/instances', '实例 360°'], ['runtime/rules', '规则与行动'],
  ]},
  { key: 'reasoning', label: '推理演绎', icon: <BulbOutlined />, children: [['reasoning/query', '语义查询']] },
  { key: 'sandbox', label: '推演沙盘', icon: <ExperimentOutlined />, children: [['sandbox/compare', '沙盘 · 多分支对比']] },
  { key: 'apps', label: '智能应用', icon: <RocketOutlined />, children: [['apps/capabilities', '能力出口']] },
  { key: 'governance', label: '治理演化', icon: <SafetyCertificateOutlined />, children: [['governance/reviews', '评审与发布']] },
  { key: 'admin', label: '系统管理', icon: <SettingOutlined />, children: [
    ['admin/overview', '系统运营'], ['admin/org', '组织与权限'], ['admin/permissions', '权限管理'],
    ['admin/menus', '菜单管理'], ['admin/monitor', '服务监控'], ['admin/logs', '日志查询'], ['admin/settings', '个性化设置'],
  ]},
];

export default function AppShell() {
  const { message } = App.useApp();
  const nav = useNavigate();
  const loc = useLocation();
  const selected = loc.pathname.replace(/^\//, '') || 'home';
  const openKey = selected.includes('/') ? selected.split('/')[0] : '';
  const { user, setUser, users, onto, chooseOnto, permVersion } = useSession();
  const [notifs, setNotifs] = useState<Notification[]>([]);

  const [menus, setMenus] = useState<MenuNode[] | null>(null);
  const [ontos, setOntos] = useState<Ontology[]>([]);
  const [err, setErr] = useState('');
  const [collapsed, setCollapsed] = useState(false);

  // 导航 = 菜单管理维护的菜单树（按当前用户角色权限过滤）；权限/菜单变更（permVersion）即时重拉
  useEffect(() => {
    api.menus(user).then(setMenus).catch(() => setMenus(null));
  }, [user, permVersion]);

  // 通知（按当前用户定向+广播，未读派生）
  useEffect(() => {
    api.notifications(user).then(setNotifs).catch(() => setNotifs([]));
  }, [user]);

  useEffect(() => {
    api.ontologies(user).then(setOntos).catch(e => setErr(String(e.message ?? e)));
  }, [user]);

  // 当前本体 = 会话全局上下文（未选择时为空，不显示任何已选值）
  const cur = onto ? ontos.find(o => o.id === onto) : undefined;
  const curUser = users.find(u => u.account === user);

  const navItems = useMemo(() => {
    if (!menus) {
      return FALLBACK.map(g => g.children
        ? { key: g.key, icon: g.icon, label: g.label, children: g.children.map(([k, label]) => ({ key: k, label })) }
        : { key: g.key, icon: g.icon, label: g.label });
    }
    return [
      { key: 'home', icon: <HomeOutlined />, label: '首页' },
      ...menus.map(m => ({
        key: m.id,
        icon: ICONS[m.icon] ?? <SettingOutlined />,
        label: m.name,
        children: (m.children ?? []).map(c => ({ key: c.route || c.id, label: c.name })),
      })),
    ];
  }, [menus]);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={216} collapsedWidth={72} collapsible trigger={null} collapsed={collapsed}>
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          gap: 4, padding: collapsed ? '12px 0' : '10px 10px 10px 16px', height: 52,
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <img src="/logo.svg" alt="entKnow" style={{ width: 28, height: 28, flexShrink: 0 }} />
            {!collapsed && <span style={{ color: '#1a1a2e', fontWeight: 700, fontSize: 16, whiteSpace: 'nowrap' }}>entKnow</span>}
          </span>
          <Button type="text" size="small" onClick={() => setCollapsed(!collapsed)}
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            aria-label={collapsed ? '展开菜单' : '折叠菜单'}
            style={{ color: '#8a94a6', flexShrink: 0 }} />
        </div>
        <Menu
          mode="inline" selectedKeys={[selected]} defaultOpenKeys={[openKey]}
          items={navItems}
          onClick={({ key }) => nav('/' + key)}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: '0 20px', display: 'flex', alignItems: 'center', borderBottom: '1px solid #e2e4e9' }}>
          <span style={{ color: '#6b7688', marginRight: 8 }}>工作本体</span>
          <Select
            value={onto || undefined} onChange={chooseOnto} style={{ width: 300 }} variant="filled"
            loading={ontos.length === 0} allowClear placeholder="点击选择工作本体"
            options={ontos.map(o => ({ value: o.id, label: `${o.name} · ${o.scene}（${o.version}）` }))}
          />
          {cur && <>
            <Tag color="blue" style={{ marginLeft: 10 }}>{cur.version} {cur.status === 'DRAFT' ? '草稿' : '已发布'}</Tag>
            <Tag color="gold">我的角色: {cur.myRole}</Tag>
          </>}
          <Tag color="orange">环境: LIVE</Tag>
          <div style={{ flex: 1 }} />
          {err && <Tag color="red">API 异常: {err}</Tag>}
          <Popover trigger="click" placement="bottomRight" onOpenChange={open => {
            if (open) api.notifications(user).then(setNotifs).catch(() => {});
          }} content={
            <div style={{ width: 340 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <b>消息通知</b>
                <Button size="small" type="link" onClick={async () => {
                  try {
                    const res = await api.markAllNotificationsRead(user);
                    message.success(`已读 ${res.marked} 条`);
                    setNotifs(await api.notifications(user));
                  } catch (e) { message.error(String((e as Error).message)); }
                }}>全部已读</Button>
              </div>
              {(notifs.length === 0) && <span style={{ color: '#6b7688', fontSize: 12 }}>暂无通知</span>}
              {notifs.slice(0, 8).map(n => (
                <div key={n.id} style={{
                  display: 'flex', gap: 8, padding: '8px 0', borderBottom: '1px dashed #f1f3f5',
                  opacity: n.unread ? 1 : 0.55, cursor: n.to ? 'pointer' : 'default',
                }} onClick={async () => {
                  if (!n.to) return;
                  if (n.unread) {
                    await api.markNotificationRead(n.id, user).catch(() => {});
                    api.notifications(user).then(setNotifs).catch(() => {});
                  }
                  nav(n.to);
                }}>
                  <Badge status={n.cat === '待办处理' ? 'error' : n.cat === '治理任务' ? 'warning' : 'processing'} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: n.unread ? 600 : 400 }}>{n.title}</div>
                    <div style={{ fontSize: 12, color: '#6b7688' }}>{n.cat} · {n.time}{n.toUser && n.toUser === user ? ' · 定向' : ''}</div>
                  </div>
                </div>
              ))}
            </div>
          }>
            <Badge count={notifs.filter(n => n.unread).length} size="small" offset={[-2, 2]}>
              <Button type="text" icon={<BellOutlined style={{ color: '#5a5a72', fontSize: 16 }} />} />
            </Badge>
          </Popover>
          <Space size={8} style={{ marginRight: 12 }}>
            <Avatar size={28} style={{ background: '#059669' }}>{curUser?.name?.[0] ?? '张'}</Avatar>
            <Select
              value={user} onChange={setUser} size="small" style={{ width: 190 }} variant="filled"
              options={users.map(u => ({ value: u.account, label: `${u.name} · ${u.post}` }))}
            />
          </Space>
        </Header>
        <Content style={{ padding: 16 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
