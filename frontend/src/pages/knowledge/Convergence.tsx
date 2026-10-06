import { useCallback, useEffect, useState } from 'react';
import {
  App, Alert, Button, Card, Popconfirm, Space, Table, Tabs, Tag, Typography,
} from 'antd';
import { CheckOutlined, CloseOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { api, type EntityAlignment, type OntoCandidate } from '../../api';
import { useSession } from '../../session';

const { Title, Text } = Typography;

/** 隐式收敛：知识/同义词 → 本体候选（确定性召回）→ 采纳（建对象草稿）/ 丢弃；跨源对齐裁决 */
export default function Convergence() {
  const { message } = App.useApp();
  const { user } = useSession();
  const [candidates, setCandidates] = useState<OntoCandidate[]>([]);
  const [alignments, setAlignments] = useState<EntityAlignment[]>([]);
  const [generating, setGenerating] = useState(false);

  const reload = useCallback(() => {
    api.candidates().then(setCandidates).catch(e => message.error(String(e.message)));
    api.alignments().then(setAlignments).catch(() => {});
  }, [message]);

  useEffect(() => { reload(); }, [reload]);

  const generate = async () => {
    setGenerating(true);
    try {
      const added = await api.generateCandidates();
      message.success(`确定性召回完成：当前待裁决候选 ${added.length} 条（LLM/Utopia 语料提取为后续提案）`);
      reload();
    } catch (e) { message.error(String((e as Error).message)); }
    finally { setGenerating(false); }
  };

  const decide = async (c: OntoCandidate, adopt: boolean) => {
    try {
      const out = adopt ? await api.adoptCandidate(c.id, user) : await api.dropCandidate(c.id, user);
      message.success(adopt
        ? `已采纳：「${c.suggestion}」${c.kind === '对象' ? ' 已创建 DRAFT 对象（注册中心可见）' : ''}`
        : `已丢弃：「${c.suggestion}」`);
      void out;
      reload();
    } catch (e) { message.error(String((e as Error).message)); }
  };

  const decideAlign = async (a: EntityAlignment, action: 'merge' | 'drop') => {
    try {
      await api.decideAlignment(a.id, action, user);
      message.success(action === 'merge' ? `已合并：「${a.leftTerm}」≈「${a.rightTerm}」` : '已丢弃');
      reload();
    } catch (e) { message.error(String((e as Error).message)); }
  };

  const candTab = (
    <Card size="small" extra={
      <Button type="primary" icon={<ThunderboltOutlined />} loading={generating} onClick={generate}>
        重新召回候选
      </Button>}>
      <Alert type="info" showIcon style={{ marginBottom: 12 }}
        message="召回规则（确定性）：同义词组标准词未被任何对象名覆盖 → 生成「对象」候选。采纳对象类候选会在注册中心创建 DRAFT 草稿，走治理评审后发布。" />
      <Table<OntoCandidate> size="small" rowKey="id" dataSource={candidates} pagination={false}
        columns={[
          { title: '建议', dataIndex: 'suggestion', render: (v: string, r) => (
            <Space size={6}><b>{v}</b><Tag>{r.kind}</Tag></Space>) },
          { title: '来源', dataIndex: 'source', width: 220 },
          { title: '依据', dataIndex: 'evidence' },
          { title: '状态', dataIndex: 'status', width: 90, render: (v: string) => (
            <Tag color={v === '已采纳' ? 'green' : v === '已丢弃' ? 'default' : 'blue'}>{v}</Tag>) },
          { title: '操作', key: 'op', width: 140, render: (_, c) => c.status === '待裁决' ? (
            <Space size={0}>
              <Popconfirm title={`采纳「${c.suggestion}」？对象类候选将创建 DRAFT 对象。`} onConfirm={() => decide(c, true)}>
                <Button size="small" type="link" icon={<CheckOutlined />}>采纳</Button>
              </Popconfirm>
              <Button size="small" type="link" danger icon={<CloseOutlined />} onClick={() => decide(c, false)}>丢弃</Button>
            </Space>
          ) : <Text type="secondary">{c.by || '—'} {c.at}</Text> },
        ]} />
    </Card>
  );

  const alignTab = (
    <Card size="small" extra={
      <Button icon={<ThunderboltOutlined />} onClick={async () => {
        try { const added = await api.generateAlignments(); message.success(`对齐召回完成：待裁决 ${added.length} 条`); reload(); }
        catch (e) { message.error(String((e as Error).message)); }
      }}>重新召回对齐</Button>}>
      <Table<EntityAlignment> size="small" rowKey="id" dataSource={alignments} pagination={false}
        columns={[
          { title: '左术语', dataIndex: 'leftTerm', render: (v: string) => <b>{v}</b> },
          { title: '右术语', dataIndex: 'rightTerm', render: (v: string) => <b>{v}</b> },
          { title: '来源', key: 'src', render: (_, a) => <span style={{ fontSize: 12 }}>{a.sourceA} × {a.sourceB}</span> },
          { title: '策略', dataIndex: 'strategy', width: 100, render: (v: string) => <Tag>{v}</Tag> },
          { title: '相似度', dataIndex: 'score', width: 80, render: (v: number) => <span className="mono">{v}%</span> },
          { title: '状态', dataIndex: 'status', width: 90, render: (v: string) => (
            <Tag color={v === '已合并' ? 'green' : v === '已丢弃' ? 'default' : 'blue'}>{v}</Tag>) },
          { title: '操作', key: 'op', width: 130, render: (_, a) => a.status === '待裁决' ? (
            <Space size={0}>
              <Button size="small" type="link" onClick={() => decideAlign(a, 'merge')}>合并</Button>
              <Button size="small" type="link" danger onClick={() => decideAlign(a, 'drop')}>丢弃</Button>
            </Space>
          ) : <Text type="secondary">{a.by || '—'} {a.at}</Text> },
        ]} />
    </Card>
  );

  return (
    <div>
      <Title level={4}>隐式收敛</Title>
      <Text type="secondary">知识 → 本体的确定性收敛（候选召回 → 专家裁决入库）· 跨源实体对齐裁决</Text>
      <div style={{ marginTop: 12 }}>
        <Tabs items={[
          { key: 'cand', label: `本体候选（${candidates.filter(c => c.status === '待裁决').length}）`, children: candTab },
          { key: 'align', label: `跨源对齐（${alignments.filter(a => a.status === '待裁决').length}）`, children: alignTab },
        ]} />
      </div>
    </div>
  );
}
