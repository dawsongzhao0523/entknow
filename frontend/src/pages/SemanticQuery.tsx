import { useCallback, useEffect, useState } from 'react';
import { App, Button, Card, Empty, Input, List, Space, Table, Tag, Typography } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { api, type ExecutedQuery, type QueryRecord, type SearchResultItem } from '../api';

const { Title, Text, Paragraph } = Typography;
const ME = '张三';

const CATS: [keyof NonNullable<ExecutedQuery['results']>, string, string][] = [
  ['objects', '对象', 'blue'],
  ['knowledge', '知识', 'green'],
  ['instances', '实例', 'purple'],
  ['synonyms', '同义词', 'orange'],
];

/** 语义查询：统一检索（确定性内核）+ DSL + 查询历史（真实写路径） */
export default function SemanticQuery() {
  const { message } = App.useApp();
  const [q, setQ] = useState('');
  const [exec, setExec] = useState<ExecutedQuery | null>(null);
  const [history, setHistory] = useState<QueryRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const reloadHistory = useCallback(() => {
    api.queries().then(setHistory).catch(() => {});
  }, []);

  useEffect(() => { reloadHistory(); }, [reloadHistory]);

  const run = async (question: string) => {
    if (!question.trim()) { message.warning('请输入问题'); return; }
    setLoading(true);
    try {
      const out = await api.executeQuery({
        id: `q-${Date.now().toString(36)}`, question: question.trim(), by: ME,
      });
      setExec(out);
      reloadHistory();
    } catch (e) {
      message.error(String((e as Error).message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Title level={4}>语义查询</Title>
      <Text type="secondary">用业务语言提问：横跨对象 / 知识 / 实例 / 同义词的统一检索，执行即记录历史（幂等）</Text>

      <Card size="small" style={{ marginTop: 12 }}>
        <Space.Compact style={{ width: '100%' }}>
          <Input size="large" placeholder="如：华兴电子近三月准时率 / 采购订单的交付风险 / 供货商"
            value={q} onChange={e => setQ(e.target.value)} onPressEnter={() => run(q)}
            prefix={<SearchOutlined style={{ color: '#059669' }} />} />
          <Button size="large" type="primary" loading={loading} onClick={() => run(q)}>执行查询</Button>
        </Space.Compact>
      </Card>

      {exec && (
        <>
          <Card size="small" style={{ marginTop: 12 }}
            title={<Space size={8}>
              <span>执行结果</span>
              <Tag color="green">{exec.hits} 命中</Tag>
              <Tag>{exec.latencyMs} ms</Tag>
              <Tag color="blue">{exec.by} · {exec.at}</Tag>
            </Space>}>
            <Paragraph code style={{ whiteSpace: 'pre-wrap', background: '#f8fbfa', padding: 12, borderRadius: 8, fontSize: 12 }}>
              {exec.dsl}
            </Paragraph>
            <Space wrap size={12} align="start" style={{ width: '100%' }}>
              {CATS.map(([key, label, color]) => {
                const items = (exec.results?.[key] ?? []) as SearchResultItem[];
                return (
                  <Card size="small" key={key} style={{ width: 280, verticalAlign: 'top' }}
                    title={<Space size={6}><Tag color={color}>{label}</Tag><Text type="secondary">{items.length}</Text></Space>}>
                    {items.length === 0 ? <Text type="secondary" style={{ fontSize: 12 }}>无命中</Text> : (
                      <List size="small" dataSource={items} renderItem={it => (
                        <List.Item style={{ padding: '4px 0' }}>
                          <List.Item.Meta title={<span style={{ fontSize: 13 }}>{it.label}</span>}
                            description={<span style={{ fontSize: 11 }}>{it.sub}</span>} />
                        </List.Item>
                      )} />
                    )}
                  </Card>
                );
              })}
            </Space>
          </Card>
        </>
      )}
      {!exec && <Card size="small" style={{ marginTop: 12 }}><Empty description="输入业务问题开始查询" /></Card>}

      <Card size="small" title={`查询历史（${history.length}）`} style={{ marginTop: 12 }}
        extra={<Button size="small" icon={<ReloadOutlined />} onClick={reloadHistory}>刷新</Button>}>
        <Table<QueryRecord> size="small" rowKey="id" pagination={false} dataSource={history}
          columns={[
            { title: '问题', dataIndex: 'question', render: (v: string) => <b>{v}</b> },
            { title: 'DSL 摘要', dataIndex: 'dsl', ellipsis: true,
              render: (v: string) => <Text code style={{ fontSize: 11 }}>{v}</Text> },
            { title: '命中', dataIndex: 'hits', width: 64, align: 'center' },
            { title: '延迟', dataIndex: 'latencyMs', width: 76, render: (v: number) => `${v} ms` },
            { title: '执行人', dataIndex: 'by', width: 76 },
            { title: '时间', dataIndex: 'at', width: 140 },
            { title: '操作', key: 'op', width: 76, render: (_, r) => (
              <Button size="small" type="link" icon={<ReloadOutlined />}
                onClick={() => { setQ(r.question); run(r.question); }}>重问</Button>
            ) },
          ]} />
      </Card>
    </div>
  );
}
