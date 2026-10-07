import { useCallback, useEffect, useState } from 'react';
import { Alert, App, Button, Card, Form, Input, Modal, Select, Space, Table, Tabs, Tag, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { api, type Action, type Func, type Rule, type RuleFiring } from '../api';

const { Title, Text } = Typography;

const TRIGGER: Record<string, [string, string]> = { manual: ['手动', 'blue'], schedule: ['定时', 'purple'], event: ['事件', 'cyan'] };
const ACT_COLOR: Record<string, string> = { 执行成功: 'green', 权限拒绝: 'red', 已回滚: 'orange', 待确认: 'blue' };

/** 规则与行动：传播规则（创建/列表）· 触发记录 · 行动网关（行动注册 + 执行日志） */
export default function RuntimeRules() {
  const { message } = App.useApp();
  const [rules, setRules] = useState<Rule[]>([]);
  const [firings, setFirings] = useState<RuleFiring[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [ruleFilter, setRuleFilter] = useState('');
  const reload = useCallback(() => {
    api.rules().then(setRules).catch(() => {});
    api.ruleFirings(ruleFilter).then(setFirings).catch(e => message.error(String((e as Error).message)));
    api.actions().then(setActions).catch(() => {});
  }, [ruleFilter, message]);

  useEffect(() => { reload(); }, [reload]);


  const [funcs, setFuncs] = useState<Func[]>([]);
  const [ruleForm] = Form.useForm();
  const [ruleOpen, setRuleOpen] = useState(false);
  const [actForm] = Form.useForm();
  const [actOpen, setActOpen] = useState(false);

  useEffect(() => {
    api.functions().then(setFuncs).catch(() => {});
  }, []);

  const actionFuncs = funcs.filter(f => f.cat === '行动');

  const createRule = async () => {
    const v = await ruleForm.validateFields();
    try {
      const id = v.id || `R-${Date.now().toString(36).slice(-4)}`;
      await api.createRule({ id, def: v.def, kind: v.kind, status: '草稿', fired: 0 });
      message.success(`规则 ${id} 已创建（草稿 · 发布前需沙盘验证，见推理引擎）`);
      setRuleOpen(false); ruleForm.resetFields(); reload();
    } catch (e) { message.error(String((e as Error).message)); }
  };

  const registerAction = async () => {
    const v = await actForm.validateFields();
    try {
      const id = `f-${Date.now().toString(36)}`;
      await api.createFunction({
        id, name: v.name, cat: '行动', version: 'v0.1', status: 'DRAFT',
        tests: '', signature: v.signature, impl: v.impl,
      });
      message.success(`行动「${v.name}」已注册（DRAFT，走治理发布）`);
      setActOpen(false); actForm.resetFields();
      api.functions().then(setFuncs).catch(() => {});
    } catch (e) { message.error(String((e as Error).message)); }
  };

  return (
    <div>
      <Title level={4}>规则与行动</Title>
      <Text type="secondary">传播引擎（规则创建 · 写入即计算）· 行动网关（行动注册 + 治理化执行日志）· 均真实写路径</Text>
      <div style={{ marginTop: 12 }}>
        <Tabs items={[
          { key: 'rules', label: `传播规则（${rules.length}）`, children: (
            <Card size="small" extra={
              <Button type="primary" icon={<PlusOutlined />} onClick={() => { ruleForm.resetFields(); setRuleOpen(true); }}>新建规则</Button>
            }>
              <Table<Rule> size="small" rowKey="id" pagination={false} dataSource={rules}
                columns={[
                  { title: '规则', dataIndex: 'id', width: 70, render: (v: string) => <b className="mono">{v}</b> },
                  { title: '定义（触发条件 → 目标动作）', dataIndex: 'def' },
                  { title: '类型', dataIndex: 'kind', width: 70, render: (v: string) => <Tag>{v}</Tag> },
                  { title: '状态', dataIndex: 'status', width: 90, render: (v: string) => (
                    <Tag color={v === '运行中' ? 'green' : 'default'}>{v}</Tag>) },
                  { title: '累计触发', dataIndex: 'fired', width: 90 },
                ]} />
            </Card>
          ) },
          { key: 'firings', label: `触发记录（${firings.length}）`, children: (
            <Card size="small" extra={(
              <Select size="small" style={{ width: 130 }} value={ruleFilter} onChange={setRuleFilter}
                options={[{ value: '', label: '规则：全部' }, ...rules.map(r => ({ value: r.id, label: `规则 ${r.id}` }))]} />
            )}>
              <Table<RuleFiring> size="small" rowKey="id" pagination={false} dataSource={firings}
                columns={[
                  { title: '规则', dataIndex: 'ruleId', width: 70, render: (v: string) => <b className="mono">{v}</b> },
                  { title: '实例', dataIndex: 'instanceId', width: 130, render: (v: string) => <span className="mono" style={{ fontSize: 12 }}>{v || '—'}</span> },
                  { title: '详情', dataIndex: 'detail' },
                  { title: '时间', dataIndex: 'firedAt', width: 125 },
                ]} />
            </Card>
          ) },
          { key: 'gateway', label: `行动网关（${actionFuncs.length}）`, children: (
            <Card size="small" extra={
              <Button type="primary" icon={<PlusOutlined />} onClick={() => { actForm.resetFields(); setActOpen(true); }}>注册行动</Button>
            }>
              <Alert type="info" showIcon style={{ marginBottom: 12 }}
                message="行动 = 治理化执行单元：注册为 DRAFT 函数，发布后经实例 360° 执行（权限校验 / 风险分>80 二次确认 / 可回滚）。" />
              <Table<Func> size="small" rowKey="id" pagination={false} dataSource={actionFuncs}
                columns={[
                  { title: '行动', dataIndex: 'name', render: (v: string, f) => (
                    <Space size={6}><b>{v}</b><Tag>{f.version}</Tag></Space>) },
                  { title: '签名', dataIndex: 'signature', render: (v: string) => <span className="mono" style={{ fontSize: 12 }}>{v || '—'}</span> },
                  { title: '实现约束', dataIndex: 'impl', ellipsis: true },
                  { title: '状态', dataIndex: 'status', width: 110, render: (v: string) => (
                    <Tag color={v === 'PUBLISHED' ? 'green' : 'orange'}>{v === 'PUBLISHED' ? '已发布' : '草稿'}</Tag>) },
                ]} />
              <div style={{ marginTop: 16 }} />
              <Table<Action> size="small" rowKey="id" pagination={false} dataSource={actions}
                title={() => <b>执行日志（治理化：权限拒绝 / 二次确认 / 回滚均留痕）</b>}
                columns={[
                  { title: '行动', dataIndex: 'funcId', width: 90, render: (v: string) => <span className="mono">{v}</span> },
                  { title: '实例', dataIndex: 'instanceId', width: 130, render: (v: string) => <span className="mono" style={{ fontSize: 12 }}>{v}</span> },
                  { title: '执行人', dataIndex: 'user', width: 90 },
                  { title: '触发', dataIndex: 'trigger', width: 80, render: (v: string) => (
                    <Tag color={TRIGGER[v]?.[1] ?? 'default'}>{TRIGGER[v]?.[0] ?? v}</Tag>) },
                  { title: '结果', dataIndex: 'status', width: 90, render: (v: string) => (
                    <Tag color={ACT_COLOR[v]}>{v}</Tag>) },
                  { title: '时间', dataIndex: 'time', width: 125 },
                ]} />
            </Card>
          ) },
        ]} />
      </div>

      <Modal title="新建传播规则" open={ruleOpen} onOk={createRule} onCancel={() => setRuleOpen(false)} okText="创建（草稿）" cancelText="取消">
        <Form form={ruleForm} layout="vertical">
          <Form.Item name="def" label="规则定义（触发条件 → 目标动作）" rules={[{ required: true }]}>
            <Input.TextArea rows={3} placeholder={'如：齐套率 < 70% → SUPPLY 边标记「风险」（写入即计算 · 发布前需沙盘验证）'} />
          </Form.Item>
          <Form.Item name="kind" label="类型" initialValue="V→V" style={{ width: 140 }}>
            <Select options={['V→V', 'V→E', 'E→V', 'E→E'].map(v => ({ value: v }))} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="注册行动（治理化执行单元）" open={actOpen} onOk={registerAction} onCancel={() => setActOpen(false)} okText="注册（DRAFT）" cancelText="取消" width={520}>
        <Form form={actForm} layout="vertical">
          <Form.Item name="name" label="行动名" rules={[{ required: true }]}><Input placeholder="如 延期订单" /></Form.Item>
          <Form.Item name="signature" label="签名"><Input className="mono" placeholder="(po: 采购订单) → receipt" /></Form.Item>
          <Form.Item name="impl" label="实现约束">
            <Input.TextArea rows={3} placeholder={'条件/权限/确认/回滚声明，如：条件: 风险分>80 · 权限: 计划主管 · 二次确认 · 回滚: 恢复订单'} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
