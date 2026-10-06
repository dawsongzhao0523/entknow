import { useEffect, useMemo, useState } from 'react';
import { Avatar, Layout, Menu, Select, Space, Tag } from 'antd';
import {
  HomeOutlined, DatabaseOutlined, BookOutlined, DeploymentUnitOutlined, ApiOutlined,
  BulbOutlined, ExperimentOutlined, RocketOutlined, SafetyCertificateOutlined, SettingOutlined,
} from '@ant-design/icons';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { api, type MenuNode, type Ontology } from '../api';
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
  { key: 'm1', label: '数据资产', icon: <DatabaseOutlined />, children: [
    ['m1/datasources', '数据源中心'], ['m1/views', '逻辑视图'], ['m1/pipelines', '数据加工'],
  ]},
  { key: 'm2', label: '知识运营', icon: <BookOutlined />, children: [
    ['m2/knowledge', '知识库'], ['m2/synonyms', '同义词治理'],
  ]},
  { key: 'm3', label: '本体建模', icon: <DeploymentUnitOutlined />, children: [
    ['m3/ontologies', '本体管理'], ['m3/registry', '注册中心'],
  ]},
  { key: 'm4', label: '本体运行时', icon: <ApiOutlined />, children: [
    ['m4/instance-360', '实例 360°'], ['m4/runtime', '规则与行动'],
  ]},
  { key: 'm5', label: '推理演绎', icon: <BulbOutlined />, children: [['m5/query', '语义查询']] },
  { key: 'm6', label: '推演沙盘', icon: <ExperimentOutlined />, children: [['m6/sandbox', '沙盘 · 多分支对比']] },
  { key: 'm7', label: '智能应用', icon: <RocketOutlined />, children: [['m7/capability', '能力出口']] },
  { key: 'm8', label: '治理演化', icon: <SafetyCertificateOutlined />, children: [['m8/reviews', '评审与发布']] },
  { key: 'm9', label: '系统管理', icon: <SettingOutlined />, children: [
    ['m9/overview', '系统运营'], ['m9/org', '组织与权限'], ['m9/permissions', '权限管理'],
    ['m9/menus', '菜单管理'], ['m9/monitor', '服务监控'], ['m9/logs', '日志查询'], ['m9/settings', '个性化设置'],
  ]},
];

export default function AppShell() {
  const nav = useNavigate();
  const loc = useLocation();
  const selected = loc.pathname.replace(/^\//, '') || 'home';
  const openKey = selected.includes('/') ? selected.split('/')[0] : '';
  const { user, setUser, users, prefs, permVersion } = useSession();

  const [menus, setMenus] = useState<MenuNode[] | null>(null);
  const [ontos, setOntos] = useState<Ontology[]>([]);
  const [onto, setOnto] = useState('');
  const [err, setErr] = useState('');

  // 导航 = 菜单管理维护的菜单树（按当前用户角色权限过滤）；权限/菜单变更（permVersion）即时重拉
  useEffect(() => {
    api.menus(user).then(setMenus).catch(() => setMenus(null));
  }, [user, permVersion]);

  useEffect(() => {
    api.ontologies(user).then(setOntos).catch(e => setErr(String(e.message ?? e)));
  }, [user]);

  // 默认本体由个性化设置决定（设置加载后生效一次）
  useEffect(() => {
    if (prefs.defaultOnto) setOnto(prefs.defaultOnto);
  }, [prefs.defaultOnto]);

  const cur = ontos.find(o => o.id === (onto || 'scm'));
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
      <Sider width={216}>
        <div style={{ color: '#1a1a2e', padding: '14px 16px', fontWeight: 700, fontSize: 15 }}>
          entKnow
          <div style={{ fontSize: 11, fontWeight: 400, color: '#6b7688', marginTop: 2 }}>企业级本体操作系统</div>
        </div>
        <Menu
          mode="inline" selectedKeys={[selected]} defaultOpenKeys={[openKey]}
          items={navItems}
          onClick={({ key }) => nav('/' + key)}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: '0 20px', display: 'flex', alignItems: 'center', borderBottom: '1px solid #e2e4e9' }}>
          <span style={{ color: '#6b7688', marginRight: 8 }}>当前本体</span>
          <Select
            value={onto || 'scm'} onChange={setOnto} style={{ width: 300 }} variant="filled"
            loading={ontos.length === 0}
            options={ontos.map(o => ({ value: o.id, label: `${o.name} · ${o.scene}（${o.version}）` }))}
          />
          {cur && <>
            <Tag color="blue" style={{ marginLeft: 10 }}>{cur.version} {cur.status === 'DRAFT' ? '草稿' : '已发布'}</Tag>
            <Tag color="gold">我的角色: {cur.myRole}</Tag>
          </>}
          <Tag color="orange">环境: LIVE</Tag>
          <div style={{ flex: 1 }} />
          {err && <Tag color="red">API 异常: {err}</Tag>}
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
