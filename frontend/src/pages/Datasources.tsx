import { useEffect, useState } from 'react';
import { Card, Table, Tag, Typography } from 'antd';
import { api, type Datasource } from '../api';

const { Title, Text } = Typography;

const statusColor: Record<string, string> = { 正常: 'green', 异常: 'red', 停用: 'default' };
const modeText: Record<string, string> = { NONE: '不更新', CRON: '定时', CDC: 'CDC', EVENT: '事件' };

export default function Datasources() {
  const [dss, setDss] = useState<Datasource[]>([]);
  const [err, setErr] = useState('');
  useEffect(() => { api.datasources().then(setDss).catch(e => setErr(String(e.message ?? e))); }, []);

  return (
    <div>
      <Title level={4}>数据源中心</Title>
      <Text type="secondary">已注册的业务数据连接与同步策略（GET /api/v1/datasources）</Text>
      {err && <Card style={{ marginTop: 12 }}>API 异常：{err}</Card>}
      <Card size="small" style={{ marginTop: 12 }}>
        <Table<Datasource> size="small" rowKey="id" pagination={false} dataSource={dss}
          columns={[
            { title: '数据源', dataIndex: 'name', render: (v: string) => <b>{v}</b> },
            { title: '类型', dataIndex: 'type', width: 110 },
            { title: '形态', dataIndex: 'kind', width: 80 },
            { title: '连接', dataIndex: 'host', render: (v?: string) => <Text code style={{ fontSize: 12 }}>{v || '—'}</Text> },
            { title: '状态', dataIndex: 'status', width: 70, render: (v: string) => <Tag color={statusColor[v]}>{v}</Tag> },
            { title: '同步', dataIndex: 'mode', width: 70, render: (v: string) => modeText[v] },
            { title: '表数', dataIndex: 'tables', width: 60, align: 'center', render: (v?: number) => v ?? '—' },
            { title: '敏感级', dataIndex: 'sensitive', width: 70, align: 'center' },
            { title: '负责人', dataIndex: 'owner', width: 70 },
            { title: '最近同步', dataIndex: 'lastSync', width: 130 },
          ]} />
      </Card>
    </div>
  );
}
