import { useState } from 'react';
import { Alert, Button, Card, Input, Modal, Space, Table, Tag, Typography, message } from 'antd';
import { BugOutlined, FileTextOutlined, PlayCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { CAPABILITIES } from '../../mock/data';
import { ok, edit } from '../../components/proto';

const { Title, Text, Paragraph } = Typography;

type Capability = (typeof CAPABILITIES)[number];

const protoColor = (p: string) => ({ MCP: 'blue', REST: 'purple', CLI: 'default' } as Record<string, string>)[p];

/** 每个 CAPABILITIES 条目的调试样例输入/输出（原型 mock） */
const SAMPLES: Record<string, { input: string; output: string; ms: number }> = {
  c1: { input: '{ "type": "采购订单", "id": "PO20260930001" }', output: '{ "props": { "status": "已下达", "amount": 486000 }, "edges": ["FULFILLS", "SUPPLY"] }', ms: 34 },
  c2: { input: '{ "q": "哪些订单可能逾期？" }', output: '{ "dsl": "PO.where(risk_score>70)", "rows": 3, "ms": 1420 }', ms: 1420 },
  c3: { input: '{ "action": "freeze_order", "po_id": "PO20260930001", "dry_run": true }', output: '{ "token": "DRY-a83f", "edits": ["PO.status→冻结"], "side_effects": 1 }', ms: 214 },
  c4: { input: '{ "supplier_id": "S-0012" }', output: '{ "level": "C", "trend": "下降", "orders_affected": 14 }', ms: 95 },
};

export default function CapabilityCatalog() {
  const [dbg, setDbg] = useState<Capability>();
  const [req, setReq] = useState('');
  const sample = dbg ? SAMPLES[dbg.id] : undefined;

  const openDebug = (r: Capability) => { setDbg(r); setReq(SAMPLES[r.id]?.input ?? '{ }'); };

  const callFn = () => {
    try { JSON.parse(req); } catch { message.error('请求体不是合法 JSON，请修正后重试'); return; }
    message.loading({ content: `调用 ${dbg?.name} …`, key: 'dbg', duration: 0.6 });
    setTimeout(() => message.success({ content: `200 OK · ${sample?.ms}ms · 输出已回填`, key: 'dbg' }), 700);
  };

  const columns = [
    {
      title: '能力', key: 'name',
      render: (_: unknown, r: Capability) => (
        <>
          <div style={{ fontWeight: 600 }} className="mono">{r.name}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>{r.desc}</Text>
        </>
      ),
    },
    {
      title: '封装协议', key: 'proto',
      render: (_: unknown, r: Capability) => (
        <Space size={4}>{r.proto.split('/').map(p => <Tag key={p} color={protoColor(p)}>{p}</Tag>)}</Space>
      ),
    },
    { title: '7日调用', dataIndex: 'calls', key: 'calls', render: (v: string) => <Text className="mono">{v}</Text> },
    { title: '负责人', dataIndex: 'owner', key: 'owner' },
    {
      title: '操作', key: 'ops',
      render: (_: unknown, r: Capability) => (
        <Space size={4}>
          <Button size="small" type="link" icon={<BugOutlined />} onClick={() => openDebug(r)}>调试</Button>
          <Button size="small" type="link" icon={<FileTextOutlined />} onClick={() => ok(`${r.name} 文档：签名 / 参数 schema / 错误码 / 调用配额（原型示意）`)}>文档</Button>
        </Space>
      ),
    },
  ];

  const ROUTES = [
    { item: '库存扣减 / 状态校验', to: '规则引擎', feat: '确定性，<10ms', tag: ['规则', 'default'] },
    { item: '风险等级粗分', to: '轻量判断', feat: '高频，<100ms', tag: ['轻量', 'blue'] },
    { item: '逾期根因解释 / 方案建议', to: 'LLM + 本体上下文', feat: '复杂推理，带证据', tag: ['LLM', 'purple'] },
    { item: '冻结 / 取消 / 调价', to: '人工闸门', feat: '永远人工确认', tag: ['人工', 'red'] },
  ];

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>本体能力出口</Title>
          <Text type="secondary">统一能力出口层（M7-F01）：所有智能能力在此注册发布，供 Agent / 系统 / 人调用，权限、回执、审计完全一致</Text>
        </div>
        <div style={{ flex: 1 }} />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => edit('注册能力', [
          ['能力名', <Input key="n" className="mono" placeholder="scm.risk.score" />],
          ['封装协议', <Input key="p" defaultValue="REST/MCP" />],
          ['负责人', <Input key="o" defaultValue="张三" />],
        ])}>注册能力</Button>
      </div>
      <Alert type="info" showIcon style={{ marginBottom: 12 }}
        message="各 Agent 不重复定义业务概念，统一从本体能力出口调用；本体对象 >200 时启用导航壳降级 + 回执证据链。" />
      <Card style={{ marginBottom: 12 }}>
        <Table<Capability> rowKey="id" columns={columns as never} dataSource={CAPABILITIES} size="middle" pagination={false} />
      </Card>
      <Card title="决策路由说明" extra={<Text type="secondary" style={{ fontSize: 12 }}>按决策类型自动选择执行层 · 示例：订单风险场景</Text>}>
        <Table
          rowKey="item" size="small" pagination={false}
          dataSource={ROUTES}
          columns={[
            { title: '决策事项', dataIndex: 'item' },
            { title: '路由到', dataIndex: 'to', render: (v: string) => <b>{v}</b> },
            { title: '特性', dataIndex: 'feat', render: (v: string) => <Text type="secondary" style={{ fontSize: 12 }}>{v}</Text> },
            { title: '执行层', key: 'tag', align: 'right', render: (_: unknown, r: (typeof ROUTES)[number]) => <Tag color={r.tag[1]}>{r.tag[0]}</Tag> },
          ] as never}
        />
        <Paragraph type="secondary" style={{ fontSize: 12, marginTop: 12, marginBottom: 0 }}>
          规则管确定性 · LLM 管复杂推理 · 高风险动作永远人工确认
        </Paragraph>
      </Card>

      <Modal
        title={<>调试 · <Text code>{dbg?.name}</Text></>}
        open={!!dbg} width={720} onCancel={() => setDbg(undefined)}
        footer={<Space>
          <Button onClick={() => { setReq(sample?.input ?? '{ }'); message.info('已重置为示例请求'); }}>重置示例</Button>
          <Button type="primary" icon={<PlayCircleOutlined />} onClick={callFn}>调用</Button>
        </Space>}
      >
        <Alert type="info" showIcon style={{ marginBottom: 12 }}
          message="函数为纯计算（无副作用）：相同输入永远相同输出；Action 类能力会校验调用方权限并全量留痕。" />
        <Text strong style={{ fontSize: 13 }}>请求体（JSON）</Text>
        <Input.TextArea
          className="mono" rows={4} style={{ margin: '6px 0 12px' }}
          value={req} onChange={e => setReq(e.target.value)}
        />
        <Text strong style={{ fontSize: 13 }}>响应（mock）</Text>
        <pre className="mono" style={{ background: '#0d1420', color: '#e2e4e9', borderRadius: 8, padding: 12, fontSize: 12, marginTop: 6, minHeight: 76 }}>
{sample ? `HTTP/1.1 200 OK · ${sample.ms}ms\n${sample.output}` : '// 点击「调用」查看返回'}
        </pre>
      </Modal>
    </>
  );
}
