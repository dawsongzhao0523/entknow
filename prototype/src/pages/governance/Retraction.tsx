import { useState } from 'react';
import { Alert, Button, Card, Checkbox, Col, Radio, Row, Statistic, Steps, Tag, Typography } from 'antd';
import { run } from '../../components/proto';

const { Title, Text } = Typography;

export default function Retraction() {
  const [strategy, setStrategy] = useState('recalc');
  const [confirmed, setConfirmed] = useState(true);

  return (
    <>
      <div style={{ marginBottom: 12 }}>
        <Title level={4} style={{ margin: 0 }}>撤回传播与对账</Title>
        <Text type="secondary"> · 误改口径可撤回、可重算、可对账</Text>
      </div>
      <Alert type="warning" showIcon style={{ marginBottom: 12 }}
        message={<>撤回场景：v0.3.1 误改 <Text className="mono">SUPPLY.delay</Text> 聚合口径 → 已传播到下游 3 个函数</>} />
      <Card
        title="撤回向导"
        extra={<Tag color="orange">进行中 · 第 3 步</Tag>}
        style={{ marginBottom: 12 }}
      >
        <Steps
          current={2} size="small" style={{ marginBottom: 24 }}
          items={[
            { title: '选择版本 · v0.3.1' },
            { title: '影响扫描' },
            { title: '撤回策略' },
            { title: '二次确认 → 执行' },
          ]}
        />
        <Row gutter={12} style={{ marginBottom: 16 }}>
          <Col span={6}><Card size="small"><Statistic title="回滚目标版本" value="v0.3.1" valueStyle={{ fontSize: 19 }} /></Card></Col>
          <Col span={6}><Card size="small"><Statistic title="受影响函数" value={3} prefix="×" /></Card></Col>
          <Col span={6}><Card size="small"><Statistic title="受影响实例属性" value="214万" prefix="×" /></Card></Col>
          <Col span={6}><Card size="small"><Statistic title="受影响沙盘" value={1} prefix="×" /></Card></Col>
        </Row>
        <Title level={5}>撤回策略</Title>
        <Radio.Group
          value={strategy} onChange={e => setStrategy(e.target.value)}
          options={[
            { value: 'recalc', label: '回滚并重算（推荐）' },
            { value: 'void', label: '仅标记作废' },
          ]}
        />
        <div style={{ display: 'flex', alignItems: 'center', marginTop: 24 }}>
          <Checkbox checked={confirmed} onChange={e => setConfirmed(e.target.checked)}>
            二次确认：已核对影响范围（函数×3 · 实例属性×214万 · 沙盘×1）
          </Checkbox>
          <div style={{ flex: 1 }} />
          <Button danger type="primary" disabled={!confirmed}
            onClick={() => run(`执行撤回（${strategy === 'recalc' ? '回滚并重算' : '仅标记作废'}）`, '将通过 Action 网关下发撤回事务；重算在后台执行，完成后通知 5 位引用方。')}>执行撤回</Button>
        </div>
      </Card>
      <Card title="对账报告" extra={<Tag color="green">对账完成</Tag>}>
        <Row gutter={12}>
          <Col span={6}><Statistic title="重算完成" value={100} suffix="%" valueStyle={{ color: '#2d8a4e' }} /></Col>
          <Col span={6}>
            <Statistic title="差异实例" value={8412} />
            <Tag color="green" style={{ marginTop: 4 }}>已回写</Tag>
          </Col>
          <Col span={6}><Statistic title="耗时" value={18} suffix="min" /></Col>
          <Col span={6}><Statistic title="已通知引用方" value={5} suffix="人" /></Col>
        </Row>
      </Card>
    </>
  );
}
