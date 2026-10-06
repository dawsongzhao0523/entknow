import { useEffect, useState } from 'react';
import { Alert, Badge, Card, Col, List, Row, Space, Statistic, Table, Tag, Typography } from 'antd';
import { api, type WorkbenchSnapshot } from '../../api';
import { useSession } from '../../session';

const { Title, Text } = Typography;

/** 数据工作台：个人聚合视图（采集任务/我的资产/治理待办/最近运行，全部真实派生） */
export default function Workbench() {
  const { user } = useSession();
  const [w, setW] = useState<WorkbenchSnapshot | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.workbench(user).then(setW).catch(e => setErr(String(e.message ?? e)));
  }, [user]);

  if (err) return <Alert type="error" showIcon message={`加载失败：${err}`} />;
  if (!w) return <Card loading />;

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <Title level={4} style={{ margin: 0 }}>数据工作台</Title>
        <Text type="secondary">当前用户：{user} · 采集任务 · 我的资产 · 治理待办 一览（真实聚合）</Text>
      </div>

      {w.alerts?.map((a, i) => (
        <Alert key={i} type="error" showIcon style={{ marginBottom: 8 }} message={a.detail} />
      ))}

      <Row gutter={12} style={{ marginBottom: 12 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic title={<Space><Badge status="processing" />采集任务 · 运行中</Space>} value={w.tasksRunning} />
            {w.tasksFailed > 0 && <Text type="danger" style={{ fontSize: 12 }}>{w.tasksFailed} 个失败</Text>}
          </Card>
        </Col>
        <Col span={6}><Card size="small"><Statistic title="我的上架资产" value={w.myAssets} /><Text type="secondary" style={{ fontSize: 12 }}>数据集市</Text></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="治理待办" value={w.pendingTodos} /><Text type="secondary" style={{ fontSize: 12 }}>评审 / 审批 / 同义词</Text></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="最近绑定同步" value={w.recentRuns?.length ?? 0} /><Text type="secondary" style={{ fontSize: 12 }}>数据绑定</Text></Card></Col>
      </Row>

      <Row gutter={12}>
        <Col span={12}>
          <Card size="small" title="最近绑定同步">
            <Table size="small" rowKey="id" pagination={false} dataSource={w.recentRuns ?? []} locale={{ emptyText: '暂无运行' }}
              columns={[
                { title: '绑定', dataIndex: 'bindingId', width: 90, render: (v: string) => <span className="mono">{v}</span> },
                { title: '状态', dataIndex: 'status', width: 70, render: (v: string) => <Tag color={v === '成功' ? 'green' : 'red'}>{v}</Tag> },
                { title: '详情', dataIndex: 'detail' },
                { title: '时间', dataIndex: 'at', width: 120, render: (v: string) => <span className="mono" style={{ fontSize: 12 }}>{v}</span> },
              ]} />
          </Card>
        </Col>
        <Col span={12}>
          <Card size="small" title="最近管道运行">
            <Table size="small" rowKey="id" pagination={false} dataSource={w.recentPipelines ?? []} locale={{ emptyText: '暂无运行' }}
              columns={[
                { title: '任务', dataIndex: 'taskId', width: 110, render: (v: string) => <span className="mono">{v}</span> },
                { title: '状态', dataIndex: 'status', width: 70, render: (v: string) => <Tag color={v === '成功' ? 'green' : 'red'}>{v}</Tag> },
                { title: '详情', dataIndex: 'detail' },
              ]} />
          </Card>
        </Col>
      </Row>

      <Card size="small" title="最近语义查询" style={{ marginTop: 12 }}>
        <List size="small" dataSource={w.recentQueries ?? []} locale={{ emptyText: '暂无查询' }}
          renderItem={q => (
            <List.Item>
              <List.Item.Meta
                title={<span style={{ fontSize: 13 }}>{q.question}</span>}
                description={<span className="mono" style={{ fontSize: 12 }}>{q.by} · {q.at} · {q.latencyMs}ms</span>}
              />
            </List.Item>
          )} />
      </Card>
    </div>
  );
}
