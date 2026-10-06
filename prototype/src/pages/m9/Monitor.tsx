import { Badge, Button, Card, Col, Row, Table, Tag, Typography } from 'antd';
import { ThunderboltOutlined, ReloadOutlined } from '@ant-design/icons';
import { ok, run } from '../../components/proto';

const { Title, Text } = Typography;

interface Svc {
  id: string; name: string; desc: string; status: '正常' | '延迟' | '异常';
  latency: string; uptime: string; trend: string;
}

const SERVICES: Svc[] = [
  { id: 's1', name: 'peng AI 服务', desc: 'AI 补全 / 协作建模 / 语义解析', status: '正常', latency: '12ms', uptime: '99.98%', trend: '0,20 32,18 64,19 96,15 128,17 160,12' },
  { id: 's2', name: 'codenexus 代码索引', desc: '代码 → 本体映射', status: '正常', latency: '34ms', uptime: '99.95%', trend: '0,16 32,18 64,14 96,17 128,15 160,16' },
  { id: 's3', name: 'S3 对象存储', desc: '非结构化文档 / 制品仓库', status: '正常', latency: '21ms', uptime: '100%', trend: '0,14 32,13 64,15 96,12 128,14 160,13' },
  { id: 's4', name: 'StarRocks 联邦层', desc: '逻辑视图下推执行', status: '正常', latency: '8ms', uptime: '99.99%', trend: '0,18 32,10 64,14 96,8 128,12 160,9' },
  { id: 's5', name: 'MySQL scm_prod', desc: 'CRON 抽取源（供应链）', status: '正常', latency: '15ms', uptime: '99.92%', trend: '0,15 32,17 64,13 96,16 128,14 160,15' },
  { id: 's6', name: '飞书 KB 插件', desc: 'kb_supply_chain 事件订阅', status: '延迟', latency: '412ms', uptime: '98.71%', trend: '0,10 32,12 64,8 96,18 128,22 160,20' },
];

const UPTIME_7D = SERVICES.map(s => ({
  ...s,
  days: s.status === '延迟'
    ? ['100%', '100%', '99.2%', '98.7%', '99.9%', '97.4%', '98.7%']
    : ['100%', '100%', '100%', '99.9%', '100%', '100%', s.uptime],
}));

function Dot({ status }: { status: Svc['status'] }) {
  return (
    <Badge
      status={status === '正常' ? 'success' : status === '延迟' ? 'warning' : 'error'}
      text={<span style={{ fontWeight: 600 }}>{status}</span>}
    />
  );
}

export default function Monitor() {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>依赖服务监控</Title>
          <Text type="secondary">本体运行时外部依赖健康度 · 最近巡检 2026-10-03 09:58（M9-F05）</Text>
        </div>
        <div style={{ flex: 1 }} />
        <Button type="primary" icon={<ThunderboltOutlined />} onClick={() => run('手动巡检', '将对 6 个依赖服务逐项执行健康检查（探活 / 延迟采样 / 可用率复核），结果刷新至面板。')}>手动巡检</Button>
      </div>
      <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
        {SERVICES.map(s => (
          <Col span={8} key={s.id}>
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                <b>{s.name}</b>
                <div style={{ flex: 1 }} />
                <Dot status={s.status} />
              </div>
              <Text type="secondary" style={{ fontSize: 12 }}>{s.desc}</Text>
              <div style={{ display: 'flex', alignItems: 'flex-end', marginTop: 10 }}>
                <div>
                  <div className="mono" style={{ fontSize: 22, fontWeight: 700 }}>{s.latency}</div>
                  <Text type="secondary" style={{ fontSize: 12 }}>响应时间</Text>
                </div>
                <div style={{ flex: 1 }} />
                <div style={{ textAlign: 'right' }}>
                  <div className="mono" style={{ fontSize: 16, fontWeight: 600, color: s.status === '延迟' ? '#c9861a' : '#2d8a4e' }}>{s.uptime}</div>
                  <Text type="secondary" style={{ fontSize: 12 }}>24h 可用率</Text>
                </div>
              </div>
              <svg width="100%" height="28" viewBox="0 0 160 28" style={{ marginTop: 8 }}>
                <polyline fill="none" stroke={s.status === '延迟' ? '#c9861a' : '#059669'} strokeWidth="2" points={s.trend} />
              </svg>
            </Card>
          </Col>
        ))}
      </Row>
      <Card title="7 日可用率" extra={<Button size="small" icon={<ReloadOutlined />} onClick={() => ok('可用率数据已刷新（截至 2026-10-03 23:59）')}>刷新</Button>}>
        <Table
          rowKey="id" size="middle" pagination={false} dataSource={UPTIME_7D}
          columns={[
            { title: '服务', dataIndex: 'name', key: 'name', render: (v: string, r) => <span><b>{v}</b> <Tag color={r.status === '延迟' ? 'orange' : 'green'} style={{ marginLeft: 6 }}>{r.status}</Tag></span> },
            ...['09-27', '09-28', '09-29', '09-30', '10-01', '10-02', '10-03'].map((d, i) => ({
              title: d, key: d, align: 'center' as const,
              render: (_: unknown, r: typeof UPTIME_7D[number]) => {
                const v = r.days[i];
                const low = parseFloat(v) < 99;
                return <span className="mono" style={{ fontSize: 12, color: low ? '#c23b3b' : undefined }}>{v}</span>;
              },
            })),
          ]} />
      </Card>
    </>
  );
}
