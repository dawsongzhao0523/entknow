import { Alert, Button, Card, Descriptions, Form, Input, InputNumber, Popconfirm, Progress, Select, Space, Table, Tag, Typography } from 'antd';
import { DeleteOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { SANDBOX_BRANCHES } from '../../mock/data';
import { ok, run } from '../../components/proto';

const { Title, Text } = Typography;

const RISK_COLOR = (v: number) => (v >= 70 ? '#ff4d4f' : v >= 60 ? '#c9861a' : '#2d8a4e');

export default function Sandbox() {
  const nav = useNavigate();
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>推演沙盘 · 多分支对比</Title>
          <Text type="secondary">克隆生产口径注入假设，Tick 推演后择优回写</Text>
        </div>
        <div style={{ flex: 1 }} />
        <Popconfirm title="确认销毁沙盘？推演结果将不可恢复。" okText="销毁" okButtonProps={{ danger: true }}
          onConfirm={() => ok('沙盘已销毁，生产口径不受影响；可随时重新克隆')}>
          <Button danger icon={<DeleteOutlined />}>销毁沙盘</Button>
        </Popconfirm>
      </div>

      <Alert
        style={{ marginBottom: 16 }}
        type="warning"
        showIcon
        message={<span><b>推演世界与生产隔离</b> · 克隆自生产 v0.3 · 已运行 Tick 30 · 默认不回写生产</span>}
      />

      <Card title="假设注入 · 分支 B" style={{ marginBottom: 16 }} extra={<Button type="primary" icon={<PlayCircleOutlined />} onClick={() => run('注入并重算', '将假设写入分支 B 沙盘世界，重放 30 个 Tick：传播规则 × 23 条即时求值，生成新推演终值。', () => ok('分支 B 已重算：交付风险分 76 → 52 · 成本 +¥1.2 万/月'))}>注入并重算</Button>}>
        <Form layout="inline">
          <Form.Item label="分支">
            <Select defaultValue="B" style={{ width: 220 }} options={[
              { value: 'B', label: '分支 B · 切换备选供应商' },
              { value: 'C', label: '分支 C · 提前下单 7 天' },
            ]} />
          </Form.Item>
          <Form.Item label="切换供应商">
            <Input.Group compact>
              <Input defaultValue="S-0012" style={{ width: 100, textAlign: 'center' }} />
              <Input style={{ width: 34, borderLeft: 0, borderRight: 0, pointerEvents: 'none', textAlign: 'center' }} placeholder="→" disabled />
              <Input defaultValue="S-0031" style={{ width: 100, textAlign: 'center' }} />
            </Input.Group>
          </Form.Item>
          <Form.Item label="delay">
            <InputNumber defaultValue={-4} style={{ width: 110 }} addonAfter="天" />
          </Form.Item>
        </Form>
      </Card>

      <Card title="多分支对比" style={{ marginBottom: 16 }}>
        <Table
          rowKey="id"
          size="middle"
          dataSource={SANDBOX_BRANCHES}
          pagination={false}
          columns={[
            { title: '分支', dataIndex: 'name', render: (v: string, r) => <Space><Text strong>{v}</Text>{r.note === '推荐' && <Tag color="green">推荐</Tag>}</Space> },
            { title: '假设', dataIndex: '假设', render: (v: string) => <Text code style={{ fontSize: 12 }}>{v}</Text> },
            {
              title: '交付风险分（推演终值）', dataIndex: 'risk', width: 260,
              render: (v: number) => (
                <Space style={{ width: '100%' }}>
                  <Progress percent={v} size="small" strokeColor={RISK_COLOR(v)} style={{ width: 160 }} showInfo={false} />
                  <Text strong style={{ color: RISK_COLOR(v) }}>{v}</Text>
                </Space>
              ),
            },
            { title: '成本影响', dataIndex: 'cost', render: (v: string) => v === '—' ? <Text type="secondary">—</Text> : <Text code style={{ fontSize: 12 }}>{v}</Text> },
            { title: '备注', dataIndex: 'note', render: (v: string) => v || <Text type="secondary">—</Text> },
          ]}
        />
      </Card>

      <Card title="行动清单">
        <Descriptions
          size="small"
          column={1}
          items={[
            { key: '1', label: '行动 1', children: '切换分支 B：供应商 S-0012 → S-0031（delay -4 天），风险分 76 → 52' },
            { key: '2', label: '来源', children: <Text type="secondary">沙盘 Tick 30 推演终值 · 多分支对比择优</Text> },
          ]}
        />
        <div style={{ marginTop: 16 }}>
          <Popconfirm
            title="写回生产将创建真实 Action 调用"
            description="将通过 Action 网关执行（需计划主管 + 二次确认），确认继续？"
            okText="确认写回"
            onConfirm={() => nav('/runtime/action-gateway')}
          >
            <Button type="primary">写回生产 →</Button>
          </Popconfirm>
          <Button style={{ marginLeft: 8 }} onClick={() => ok('已继续推演 +10 Tick（Tick 40）：终值收敛，波动 <0.5%')}>继续推演</Button>
          <Button onClick={() => run('放弃本次推演', '丢弃沙盘分支 B 的全部假设与结果，恢复到克隆时点。')}>放弃</Button>
        </div>
      </Card>
    </>
  );
}
