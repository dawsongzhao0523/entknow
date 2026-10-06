import { Alert, Button, Card, Col, Popconfirm, Row, Space, Statistic, Table, Tag, Typography } from 'antd';
import { CheckCircleFilled, WarningFilled } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { GATE_ITEMS } from '../../mock/data';
import { ok, run } from '../../components/proto';

const { Title, Text } = Typography;

type GateItem = (typeof GATE_ITEMS)[number];

export default function ReleaseGate() {
  const nav = useNavigate();

  const columns = [
    {
      title: '状态', key: 'result', width: 60,
      render: (_: unknown, r: GateItem) => r.result === 'pass'
        ? <CheckCircleFilled style={{ color: '#2d8a4e', fontSize: 18 }} />
        : <WarningFilled style={{ color: '#c9861a', fontSize: 18 }} />,
    },
    {
      title: '检查项', key: 'name',
      render: (_: unknown, r: GateItem) => (
        <>
          <div style={{ fontWeight: 600 }}>{r.name}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>{r.detail}</Text>
        </>
      ),
    },
    {
      title: '结果', key: 'tag', align: 'right',
      render: (_: unknown, r: GateItem) => r.result === 'pass'
        ? <Tag color="green">通过</Tag>
        : <Button size="small" type="primary" ghost onClick={() => nav('/m6/sandbox')}>一键送沙盘 →</Button>,
    },
  ];

  return (
    <>
      <div style={{ marginBottom: 12 }}>
        <Title level={4} style={{ margin: 0 }}>发布门禁与 K 等级引擎</Title>
        <Text type="secondary">M8-F01 · 门禁全绿方可发布，K 等级随证据链晋升</Text>
      </div>
      <Card style={{ marginBottom: 12 }}>
        <Space size={16} wrap>
          <Tag color="blue" style={{ fontSize: 13, padding: '2px 10px' }}>供应链本体 v0.4</Tag>
          <span>发布目标：<Tag>K2</Tag> → <Tag color="gold">K3</Tag></span>
          <span>申请人：<b>张三</b></span>
          <span>评审单：<Text className="mono">RV-2026-1002-003</Text></span>
          <Tag color="orange">阻塞 1 项</Tag>
        </Space>
      </Card>
      <Row gutter={12} style={{ marginBottom: 12 }}>
        <Col span={6}><Card><Statistic title="门禁检查项" value={5} suffix="项" /></Card></Col>
        <Col span={6}><Card><Statistic title="已通过" value={4} valueStyle={{ color: '#2d8a4e' }} /></Card></Col>
        <Col span={6}><Card><Statistic title="警告" value={1} valueStyle={{ color: '#c9861a' }} /></Card></Col>
        <Col span={6}><Card><Statistic title="阻塞" value={1} valueStyle={{ color: '#c23b3b' }} /></Card></Col>
      </Row>
      <Card title="门禁检查项" extra={<Text type="secondary" style={{ fontSize: 12 }}>4 通过 · 1 警告</Text>} style={{ marginBottom: 12 }}>
        <Table<GateItem> rowKey="name" columns={columns as never} dataSource={GATE_ITEMS} size="middle" pagination={false} />
      </Card>
      <Card title="结论">
        <Alert type="warning" showIcon message="阻塞项 1（沙盘回归未完成）→ 通过后方可发布" />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <Space>
            <Button onClick={() => run('退回修改', '版本退回草稿态，附门禁报告（阻塞：沙盘回归未完成）通知建模人。')}>退回修改</Button>
            <Button type="primary" onClick={() => nav('/m6/sandbox')}>先去沙盘验证</Button>
            <Popconfirm
              title="管理员强制发布？"
              description="跳过阻塞项将留下 K2 降级记录并通知全部订阅方，事后可在 治理与演化·撤回 中回滚。"
              okText="强制发布" okButtonProps={{ danger: true }} cancelText="取消"
              onConfirm={() => run('强制发布 v0.4（管理员越权）', '发布将带「跳过阻塞：沙盘回归未完成」标记，K 等级维持 K2；操作已记入审计日志。', () => ok('v0.4 已强制发布（K2）· 审计记录 GW-FORCE-20261005'))}
            >
              <Button danger>强制发布（管理员）</Button>
            </Popconfirm>
          </Space>
        </div>
      </Card>
    </>
  );
}
