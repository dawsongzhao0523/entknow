import { useCallback, useEffect, useMemo, useState } from 'react';
import { App, Badge, Button, Card, Col, Row, Table, Tag, Typography } from 'antd';
import { ReloadOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { api, type DepService, type UptimePoint } from '../../api';

const { Title, Text } = Typography;

const badgeOf = (s: string) =>
  s === '正常' ? 'success' : s === '延迟' ? 'warning' : s === '异常' ? 'error' : 'default';

/** M9 依赖服务监控：真实探活（PG 自库 / Redis PING / MinIO health）+ 巡检历史聚合 */
export default function Monitor() {
  const { message } = App.useApp();
  const [services, setServices] = useState<DepService[]>([]);
  const [uptime, setUptime] = useState<UptimePoint[]>([]);
  const [inspecting, setInspecting] = useState(false);
  const [err, setErr] = useState('');

  const reload = useCallback(() => {
    api.depServices().then(setServices).catch(e => setErr(String(e.message)));
    api.depUptime().then(setUptime).catch(() => {});
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const inspect = async () => {
    setInspecting(true);
    try {
      const after = await api.inspectDepServices();
      setServices(after);
      await api.depUptime().then(setUptime);
      const bad = after.filter(s => s.status === '异常').length;
      message.success(bad > 0
        ? `巡检完成：${after.length} 个服务，${bad} 个异常（结果已入库）`
        : `巡检完成：${after.length} 个服务全部存活（结果已入库）`);
    } catch (e) {
      message.error(String((e as Error).message));
    } finally {
      setInspecting(false);
    }
  };

  // 7 日可用率透视：行 = 服务，列 = 日期（升序）
  const days = useMemo(() =>
    [...new Set(uptime.map(p => p.day))].sort(), [uptime]);
  const cell = (svc: string, day: string) =>
    uptime.find(p => p.serviceId === svc && p.day === day)?.uptime;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>依赖服务监控</Title>
          <Text type="secondary">对登记服务执行真实健康检查（探活 + 延迟采样），结果与历史均落库</Text>
        </div>
        <div style={{ flex: 1 }} />
        <Button type="primary" icon={<ThunderboltOutlined />} loading={inspecting} onClick={inspect}>
          手动巡检
        </Button>
      </div>
      {err && <Card size="small" style={{ marginBottom: 12 }}><Text type="danger">加载失败：{err}</Text></Card>}

      <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
        {services.map(s => (
          <Col span={8} key={s.id}>
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                <b>{s.name}</b>
                <div style={{ flex: 1 }} />
                <Badge status={badgeOf(s.status) as 'success' | 'warning' | 'error' | 'default'} text={<span style={{ fontWeight: 600 }}>{s.status}</span>} />
              </div>
              <Text type="secondary" style={{ fontSize: 12 }}>{s.descr}</Text>
              <div style={{ display: 'flex', alignItems: 'flex-end', marginTop: 10 }}>
                <div>
                  <div className="mono" style={{ fontSize: 22, fontWeight: 700 }}>{s.latencyMs}ms</div>
                  <Text type="secondary" style={{ fontSize: 12 }}>响应时间</Text>
                </div>
                <div style={{ flex: 1 }} />
                <div style={{ textAlign: 'right' }}>
                  <div className="mono" style={{ fontSize: 12 }}>{s.checkedAt || '—'}</div>
                  <Text type="secondary" style={{ fontSize: 12 }}>最近巡检</Text>
                </div>
              </div>
              <div style={{ marginTop: 8 }}>
                <Tag>{s.kind}</Tag>
                <Text className="mono" type="secondary" style={{ fontSize: 12 }}>{s.target || '（自库连接池）'}</Text>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Card title="近 7 日可用率（按日聚合巡检历史）"
        extra={<Button size="small" icon={<ReloadOutlined />} onClick={reload}>刷新</Button>}>
        <Table size="middle" rowKey="id" pagination={false} dataSource={services} scroll={{ x: 720 }}
          columns={[
            { title: '服务', dataIndex: 'name', render: (v: string, r) => (
              <span><b>{v}</b> <Tag color={r.status === '正常' ? 'green' : r.status === '异常' ? 'red' : 'orange'} style={{ marginLeft: 6 }}>{r.status}</Tag></span>
            ) },
            ...days.map(d => ({
              title: d.slice(5), key: d, align: 'center' as const,
              render: (_: unknown, r: DepService) => {
                const v = cell(r.id, d);
                if (v === undefined) return <Text type="secondary">—</Text>;
                return <span className="mono" style={{ fontSize: 12, color: v < 99 ? '#c23b3b' : undefined }}>{v}%</span>;
              },
            })),
          ]} />
      </Card>
    </div>
  );
}
