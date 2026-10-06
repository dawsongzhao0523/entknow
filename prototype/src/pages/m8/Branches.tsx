import { useState } from 'react';
import { Alert, Button, Card, Input, Modal, Space, Table, Tag, Typography } from 'antd';
import { BranchesOutlined, PlusOutlined } from '@ant-design/icons';
import { edit } from '../../components/proto';

const { Title, Text } = Typography;

interface Branch {
  id: string; name: string; version?: string; status: string; statusColor: string;
  tags: string[]; note: string;
}

const BRANCHES: Branch[] = [
  { id: 'b1', name: 'main', version: 'v0.3', status: '生产中', statusColor: 'green', tags: ['保护分支'], note: '保护分支，仅门禁可发布' },
  { id: 'b2', name: 'dev-risk', version: 'v0.4', status: '评审中', statusColor: 'blue', tags: [], note: '变更: +交付风险分 · diff 12 处' },
  { id: 'b3', name: 'exp-new-erp', status: '实验中', statusColor: 'default', tags: ['子图隔离'], note: '子图隔离: 仅对象 9/34 可见，沙箱数据' },
];

const columns = [
  {
    title: '分支', key: 'name',
    render: (_: unknown, r: Branch) => (
      <Space>
        <BranchesOutlined />
        <Text className="mono" style={{ fontWeight: 700 }}>{r.name}</Text>
        {r.version && <Text type="secondary" className="mono" style={{ fontSize: 12 }}>{r.version}</Text>}
      </Space>
    ),
  },
  {
    title: '状态', key: 'status',
    render: (_: unknown, r: Branch) => (
      <Space size={4}>
        <Tag color={r.statusColor}>{r.status}</Tag>
        {r.tags.map(t => <Tag key={t} color={t === '子图隔离' ? 'purple' : 'default'}>{t}</Tag>)}
      </Space>
    ),
  },
  { title: '说明', dataIndex: 'note', key: 'note', render: (v: string) => <Text type="secondary" style={{ fontSize: 12 }}>{v}</Text> },
];

export default function Branches() {
  const [mergeOpen, setMergeOpen] = useState(false);

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>分支与子图隔离</Title>
          <Text type="secondary">M8-F02 · 供应链本体 · 共 3 个分支：生产中 1 · 评审中 1 · 实验中 1</Text>
        </div>
        <div style={{ flex: 1 }} />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => edit('新建分支', [
          ['分支名', <Input key="n" className="mono" placeholder="dev-promo" />],
          ['基于', <Input key="b" className="mono" defaultValue="main @ v0.3" />],
          ['用途', <Input key="d" defaultValue="实验：促销季交付风险策略" />],
        ])}>新建分支</Button>
      </div>
      <Card style={{ marginBottom: 12 }}>
        <Table<Branch> rowKey="id" columns={columns as never} dataSource={BRANCHES} size="middle" pagination={false} />
      </Card>
      <Card title="合并">
        <Space size={12} wrap>
          <Text className="mono" style={{ fontWeight: 700 }}>dev-risk</Text>
          <Text type="secondary">→</Text>
          <Text className="mono" style={{ fontWeight: 700 }}>main</Text>
          <Button type="primary" onClick={() => setMergeOpen(true)}>发起合并 dev-risk → main</Button>
        </Space>
        <Alert type="info" showIcon style={{ marginTop: 16 }}
          message="子图隔离用途：新 ERP 试点只暴露相关对象，避免全量本体耦合。" />
      </Card>
      <Modal
        title="合并预检 · dev-risk → main"
        open={mergeOpen} onCancel={() => setMergeOpen(false)}
        footer={[
          <Button key="c" onClick={() => setMergeOpen(false)}>取消</Button>,
          <Button key="ok" type="primary" onClick={() => setMergeOpen(false)}>确认发起（进入评审）</Button>,
        ]}
      >
        <Space size={8} style={{ margin: '8px 0' }}>
          <Tag color="green">冲突 0</Tag>
          <Tag color="blue">引用影响 3</Tag>
          <Tag color="orange">需评审</Tag>
        </Space>
        <div><Text type="secondary" style={{ fontSize: 12 }}>合并将创建评审单并进入发布门禁流程，main 为保护分支，仅门禁可发布。</Text></div>
      </Modal>
    </>
  );
}
