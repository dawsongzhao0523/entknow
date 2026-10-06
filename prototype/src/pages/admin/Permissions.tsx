import { Alert, Button, Card, Input, Space, Table, Tabs, Tag, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { edit, run } from '../../components/proto';

const { Title, Text } = Typography;

type Level = '管理' | '编辑' | '只读' | '无';
const LEVEL_COLOR: Record<Level, string> = { 管理: 'gold', 编辑: 'blue', 只读: 'green', 无: 'default' };

const MODULES = ['数据资产', '知识运营', '本体建模', '本体运行时 运行时', '推理演绎 推理', '推演沙盘 沙盘', '智能应用', '治理演化 治理', '系统管理'];

const MATRIX: { role: string; levels: Level[] }[] = [
  { role: '本体管理员', levels: ['管理', '管理', '管理', '管理', '管理', '管理', '管理', '管理', '管理'] },
  { role: '业务专家', levels: ['只读', '编辑', '只读', '只读', '只读', '编辑', '无', '编辑', '无'] },
  { role: '数据开发', levels: ['编辑', '只读', '编辑', '编辑', '只读', '编辑', '只读', '只读', '无'] },
  { role: '智能体开发', levels: ['只读', '无', '只读', '编辑', '只读', '只读', '编辑', '无', '无'] },
  { role: '只读访客', levels: ['只读', '只读', '只读', '只读', '只读', '无', '无', '无', '无'] },
];

interface RowRule {
  id: string; target: string; rule: string; role: string; effect: string; updatedBy: string; updatedAt: string;
}
const ROW_RULES: RowRule[] = [
  { id: 'rls-1', target: '对象[采购订单]', rule: "plant_id IN ('RCBJ-YK', 'RCBJ-BSE')", role: '数据开发', effect: '仅可见 2 个工厂行', updatedBy: '张三', updatedAt: '2026-09-28 14:20' },
  { id: 'rls-2', target: '对象[采购订单]', rule: 'amount <= 100000', role: '只读访客', effect: '大额订单金额脱敏', updatedBy: '张三', updatedAt: '2026-09-28 14:22' },
  { id: 'rls-3', target: '视图[lv_order_delivery]', rule: "domain = '供应链'", role: '业务专家', effect: '跨域行不可见', updatedBy: '王五', updatedAt: '2026-09-30 10:05' },
  { id: 'rls-4', target: '对象[供应商]', rule: "qual_status = '已准入'", role: '智能体开发', effect: 'Agent 仅消费已准入供应商', updatedBy: '赵六', updatedAt: '2026-10-01 09:11' },
];

export default function Permissions() {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>权限管理</Title>
          <Text type="secondary">功能权限矩阵 · 数据权限（行级规则）· 敏感级继承</Text>
        </div>
      </div>
      <Tabs
        defaultActiveKey="matrix"
        items={[
          {
            key: 'matrix', label: '功能权限矩阵',
            children: (
              <Card>
                <Table
                  rowKey="role" size="middle" pagination={false}
                  dataSource={MATRIX}
                  columns={[
                    { title: '角色 \\ 模块', dataIndex: 'role', key: 'role', fixed: 'left', render: (v: string) => <b>{v}</b> },
                    ...MODULES.map((m, i) => ({
                      title: m, key: m, align: 'center' as const,
                      render: (_: unknown, r: { levels: Level[] }) => <Tag color={LEVEL_COLOR[r.levels[i]]}>{r.levels[i]}</Tag>,
                    })),
                  ]} />
              </Card>
            ),
          },
          {
            key: 'data', label: '数据权限',
            children: (
              <Card
                title="行级规则"
                extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => edit('新增行级规则', [
                  ['作用对象', <Input key="t" className="mono" placeholder="对象[采购订单]" />],
                  ['行级规则', <Input key="r" className="mono" placeholder="工厂 IN (用户.可见工厂)" />],
                  ['绑定角色', <Input key="o" defaultValue="域数据管家" />],
                ])}>新增规则</Button>}
              >
                <Table<RowRule>
                  rowKey="id" size="middle" dataSource={ROW_RULES} pagination={false}
                  columns={[
                    { title: '作用对象', dataIndex: 'target', key: 'target', render: (v: string) => <b>{v}</b> },
                    { title: '行级规则', dataIndex: 'rule', key: 'rule', render: (v: string) => <Text className="mono" style={{ fontSize: 12 }}>{v}</Text> },
                    { title: '绑定角色', dataIndex: 'role', key: 'role', render: (v: string) => <Tag color="blue">{v}</Tag> },
                    { title: '效果', dataIndex: 'effect', key: 'effect' },
                    { title: '更新', key: 'upd', render: (_, r) => <Text type="secondary" style={{ fontSize: 12 }}>{r.updatedBy} · <span className="mono">{r.updatedAt}</span></Text> },
                    { title: '操作', key: 'ops', render: (_: unknown, r: RowRule) => <Space size={4}>
                      <Button size="small" type="link" onClick={() => edit('编辑行级规则', [
                        ['作用对象', <Input key="t" defaultValue={r.target} />],
                        ['行级规则', <Input key="r" className="mono" defaultValue={r.rule} />],
                        ['绑定角色', <Input key="o" defaultValue={r.role} />],
                      ])}>编辑</Button>
                      <Button size="small" type="link" danger onClick={() => run('删除行级规则', `删除后绑定角色「${r.role}」将立即失去对应数据范围。`)}>删除</Button>
                    </Space> },
                  ]} />
              </Card>
            ),
          },
          {
            key: 'inherit', label: '敏感级继承',
            children: (
              <>
                <Alert type="info" showIcon style={{ marginBottom: 12 }}
                  message="敏感级继承规则"
                  description="逻辑视图的敏感级取其上游依赖的最高等级（视图 lv_order_delivery 依赖 srm(L3) → 视图=L3）；敏感级只能升不能降，降敏需治理评审通过。" />
                <Card>
                  <Table
                    rowKey="a" size="middle" pagination={false}
                    dataSource={[
                      { a: 'lv_order_delivery', b: 'purchase_order(L2) + supplier(L3)', c: 'L3', d: '取上游最高 L3', by: '系统继承' },
                      { a: 'lv_supplier_ontime', b: 'supplier(L3) + purchase_order(L2)', c: 'L3', d: '取上游最高 L3', by: '系统继承' },
                      { a: 'lv_inventory_kit', b: 'inventory(L2) + bom(L2)', c: 'L2', d: '取上游最高 L2', by: '系统继承' },
                      { a: '金额可见性(权限函数)', b: 'po.amount', c: 'L3', d: '字段级脱敏策略', by: '张三 显式指定' },
                    ]}
                    columns={[
                      { title: '下游资产', dataIndex: 'a', key: 'a', render: (v: string) => <Text className="mono" style={{ fontSize: 12 }}>{v}</Text> },
                      { title: '上游依赖', dataIndex: 'b', key: 'b' },
                      { title: '继承敏感级', dataIndex: 'c', key: 'c', render: (v: string) => <Tag color={v >= 'L3' ? 'orange' : 'default'}>{v}</Tag> },
                      { title: '规则说明', dataIndex: 'd', key: 'd' },
                      { title: '来源', dataIndex: 'by', key: 'by' },
                    ]} />
                </Card>
              </>
            ),
          },
        ]} />
    </>
  );
}
