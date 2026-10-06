import { useCallback, useEffect, useState } from 'react';
import {
  App, Alert, Button, Card, Table, Tag, Typography,
} from 'antd';
import { CaretRightOutlined, SafetyOutlined } from '@ant-design/icons';
import { api, type ConsistencyIssue, type Rule, type RuleFiring, type RunResult } from '../../api';

const { Title, Text } = Typography;

/** 推理引擎：规则确定性执行（传播触发 + 风险分重算）· 本体一致性检查（派生） */
export default function Engine() {
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

  const check = async () => {
    try {
      const out = await api.consistency();
      setIssues(out);
      message.success(out.length === 0 ? '一致性检查通过：未发现问题' : `发现 ${out.length} 个问题`);
    } catch (e) { message.error(String((e as Error).message)); }
  };

  return (
    <div>
      <Title level={4}>推理引擎</Title>
      <Text type="secondary">规则确定性执行（写入即计算：触发记录 + 实例风险分重算）· 本体一致性检查（派生评估）</Text>
      <div style={{ marginTop: 12, display: 'flex', gap: 12 }}>
        <Card size="small" title="传播规则" style={{ flex: 1 }} extra={
          <Button size="small" icon={<SafetyOutlined />} onClick={check}>一致性检查</Button>}>
          <Table<Rule> size="small" rowKey="id" pagination={false} dataSource={rules}
            columns={[
              { title: '规则', dataIndex: 'id', width: 64, render: (v: string) => <b className="mono">{v}</b> },
              { title: '定义', dataIndex: 'def' },
              { title: '类型', dataIndex: 'kind', width: 70, render: (v: string) => <Tag>{v}</Tag> },
              { title: '状态', dataIndex: 'status', width: 80, render: (v: string) => <Tag color={v === '运行中' ? 'green' : 'default'}>{v}</Tag> },
              { title: '累计触发', dataIndex: 'fired', width: 90 },
              { title: '操作', key: 'op', width: 90, render: (_, r) => (
                <Button size="small" type="link" icon={<CaretRightOutlined />}
                  loading={running === r.id} onClick={() => run(r.id)}>执行</Button>) },
            ]} />
          {lastRun && (
            <Alert type="success" showIcon style={{ marginTop: 10 }}
              message={lastRun.detail} />
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
    </div>
  );
}
