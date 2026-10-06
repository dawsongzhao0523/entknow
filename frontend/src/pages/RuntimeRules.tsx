import { useCallback, useEffect, useState } from 'react';
import { App, Button, Card, Input, Modal, Select, Space, Table, Tag, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { api, type Action, type Rule, type RuleFiring } from '../api';

const { Title, Text } = Typography;

const TRIGGER: Record<string, [string, string]> = { manual: ['手动', 'blue'], schedule: ['定时', 'purple'], event: ['事件', 'cyan'] };
const ACT_COLOR: Record<string, string> = { 执行成功: 'green', 权限拒绝: 'red', 已回滚: 'orange', 待确认: 'blue' };

/** 规则与行动：传播规则 / 触发记录 / 行动网关日志 */
export default function RuntimeRules() {
  const { message } = App.useApp();
  const [rules, setRules] = useState<Rule[]>([]);
  const [firings, setFirings] = useState<RuleFiring[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [ruleFilter, setRuleFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ruleId: 'R4', instanceId: '', detail: '' });

  const reload = useCallback(() => {
    api.rules().then(setRules).catch(() => {});
    api.ruleFirings(ruleFilter).then(setFirings).catch(e => message.error(String((e as Error).message)));
    api.actions().then(setActions).catch(() => {});
  }, [ruleFilter, message]);

  useEffect(() => { reload(); }, [reload]);

  const record = async () => {
    if (!form.detail.trim()) { message.warning('请填写触发明细'); return; }
    try {
      await api.createRuleFiring({
        id: `rf-${Date.now().toString(36)}`, ruleId: form.ruleId,
        instanceId: form.instanceId.trim(), detail: form.detail.trim(),
      });
      message.success('触发记录已保存（幂等）');
      setOpen(false); setForm({ ruleId: 'R4', instanceId: '', detail: '' });
      reload();
    } catch (e) {
      message.error(String((e as Error).message));
    }
  };

  return (
    <div>
      <Title level={4}>规则与行动</Title>
      <Text type="secondary">传播规则（写入即计算）· 触发记录 · 行动网关日志（成功 / 权限拒绝 / 回滚）</Text>

      <Card size="small" title="传播规则" style={{ marginTop: 12 }}>
        <Table<Rule> size="small" rowKey="id" pagination={false} dataSource={rules}
          columns={[
            { title: '规则', dataIndex: 'id', width: 60, render: (v: string) => <b>{v}</b> },
            { title: '定义', dataIndex: 'def' },
            { title: '传播类型', dataIndex: 'kind', width: 100,
              render: (v: string) => <Tag color={{ 'V→V': 'green', 'V→E': 'blue', 'E→V': 'purple', 'E→E': 'orange' }[v]}>{v}</Tag> },
            { title: '触发次数', dataIndex: 'fired', width: 100, align: 'center' },
            { title: '状态', dataIndex: 'status', width: 90, render: (v: string) => <Tag color="green">{v}</Tag> },
          ]} />
      </Card>

      <Card size="small" title="规则触发记录" style={{ marginTop: 12 }}
        extra={<Space>
          <Select allowClear placeholder="按规则过滤" style={{ width: 140 }} value={ruleFilter || undefined}
            options={rules.map(r => ({ value: r.id, label: r.id }))} onChange={v => setRuleFilter(v ?? '')} />
          <Button icon={<PlusOutlined />} onClick={() => setOpen(true)}>记录触发</Button>
        </Space>}>
        <Table<RuleFiring> size="small" rowKey="id" pagination={false} dataSource={firings}
          columns={[
            { title: '规则', dataIndex: 'ruleId', width: 70, render: (v: string) => <b>{v}</b> },
            { title: '实例', dataIndex: 'instanceId', width: 150, render: (v?: string) => v ? <Text code style={{ fontSize: 12 }}>{v}</Text> : '—' },
            { title: '触发明细', dataIndex: 'detail' },
            { title: '时间', dataIndex: 'firedAt', width: 140 },
          ]} />
      </Card>

      <Card size="small" title="行动网关日志" style={{ marginTop: 12 }}>
        <Table<Action> size="small" rowKey="id" pagination={false} dataSource={actions}
          columns={[
            { title: '执行号', dataIndex: 'id', width: 130, render: (v: string) => <Text code style={{ fontSize: 12 }}>{v}</Text> },
            { title: '实例', dataIndex: 'instanceId', width: 140, render: (v: string) => <Text code style={{ fontSize: 12 }}>{v}</Text> },
            { title: '执行人', dataIndex: 'user', width: 90 },
            { title: '触发', dataIndex: 'trigger', width: 80,
              render: (v: string) => <Tag color={TRIGGER[v]?.[1]}>{TRIGGER[v]?.[0] ?? v}</Tag> },
            { title: '结果', dataIndex: 'status', width: 100, render: (v: string) => <Tag color={ACT_COLOR[v]}>{v}</Tag> },
            { title: '明细', dataIndex: 'detail' },
            { title: '时间', dataIndex: 'time', width: 140 },
          ]} />
      </Card>

      <Modal title="记录规则触发（幂等）" open={open} onOk={record} onCancel={() => setOpen(false)} okText="保存" cancelText="取消">
        <Space direction="vertical" style={{ width: '100%' }} size={10}>
          <Select style={{ width: '100%' }} value={form.ruleId}
            options={rules.map(r => ({ value: r.id, label: `${r.id} · ${r.def.slice(0, 24)}…` }))}
            onChange={v => setForm(f => ({ ...f, ruleId: v }))} />
          <Input placeholder="关联实例（可选，如 PO20261002091）" value={form.instanceId}
            onChange={e => setForm(f => ({ ...f, instanceId: e.target.value }))} />
          <Input.TextArea rows={3} placeholder="触发明细，如：SUPPLY.delay 月均值 +18% → 风险分 76→81"
            value={form.detail} onChange={e => setForm(f => ({ ...f, detail: e.target.value }))} />
        </Space>
      </Modal>
    </div>
  );
}
