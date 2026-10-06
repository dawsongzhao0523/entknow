import { useState } from 'react';
import { Badge, Button, Drawer, Dropdown, Layout, Menu, Avatar, Space, Tabs, Tag, Select } from 'antd';
import { BellOutlined, SwapOutlined, HomeOutlined, DatabaseOutlined, BookOutlined, DeploymentUnitOutlined, ApiOutlined, BulbOutlined, ExperimentOutlined, RocketOutlined, SafetyCertificateOutlined, SettingOutlined } from '@ant-design/icons';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { NOTIFICATIONS, ONTOLOGIES, type OntoRole } from '../mock/data';

const { Sider, Header, Content } = Layout;

/** 演示角色：构建者 / 管理层 / 业务专家 —— 决定首页形态 */
export type Persona = 'builder' | 'manager' | 'biz';
export const PERSONAS: Record<Persona, { name: string; title: string; avatar: string }> = {
  builder: { name: '张三', title: '数据架构师', avatar: '张' },
  manager: { name: '李四', title: '供应链总监', avatar: '李' },
  biz: { name: '王五', title: '业务专家', avatar: '王' },
};

/** 路由上下文：当前本体 + 我在其中的角色 + 演示角色（设计器等页面据此切换只读/可编辑） */
export interface ShellCtx { onto: string; role: OntoRole; persona: Persona }

const NAV: { key: string; label: string; icon?: React.ReactNode; children?: [string, string][] }[] = [
  { key: 'home', label: '首页', icon: <HomeOutlined /> },
  { key: 'm1', label: '数据资产', icon: <DatabaseOutlined />, children: [
    ['m1/sources', '数据源中心'], ['m1/market', '数据集市'], ['m1/workbench', '数据工作台'],
    ['m1/processing', '数据加工'], ['m1/logical-view', '逻辑视图'],
  ]},
  { key: 'm2', label: '知识运营', icon: <BookOutlined />, children: [
    ['m2/knowledge-tree', '知识库'], ['m2/governance', '知识治理'],
  ]},
  { key: 'm3', label: '本体建模', icon: <DeploymentUnitOutlined />, children: [
    ['m3/ontology', '本体管理'], ['m3/designer', '本体设计器'], ['m3/modeling', '智能建模'],
  ]},
  { key: 'm4', label: '本体运行时', icon: <ApiOutlined />, children: [
    ['m4/binding', '数据绑定'], ['m4/instance-360', '实例 360°'], ['m4/runtime', '规则与行动'],
  ]},
  { key: 'm5', label: '推理演绎', icon: <BulbOutlined />, children: [['m5/reasoning', '推理演绎']]},
  { key: 'm6', label: '推演沙盘', icon: <ExperimentOutlined />, children: [['m6/sandbox', '沙盘 · 多分支对比']]},
  { key: 'm7', label: '智能应用', icon: <RocketOutlined />, children: [['m7/capability', '能力出口']]},
  { key: 'm8', label: '治理演化', icon: <SafetyCertificateOutlined />, children: [
    ['m8/release', '评审与发布'], ['m8/evolution', '版本与演化'],
  ]},
  { key: 'm9', label: '系统管理', icon: <SettingOutlined />, children: [
    ['m9/overview', '系统运营'], ['m9/org', '组织与权限'], ['m9/ops', '监控与日志'], ['m9/settings', '个性化设置'],
  ]},
];

export default function AppShell() {
  const nav = useNavigate();
  const loc = useLocation();
  const selected = loc.pathname.replace(/^\//, '') || 'home';
  const openKey = selected.includes('/') ? selected.split('/')[0] : '';
  const [onto, setOnto] = useState('scm');
  const [persona, setPersona] = useState<Persona>('builder');
  const [bellOpen, setBellOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const unread = NOTIFICATIONS.filter(n => !readIds.has(n.id) && n.unread).length;
  const cur = ONTOLOGIES.find(o => o.id === onto)!;
  const me = PERSONAS[persona];
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={216}>
        <div style={{ color: '#1a1a2e', padding: '14px 16px', fontWeight: 700, fontSize: 15 }}>
          entKnow
          <div style={{ fontSize: 11, fontWeight: 400, color: '#6b7688', marginTop: 2 }}>企业级本体操作系统 · 原型</div>
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
        <Header style={{ padding: '0 20px', display: 'flex', alignItems: 'center', borderBottom: '1px solid #e2e4e9', position: 'sticky', top: 0, zIndex: 10 }}>
          <span style={{ color: '#6b7688', marginRight: 8 }}>当前本体</span>
          <Select
            value={onto} onChange={setOnto} style={{ width: 320 }} variant="filled"
            options={ONTOLOGIES.map(o => ({
              value: o.id,
              label: `${o.name} · ${o.scene}（${o.version} ${o.status === 'DRAFT' ? '草稿' : '已发布'}）`,
            }))}
            popupRender={menu => (
              <>
                {menu}
                <div style={{ padding: '6px 12px', borderTop: '1px solid #f1f3f5', cursor: 'pointer', color: '#059669', fontSize: 12 }}
                  onClick={() => nav('/m3/ontology')}>
                  ⚙ 本体的创建与授权，在「M3 本体管理」集中维护 →
                </div>
              </>
            )}
          />
          <Tag color={onto === 'scm' ? 'blue' : onto === 'quality' ? 'green' : 'default'} style={{ marginLeft: 10 }}>
            {cur.version} {cur.status === 'DRAFT' ? '草稿' : '已发布'}
          </Tag>
          <Tag color={{ 所有者: 'gold', 建模者: 'blue', 评审者: 'purple', 查看者: 'default' }[cur.myRole]}>我的角色: {cur.myRole}</Tag>
          <Tag color="orange">环境: MOCK</Tag>
          <div style={{ flex: 1 }} />
          <Badge count={unread} size="small" offset={[-4, 4]}>
            <Button type="text" icon={<BellOutlined style={{ fontSize: 17, color: '#5a5a72' }} />} onClick={() => setBellOpen(true)} />
          </Badge>
          <Dropdown
            menu={{
              selectedKeys: [persona],
              items: (Object.keys(PERSONAS) as Persona[]).map(p => ({
                key: p, icon: <SwapOutlined />,
                label: `${PERSONAS[p].name} · ${PERSONAS[p].title}${p === 'manager' ? '（管理层看板首页）' : ''}`,
              })),
              onClick: ({ key }) => { setPersona(key as Persona); nav('/home'); },
            }}
            trigger={['click']}
          >
            <Space size={8} style={{ cursor: 'pointer' }}>
              <Avatar size={28} style={{ background: '#059669' }}>{me.avatar}</Avatar>
              <span style={{ color: '#5a5a72' }}>{me.name} · {me.title}</span>
            </Space>
          </Dropdown>
        </Header>
        <Content style={{ padding: 16 }}>
          <Outlet context={{ onto, role: cur.myRole, persona } satisfies ShellCtx} />
        </Content>
      </Layout>
      <Drawer
        title="消息通知" width={420} open={bellOpen} onClose={() => setBellOpen(false)}
        extra={<Button size="small" type="link" onClick={() => setReadIds(new Set(NOTIFICATIONS.map(n => n.id)))}>全部已读</Button>}
      >
        <Tabs
          size="small"
          items={['全部', '待办处理', '治理任务', '协同分享'].map(cat => ({
            key: cat,
            label: cat === '全部' ? `全部 (${NOTIFICATIONS.length})` : `${cat} (${NOTIFICATIONS.filter(n => n.cat === cat).length})`,
            children: (
              <div>
                {NOTIFICATIONS.filter(n => cat === '全部' || n.cat === cat).map(n => {
                  const isRead = readIds.has(n.id) || !n.unread;
                  return (
                    <div key={n.id}
                      onClick={() => { setReadIds(s => new Set(s).add(n.id)); setBellOpen(false); nav(n.to); }}
                      style={{ display: 'flex', gap: 10, padding: '12px 4px', borderBottom: '1px solid #f1f3f5', cursor: 'pointer', opacity: isRead ? 0.55 : 1 }}>
                      <Badge dot={!isRead} offset={[-2, 6]}>
                        <Avatar size={30} style={{ background: { 待办处理: '#059669', 治理任务: '#c9861a', 协同分享: '#2d8a4e' }[n.cat], fontSize: 12 }}>
                          {n.cat.slice(0, 2)}
                        </Avatar>
                      </Badge>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: isRead ? 400 : 600 }}>{n.title}</div>
                        <Space size={6} style={{ marginTop: 4 }}>
                          <Tag style={{ margin: 0, fontSize: 11 }}>{n.cat}</Tag>
                          <span style={{ fontSize: 12, color: '#6b7688' }}>{n.time}</span>
                        </Space>
                      </div>
                    </div>
                  );
                })}
              </div>
            ),
          }))}
        />
      </Drawer>
    </Layout>
  );
}
