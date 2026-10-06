import { useCallback, useEffect, useState } from 'react';
import {
  App, Button, Card, Descriptions, Input, Modal, Select, Space,
  Table, Tag, Typography,
} from 'antd';
import { DownloadOutlined, SearchOutlined } from '@ant-design/icons';
import { api, type AuditLog } from '../../api';

const { Title, Text } = Typography;

const LEVEL_COLOR: Record<string, string> = { INFO: 'blue', WARN: 'orange', ERROR: 'red' };
const MODULES = ['assets', 'knowledge', 'modeling', 'runtime', 'reasoning', 'sandbox', 'apps', 'governance', 'admin'];
const PAGE_SIZE = 20;

/** 快捷时间范围 → since 参数（日期或日期时间字符串） */
function rangeSince(key: string): string {
  const now = new Date();
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  if (key === 'today') return fmt(now);
  if (key === '3d') { now.setDate(now.getDate() - 2); return fmt(now); }
  if (key === '7d') { now.setDate(now.getDate() - 6); return fmt(now); }
  return '';
}

/** 日志查询：审计事件统一检索（服务端过滤分页）+ 详情 + CSV 导出 */
export default function Logs() {
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
    module: module === 'all' ? '' : module,
    level: level === 'all' ? '' : level,
    kw: kw.trim() || undefined,
    since: rangeSince(range) || undefined,
  }), [module, level, kw, range]);

  const query = useCallback((p = 1) => {
    setLoading(true);
    api.auditLogs({ ...filters(), limit: PAGE_SIZE, offset: (p - 1) * PAGE_SIZE })
      .then(res => { setItems(res.items ?? []); setTotal(res.total); setPage(p); })
      .catch(e => message.error(String(e.message)))
      .finally(() => setLoading(false));
  }, [filters, message]);

  useEffect(() => { query(1); }, [query]); // 过滤条件变化自动重查

  const exportCSV = () => {
    const f = filters();
    const qs = Object.entries(f).filter(([, v]) => v).map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&');
    message.success(`导出任务已开始：按当前过滤条件生成 audit_logs.csv`);
    window.open(`/api/v1/audit-logs/export${qs ? '?' + qs : ''}`);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>日志查询</Title>
          <Text type="secondary">平台运行日志与审计事件统一检索（全部 /api/v1 写操作自动留痕）</Text>
        </div>
        <div style={{ flex: 1 }} />
        <Button icon={<DownloadOutlined />} onClick={exportCSV}>导出 CSV</Button>
      </div>
      <Card>
        <Space style={{ marginBottom: 12 }} wrap>
          <Select value={module} onChange={setModule} style={{ width: 140 }} options={[
            { value: 'all', label: '模块：全部' },
            ...MODULES.map(m => ({ value: m, label: `模块 ${m}` })),
          ]} />
          <Select value={level} onChange={setLevel} style={{ width: 130 }} options={[
            { value: 'all', label: '级别：全部' },
            { value: 'INFO', label: 'INFO' }, { value: 'WARN', label: 'WARN' }, { value: 'ERROR', label: 'ERROR' },
          ]} />
          <Select value={range} onChange={setRange} style={{ width: 130 }} options={[
            { value: 'all', label: '时间：全部' },
            { value: 'today', label: '今天' }, { value: '3d', label: '近 3 天' }, { value: '7d', label: '近 7 天' },
          ]} />
          <Input.Search placeholder="关键字 / TraceID" style={{ width: 240 }} allowClear
            value={kw} onChange={e => setKw(e.target.value)} onSearch={() => query(1)} />
          <Button type="primary" icon={<SearchOutlined />} loading={loading} onClick={() => query(1)}>查询</Button>
        </Space>
        <Table<AuditLog>
          rowKey="id" size="middle" loading={loading} dataSource={items}
          pagination={{
            current: page, pageSize: PAGE_SIZE, total,
            showTotal: t => `共 ${t.toLocaleString()} 条`,
            onChange: p => query(p),
          }}
          columns={[
            { title: '时间', dataIndex: 'at', width: 165, render: (v: string) => <Text className="mono" style={{ fontSize: 12 }}>{v}</Text> },
            { title: '模块', dataIndex: 'module', width: 70, render: (v: string) => <Tag>{v}</Tag> },
            { title: '级别', dataIndex: 'level', width: 76, render: (v: string) => <Tag color={LEVEL_COLOR[v]}>{v}</Tag> },
            { title: '操作人', dataIndex: 'operator', width: 110 },
            { title: '内容', dataIndex: 'content' },
            { title: 'TraceID', dataIndex: 'traceId', width: 105, render: (v: string) => <Text className="mono" style={{ fontSize: 12 }}>{v}</Text> },
            { title: '操作', key: 'ops', width: 70, render: (_, r) => (
              <Button size="small" type="link" onClick={() => setDetail(r)}>详情</Button>
            ) },
          ]}
        />
      </Card>

      <Modal title={`日志详情 · ${detail?.id ?? ''}`} open={!!detail} footer={null}
        onCancel={() => setDetail(null)}>
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
    </div>
  );
}
