import { useEffect, useState } from 'react';
import { Avatar, Layout, Menu, Select, Space, Tag } from 'antd';
import {
  HomeOutlined, DatabaseOutlined, BookOutlined, DeploymentUnitOutlined, ApiOutlined,
  BulbOutlined, ExperimentOutlined, RocketOutlined, SafetyCertificateOutlined, SettingOutlined,
} from '@ant-design/icons';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { api, type Ontology } from '../api';

const { Sider, Header, Content } = Layout;

/** 已实现页面挂真实路由；未实现模块统一 Placeholder（按「UI 原型先行」流程推进） */
const NAV: { key: string; label: string; icon?: React.ReactNode; children?: [string, string][] }[] = [
  { key: 'home', label: '首页', icon: <HomeOutlined /> },
  { key: 'm1', label: '数据资产', icon: <DatabaseOutlined />, children: [['m1/datasources', '数据源中心']] },
  { key: 'm2', label: '知识运营', icon: <BookOutlined />, children: [
    ['m2/knowledge', '知识库'], ['m2/synonyms', '同义词治理'],
  ]},
  { key: 'm3', label: '本体建模', icon: <DeploymentUnitOutlined />, children: [
    ['m3/ontologies', '本体管理'], ['m3/registry', '注册中心'],
  ]},
  { key: 'm4', label: '本体运行时', icon: <ApiOutlined /> },
  { key: 'm5', label: '推理演绎', icon: <BulbOutlined /> },
  { key: 'm6', label: '推演沙盘', icon: <ExperimentOutlined /> },
  { key: 'm7', label: '智能应用', icon: <RocketOutlined /> },
  { key: 'm8', label: '治理演化', icon: <SafetyCertificateOutlined />, children: [['m8/reviews', '评审与发布']] },
  { key: 'm9', label: '系统管理', icon: <SettingOutlined /> },
];

export default function AppShell() {
  const nav = useNavigate();
  const loc = useLocation();
  const selected = loc.pathname.replace(/^\//, '') || 'home';
  const openKey = selected.includes('/') ? selected.split('/')[0] : '';
  const [ontos, setOntos] = useState<Ontology[]>([]);
  const [onto, setOnto] = useState('scm');
  const [err, setErr] = useState('');

  useEffect(() => {
    api.ontologies().then(setOntos).catch(e => setErr(String(e.message ?? e)));
  }, []);

  const cur = ontos.find(o => o.id === onto);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={216}>
        <div style={{ color: '#1a1a2e', padding: '14px 16px', fontWeight: 700, fontSize: 15 }}>
          entKnow
          <div style={{ fontSize: 11, fontWeight: 400, color: '#6b7688', marginTop: 2 }}>企业级本体操作系统</div>
        </div>
        <Menu
          mode="inline" selectedKeys={[selected]} defaultOpenKeys={[openKey]}
          items={NAV.map(g => g.children
            ? { key: g.key, icon: g.icon, label: g.label, children: g.children.map(([k, label]) => ({ key: k, label })) }
            : { key: g.key, icon: g.icon, label: g.label })}
          onClick={({ key }) => nav('/' + key)}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: '0 20px', display: 'flex', alignItems: 'center', borderBottom: '1px solid #e2e4e9' }}>
          <span style={{ color: '#6b7688', marginRight: 8 }}>当前本体</span>
          <Select
            value={onto} onChange={setOnto} style={{ width: 320 }} variant="filled"
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
          <Space size={8}>
            <Avatar size={28} style={{ background: '#059669' }}>张</Avatar>
            <span style={{ color: '#5a5a72' }}>张三 · 数据架构师</span>
          </Space>
        </Header>
        <Content style={{ padding: 16 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
