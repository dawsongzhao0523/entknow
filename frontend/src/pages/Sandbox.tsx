import { useCallback, useEffect, useState } from 'react';
import { App, Button, Card, Col, Form, Input, InputNumber, Modal, Popconfirm, Row, Space, Tag, Typography } from 'antd';
import { ExperimentOutlined, RollbackOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { api, type SandboxBranch } from '../api';

const { Title, Text } = Typography;
const ME = '张三';

const statusColor: Record<string, string> = { 推演中: 'blue', 已对比: 'green', 已回滚: 'default' };
const riskColor = (s: number) => (s > 80 ? '#c23b3b' : s > 60 ? '#c9861a' : '#2d8a4e');

const RiskBar = ({ label, v }: { label: string; v: number }) => (
  <div style={{ marginBottom: 6 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#5a5a72' }}>
      <span>{label}</span><span><b style={{ color: riskColor(v) }}>{v}</b></span>
    </div>
    <div style={{ height: 6, background: '#f1f3f5', borderRadius: 3, marginTop: 2 }}>
      <div style={{ width: `${v}%`, height: 6, borderRadius: 3, background: riskColor(v), transition: 'width .3s' }} />
    </div>
  </div>
);

/** 推演沙盘：多分支假设对比（推演不落地，行动才改世界；回滚即放弃，生产隔离） */
export default function Sandbox() {
  const { message } = App.useApp();
  const [branches, setBranches] = useState<SandboxBranch[]>([]);
  const [simTarget, setSimTarget] = useState<SandboxBranch | null>(null);
  const [simForm] = Form.useForm();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const reload = useCallback(() => {
    api.sandboxBranches().then(setBranches).catch(e => message.error(String((e as Error).message)));
  }, [message]);

  useEffect(() => { reload(); }, [reload]);

  const simulate = async () => {
    if (!simTarget) return;
    const v = await simForm.validateFields();
    try {
      const out = await api.simulateBranch(simTarget.id, {
        riskAfter: Number(v.riskAfter), cost: v.cost ?? '', note: v.note ?? '', by: ME,
      });
      message.success(`推演已记录：${out.name} 风险 ${out.riskBefore} → ${out.riskAfter}（可重跑，取最新）`);
      setSimTarget(null);
      reload();
    } catch (e) {
      message.error(String((e as Error).message)); // 已回滚 409 / 越界 400
    }
  };

  const rollback = async (b: SandboxBranch) => {
    try {
      await api.rollbackBranch(b.id, ME);
      message.success(`「${b.name}」已回滚（生产隔离，不产生任何生产写入）`);
      reload();
    } catch (e) {
      message.error(String((e as Error).message));
    }
  };

  const create = async () => {
    const v = await form.validateFields();
    try {
      const id = `sb-${Date.now().toString(36)}`;
      await api.createSandboxBranch({ ...v, id, status: '推演中' });
      message.success(`分支已创建：${id}（基准风险自动取实例当前值）`);
      setOpen(false);
      reload();
    } catch (e) {
      message.error(String((e as Error).message));
    }
  };

  return (
    <div>
      <Title level={4}>推演沙盘</Title>
      <Text type="secondary">在克隆世界中验证假设：多分支风险对比，推演不落地、回滚即放弃（生产隔离）</Text>

      <Row gutter={12} style={{ marginTop: 12 }}>
        {branches.map(b => (
          <Col span={8} key={b.id}>
            <Card size="small"
              title={<Space size={6}><ExperimentOutlined style={{ color: '#059669' }} /><b>{b.name}</b></Space>}
              extra={<Tag color={statusColor[b.status]}>{b.status}</Tag>}
              style={{ opacity: b.status === '已回滚' ? 0.55 : 1 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>假设：{b.hypothesis || '—'}</Text>
              {b.baseInstance && <div><Text code style={{ fontSize: 11 }}>{b.baseInstance}</Text></div>}
              <div style={{ marginTop: 10 }}>
                <RiskBar label="推演前风险" v={b.riskBefore} />
                <RiskBar label="推演后风险" v={b.riskAfter ?? 0} />
              </div>
              {b.cost && <div style={{ fontSize: 12, marginBottom: 4 }}>代价：<b>{b.cost}</b></div>}
              {b.note && <Tag color="green" style={{ marginInlineEnd: 0 }}>{b.note}</Tag>}
              <div style={{ marginTop: 10 }}>
                {b.status !== '已回滚' ? (
                  <Space size={0}>
                    <Button size="small" type="link" icon={<ThunderboltOutlined />}
                      onClick={() => { setSimTarget(b); simForm.setFieldsValue({ riskAfter: b.riskAfter ?? 50, cost: b.cost ?? '' }); }}>
                      模拟
                    </Button>
                    <Popconfirm title={`回滚「${b.name}」？（分支作废，生产隔离）`} onConfirm={() => rollback(b)}>
                      <Button size="small" type="link" danger icon={<RollbackOutlined />}>回滚</Button>
                    </Popconfirm>
                  </Space>
                ) : <Text type="secondary" style={{ fontSize: 12 }}>世界已销毁</Text>}
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Button type="primary" style={{ marginTop: 12 }} onClick={() => { form.resetFields(); setOpen(true); }}>新建分支</Button>

      <Modal title={`模拟 · ${simTarget?.name ?? ''}`} open={!!simTarget} onOk={simulate}
        onCancel={() => setSimTarget(null)} okText="记录推演（可重跑）" cancelText="取消">
        <Form form={simForm} layout="vertical">
          <Form.Item name="riskAfter" label="推演后风险分（0-100）" rules={[{ required: true }]}>
            <InputNumber min={0} max={100} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="cost" label="代价（如 +2.1% / 库存占用 +¥1.2M）"><Input /></Form.Item>
          <Form.Item name="note" label="结论（如 推荐）"><Input /></Form.Item>
        </Form>
      </Modal>

      <Modal title="新建沙盘分支" open={open} onOk={create} onCancel={() => setOpen(false)} okText="创建（幂等）" cancelText="取消">
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="分支名" rules={[{ required: true }]}><Input placeholder="分支 E · 联合谈判降价" /></Form.Item>
          <Form.Item name="hypothesis" label="假设" rules={[{ required: true }]}><Input placeholder="如 SUPPLY.cost -5%" /></Form.Item>
          <Form.Item name="baseInstance" label="基准实例（自动带出当前风险）"><Input placeholder="PO20261002091" /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
