import { useEffect, useState } from 'react';
import { Alert, Badge, Card, Col, List, Row, Space, Statistic, Table, Tag, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { api, type StatsSnapshot } from '../../api';

const { Title, Text } = Typography;

const LEVEL_COLOR: Record<string, string> = { INFO: 'blue', WARN: 'orange', ERROR: 'red' };

/** M9 系统运营总览：全部指标由 /admin/stats 真实聚合（无硬编码展示值） */
export default function Overview() {
  const nav = useNavigate();
  const [stats, setStats] = useState<StatsSnapshot | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.adminStats().then(setStats).catch(e => setErr(String(e.message ?? e)));
  }, []);

  if (err) return <Alert type="error" showIcon message={`加载总览失败：${err}`} />;
  if (!stats) return <Card loading />;

  const cards: { t: string; v: number | string; s: string }[] = [
    { t: '用户', v: stats.users, s: `角色 ${stats.roles} 个` },
    { t: '本体', v: stats.ontos, s: `已发布 ${stats.ontoPublished} · 草稿 ${stats.ontoDraft}` },
    { t: '对象 / 关系', v: `${stats.objects} / ${stats.edges}`, s: `运行实例 ${stats.instances}` },
    { t: '数据源', v: stats.dsTotal, s: `正常 ${stats.dsNormal} · 异常 ${stats.dsError}` },
    { t: '知识条目', v: stats.kbEntries, s: `同义词组 ${stats.synonyms}` },
    { t: '能力出口', v: stats.capabilities, s: `真实调用 ${stats.capabilityCalls} 次` },
    { t: '语义查询', v: stats.queries, s: '历史执行次数' },
    { t: '评审', v: stats.reviews, s: `待处理 ${stats.reviewsPending}` },
    { t: '管道任务', v: stats.pipelineTasks, s: `失败 ${stats.tasksFailed}` },
    { t: '今日审计事件', v: stats.auditToday, s: '写操作自动留痕' },
  ];

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <Title level={4} style={{ margin: 0 }}>系统运营总览</Title>
        <Text type="secondary">平台全量真实计数 · 服务健康取最近巡检 · 告警取审计 WARN/ERROR</Text>
      </div>

      <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
        {cards.map(c => (
          <Col span={6} key={c.t}>
            <Card size="small">
              <Statistic title={c.t} value={c.v} />
              <Text type="secondary" style={{ fontSize: 12 }}>{c.s}</Text>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={12} style={{ marginBottom: 12 }}>
        <Col span={14}>
          <Card title="依赖服务健康" size="small" extra={<a onClick={() => nav('/admin/monitor')}>监控与巡检 →</a>}
            style={{ height: '100%' }}>
            <Table size="small" rowKey="id" pagination={false} dataSource={stats.services}
              columns={[
                { title: '服务', dataIndex: 'name', render: (v: string) => <b>{v}</b> },
                { title: '状态', dataIndex: 'status', width: 90, render: (v: string) => (
                  <Badge status={v === '正常' ? 'success' : v === '延迟' ? 'warning' : v === '异常' ? 'error' : 'default'} text={v} />
                ) },
                { title: '延迟', dataIndex: 'latencyMs', width: 90, render: (v: number) => <span className="mono">{v}ms</span> },
                { title: '最近巡检', dataIndex: 'checkedAt', width: 130, render: (v: string) => <span className="mono" style={{ fontSize: 12 }}>{v || '—'}</span> },
              ]} />
          </Card>
        </Col>
        <Col span={10}>
          <Card title="最近告警（审计 WARN/ERROR）" size="small" extra={<a onClick={() => nav('/admin/logs')}>日志查询 →</a>}
            style={{ height: '100%' }}>
            <List
              size="small" dataSource={stats.recentAlerts ?? []} locale={{ emptyText: '暂无告警' }}
              renderItem={a => (
                <List.Item>
                  <List.Item.Meta
                    title={<Space>
                      <Tag color={LEVEL_COLOR[a.level]}>{a.level}</Tag>
                      <span style={{ fontSize: 13 }}>{a.content}</span>
                    </Space>}
                    description={<span className="mono" style={{ fontSize: 12 }}>{a.at} · {a.module} · {a.operator} · {a.traceId}</span>}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      {(stats.dsError > 0 || stats.tasksFailed > 0) && (
        <Alert type="warning" showIcon message={
          `系统告警：${stats.dsError} 个数据源异常 · ${stats.tasksFailed} 个管道任务失败（详见数据源中心 / 数据加工）`
        } />
      )}
    </div>
  );
}
