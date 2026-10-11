import { useCallback, useEffect, useState } from 'react';
import {
  Alert, App, Button, Card, Form, Input, Select, Space, Steps, Table, Tabs, Tag, Typography,
} from 'antd';
import { RobotOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { api, type AIDraft, type OntoCandidate, type Template29 } from '../../api';
import { useSession } from '../../session';

const { Title, Text, Paragraph } = Typography;

const KINDS = ['静态事实', '单体动态', '立方动态'];

const AI_EXAMPLE = '采购订单有订单号/供应商/金额/交期四个属性，供应商供应物料，工厂生产工单';

/** 智能建模：AI 自动建模（自然语言→本体草稿）· 29 句话模板 · 七步向导 · 语料候选队列 */
export default function AiModeling() {
  return (
    <div>
      <Title level={4}>智能建模</Title>
      <Text type="secondary">AI 精准建模（自然语言 → 本体草稿，LLM 优先 / 规则引擎兜底）· 29 句话模板 · 向导建模 · 语料候选</Text>
      <Tabs
        style={{ marginTop: 12 }}
        items={[
          { key: 'ai', label: <Space size={4}><RobotOutlined />AI 自动建模</Space>, children: <AiGenerateTab /> },
          { key: 'templates', label: <Space size={4}><ThunderboltOutlined />29 句话模板</Space>, children: <TemplatesTab /> },
          { key: 'wizard', label: '向导建模', children: <WizardTab /> },
        ]}
      />
    </div>
  );
}

/** Tab 1：AI 自动建模 — 场景描述 → 预览草稿 → 确认入库 */
function AiGenerateTab() {
  const { message } = App.useApp();
  const { user } = useSession();
  const [input, setInput] = useState('');
  const [draft, setDraft] = useState<AIDraft | null>(null);
  const [llm, setLlm] = useState<{ enabled: boolean; provider?: string; model?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [onto, setOnto] = useState('供应链本体');

  useEffect(() => { api.llmStatus().then(setLlm).catch(() => {}); }, []);

  const generate = async () => {
    if (input.trim().length < 6) { message.warning('请输入至少 6 个字的场景描述'); return; }
    setBusy(true);
    try {
      const out = await api.aiGenerate(input.trim());
      setDraft(out as AIDraft);
      message.success(`生成完成：${(out as AIDraft).objects.length} 个对象 + ${(out as AIDraft).edges.length} 条关系`);
    } catch (e) { message.error(String((e as Error).message)); }
    finally { setBusy(false); }
  };

  const apply = async () => {
    if (!draft) return;
    setBusy(true);
    try {
      const out = await api.aiGenerate(input.trim(), true, onto, user) as {
        createdObjects: unknown[]; createdEdges: unknown[]; skippedObjects: number; skippedEdges: number;
      };
      message.success(`已入库：${out.createdObjects.length} 对象 + ${out.createdEdges.length} 关系（DRAFT，进入治理流）`);
      setDraft(null);
    } catch (e) { message.error(String((e as Error).message)); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <Card size="small" title="场景描述" style={{ flex: 1 }}>
        <Alert type={llm?.enabled ? 'success' : 'info'} showIcon style={{ marginBottom: 10 }}
          message={llm?.enabled
            ? `LLM 已接入：${llm.provider} / ${llm.model}`
            : 'LLM 未配置：使用确定性规则引擎（配置 ENTKNOW_LLM_PROVIDER 后自动切换大模型生成）'}
          description={llm?.enabled ? undefined :
            '规则引擎支持：「X有A/B/C属性」属性声明模式 + 「X供应/生产/监测Y」关系模式'} />
        <Input.TextArea rows={7} value={input} onChange={(e) => setInput(e.target.value)}
          placeholder={'例：' + AI_EXAMPLE} />
        <Space style={{ marginTop: 10 }} wrap>
          <Button type="primary" icon={<RobotOutlined />} loading={busy} onClick={generate}>生成预览</Button>
          <a onClick={() => setInput(AI_EXAMPLE)} style={{ fontSize: 12 }}>填入示例</a>
          <Select size="small" value={onto} onChange={setOnto} style={{ width: 140 }}
            options={[
              { value: '供应链本体' }, { value: '质量追溯本体' }, { value: '设备运维本体' },
            ]} />
        </Space>
        <Paragraph type="secondary" style={{ marginTop: 12, fontSize: 12 }}>
          依据《本体驱动的AI数据管理》第 6 章：大模型充当「语义编译官」，将符合「7+1」语义规范的自然语言映射为标准本体；
          入库对象为 DRAFT，走注册中心 → 评审 → 发布治理流。
        </Paragraph>
      </Card>

      <Card size="small" title="生成预览" style={{ flex: 1.3 }}
        extra={draft && (
          <Button size="small" type="primary" loading={busy} onClick={apply}>
            确认入库（{draft.objects.length} 对象 + {draft.edges.length} 关系）
          </Button>
        )}>
        {!draft ? (
          <Alert type="info" showIcon message="等待生成"
            description="输入场景描述并点击「生成预览」；确认后对象/关系以 DRAFT 状态入库。" />
        ) : (
          <>
            <Space size={6} style={{ marginBottom: 8 }}>
              <Tag color={draft.source === 'llm' ? 'purple' : 'cyan'}>
                {draft.source === 'llm' ? '大模型生成' : '规则引擎生成'}
              </Tag>
              {draft.reply && <Text type="secondary" style={{ fontSize: 12 }}>{draft.reply}</Text>}
            </Space>
            <Text strong style={{ fontSize: 12 }}>对象（{draft.objects.length}）</Text>
            <Table size="small" rowKey="name" pagination={false} style={{ marginTop: 4 }}
              dataSource={draft.objects}
              columns={[
                { title: '中文名', dataIndex: 'name', width: 110 },
                { title: '英文标识', dataIndex: 'en', width: 130, render: (v: string) => <span className="mono" style={{ fontSize: 12 }}>{v}</span> },
                { title: '类型', dataIndex: 'kind', width: 84, render: (v: string) => <Tag>{v}</Tag> },
                {
                  title: '属性', dataIndex: 'props',
                  render: (props: AIDraft['objects'][0]['props']) => (
                    <Space size={4} wrap>
                      {(props ?? []).map((p) => <Tag key={p.name} style={{ fontSize: 11 }}>{p.name}:{p.type}</Tag>)}
                    </Space>
                  ),
                },
              ]} />
            <Text strong style={{ fontSize: 12, display: 'block', marginTop: 10 }}>关系（{draft.edges.length}）</Text>
            <Table size="small" rowKey={(r) => r.from + r.name + r.to} pagination={false} style={{ marginTop: 4 }}
              dataSource={draft.edges}
              columns={[
                { title: '起点', dataIndex: 'from', width: 110 },
                { title: '关系', dataIndex: 'name', width: 90, render: (v: string) => <Tag color="geekblue">{v}</Tag> },
                { title: '终点', dataIndex: 'to', width: 110 },
              ]} />
          </>
        )}
      </Card>
    </div>
  );
}

/** Tab 2：29 句话模板库（7+1 语义规范 → 29 种标准化描述模板） */
function TemplatesTab() {
  const [templates, setTemplates] = useState<Template29[]>([]);
  const [cat, setCat] = useState<string>('');

  useEffect(() => { api.templates().then(setTemplates).catch(() => {}); }, []);

  const cats = [...new Set(templates.map((t) => t.category))];
  const shown = cat ? templates.filter((t) => t.category === cat) : templates;

  return (
    <Card size="small" title={`「29 句话」模板库（${templates.length} / 29 种）`}
      extra={
        <Select size="small" style={{ width: 180 }} allowClear placeholder="按 7 类筛选"
          value={cat || undefined} onChange={(v) => setCat(v ?? '')}
          options={cats.map((c) => ({ value: c, label: c }))} />
      }>
      <Alert type="info" showIcon style={{ marginBottom: 10 }}
        message="「7+1」语义规范细化为 29 种标准化自然语言模板 —— 业务专家按模板讲清业务，AI 按规范转译为本体" />
      <Table<Template29> size="small" rowKey="id" pagination={{ pageSize: 12 }} dataSource={shown}
        columns={[
          { title: 'ID', dataIndex: 'id', width: 56, render: (v: string) => <b className="mono">{v}</b> },
          { title: '分类', dataIndex: 'category', width: 140, render: (v: string) => <Tag color="blue">{v}</Tag> },
          { title: '标准', dataIndex: 'standard', width: 82, render: (v: string) => <Tag color="geekblue">{v}</Tag> },
          { title: '模板', dataIndex: 'name', width: 110 },
          { title: '句式', dataIndex: 'pattern', render: (v: string) => <Text style={{ fontSize: 12 }}>{v}</Text> },
          { title: '示例', dataIndex: 'example', render: (v: string) => <Text type="secondary" style={{ fontSize: 12 }}>{v}</Text> },
        ]} />
    </Card>
  );
}

/** Tab 3：七步向导（确定性模板产出对象草稿） */
function WizardTab() {
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
            description="将按以上配置创建 DRAFT 对象，创建后进入注册中心治理流。" />
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
      {wizard}
      <div style={{ height: 12 }} />
      {corpus}
    </div>
  );
}
