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

// 九大模块功能点树（示例到二级）
const PERM_TREE: DataNode[] = [
  { title: '数据资产', key: 'assets', children: [
    { title: '数据源注册', key: 'assets/ds' }, { title: '更新策略', key: 'assets/sync' }, { title: '元数据探查', key: 'assets/profile' },
    { title: '数据工作台', key: 'assets/wb' }, { title: '逻辑视图管理', key: 'assets/lv' },
  ]},
  { title: '知识运营', key: 'knowledge', children: [
    { title: '知识工作台', key: 'knowledge/wb' }, { title: '同义词归并', key: 'knowledge/syn' }, { title: '跨源融合', key: 'knowledge/x' },
  ]},
  { title: '本体建模', key: 'modeling', children: [
    { title: '本体设计器', key: 'modeling/design' }, { title: 'AI 协作建模', key: 'modeling/ai' }, { title: '本体与版本', key: 'modeling/ver' },
  ]},
  { title: '本体运行时', key: 'runtime', children: [
    { title: '数据绑定与同步', key: 'runtime/bind' }, { title: '实例 360°', key: 'runtime/inst' },
    { title: '传播引擎', key: 'runtime/prop' }, { title: 'Action 执行网关', key: 'runtime/act' },
  ]},
  { title: '推理演绎', key: 'reasoning', children: [
    { title: '语义查询', key: 'reasoning/q' }, { title: '规则推理', key: 'reasoning/rule' },
  ]},
  { title: '推演沙盘', key: 'sandbox', children: [{ title: '沙盘 · 多分支对比', key: 'sandbox/compare' }] },
  { title: '智能应用', key: 'apps', children: [{ title: '能力出口', key: 'apps/cap' }, { title: 'CLI 出口', key: 'apps/cli' }] },
  { title: '治理演化', key: 'governance', children: [
    { title: '治理评审台', key: 'governance/rev' }, { title: '发布门禁', key: 'governance/gate' }, { title: '自进化闭环', key: 'governance/evo' },
  ]},
  { title: '系统管理', key: 'admin', children: [
    { title: '本体总览 Dashboard', key: 'admin/dash' }, { title: '用户管理', key: 'admin/users' }, { title: '角色管理', key: 'admin/roles' },
  ]},
];

const ROLE_CHECKS: Record<string, string[]> = {
  admin: PERM_TREE.flatMap(m => [m.key as string, ...(m.children ?? []).map(c => c.key as string)]),
  expert: ['knowledge', 'knowledge/wb', 'knowledge/syn', 'reasoning', 'reasoning/q', 'governance', 'governance/rev', 'admin/dash'],
  dev: ['assets', 'assets/ds', 'assets/sync', 'assets/profile', 'assets/wb', 'assets/lv', 'runtime/bind', 'runtime/inst'],
  agent: ['apps', 'apps/cap', 'apps/cli', 'runtime/act'],
  guest: ['reasoning/q', 'runtime/inst', 'admin/dash'],
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
          <Text type="secondary">角色即权限集合：功能权限（模块/功能点）+ 数据权限（业务域/敏感级）</Text>
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
