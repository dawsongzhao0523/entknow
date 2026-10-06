import { useCallback, useEffect, useState } from 'react';
import {
  App, Button, Card, Descriptions, Input, Modal, Select, Space,
  Table, Tabs, Tag, Typography,
} from 'antd';
import { DownloadOutlined, SearchOutlined } from '@ant-design/icons';
import { api, type AuditLog, type SystemLog } from '../../api';
import { useSession } from '../../session';

const { Title, Text } = Typography;

const LEVEL_COLOR: Record<string, string> = { INFO: 'blue', WARN: 'orange', ERROR: 'red' };
const MODULES = ['assets', 'knowledge', 'modeling', 'runtime', 'reasoning', 'sandbox', 'apps', 'governance', 'admin'];
const COMPONENTS = ['数据同步', '数据绑定', '推理引擎', '依赖巡检', '治理引擎'];
const PAGE_SIZE = 20;

/** 快捷时间范围 → since 参数 */
function rangeSince(key: string): string {
  const now = new Date();
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  if (key === 'today') return fmt(now);
  if (key === '3d') { now.setDate(now.getDate() - 2); return fmt(now); }
  if (key === '7d') { now.setDate(now.getDate() - 6); return fmt(now); }
  return '';
}

/** 日志中心：审计日志（用户写操作留痕，治理/系统管理域可见）与
 *  系统日志（运行时可观测性，系统管理域可见）分 tab 管理；无权限的 tab 自动隐藏 */
export default function Logs() {
  const { user } = useSession();
  const [canAudit, setCanAudit] = useState<boolean | null>(null);
  const [canSys, setCanSys] = useState<boolean | null>(null);

  // 权限探测：403 → 隐藏对应 tab
  useEffect(() => {
    api.auditLogs({ user, limit: 1 }).then(() => setCanAudit(true)).catch(() => setCanAudit(false));
    api.systemLogs({ user, limit: 1 }).then(() => setCanSys(true)).catch(() => setCanSys(false));
  }, [user]);

  if (canAudit === null || canSys === null) return <Card loading />;

  const items = [];
  if (canAudit) items.push({ key: 'audit', label: '审计日志（用户操作）', children: <AuditPanel user={user} /> });
  if (canSys) items.push({ key: 'system', label: '系统日志（运行事件）', children: <SystemPanel user={user} /> });

  return (
    <div>
      <Title level={4}>日志中心</Title>
      <Text type="secondary">
        审计日志 = 谁、何时、做了什么写操作（治理追溯{canAudit ? '' : '，你无权限'}）；
        系统日志 = 运行时事件与告警（故障排查{canSys ? '' : '，你无权限'}）。两者分离管理与授权。
      </Text>
      <div style={{ marginTop: 12 }}>
        <Tabs items={items} />
      </div>
    </div>
  );
}

/** ─── 审计日志面板 ─── */
function AuditPanel({ user }: { user: string }) {
  const { message } = App.useApp();
  const [module, setModule] = useState('all');
  const [level, setLevel] = useState('all');
  const [range, setRange] = useState('all');
  const [kw, setKw] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [items, setItems] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<AuditLog | null>(null);

  const filters = useCallback(() => ({
    user,
    module: module === 'all' ? '' : module,
    level: level === 'all' ? '' : level,
    kw: kw.trim() || undefined,
    since: rangeSince(range) || undefined,
  }), [user, module, level, kw, range]);

  const query = useCallback((p = 1) => {
    setLoading(true);
    api.auditLogs({ ...filters(), limit: PAGE_SIZE, offset: (p - 1) * PAGE_SIZE })
      .then(res => { setItems(res.items ?? []); setTotal(res.total); setPage(p); })
      .catch(e => message.error(String(e.message)))
      .finally(() => setLoading(false));
  }, [filters, message]);

  useEffect(() => { query(1); }, [query]);

  const exportCSV = () => {
    const f = filters();
    const qs = Object.entries(f).filter(([, v]) => v).map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&');
    message.success('按当前过滤条件导出 audit_logs.csv');
    window.open(`/api/v1/audit-logs/export${qs ? '?' + qs : ''}`);
  };

  return (
    <Card size="small">
      <Space style={{ marginBottom: 12 }} wrap>
        <Select value={module} onChange={setModule} style={{ width: 140 }} options={[
          { value: 'all', label: '模块：全部' }, ...MODULES.map(m => ({ value: m, label: `模块 ${m}` })),
        ]} />
        <LevelSelect value={level} onChange={setLevel} />
        <RangeSelect value={range} onChange={setRange} />
        <Input.Search placeholder="关键字 / TraceID" style={{ width: 240 }} allowClear
          value={kw} onChange={e => setKw(e.target.value)} onSearch={() => query(1)} />
        <Button type="primary" icon={<SearchOutlined />} loading={loading} onClick={() => query(1)}>查询</Button>
        <Button icon={<DownloadOutlined />} onClick={exportCSV}>导出 CSV</Button>
      </Space>
      <Table<AuditLog> rowKey="id" size="middle" loading={loading} dataSource={items}
        pagination={{ current: page, pageSize: PAGE_SIZE, total, showTotal: t => `共 ${t.toLocaleString()} 条`, onChange: p => query(p) }}
        columns={[
          { title: '时间', dataIndex: 'at', width: 165, render: (v: string) => <Text className="mono" style={{ fontSize: 12 }}>{v}</Text> },
          { title: '模块', dataIndex: 'module', width: 100, render: (v: string) => <Tag>{v}</Tag> },
          { title: '级别', dataIndex: 'level', width: 76, render: (v: string) => <Tag color={LEVEL_COLOR[v]}>{v}</Tag> },
          { title: '操作人', dataIndex: 'operator', width: 110 },
          { title: '内容', dataIndex: 'content' },
          { title: 'TraceID', dataIndex: 'traceId', width: 105, render: (v: string) => <Text className="mono" style={{ fontSize: 12 }}>{v}</Text> },
          { title: '操作', key: 'ops', width: 70, render: (_, r) => (
            <Button size="small" type="link" onClick={() => setDetail(r)}>详情</Button>) },
        ]} />
      <Modal title={`审计详情 · ${detail?.id ?? ''}`} open={!!detail} footer={null} onCancel={() => setDetail(null)}>
        {detail && (
          <Descriptions column={1} size="small" bordered style={{ marginTop: 8 }}>
            <Descriptions.Item label="时间"><span className="mono">{detail.at}</span></Descriptions.Item>
            <Descriptions.Item label="模块 / 级别">{detail.module} · <Tag color={LEVEL_COLOR[detail.level]}>{detail.level}</Tag></Descriptions.Item>
            <Descriptions.Item label="操作人">{detail.operator}</Descriptions.Item>
            <Descriptions.Item label="内容">{detail.content}</Descriptions.Item>
            <Descriptions.Item label="TraceID"><span className="mono">{detail.traceId}</span></Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </Card>
  );
}

/** ─── 系统日志面板 ─── */
function SystemPanel({ user }: { user: string }) {
  const { message } = App.useApp();
  const [level, setLevel] = useState('all');
  const [component, setComponent] = useState('all');
  const [range, setRange] = useState('all');
  const [kw, setKw] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [items, setItems] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<SystemLog | null>(null);

  const filters = useCallback(() => ({
    user,
    level: level === 'all' ? '' : level,
    component: component === 'all' ? '' : component,
    kw: kw.trim() || undefined,
    since: rangeSince(range) || undefined,
  }), [user, level, component, kw, range]);

  const query = useCallback((p = 1) => {
    setLoading(true);
    api.systemLogs({ ...filters(), limit: PAGE_SIZE, offset: (p - 1) * PAGE_SIZE })
      .then(res => { setItems(res.items ?? []); setTotal(res.total); setPage(p); })
      .catch(e => message.error(String(e.message)))
      .finally(() => setLoading(false));
  }, [filters, message]);

  useEffect(() => { query(1); }, [query]);

  const exportCSV = () => {
    const f = filters();
    const qs = Object.entries(f).filter(([, v]) => v).map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&');
    message.success('按当前过滤条件导出 system_logs.csv');
    window.open(`/api/v1/system-logs/export${qs ? '?' + qs : ''}`);
  };

  return (
    <Card size="small">
      <Space style={{ marginBottom: 12 }} wrap>
        <Select value={component} onChange={setComponent} style={{ width: 140 }} options={[
          { value: 'all', label: '组件：全部' }, ...COMPONENTS.map(c => ({ value: c, label: c })),
        ]} />
        <LevelSelect value={level} onChange={setLevel} />
        <RangeSelect value={range} onChange={setRange} />
        <Input.Search placeholder="关键字 / TraceID" style={{ width: 240 }} allowClear
          value={kw} onChange={e => setKw(e.target.value)} onSearch={() => query(1)} />
        <Button type="primary" icon={<SearchOutlined />} loading={loading} onClick={() => query(1)}>查询</Button>
        <Button icon={<DownloadOutlined />} onClick={exportCSV}>导出 CSV</Button>
      </Space>
      <Table<SystemLog> rowKey="id" size="middle" loading={loading} dataSource={items}
        pagination={{ current: page, pageSize: PAGE_SIZE, total, showTotal: t => `共 ${t.toLocaleString()} 条`, onChange: p => query(p) }}
        columns={[
          { title: '时间', dataIndex: 'at', width: 165, render: (v: string) => <Text className="mono" style={{ fontSize: 12 }}>{v}</Text> },
          { title: '组件', dataIndex: 'component', width: 110, render: (v: string) => <Tag color="geekblue">{v}</Tag> },
          { title: '级别', dataIndex: 'level', width: 76, render: (v: string) => <Tag color={LEVEL_COLOR[v]}>{v}</Tag> },
          { title: '内容', dataIndex: 'content' },
          { title: 'TraceID', dataIndex: 'traceId', width: 90, render: (v: string) => <Text className="mono" style={{ fontSize: 12 }}>{v || '—'}</Text> },
          { title: '操作', key: 'ops', width: 70, render: (_, r) => (
            <Button size="small" type="link" onClick={() => setDetail(r)}>详情</Button>) },
        ]} />
      <Modal title={`系统日志 · ${detail?.id ?? ''}`} open={!!detail} footer={null} onCancel={() => setDetail(null)}>
        {detail && (
          <Descriptions column={1} size="small" bordered style={{ marginTop: 8 }}>
            <Descriptions.Item label="时间"><span className="mono">{detail.at}</span></Descriptions.Item>
            <Descriptions.Item label="组件 / 级别"><Tag color="geekblue">{detail.component}</Tag> · <Tag color={LEVEL_COLOR[detail.level]}>{detail.level}</Tag></Descriptions.Item>
            <Descriptions.Item label="内容">{detail.content}</Descriptions.Item>
            <Descriptions.Item label="TraceID"><span className="mono">{detail.traceId || '—'}</span></Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </Card>
  );
}

function LevelSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onChange={onChange} style={{ width: 130 }} options={[
      { value: 'all', label: '级别：全部' },
      { value: 'INFO', label: 'INFO' }, { value: 'WARN', label: 'WARN' }, { value: 'ERROR', label: 'ERROR' },
    ]} />
  );
}

function RangeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onChange={onChange} style={{ width: 130 }} options={[
      { value: 'all', label: '时间：全部' },
      { value: 'today', label: '今天' }, { value: '3d', label: '近 3 天' }, { value: '7d', label: '近 7 天' },
    ]} />
  );
}
