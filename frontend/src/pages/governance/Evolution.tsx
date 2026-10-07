import { useCallback, useEffect, useState } from 'react';
import {
  Alert, App, Button, Card, Descriptions, Modal, Popconfirm, Select, Space,
  Statistic, Table, Tabs, Tag, Typography,
} from 'antd';
import { RollbackOutlined } from '@ant-design/icons';
import { api, type Ontology, type OntoCandidate, type RetractReport, type SandboxBranch, type Synonym, type Version } from '../../api';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../../session';

const { Title, Text } = Typography;

/** 演化与撤回：版本撤回（对账报告）+ 环境对比（草稿/已发布对象分布） */
export default function Evolution() {
  const { message } = App.useApp();
  const { user } = useSession();
  const [ontos, setOntos] = useState<Ontology[]>([]);
  const [onto, setOnto] = useState('scm');
  const [versions, setVersions] = useState<Version[]>([]);
  const [report, setReport] = useState<RetractReport | null>(null);
  const [branches, setBranches] = useState<SandboxBranch[]>([]);
  const [cands, setCands] = useState<OntoCandidate[]>([]);
  const [syns, setSyns] = useState<Synonym[]>([]);
  const nav = useNavigate();

  const reload = useCallback((id: string) => {
    api.versions(id).then(setVersions).catch(() => {});
  }, []);

  useEffect(() => {
    api.ontologies(user).then(setOntos).catch(() => {});
  }, [user]);
  useEffect(() => { reload(onto); }, [onto, reload]);

  useEffect(() => {
    api.sandboxBranches().then(setBranches).catch(() => {});
    api.candidates('待裁决').then(setCands).catch(() => {});
    api.synonyms('待归并').then(setSyns).catch(() => {});
  }, []);

  const retract = async (v: Version) => {
    try {
      const rep = await api.retractVersion(v.id, user);
      setReport(rep);
      message.success(`版本 ${v.v} 已撤回（对账报告已生成）`);
      reload(onto);
    } catch (e) { message.error(String((e as Error).message)); }
  };

  const cur = ontos.find(o => o.id === onto);
  const published = versions.filter(v => v.status.includes('PUBLISHED'));
  const retracted = versions.filter(v => v.status === 'RETRACTED');


  const mergeBranch = async (b: SandboxBranch) => {
    try {
      await api.createReview({
        id: `RV-MERGE-${b.id}-${Date.now().toString(36).slice(-4)}`,
        title: `分支合并：${b.name}（风险 ${b.riskBefore}→${b.riskAfter ?? '—'}）`,
        type: '分支合并', from: user,
      });
      message.success(`合并预检通过，已创建合并评审（治理流确认后回写）`);
      nav('/governance/reviews');
    } catch (e) { message.error(String((e as Error).message)); }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>版本与演化</Title>
          <Text type="secondary">撤回与对账 · 分支与隔离（沙盘分支合并走治理评审）· 自进化闭环（系统建议 → 专家确认）</Text>
        </div>
        <div style={{ flex: 1 }} />
        <Select value={onto} onChange={setOnto} style={{ width: 220 }} variant="filled"
          options={ontos.map(o => ({ value: o.id, label: `${o.name}（${o.version}）` }))} />
      </div>

      <Tabs items={[
        { key: 'retract', label: '撤回与对账', children: (
          <>
            <Card size="small" style={{ marginBottom: 12 }}>
              <Space size={24} wrap>
                <Statistic title="当前版本" value={cur?.version ?? '-'} />
                <Statistic title="已发布版本" value={published.length} />
                <Statistic title="已撤回" value={retracted.length} />
                <Statistic title="对象/关系" value={`${cur?.objects ?? 0} / ${cur?.edges ?? 0}`} />
              </Space>
            </Card>
            <Card size="small" title="版本与撤回操作">
              <Table<Version> size="small" rowKey="id" pagination={false} dataSource={versions}
                columns={[
                  { title: '版本', dataIndex: 'v', width: 70, render: (v: string) => <b className="mono">{v}</b> },
                  { title: '日期', dataIndex: 'date', width: 80 },
                  { title: '说明', dataIndex: 'desc' },
                  { title: '状态', dataIndex: 'status', width: 130, render: (v: string) => (
                    <Tag color={v.includes('PUBLISHED') ? 'green' : v === 'RETRACTED' ? 'red' : 'blue'}>{v}</Tag>) },
                  { title: '操作', key: 'op', width: 110, render: (_, v) =>
                    v.status.includes('PUBLISHED') ? (
                      <Popconfirm title={`撤回 ${v.v}？将生成受影响对账并通知相关方。`} onConfirm={() => retract(v)}>
                        <Button size="small" type="link" danger icon={<RollbackOutlined />}>撤回</Button>
                      </Popconfirm>
                    ) : <Text type="secondary">—</Text> },
                ]} />
            </Card>
          </>
        ) },
        { key: 'branches', label: `分支与隔离（${branches.length}）`, children: (
          <Card size="small">
            <Alert type="info" showIcon style={{ marginBottom: 12 }}
              message="沙盘分支 = 隔离的推演环境（推演不落地）。合并预检展示风险/代价对比；「提请合并」创建合并评审，治理确认后才回写生产。" />
            <Table<SandboxBranch> size="small" rowKey="id" pagination={false} dataSource={branches}
              columns={[
                { title: '分支', dataIndex: 'name', render: (v: string, b) => (
                  <Space size={6}><b>{v}</b><Tag>{b.status}</Tag></Space>) },
                { title: '假设', dataIndex: 'hypothesis', ellipsis: true },
                { title: '基准实例', dataIndex: 'baseInstance', width: 120, render: (v: string) => (
                  <span className="mono" style={{ fontSize: 12 }}>{v || '—'}</span>) },
                { title: '风险对比', key: 'risk', width: 110, render: (_, b) => b.riskAfter != null ? (
                  <span><Tag color="default">{b.riskBefore}</Tag>→<Tag color={b.riskAfter < b.riskBefore ? 'green' : 'red'}>{b.riskAfter}</Tag></span>
                ) : <Tag>未推演</Tag> },
                { title: '代价', dataIndex: 'cost', width: 110 },
                { title: '操作', key: 'op', width: 110, render: (_, b) => b.status === '已对比' ? (
                  <Button size="small" type="link" onClick={() => mergeBranch(b)}>提请合并</Button>
                ) : <Text type="secondary">推演中/已回滚</Text> },
              ]} />
          </Card>
        ) },
        { key: 'evolution', label: `自进化闭环（${cands.length + syns.length}）`, children: (
          <Card size="small">
            <Alert type="info" showIcon style={{ marginBottom: 12 }}
              message="自进化闭环：系统确定性生成补丁建议（本体候选 / 同义词归并），专家确认后入库——生成自动、确认治理。" />
            <div style={{ marginBottom: 8 }}><b>本体候选建议（{cands.length}）</b></div>
            <Table<OntoCandidate> size="small" rowKey="id" pagination={false} dataSource={cands}
              locale={{ emptyText: '暂无候选' }}
              columns={[
                { title: '建议', dataIndex: 'suggestion', render: (v: string, c) => <Space size={6}><b>{v}</b><Tag>{c.kind}</Tag></Space> },
                { title: '依据', dataIndex: 'evidence' },
                { title: '操作', key: 'op', width: 90, render: () => (
                  <a onClick={() => nav('/knowledge/convergence')}>去裁决 →</a>) },
              ]} />
            <div style={{ margin: '12px 0 8px' }}><b>同义词归并建议（{syns.length}）</b></div>
            <Table<Synonym> size="small" rowKey="id" pagination={false} dataSource={syns}
              locale={{ emptyText: '暂无待归并' }}
              columns={[
                { title: '术语组', dataIndex: 'terms', render: (v: string[]) => v.join(' ≈ ') },
                { title: '操作', key: 'op', width: 90, render: () => (
                  <a onClick={() => nav('/knowledge/synonyms')}>去归并 →</a>) },
              ]} />
          </Card>
        ) },
      ]} />

      <Modal title={`撤回对账 · ${report?.version ?? ''}`} open={!!report} footer={null}
        onCancel={() => setReport(null)}>
        {report && (
          <Descriptions column={2} size="small" bordered style={{ marginTop: 8 }}>
            <Descriptions.Item label="本体">{report.ontoId}</Descriptions.Item>
            <Descriptions.Item label="版本">{report.version}</Descriptions.Item>
            <Descriptions.Item label="受影响对象">{report.affectedObjects}</Descriptions.Item>
            <Descriptions.Item label="受影响绑定">{report.affectedBindings}</Descriptions.Item>
            <Descriptions.Item label="受影响视图">{report.affectedViews}</Descriptions.Item>
            <Descriptions.Item label="操作人">{user}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}
