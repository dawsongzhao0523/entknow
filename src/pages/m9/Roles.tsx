import { useState } from 'react';
import { Badge, Button, Card, Checkbox, Col, Input, List, Row, Select, Space, Tag, Tree, Typography } from 'antd';
import { ok, edit } from '../../components/proto';
import { PlusOutlined, SaveOutlined } from '@ant-design/icons';
import type { DataNode } from 'antd/es/tree';

const { Title, Text } = Typography;

const ROLES = [
  { key: 'admin', name: '本体管理员', count: 3, desc: '本体建模、发布、权限全部' },
  { key: 'expert', name: '业务专家', count: 28, desc: '评审、术语归并、语义查询' },
  { key: 'dev', name: '数据开发', count: 61, desc: '数据源、管道、视图开发' },
  { key: 'agent', name: '智能体开发', count: 12, desc: '能力出口、Action 调用' },
  { key: 'guest', name: '只读访客', count: 82, desc: '只读查询与实例浏览' },
];

// M1-M9 模块功能点树（示例到二级）
const PERM_TREE: DataNode[] = [
  { title: 'M1 数据资产', key: 'm1', children: [
    { title: '数据源注册', key: 'm1/ds' }, { title: '更新策略', key: 'm1/sync' }, { title: '元数据探查', key: 'm1/profile' },
    { title: '数据工作台', key: 'm1/wb' }, { title: '逻辑视图管理', key: 'm1/lv' },
  ]},
  { title: 'M2 知识运营', key: 'm2', children: [
    { title: '知识工作台', key: 'm2/wb' }, { title: '同义词归并', key: 'm2/syn' }, { title: '跨源融合', key: 'm2/x' },
  ]},
  { title: 'M3 本体建模', key: 'm3', children: [
    { title: '本体设计器', key: 'm3/design' }, { title: 'AI 协作建模', key: 'm3/ai' }, { title: '本体与版本', key: 'm3/ver' },
  ]},
  { title: 'M4 本体运行时', key: 'm4', children: [
    { title: '数据绑定与同步', key: 'm4/bind' }, { title: '实例 360°', key: 'm4/inst' },
    { title: '传播引擎', key: 'm4/prop' }, { title: 'Action 执行网关', key: 'm4/act' },
  ]},
  { title: 'M5 推理演绎', key: 'm5', children: [
    { title: '语义查询', key: 'm5/q' }, { title: '规则推理', key: 'm5/rule' },
  ]},
  { title: 'M6 推演沙盘', key: 'm6', children: [{ title: '沙盘 · 多分支对比', key: 'm6/sandbox' }] },
  { title: 'M7 智能应用', key: 'm7', children: [{ title: '能力出口', key: 'm7/cap' }, { title: 'CLI 出口', key: 'm7/cli' }] },
  { title: 'M8 治理演化', key: 'm8', children: [
    { title: '治理评审台', key: 'm8/rev' }, { title: '发布门禁', key: 'm8/gate' }, { title: '自进化闭环', key: 'm8/evo' },
  ]},
  { title: 'M9 系统管理', key: 'm9', children: [
    { title: '本体总览 Dashboard', key: 'm9/dash' }, { title: '用户管理', key: 'm9/users' }, { title: '角色管理', key: 'm9/roles' },
  ]},
];

const ROLE_CHECKS: Record<string, string[]> = {
  admin: PERM_TREE.flatMap(m => [m.key as string, ...(m.children ?? []).map(c => c.key as string)]),
  expert: ['m2', 'm2/wb', 'm2/syn', 'm5', 'm5/q', 'm8', 'm8/rev', 'm9/dash'],
  dev: ['m1', 'm1/ds', 'm1/sync', 'm1/profile', 'm1/wb', 'm1/lv', 'm4/bind', 'm4/inst'],
  agent: ['m7', 'm7/cap', 'm7/cli', 'm4/act'],
  guest: ['m5/q', 'm4/inst', 'm9/dash'],
};

const DOMAINS = ['供应链', '生产制造', '财务', '人力', '营销'];

export default function Roles() {
  const [active, setActive] = useState('admin');
  const role = ROLES.find(r => r.key === active)!;
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>角色管理</Title>
          <Text type="secondary">角色即权限集合：功能权限（模块/功能点）+ 数据权限（业务域/敏感级）（M9-F02）</Text>
        </div>
        <div style={{ flex: 1 }} />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => edit('新建角色', [
          ['角色名', <Input key="n" placeholder="如：域数据管家" />],
          ['描述', <Input key="d" placeholder="职责说明" />],
        ])}>新建角色</Button>
      </div>
      <Row gutter={12}>
        <Col span={7}>
          <Card title="角色列表" styles={{ body: { padding: 0 } }}>
            <List
              dataSource={ROLES}
              renderItem={r => (
                <List.Item
                  onClick={() => setActive(r.key)}
                  style={{
                    padding: '12px 16px', cursor: 'pointer',
                    background: r.key === active ? '#ecfdf5' : undefined,
                    borderLeft: r.key === active ? '3px solid #059669' : '3px solid transparent',
                  }}
                >
                  <List.Item.Meta
                    title={<Space>{r.name}<Badge count={r.count} color={r.key === active ? '#059669' : '#6b7688'} /></Space>}
                    description={<Text type="secondary" style={{ fontSize: 12 }}>{r.desc}</Text>}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col span={17}>
          <Card
            title={<Space>权限配置 <Tag color="gold">{role.name}</Tag></Space>}
            extra={<Button type="primary" icon={<SaveOutlined />} onClick={() => ok(`已保存「${role.name}」权限配置，对 12 名成员即时生效`)}>保存</Button>}
          >
            <Title level={5} style={{ marginTop: 0 }}>功能权限</Title>
            <Tree
              checkable defaultExpandAll
              treeData={PERM_TREE}
              defaultCheckedKeys={ROLE_CHECKS[role.key]}
              height={320}
              style={{ border: '1px solid #e2e4e9', borderRadius: 8, padding: 8, marginBottom: 16 }}
            />
            <Title level={5}>数据权限</Title>
            <Space direction="vertical" size={12}>
              <div>
                <Text style={{ marginRight: 12 }}>业务域：</Text>
                <Checkbox.Group options={DOMAINS} defaultValue={role.key === 'admin' ? DOMAINS : ['供应链']} />
              </div>
              <div>
                <Text style={{ marginRight: 12 }}>敏感级上限：</Text>
                <Select
                  defaultValue={role.key === 'admin' ? 'L4' : role.key === 'guest' ? 'L1' : 'L3'}
                  style={{ width: 200 }}
                  options={['L1', 'L2', 'L3', 'L4'].map(v => ({ value: v, label: `${v}（${['公开', '内部', '敏感', '机密'][+v[1] - 1]}）` }))}
                />
                <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>高于此等级的视图/字段对该角色不可见</Text>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </>
  );
}
