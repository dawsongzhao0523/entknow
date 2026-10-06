import { Alert, Button, Card, Input, Select, Space, Switch, Table, Tag, Typography, message } from 'antd';
import { SaveOutlined, SendOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { EDGES } from '../../mock/data';

const { Title, Text } = Typography;

const supply = EDGES[0];

export default function EdgeEditor() {
  const nav = useNavigate();

  const propColumns = [
    { title: '属性', dataIndex: 'name', width: 110, render: (v: string) => <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{v}</span> },
    { title: '类型', dataIndex: 'type', width: 100, render: (v: string) => <Text type="secondary" style={{ fontFamily: 'monospace', fontSize: 12 }}>{v}</Text> },
    { title: '中文备注', dataIndex: 'comment', width: 140 },
    {
      title: '时序', dataIndex: 'temporal',
      render: (v: string | undefined) => (
        <Space size={6}>
          <Switch size="small" defaultChecked={!!v} />
          {v && <Tag color="blue" style={{ fontSize: 11 }}>{v}</Tag>}
        </Space>
      ),
    },
    {
      title: '聚合', dataIndex: 'agg', width: 120,
      render: (v: string | undefined) => v
        ? <Select size="small" defaultValue={v} style={{ width: 96 }} options={['SUM', 'AVG', 'MAX', 'MIN'].map(o => ({ value: o, label: o }))} />
        : <Text type="secondary">—</Text>,
    },
  ];

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>关系建模编辑器 · {supply.name}</Title>
          <Text type="secondary">一等公民关系：边可携带属性，支持时序声明与聚合方式（M3-F03）</Text>
        </div>
        <div style={{ flex: 1 }} />
        <Space>
          <Tag color="purple">一等公民关系</Tag>
          <Tag>{supply.version} · {supply.status === 'PUBLISHED' ? '已发布' : '草稿'}</Tag>
        </Space>
      </div>

      <Card size="small" style={{ marginBottom: 12 }}>
        {/* 端点选择 */}
        <div style={{ border: '1px solid #e2e4e9', background: '#fafbfd', borderRadius: 10, padding: '16px 14px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Tag color="blue" style={{ height: 28, lineHeight: '26px', padding: '0 12px', fontSize: 12 }}>🏢 {supply.from} Supplier</Tag>
          <Text type="secondary" style={{ fontFamily: 'monospace' }}>──</Text>
          <Tag color="purple" style={{ height: 28, lineHeight: '26px', fontWeight: 700, letterSpacing: 1 }}>SUPPLY</Tag>
          <Text type="secondary" style={{ fontFamily: 'monospace' }}>──▶</Text>
          <Tag color="blue" style={{ height: 28, lineHeight: '26px', padding: '0 12px', fontSize: 12 }}>🏭 {supply.to} Plant</Tag>
          <div style={{ flex: 1 }} />
          <Text type="secondary" style={{ fontSize: 12 }}>基数:</Text>
          <Select size="small" defaultValue="N:M" style={{ width: 90 }}
            options={['1:1', '1:N', 'N:1', 'N:M'].map(o => ({ value: o, label: o }))} />
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontSize: 12, color: '#5a5a72', marginBottom: 4 }}>关系编码 *</div>
            <Input defaultValue="SUPPLY" style={{ fontFamily: 'monospace' }} />
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontSize: 12, color: '#5a5a72', marginBottom: 4 }}>显示名称</div>
            <Input defaultValue="供应" />
          </div>
          <div style={{ flex: 2, minWidth: 280 }}>
            <div style={{ fontSize: 12, color: '#5a5a72', marginBottom: 4 }}>语义描述（随关系一起版本化，进入评审）</div>
            <Input defaultValue="供应商按月向工厂供货，边记录供货量、时延与成本三项时序属性。" />
          </div>
        </div>
      </Card>

      <Card size="small" style={{ marginBottom: 12 }} title="边属性（一等公民）"
        extra={<Text type="secondary" style={{ fontSize: 12 }}>被引用 {supply.refCount} 处</Text>}>
        <Table rowKey="name" size="small" pagination={false} columns={propColumns} dataSource={supply.props} />
      </Card>

      <Card size="small" style={{ marginBottom: 12 }} title="约束与传播"
        extra={<Text type="secondary" style={{ fontSize: 12 }}>约束违反进入 Lint 与推理告警 · 传播在数据写入时触发</Text>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Alert
            type="warning" showIcon
            message={
              <Space wrap>
                <b>约束:</b>
                <span style={{ fontFamily: 'monospace' }}>max_delay</span>
                ≤
                <Input size="small" defaultValue="30" style={{ width: 70 }} suffix="天" />
                <Text type="secondary" style={{ fontSize: 12 }}>（违反 → Lint ⚠ + 推理告警）</Text>
              </Space>
            }
          />
          <Alert
            type="info" showIcon icon={<span>🔄</span>}
            message={<span><b>传播:</b> delay 月均值变化 {'>'}20% → 下游「采购订单.交付风险分」重算</span>}
          />
          <Alert
            type="info" showIcon
            message={<span><b>引用检查:</b> 被 2 函数 · 1 规则引用，端点对象不可删</span>}
          />
        </div>

        <Space style={{ marginTop: 16 }}>
          <Button icon={<SaveOutlined />} onClick={() => message.success('草稿已保存')}>保存草稿</Button>
          <Button type="primary" icon={<SendOutlined />} onClick={() => nav('/m8/review')}>提交评审</Button>
        </Space>
      </Card>
    </>
  );
}
