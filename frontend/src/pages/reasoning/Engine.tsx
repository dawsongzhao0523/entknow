import { useCallback, useEffect, useState } from 'react';
import {
  App, Alert, Button, Card, Input, Select, Space, Steps, Table, Tabs, Tag, Typography,
} from 'antd';
import {
  CaretRightOutlined, DownloadOutlined, PlayCircleOutlined, SafetyOutlined,
} from '@ant-design/icons';
import { api, type ConsistencyIssue, type ReasoningTrail, type Rule, type RuleFiring, type RunResult, type SPARQLResult } from '../../api';

const { Title, Text, Paragraph } = Typography;

const LEVEL_NAME: Record<string, string> = { strong: '强约束', weak: '弱约束', advisory: '建议级' };

const SPARQL_SAMPLES = [
  'SELECT ?s WHERE { ?s rdf:type owl:Class }',
  'SELECT ?s ?label WHERE { ?s rdf:type owl:Class . ?s rdfs:label ?label }',
  'SELECT ?p ?o WHERE { ?p rdf:type owl:ObjectProperty . ?p rdfs:range ?o }',
  'SELECT ?s ?o WHERE { ?s supplies ?o }',
];

/** 推理引擎：规则执行（事实-事理-行动贯通）· 推理链路 · SPARQL 查询 · W3C 标准导出 */
export default function Engine() {
  return (
    <div>
      <Title level={4}>推理引擎</Title>
      <Text type="secondary">规则确定性执行（触发 + 风险重算 + 行动贯通）· 推理链路可追溯 · SPARQL 语义查询 · W3C 标准互操作</Text>
      <Tabs
        style={{ marginTop: 12 }}
        items={[
          { key: 'rules', label: '规则执行', children: <RulesTab /> },
          { key: 'trails', label: '推理链路', children: <TrailsTab /> },
          { key: 'sparql', label: 'SPARQL 查询', children: <SparqlTab /> },
          { key: 'w3c', label: 'W3C 标准', children: <W3CTab /> },
        ]}
      />
    </div>
  );
}

/** Tab 1：规则执行 + 一致性检查 */
function RulesTab() {
  const { message } = App.useApp();
  const [rules, setRules] = useState<Rule[]>([]);
  const [firings, setFirings] = useState<RuleFiring[]>([]);
  const [issues, setIssues] = useState<ConsistencyIssue[] | null>(null);
  const [running, setRunning] = useState('');
  const [lastRun, setLastRun] = useState<RunResult | null>(null);

  const reload = useCallback(() => {
    api.rules().then(setRules).catch(() => {});
    api.ruleFirings().then(setFirings).catch(() => {});
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const run = async (ruleId: string) => {
    setRunning(ruleId);
    try {
      const res = await api.runRule(ruleId);
      setLastRun(res);
      message.success(res.detail);
      reload();
    } catch (e) { message.error(String((e as Error).message)); }
    finally { setRunning(''); }
  };

  const setLevel = async (r: Rule, level: string) => {
    try {
      await api.setConstraintLevel('rule', r.id, level);
      message.success(`规则 ${r.id} 约束等级 → ${LEVEL_NAME[level]}`);
      reload();
    } catch (e) { message.error(String((e as Error).message)); }
  };

  const check = async () => {
    try {
      const out = await api.consistency();
      setIssues(out);
      message.success(out.length === 0 ? '一致性检查通过：未发现问题' : `发现 ${out.length} 个问题`);
    } catch (e) { message.error(String((e as Error).message)); }
  };

  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <Card size="small" title="传播规则" style={{ flex: 1.4 }} extra={
        <Button size="small" icon={<SafetyOutlined />} onClick={check}>一致性检查</Button>}>
        <Table<Rule> size="small" rowKey="id" pagination={false} dataSource={rules}
          columns={[
            { title: '规则', dataIndex: 'id', width: 56, render: (v: string) => <b className="mono">{v}</b> },
            { title: '定义', dataIndex: 'def' },
            { title: '类型', dataIndex: 'kind', width: 64, render: (v: string) => <Tag>{v}</Tag> },
            {
              title: '关联行动', dataIndex: 'actionFunc', width: 96,
              render: (v: string) => v ? <Tag color="purple">{v}</Tag> : <Text type="secondary">—</Text>,
            },
            {
              title: '约束等级', dataIndex: 'constraintLevel', width: 104,
              render: (v: string, r) => (
                <Select size="small" value={v || 'weak'} style={{ width: 92 }}
                  onChange={(lv) => setLevel(r, lv)}
                  options={Object.entries(LEVEL_NAME).map(([k, n]) => ({ value: k, label: n }))} />
              ),
            },
            { title: '累计触发', dataIndex: 'fired', width: 80 },
            { title: '操作', key: 'op', width: 84, render: (_, r) => (
              <Button size="small" type="link" icon={<CaretRightOutlined />}
                loading={running === r.id} onClick={() => run(r.id)}>执行</Button>) },
          ]} />
        {lastRun && (
          <Alert type="success" showIcon style={{ marginTop: 10 }} message={lastRun.detail} />
        )}
        {issues !== null && (
          <div style={{ marginTop: 10 }}>
            {issues.length === 0
              ? <Alert type="success" showIcon message="一致性检查通过：边引用、数据映射、状态机与绑定引用均正常" />
              : issues.map((it, i) => (
                <Alert key={i} type={it.level === 'error' ? 'error' : 'warning'} showIcon style={{ marginBottom: 6 }}
                  message={it.detail} />
              ))}
          </div>
        )}
      </Card>

      <Card size="small" title={`最近触发记录（${firings.length}）`} style={{ flex: 1 }}>
        <Table<RuleFiring> size="small" rowKey="id" pagination={false} dataSource={firings.slice(0, 12)}
          locale={{ emptyText: '暂无触发（执行规则后生成）' }}
          columns={[
            { title: '规则', dataIndex: 'ruleId', width: 64, render: (v: string) => <b className="mono">{v}</b> },
            { title: '实例', dataIndex: 'instanceId', width: 130, render: (v: string) => <span className="mono" style={{ fontSize: 12 }}>{v || '—'}</span> },
            { title: '详情', dataIndex: 'detail' },
            { title: '时间', dataIndex: 'firedAt', width: 125, render: (v: string) => <span className="mono" style={{ fontSize: 12 }}>{v}</span> },
          ]} />
      </Card>
    </div>
  );
}

/** Tab 2：推理链路（事实 → 事理 → 行动） */
function TrailsTab() {
  const [trails, setTrails] = useState<ReasoningTrail[]>([]);
  const [kw, setKw] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);

  const reload = useCallback((instance = '') => {
    api.reasoningTrails(instance).then(setTrails).catch(() => setTrails([]));
  }, []);
  useEffect(() => { reload(); }, [reload]);

  return (
    <Card size="small" title={`推理链路（${trails.length} 条）`} extra={
      <Input.Search size="small" style={{ width: 240 }} placeholder="按实例过滤（如 PO2026…）"
        allowClear value={kw}
        onChange={(e) => setKw(e.target.value)}
        onSearch={(v) => reload(v.trim())} />}>
      <Table<ReasoningTrail> size="small" rowKey="id" pagination={{ pageSize: 10 }} dataSource={trails}
        locale={{ emptyText: '暂无轨迹（执行规则后生成完整「事实→事理→行动」链路）' }}
        expandable={{
          expandedRowKeys: expanded !== null ? [expanded] : [],
          onExpand: (_, r) => setExpanded(expanded === r.id ? null : r.id),
          expandedRowRender: (r) => (
            <div style={{ maxWidth: 720 }}>
              <Steps direction="vertical" size="small" current={r.steps.length - 1}
                items={r.steps.map((s) => ({
                  title: s.step,
                  description: <Text type="secondary" style={{ fontSize: 12 }}>{s.detail}</Text>,
                }))} />
            </div>
          ),
        }}
        columns={[
          { title: '#', dataIndex: 'id', width: 52, render: (v: number) => <b className="mono">{v}</b> },
          { title: '规则', dataIndex: 'ruleId', width: 64, render: (v: string) => <Tag color="blue">{v}</Tag> },
          { title: '实例', dataIndex: 'instanceId', width: 132, render: (v: string) => <span className="mono" style={{ fontSize: 12 }}>{v}</span> },
          { title: '结论', dataIndex: 'conclusion' },
          {
            title: '链路', dataIndex: 'steps', width: 150,
            render: (steps: ReasoningTrail['steps']) => (
              <Space size={4}>
                {steps.map((s) => (
                  <Tag key={s.step} color={s.step === '事实' ? 'cyan' : s.step === '事理' ? 'geekblue' : 'green'}>{s.step}</Tag>
                ))}
              </Space>
            ),
          },
          { title: '时间', dataIndex: 'createdAt', width: 125, render: (v: string) => <span className="mono" style={{ fontSize: 12 }}>{v}</span> },
        ]} />
    </Card>
  );
}

/** Tab 3：SPARQL 查询控制台 */
function SparqlTab() {
  const { message } = App.useApp();
  const [query, setQuery] = useState(SPARQL_SAMPLES[0]);
  const [result, setResult] = useState<SPARQLResult | null>(null);
  const [running, setRunning] = useState(false);

  const run = async () => {
    setRunning(true);
    try {
      const out = await api.sparql(query);
      setResult(out);
      if (out.rows.length === 0) message.warning('查询无结果（检查三元组模式拼写）');
    } catch (e) { message.error(String((e as Error).message)); }
    finally { setRunning(false); }
  };

  const cols = result?.vars.map((v) => ({
    title: '?' + v, dataIndex: v,
    render: (val: string) => <span className="mono" style={{ fontSize: 12 }}>{val ?? '—'}</span>,
  })) ?? [];

  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <Card size="small" title="SPARQL 查询" style={{ flex: 1 }}>
        <Input.TextArea rows={8} value={query} onChange={(e) => setQuery(e.target.value)}
          className="mono" placeholder="SELECT ?s WHERE { ?s rdf:type owl:Class }" />
        <Space style={{ marginTop: 10 }}>
          <Button type="primary" icon={<PlayCircleOutlined />} loading={running} onClick={run}>执行查询</Button>
          <Text type="secondary">支持多三元组模式联查（共享变量绑定）</Text>
        </Space>
        <Paragraph type="secondary" style={{ marginTop: 12, fontSize: 12 }}>
          本体已映射为 RDF 三元组：对象→owl:Class，属性→owl:DatatypeProperty，
          关系→owl:ObjectProperty（含 rdfs:domain / rdfs:range / rdfs:label / 关系断言）。
        </Paragraph>
        <Space direction="vertical" size={4} style={{ marginTop: 4 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>示例：</Text>
          {SPARQL_SAMPLES.map((s) => (
            <a key={s} onClick={() => setQuery(s)} style={{ fontSize: 12 }} className="mono">{s}</a>
          ))}
        </Space>
      </Card>
      <Card size="small" title={result ? `结果（${result.rows.length} 行）` : '结果'} style={{ flex: 1.2 }}>
        <Table size="small" rowKey={(_, i) => String(i)} pagination={{ pageSize: 10 }}
          dataSource={result?.rows ?? []} columns={cols}
          locale={{ emptyText: '执行查询后展示结果' }} />
      </Card>
    </div>
  );
}

/** Tab 4：W3C 标准互操作（OWL / SKOS / SWRL） */
function W3CTab() {
  const { message } = App.useApp();
  const [onto, setOnto] = useState('scm');
  const [owl, setOwl] = useState('');
  const [skos, setSkos] = useState('');
  const [swrl, setSwrl] = useState('');
  const [view, setView] = useState<'owl' | 'skos' | 'swrl'>('owl');

  const loadOWL = useCallback((id: string) => {
    api.ontologyOWL(id).then(setOwl).catch((e) => message.error(String(e.message)));
  }, [message]);
  useEffect(() => { loadOWL(onto); }, [onto, loadOWL]);

  const download = (text: string, name: string, mime: string) => {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  };

  const text = view === 'owl' ? owl : view === 'skos' ? skos : swrl;
  const fileMeta = view === 'owl'
    ? { name: `${onto}.ttl`, mime: 'text/turtle', label: 'OWL Turtle' }
    : view === 'skos'
      ? { name: 'terminology-skos.rdf', mime: 'application/rdf+xml', label: 'SKOS RDF/XML' }
      : { name: 'rule-swrl.xml', mime: 'application/xml', label: 'SWRL RuleML' };

  return (
    <Card size="small">
      <Space wrap style={{ marginBottom: 10 }}>
        <Select value={onto} style={{ width: 160 }} onChange={(v) => { setOnto(v); setView('owl'); }}
          options={[
            { value: 'scm', label: '供应链本体' },
            { value: 'quality', label: '质量追溯本体' },
            { value: 'equipment', label: '设备运维本体' },
          ]} />
        <Space.Compact>
          <Button type={view === 'owl' ? 'primary' : 'default'} onClick={() => { setView('owl'); loadOWL(onto); }}>OWL Turtle</Button>
          <Button type={view === 'skos' ? 'primary' : 'default'} onClick={() => {
            setView('skos');
            if (!skos) api.skosExport().then(setSkos).catch((e) => message.error(String(e.message)));
          }}>SKOS 术语</Button>
          <Button type={view === 'swrl' ? 'primary' : 'default'} onClick={() => {
            setView('swrl');
            if (!swrl) api.ruleSWRL('R1').then(setSwrl).catch((e) => message.error(String(e.message)));
          }}>SWRL 规则(R1)</Button>
        </Space.Compact>
        <Button icon={<DownloadOutlined />} disabled={!text}
          onClick={() => download(text, fileMeta.name, fileMeta.mime)}>下载 {fileMeta.label}</Button>
        <Text type="secondary" style={{ fontSize: 12 }}>
          OWL 可导入 Protégé 互操作 · SKOS 统一术语（prefLabel/altLabel）· SWRL 规则推理交换
        </Text>
      </Space>
      <Input.TextArea readOnly rows={20} value={text} className="mono"
        style={{ fontSize: 12 }} placeholder="选择标准与本体后展示" />
    </Card>
  );
}
