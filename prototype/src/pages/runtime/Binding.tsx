import { Alert, Button, Card, Form, Input, Radio, Select, Space, Statistic, Table, Tag, Typography } from 'antd';
import { Link } from 'react-router-dom';
import { PO_TABLE } from '../../mock/data';
import { ok, run, edit } from '../../components/proto';

const { Title, Text } = Typography;

const MAPPINGS = [
  { view: 'po_id', prop: 'id', status: '已映射' },
  { view: 'promise_dt', prop: '承诺交期', status: '已映射' },
  { view: 'amount', prop: '金额', status: '已映射' },
];

export default function Binding() {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>数据绑定与同步 · 对象「采购订单」</Title>
          <Text type="secondary">物理视图 → 本体对象的绑定配置与同步状态</Text>
        </div>
        <div style={{ flex: 1 }} />
        <Space>
          <Tag color="green">已启用</Tag>
          <Button type="primary" onClick={() => edit('新建绑定', [
            ['本体对象', <Select key="o" defaultValue="采购订单" style={{ width: 200 }} options={['采购订单', '供应商', '生产工单'].map(v => ({ value: v, label: v }))} />],
            ['绑定源视图', <Select key="v" defaultValue="lv_order_delivery" style={{ width: 220 }} options={['lv_order_delivery', 'lv_supplier_score', 'lv_wo_progress'].map(v => ({ value: v, label: v }))} />],
            ['同步模式', <Radio.Group key="m" defaultValue="cdc" options={[{ value: 'cdc', label: '增量 CDC' }, { value: 'full', label: '全量' }]} />],
            ['主键', <Input key="k" className="mono" defaultValue="po_id" style={{ width: 200 }} />],
          ], () => ok('绑定已创建，首次全量同步已排队'))}>＋ 新建绑定</Button>
        </Space>
      </div>

      <Card title="绑定配置" style={{ marginBottom: 16 }}>
        <Form layout="vertical">
          <Space size={32} wrap style={{ display: 'flex' }}>
            <Form.Item label="绑定源（物理视图 → 本体对象）" style={{ marginBottom: 8 }}>
              <Space>
                <Text code>lv_order_delivery</Text>
                <Tag color="blue">v3</Tag>
                <Text type="secondary">联邦层</Text>
                <Link to="/assets/logical-view">查看视图</Link>
              </Space>
            </Form.Item>
            <Form.Item label="同步模式" style={{ marginBottom: 8 }}>
              <Radio.Group defaultValue="cdc" options={[{ value: 'cdc', label: '增量 CDC' }, { value: 'full', label: '全量' }]} />
            </Form.Item>
          </Space>

          <Form.Item label="字段映射（视图字段 → 本体属性）" style={{ marginTop: 8 }}>
            <Table
              rowKey="view"
              size="small"
              pagination={false}
              dataSource={MAPPINGS}
              columns={[
                { title: '视图字段', dataIndex: 'view', render: v => <Text code>{v}</Text> },
                { title: '', width: 40, render: () => <Text type="secondary">→</Text> },
                { title: '本体属性', dataIndex: 'prop' },
                { title: '状态', dataIndex: 'status', render: v => <Tag color="green">✓ {v}</Tag> },
              ]}
              footer={() => <Text type="secondary">共 <b>12 / 12</b> <Tag color="green" style={{ marginLeft: 8 }}>全部已映射</Tag></Text>}
            />
          </Form.Item>

          <Space size={32} wrap style={{ display: 'flex' }}>
            <Form.Item label="主键策略" style={{ marginBottom: 0 }}>
              <Input defaultValue={PO_TABLE.pk} style={{ width: 200, fontFamily: 'monospace' }} />
            </Form.Item>
            <Form.Item label="水位字段（增量 CDC 依据）" style={{ marginBottom: 0 }}>
              <Select defaultValue="updated_at" style={{ width: 200 }} options={[{ value: 'updated_at' }]} />
            </Form.Item>
            <Form.Item label="冲突策略" style={{ marginBottom: 0 }}>
              <Radio.Group defaultValue="src" options={[{ value: 'src', label: '源为准' }, { value: 'manual', label: '人工' }]} />
            </Form.Item>
          </Space>
        </Form>
      </Card>

      <Card title={<Space>同步状态<Tag color="green">同步正常</Tag></Space>}>
        <Space size={48} wrap>
          <Statistic title="实例总数" value={2140331} suffix={<Text type="secondary" style={{ fontSize: 12 }}>采购订单实例</Text>} />
          <Statistic title="今日增量" value={12431} prefix="+" suffix={<Text type="secondary" style={{ fontSize: 12 }}>增量 CDC 写入</Text>} />
          <Statistic title="失败" value={0} suffix={<Text type="secondary" style={{ fontSize: 12 }}>无失败记录</Text>} />
          <Statistic title="最近同步" value="09:58 ✓" suffix={<Text type="secondary" style={{ fontSize: 12 }}>增量 CDC</Text>} />
        </Space>
        <Alert
          style={{ marginTop: 16 }}
          type="warning"
          showIcon
          message={<span>视图 <b>v3 → v4</b> 升级待确认：新增列 <Text code>tax_id</Text> 未映射</span>}
          action={<Button size="small" onClick={() => run('确认视图升级 v3 → v4', '将新增列 tax_id 映射到本体属性「税额」，映射完成后自动切换绑定版本。')}>处理</Button>}
        />
      </Card>
    </>
  );
}
