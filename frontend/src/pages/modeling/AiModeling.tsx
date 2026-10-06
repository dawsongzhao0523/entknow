import { useCallback, useEffect, useState } from 'react';
import {
  App, Alert, Button, Card, Form, Input, Select, Space, Steps, Table, Tag, Typography,
} from 'antd';
import { api, type OntoCandidate } from '../../api';
import { useSession } from '../../session';

const { Title, Text } = Typography;

const KINDS = ['静态事实', '单体动态', '立方动态'];

/** 智能建模：七步向导（确定性模板产出对象草稿，真实入库）+ 语料候选队列 */
export default function AiModeling() {
  const { message } = App.useApp();
  const { user } = useSession();
  const [form] = Form.useForm();
  const [step, setStep] = useState(0);
  const [creating, setCreating] = useState(false);
  const [candidates, setCandidates] = useState<OntoCandidate[]>([]);

  const reload = useCallback(() => {
    api.candidates('待裁决').then(setCandidates).catch(() => {});
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const next = async () => {
    if (step < 3) {
      await form.validateFields().catch(() => Promise.reject());
      setStep(step + 1);
      return;
    }
    if (step === 3) { setStep(4); return; }
  };

  const finish = async () => {
    const v = form.getFieldsValue();
    setCreating(true);
    try {
      const props = (v.props ?? '').split('\n').map((line: string) => {
        const [name, comment] = line.split(/[：:]/).map(s => s.trim());
        return { name: name || line.trim(), type: 'string', comment: comment ?? '' };
      }).filter((p: { name: string }) => p.name);
      const created = await api.createObject({
        id: `obj-${Date.now().toString(36)}`, name: v.name, en: v.en, kind: v.kind,
        version: 'v0.1', status: 'DRAFT', owner: user, ontology: v.ontology ?? '供应链本体',
        refCount: 0, shared: false, props,
      });
      message.success(`对象「${created.name}」草稿已创建（注册中心 → 评审 → 发布）`);
      setStep(5);
    } catch (e) {
      message.error(String((e as Error).message));
    } finally {
      setCreating(false);
    }
  };

  const wizard = (
    <Card size="small">
      <Steps current={step} size="small" items={[
        { title: '场景' }, { title: '命名' }, { title: '属性' }, { title: '确认' }, { title: '完成' },
      ]} />
      <div style={{ marginTop: 20, maxWidth: 560 }}>
        {step === 0 && (
          <Form form={form} layout="vertical">
            <Form.Item name="scene" label="建模场景（用一句话描述业务问题）" rules={[{ required: true }]}>
              <Input placeholder="如：跟踪采购订单的交付风险，供应商延迟时预警" />
            </Form.Item>
          </Form>
        )}
        {step === 1 && (
          <Form form={form} layout="vertical">
            <Space style={{ display: 'flex' }} size={12}>
              <Form.Item name="name" label="对象中文名" rules={[{ required: true }]} style={{ width: 200 }}>
                <Input placeholder="如 来料检验记录" />
              </Form.Item>
              <Form.Item name="en" label="英文名" rules={[{ required: true }]} style={{ width: 200 }}>
                <Input className="mono" placeholder="如 IncomingInspection" />
              </Form.Item>
            </Space>
            <Form.Item name="kind" label="对象类型" initialValue="静态事实" style={{ width: 200 }}>
              <Select options={KINDS.map(v => ({ value: v }))} />
            </Form.Item>
          </Form>
        )}
        {step === 2 && (
          <Form form={form} layout="vertical">
            <Form.Item label="属性清单（每行一个：名称：说明）">
              <Input.TextArea rows={6} className="mono" placeholder={'检验单号：唯一标识\n供应商：关联供应商对象\n检验结论：合格/让步/拒收'} />
            </Form.Item>
          </Form>
        )}
        {step === 3 && (
          <Alert type="info" showIcon message="确认创建"
            description="将按以上配置创建 DRAFT 对象（确定性模板生成；LLM 交互式建模为后续提案），创建后进入注册中心治理流。" />
        )}
        {step === 5 && (
          <Alert type="success" showIcon message="草稿已创建"
            description="可在「注册中心」查看并提交评审；版本发布走「本体详情 → 发布门禁」。" />
        )}
      </div>
      {step < 5 && (
        <Space style={{ marginTop: 16 }}>
          {step > 0 && <Button onClick={() => setStep(step - 1)}>上一步</Button>}
          {step < 4 && <Button type="primary" onClick={next}>下一步</Button>}
          {step === 4 && <Button type="primary" loading={creating} onClick={finish}>创建草稿</Button>}
        </Space>
      )}
    </Card>
  );

  const corpus = (
    <Card size="small">
      <Alert type="info" showIcon style={{ marginBottom: 12 }}
        message="语料候选队列由「隐式收敛」确定性召回生成（同义词/知识条目），此处集中处理建模向候选的转化入口。" />
      <Table<OntoCandidate> size="small" rowKey="id" dataSource={candidates} pagination={false}
        columns={[
          { title: '建议', dataIndex: 'suggestion', render: (v: string, r) => <Space size={6}><b>{v}</b><Tag>{r.kind}</Tag></Space> },
          { title: '来源', dataIndex: 'source' },
          { title: '依据', dataIndex: 'evidence' },
          { title: '状态', dataIndex: 'status', width: 90, render: (v: string) => <Tag color="blue">{v}</Tag> },
        ]} />
    </Card>
  );

  return (
    <div>
      <Title level={4}>智能建模</Title>
      <Text type="secondary">七步向导产出对象草稿（真实入库走治理流）· 语料候选队列（来自隐式收敛）</Text>
      <div style={{ marginTop: 12 }}>
        <Steps items={[{ title: '向导建模' }, { title: '语料候选' }]} current={0} size="small"
          style={{ marginBottom: 12, maxWidth: 320 }} />
        {wizard}
        <div style={{ height: 12 }} />
        {corpus}
      </div>
    </div>
  );
}
