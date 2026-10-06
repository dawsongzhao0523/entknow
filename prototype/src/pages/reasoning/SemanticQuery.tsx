import { Button, Card, Col, Input, Row, Space, Table, Tabs, Tag, Typography } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { ok } from '../../components/proto';

const { Title, Text } = Typography;

const DSL = `-- DSL
PO where promise_dt < now() and risk > 80
order by amount desc`;

const SQL = `-- SQL（下推至联邦视图 lv_order_delivery v3）
SELECT po_id, supplier_id, promise_dt, amount, risk_score
FROM lv_order_delivery
WHERE promise_dt < NOW() AND risk_score > 80
ORDER BY amount DESC
LIMIT 100;`;

const RESULTS = [
  { po: 'PO20260930001', supplier: 'S-0012 华兴电子', promiseDt: '2026-10-15', risk: 86, amount: '¥58,200' },
  { po: 'PO20260928876', supplier: 'S-0047 科锐精密', promiseDt: '2026-10-09', risk: 83, amount: '¥41,900' },
  { po: 'PO20260927440', supplier: 'S-0031 立恒材料', promiseDt: '2026-10-11', risk: 81, amount: '¥36,750' },
];

const CONCEPTS = [
  { name: '采购订单', hit: '主语命中：同义词「订单 / PO」归一' },
  { name: '交付风险分', hit: '谓词命中：「高风险」→ 派生函数 risk > 80' },
  { name: '供应商', hit: '关联命中：经 SUPPLY 边带出供应商列' },
];

export default function SemanticQuery() {
  const nav = useNavigate();
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>语义查询工作台</Title>
          <Text type="secondary">自然语言 → DSL → SQL 三段转换</Text>
        </div>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Space.Compact style={{ width: '100%' }}>
          <Input size="large" prefix={<SearchOutlined />} defaultValue="逾期的高风险采购订单" />
          <Button size="large" type="primary" onClick={() => ok('查询完成：NL → DSL → SQL 编译成功，命中 lv_order_delivery v3，返回 6 行 · 842ms')}>执行</Button>
        </Space.Compact>
        <Tabs
          style={{ marginTop: 16 }}
          items={[
            { key: 'dsl', label: '① DSL', children: <pre style={{ background: '#f8fbfa', padding: 12, borderRadius: 8, fontSize: 12, margin: 0 }}>{DSL}</pre> },
            { key: 'sql', label: '② SQL', children: <pre style={{ background: '#f8fbfa', padding: 12, borderRadius: 8, fontSize: 12, margin: 0 }}>{SQL}</pre> },
          ]}
        />
      </Card>

      <Row gutter={16}>
        <Col span={16}>
          <Card title={<Space>结果 <Tag>3 条逾期订单</Tag></Space>} extra={<Text type="secondary" style={{ fontSize: 12 }}>耗时 0.4s</Text>}>
            <Table
              rowKey="po"
              size="middle"
              dataSource={RESULTS}
              pagination={false}
              onRow={() => ({ onClick: () => nav('/runtime/instance-360'), style: { cursor: 'pointer' } })}
              columns={[
                { title: '订单', dataIndex: 'po', render: v => <Text code strong>{v}</Text> },
                { title: '供应商', dataIndex: 'supplier' },
                { title: '承诺交期', dataIndex: 'promiseDt', render: v => <Text code>{v}</Text> },
                { title: '风险分', dataIndex: 'risk', width: 90, render: v => <Tag color="red">{v}</Tag> },
                { title: '金额', dataIndex: 'amount', align: 'right', render: v => <Text code>{v}</Text> },
                { title: '操作', key: 'ops', align: 'right', render: () => <Button type="link" size="small" onClick={() => nav('/runtime/instance-360')}>360°视图 →</Button> },
              ]}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card title="命中的本体概念">
            {CONCEPTS.map(c => (
              <div key={c.name} style={{ marginBottom: 14 }}>
                <Tag color="blue">{c.name}</Tag>
                <div><Text type="secondary" style={{ fontSize: 12 }}>{c.hit}</Text></div>
              </div>
            ))}
          </Card>
        </Col>
      </Row>
    </>
  );
}
