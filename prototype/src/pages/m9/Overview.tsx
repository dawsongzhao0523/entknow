import { Alert, Card, Col, Progress, Row, Space, Statistic, Table, Tag, Typography } from 'antd';

const { Title, Text } = Typography;

/** 平台访问运营 */
const ACCESS = [
  { label: '今日 PV', value: 48213, extra: '昨日 45,207 · +6.6%' },
  { label: '今日 UV', value: 1372, extra: '昨日 1,298 · +5.7%' },
  { label: '在线用户', value: 186, extra: '峰值 243（10:20）' },
  { label: '平均停留', value: '14.2 min', extra: '人均访问 35 页' },
];

/** 平台资产规模 */
const ASSETS = [
  { label: '知识空间', value: 26, suffix: '个', extra: '本周 +2' },
  { label: '本体', value: 17, suffix: '个', extra: '12 已发布 · 5 草稿' },
  { label: '数据资产', value: 486, suffix: '张表', extra: '探查覆盖 91%' },
  { label: '注册数据源', value: 23, suffix: '个', extra: '21 正常 · 2 异常' },
];

/** 平台调用 */
const CALLS = [
  { label: 'API 调用（今日）', value: 96420, extra: 'MCP 38% · REST 52% · SDK 10%' },
  { label: '语义查询', value: 12401, extra: '成功率 99.2%' },
  { label: '同步任务执行', value: 342, extra: '失败 1 · 平均耗时 3.4min' },
  { label: '推理/沙盘调用', value: 518, extra: '沙盘分支 46 个运行中' },
];

function Spark({ points, color }: { points: string; color: string }) {
  return (
    <svg width="160" height="28" viewBox="0 0 160 28">
      <polyline fill="none" stroke={color} strokeWidth="2" points={points} />
    </svg>
  );
}

const TRENDS = [
  { label: 'PV', points: '0,20 32,15 64,18 96,10 128,13 160,7', color: '#059669', total: '31.4万' },
  { label: 'UV', points: '0,17 32,19 64,13 96,15 128,9 160,11', color: '#2d8a4e', total: '8,942' },
  { label: 'API 调用', points: '0,22 32,17 64,12 96,16 128,8 160,10', color: '#8b5cf6', total: '66.8万' },
  { label: '同步任务', points: '0,13 32,10 64,14 96,7 128,10 160,8', color: '#0891b2', total: '2,304' },
];

/** 服务健康 */
const SERVICES = [
  { name: '本体运行时（M4）', status: '正常', latency: '86ms', sla: '99.95%' },
  { name: '推理引擎（M5）', status: '正常', latency: '412ms', sla: '99.90%' },
  { name: '沙盘集群（M6）', status: '正常', latency: '1.2s', sla: '99.80%' },
  { name: '数据同步（M1）', status: '异常', latency: '-', sla: '98.10%' },
  { name: '统一出口（M7）', status: '正常', latency: '64ms', sla: '99.99%' },
];

/** 模块访问 Top */
const TOP_MODULES = [
  { m: 'M4 本体运行时 · 实例 360°', pv: 9412, uv: 486 },
  { m: 'M5 推理演绎 · 语义查询', pv: 8104, uv: 412 },
  { m: 'M3 本体建模 · 本体设计器', pv: 6877, uv: 238 },
  { m: 'M2 知识运营 · 知识库', pv: 5201, uv: 355 },
  { m: 'M1 数据资产 · 数据工作台', pv: 4388, uv: 291 },
];

export default function Overview() {
  return (
    <>
      <div style={{ marginBottom: 12 }}>
        <Title level={4} style={{ margin: 0 }}>系统运营总览</Title>
        <Text type="secondary">平台管理员视角 · 全平台 · 快照 2026-10-03 09:30</Text>
      </div>

      {/* 访问运营 */}
      <Row gutter={12} style={{ marginBottom: 12 }}>
        {ACCESS.map(c => (
          <Col span={6} key={c.label}>
            <Card size="small">
              <Statistic title={c.label} value={c.value} />
              <Text type="secondary" style={{ fontSize: 12 }}>{c.extra}</Text>
            </Card>
          </Col>
        ))}
      </Row>

      {/* 平台资产 + 调用 */}
      <Row gutter={12} style={{ marginBottom: 12 }}>
        <Col span={12}>
          <Card title="平台资产规模" size="small" style={{ height: '100%' }}>
            <Row gutter={[12, 12]}>
              {ASSETS.map(c => (
                <Col span={12} key={c.label}>
                  <Statistic title={c.label} value={c.value} suffix={<span style={{ fontSize: 13, fontWeight: 400, color: '#5a5a72' }}> {c.suffix}</span>} />
                  <Text type="secondary" style={{ fontSize: 12 }}>{c.extra}</Text>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="平台调用" size="small" style={{ height: '100%' }}>
            <Row gutter={[12, 12]}>
              {CALLS.map(c => (
                <Col span={12} key={c.label}>
                  <Statistic title={c.label} value={c.value} />
                  <Text type="secondary" style={{ fontSize: 12 }}>{c.extra}</Text>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
      </Row>

      {/* 趋势 + 服务健康 */}
      <Row gutter={12} style={{ marginBottom: 12 }}>
        <Col span={10}>
          <Card title="7 日运营趋势" size="small" extra={<Text type="secondary" style={{ fontSize: 12 }}>近 7 日 · 值为合计</Text>} style={{ height: '100%' }}>
            {TRENDS.map(t => (
              <div key={t.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px dashed #f1f3f5' }}>
                <span style={{ width: 86, color: 'rgba(0,0,0,0.65)' }}>{t.label}</span>
                <Spark points={t.points} color={t.color} />
                <b className="mono" style={{ width: 64, textAlign: 'right', fontSize: 14 }}>{t.total}</b>
              </div>
            ))}
          </Card>
        </Col>
        <Col span={14}>
          <Card title="服务健康" size="small" style={{ height: '100%' }}
            extra={<a href="/m9/ops">监控与日志 →</a>}>
            <Table size="small" rowKey="name" pagination={false} dataSource={SERVICES}
              columns={[
                { title: '服务', dataIndex: 'name', render: (v: string) => <b>{v}</b> },
                { title: '状态', dataIndex: 'status', width: 80, render: (v: string) => <Tag color={v === '正常' ? 'green' : 'red'}>{v}</Tag> },
                { title: 'P95 延迟', dataIndex: 'latency', width: 100, render: (v: string) => <span className="mono">{v}</span> },
                { title: '本月 SLA', dataIndex: 'sla', width: 160, render: (v: string) => <Space size={6}><Progress percent={parseFloat(v)} size="small" style={{ width: 90, margin: 0 }} strokeColor={parseFloat(v) >= 99.5 ? '#2d8a4e' : '#c23b3b'} /><span className="mono" style={{ fontSize: 12 }}>{v}</span></Space> },
              ]} />
          </Card>
        </Col>
      </Row>

      {/* 模块访问 Top */}
      <Card title="模块访问 Top 5（今日）" size="small" style={{ marginBottom: 12 }}>
        <Table size="small" rowKey="m" pagination={false} dataSource={TOP_MODULES}
          columns={[
            { title: '模块', dataIndex: 'm', render: (v: string) => <b>{v}</b> },
            { title: 'PV', dataIndex: 'pv', width: 110, render: (v: number) => <span className="mono">{v.toLocaleString()}</span> },
            { title: 'UV', dataIndex: 'uv', width: 110, render: (v: number) => <span className="mono">{v}</span> },
            { title: 'PV 占比', key: 'pct', render: (_: unknown, r: { pv: number }) => <Progress percent={Math.round(r.pv / TOP_MODULES[0].pv * 100)} size="small" format={p => `${p}%`} /> },
          ]} />
      </Card>

      <Alert type="warning" showIcon message="系统告警：M1 数据同步服务 1 起任务失败（lv_order_delivery 上游 schema 变更） · 沙盘集群资源水位 82%（接近扩容阈值）" />
    </>
  );
}
