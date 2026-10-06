import { useState } from 'react';
import { Alert, Button, Card, Col, Modal, Popconfirm, Row, Space, Statistic, Table, Tag, Timeline, Typography, message } from 'antd';
import { BranchesOutlined, DiffOutlined, RollbackOutlined, RocketOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { VERSIONS } from '../../mock/data';

const { Title, Text } = Typography;

const DIFF_ROWS = [
  { kind: '新增', target: '函数 · 交付风险分（派生）', detail: '签名 (po: 采购订单) → decimal(0-100)，绑定 SUPPLY.delay 时序' },
  { kind: '新增', target: '关系 · FULFILLS（准入评估 → 采购订单）', detail: '引用数 2，草稿态' },
  { kind: '修改', target: '对象 · 采购订单 PO', detail: '状态机 +异常态「已冻结」，版本 v0.3 → v0.4' },
  { kind: '修改', target: '关系 · SUPPLY', detail: 'delay 聚合 AVG 确认，新增传播规则绑定' },
  { kind: '删除', target: '—', detail: '本版本无删除项' },
];

const diffColor = (k: string) => ({ 新增: 'green', 修改: 'orange', 删除: 'red' } as Record<string, string>)[k];

export default function Versions({ embedded }: { embedded?: boolean }) {
  const nav = useNavigate();
  const [diffOpen, setDiffOpen] = useState(false);

  return (
    <>
      {!embedded && (
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>本体与版本管理</Title>
          <Text type="secondary">供应链本体 · 主干 · 每次发布生成不可变快照（M3-F04）</Text>
        </div>
      </div>
      )}

      <Card size="small" style={{ marginBottom: 12 }} title="版本概览">
        <Row gutter={16}>
          <Col span={6}><Statistic title="当前版本" value="v0.4" suffix={<Text type="secondary" style={{ fontSize: 13 }}>◌ 草稿 · 评审中</Text>} /></Col>
          <Col span={6}><Statistic title="生产中版本" value="v0.3" suffix={<Text type="secondary" style={{ fontSize: 13 }}>已发布</Text>} /></Col>
          <Col span={6}><Statistic title="创建时间" value="2026-08-12" valueStyle={{ fontSize: 20 }} suffix={<Text type="secondary" style={{ fontSize: 13 }}>张三</Text>} /></Col>
          <Col span={6}><Statistic title="待发布变更" value={1} suffix="项" /></Col>
        </Row>
      </Card>

      <Card size="small" title="版本时间线" extra={<Text type="secondary" style={{ fontSize: 12 }}>共 {VERSIONS.length} 个版本</Text>}>
        <Timeline
          style={{ marginTop: 12 }}
          items={VERSIONS.map(v => ({
            color: v.status.startsWith('PUBLISHED') ? 'green' : 'orange',
            dot: v.status === 'DRAFT' ? undefined : undefined,
            children: (
              <>
                <Space size={8}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{v.v}</span>
                  <Text type="secondary" style={{ fontSize: 12 }}>{v.date}</Text>
                  <Tag color={v.status.startsWith('PUBLISHED') ? 'green' : 'orange'}>
                    {v.status.startsWith('PUBLISHED') ? `● ${v.status === 'PUBLISHED（生产中）' ? '已发布（生产中）' : '已发布'}` : '◌ 草稿'}
                  </Tag>
                </Space>
                <div style={{ fontSize: 12.5, marginTop: 2 }}>{v.desc}</div>
              </>
            ),
          }))}
        />

        <Space wrap style={{ marginTop: 8 }}>
          <Button icon={<DiffOutlined />} onClick={() => setDiffOpen(true)}>diff v0.3 ↔ v0.4</Button>
          <Popconfirm
            title="回滚到 v0.2？"
            description="将基于 v0.2 生成新草稿分支，生产中 v0.3 不受影响"
            onConfirm={() => message.success('已基于 v0.2 创建回滚草稿')}
          >
            <Button icon={<RollbackOutlined />}>回滚到 v0.2</Button>
          </Popconfirm>
          <Button icon={<BranchesOutlined />} onClick={() => nav('/m8/branches')}>创建分支</Button>
          <Button type="primary" icon={<RocketOutlined />} onClick={() => nav('/m8/release-gate')}>发布 → 门禁</Button>
        </Space>

        <Alert
          style={{ marginTop: 12 }} type="info" showIcon
          message="发布门禁：v0.4（草稿）发布需通过门禁检查（K2 → K3），详见 治理与演化 · 发布门禁"
        />
      </Card>

      <Modal title="diff · v0.3 ↔ v0.4" open={diffOpen} width={760}
        footer={<Button type="primary" onClick={() => setDiffOpen(false)}>关闭</Button>}
        onCancel={() => setDiffOpen(false)}>
        <Table
          rowKey="target" size="small" pagination={false}
          columns={[
            { title: '变更', dataIndex: 'kind', width: 70, render: (v: string) => <Tag color={diffColor(v)}>{v}</Tag> },
            { title: '对象 / 元素', dataIndex: 'target', width: 280 },
            { title: '说明', dataIndex: 'detail' },
          ]}
          dataSource={DIFF_ROWS}
        />
        <Text type="secondary" style={{ fontSize: 12 }}>新增 2 · 修改 2 · 删除 0 ｜ 无破坏性变更</Text>
      </Modal>
    </>
  );
}
