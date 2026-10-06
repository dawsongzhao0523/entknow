import { useCallback, useEffect, useState } from 'react';
import {
  App, Button, Card, Descriptions, Modal, Popconfirm, Select, Space,
  Statistic, Table, Tag, Typography,
} from 'antd';
import { RollbackOutlined } from '@ant-design/icons';
import { api, type Ontology, type RetractReport, type Version } from '../../api';
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

  const reload = useCallback((id: string) => {
    api.versions(id).then(setVersions).catch(() => {});
  }, []);

  useEffect(() => {
    api.ontologies(user).then(setOntos).catch(() => {});
  }, [user]);
  useEffect(() => { reload(onto); }, [onto, reload]);

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

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>演化与撤回</Title>
          <Text type="secondary">已发布版本的撤回与受影响对账（对象/绑定/视图）；撤回写审计与通知</Text>
        </div>
        <div style={{ flex: 1 }} />
        <Select value={onto} onChange={setOnto} style={{ width: 220 }} variant="filled"
          options={ontos.map(o => ({ value: o.id, label: `${o.name}（${o.version}）` }))} />
      </div>

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
