import { Alert, Button, Card, Input, Space, Table, Tag, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { edit, run } from '../../components/proto';

const { Title, Text } = Typography;

interface MenuRow {
  key: string; name: string; route?: string; icon?: string; sort: number;
  visible: boolean; children?: MenuRow[];
}

const leaf = (key: string, name: string, sort: number, visible = true): MenuRow => ({
  key, name, route: `/${key}`, icon: '▸', sort, visible,
});

const MENUS: MenuRow[] = [
  {
    key: 'm1', name: '数据资产', icon: '🗄', sort: 1, visible: true,
    children: [
      leaf('m1/datasource-list', '数据源注册', 1), leaf('m1/sync-policy', '更新策略', 2),
      leaf('m1/profile-report', '元数据探查', 3), leaf('m1/doc-source', '非结构化数据源', 4),
      leaf('m1/market', '数据集市', 5), leaf('m1/workbench', '数据工作台', 6),
      leaf('m1/pipeline', '数据处理管道', 7), leaf('m1/parse-profile', '解析策略', 8),
      leaf('m1/logical-view', '逻辑视图管理', 9),
    ],
  },
  {
    key: 'm2', name: '知识运营', icon: '📚', sort: 2, visible: true,
    children: [
      leaf('m2/knowledge-tree', '业务领域知识库', 1),
      leaf('m2/convergence', '隐式本体收敛', 2), leaf('m2/synonym', '同义词归并', 3),
      leaf('m2/crosslink', '跨源融合', 4),
    ],
  },
  {
    key: 'm3', name: '本体建模', icon: '🧩', sort: 3, visible: true,
    children: [
      leaf('m3/ontology', '本体管理', 1), leaf('m3/designer', '本体设计器', 2),
      leaf('m3/modeling', '智能建模', 3),
    ],
  },
  {
    key: 'm4', name: '本体运行时', icon: '⚙', sort: 4, visible: true,
    children: [
      leaf('m4/binding', '数据绑定与同步', 1), leaf('m4/instance-360', '实例 360°', 2),
      leaf('m4/propagation', '传播引擎', 3), leaf('m4/action-gateway', 'Action 执行网关', 4),
    ],
  },
  {
    key: 'm5', name: '推理演绎', icon: '🔍', sort: 5, visible: true,
    children: [leaf('m5/semantic-query', '语义查询', 1), leaf('m5/rule-reasoning', '规则推理', 2), leaf('m5/owl-reasoner', 'OWL 推理机', 3)],
  },
  { key: 'm6', name: '推演沙盘', icon: '🧪', sort: 6, visible: true, children: [leaf('m6/sandbox', '沙盘 · 多分支对比', 1)] },
  {
    key: 'm7', name: '智能应用', icon: '🤖', sort: 7, visible: true,
    children: [leaf('m7/capability-catalog', '能力出口', 1), leaf('m7/cli', 'CLI 出口', 2)],
  },
  {
    key: 'm8', name: '治理演化', icon: '🛡', sort: 8, visible: true,
    children: [
      leaf('m8/review', '治理评审台', 1), leaf('m8/release-gate', '发布门禁', 2),
      leaf('m8/branches', '分支与隔离', 3), leaf('m8/retraction', '撤回与对账', 4),
      leaf('m8/evolution', '自进化闭环', 5),
    ],
  },
  {
    key: 'm9', name: '系统管理', icon: '🎛', sort: 9, visible: true,
    children: [
      leaf('m9/overview', '系统运营', 1), leaf('m9/users', '用户管理', 2),
      leaf('m9/roles', '角色管理', 3), leaf('m9/menus', '菜单管理', 4),
      leaf('m9/permissions', '权限管理', 5), leaf('m9/monitor', '依赖服务监控', 6),
      leaf('m9/logs', '日志查询', 7), leaf('m9/settings', '个性化设置', 8, false),
    ],
  },
];

export default function Menus() {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>菜单管理</Title>
          <Text type="secondary">平台菜单树：排序、显隐与路由配置（M9-F03）</Text>
        </div>
        <div style={{ flex: 1 }} />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => edit('新增一级菜单', [
          ['菜单名称', <Input key="n" placeholder="如：数据中心" />],
          ['路由', <Input key="r" className="mono" placeholder="/data/overview" />],
          ['图标', <Input key="i" placeholder="AppstoreOutlined" />],
          ['排序', <Input key="s" defaultValue={99} />],
        ])}>新增一级菜单</Button>
      </div>
      <Alert type="info" showIcon style={{ marginBottom: 12 }}
        message="菜单变更需发布后对对应角色生效；隐藏菜单不删除路由，仅从导航中移除。" />
      <Card>
        <Table<MenuRow>
          rowKey="key" size="middle" dataSource={MENUS} pagination={false}
          expandable={{ defaultExpandedRowKeys: ['m1', 'm9'] }}
          columns={[
            { title: '菜单名称', dataIndex: 'name', key: 'name', render: (v: string, r) => <span style={{ fontWeight: r.children ? 600 : 400 }}>{v}</span> },
            { title: '路由', dataIndex: 'route', key: 'route', render: (v?: string) => v ? <Text className="mono" style={{ fontSize: 12 }}>{v}</Text> : <Text type="secondary">—</Text> },
            { title: '图标', dataIndex: 'icon', key: 'icon', width: 60 },
            { title: '排序', dataIndex: 'sort', key: 'sort', width: 60 },
            { title: '状态', dataIndex: 'visible', key: 'visible', width: 80, render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? '显示' : '隐藏'}</Tag> },
            {
              title: '操作', key: 'ops', width: 180,
              render: (_, r) => (
                <Space size={4}>
                  <Button size="small" type="link" onClick={() => edit('编辑菜单', [
                    ['菜单名称', <Input key="n" defaultValue={r.name} />],
                    ['路由', <Input key="rt" className="mono" defaultValue={r.route} />],
                    ['排序', <Input key="s" defaultValue={r.sort} />],
                  ])}>编辑</Button>
                  <Button size="small" type="link" onClick={() => edit(`新增子菜单 · ${r.name}`, [
                    ['菜单名称', <Input key="n" placeholder="子菜单名称" />],
                    ['路由', <Input key="rt" className="mono" placeholder="/parent/child" />],
                  ])}>新增子菜单</Button>
                  {r.children && <Button size="small" type="link" danger onClick={() => run(`隐藏菜单 · ${r.name}`, '隐藏后仅从导航移除，路由保留；需发布后对角色生效。')}>隐藏</Button>}
                </Space>
              ),
            },
          ]} />
      </Card>
    </>
  );
}
