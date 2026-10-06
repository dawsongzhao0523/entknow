import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Table, Tag, Typography } from 'antd';
import { api, type Ontology, type Version } from '../api';

const { Title, Text } = Typography;

const statusColor: Record<string, string> = { PUBLISHED: 'green', DRAFT: 'default', IN_REVIEW: 'orange' };
const roleColor: Record<string, string> = { 所有者: 'gold', 建模者: 'blue', 评审者: 'purple', 查看者: 'default' };

export default function Ontologies() {
  const nav = useNavigate();
  const [ontos, setOntos] = useState<Ontology[]>([]);
  const [versions, setVersions] = useState<Version[]>([]);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.ontologies().then(setOntos).catch(e => setErr(String(e.message ?? e)));
    api.versions('scm').then(setVersions).catch(() => setVersions([]));
  }, []);

  return (
    <div>
      <Title level={4}>本体管理</Title>
      <Text type="secondary">本体的创建、授权与生命周期（数据：GET /api/v1/ontologies）</Text>
      {err && <Card style={{ marginTop: 12 }}>API 异常：{err}</Card>}
      <Card size="small" style={{ marginTop: 12 }}>
        <Table<Ontology> size="small" rowKey="id" pagination={false} dataSource={ontos}
          columns={[
            { title: '本体', dataIndex: 'name', render: (v: string, r) => <a onClick={() => nav(`/modeling/ontology/detail?onto=${r.id}`)}><b>{v}</b></a> },
            { title: '场景', dataIndex: 'scene' },
            { title: '版本', dataIndex: 'version', width: 70 },
            { title: '状态', dataIndex: 'status', width: 90,
              render: (v: string) => <Tag color={statusColor[v]}>{v === 'DRAFT' ? '草稿' : v === 'PUBLISHED' ? '已发布' : v}</Tag> },
            { title: '我的角色', dataIndex: 'myRole', width: 90, render: (v: string) => <Tag color={roleColor[v]}>{v}</Tag> },
            { title: '所有者', dataIndex: 'owner', width: 80 },
            { title: '成员', dataIndex: 'members', width: 60, align: 'center' },
            { title: '对象/关系', key: 'cnt', width: 90, align: 'center',
              render: (_, r) => <span>{r.objects} / {r.edges}</span> },
            { title: '创建', dataIndex: 'created', width: 100 },
          ]} />
      </Card>
      <Card size="small" title="供应链本体 · 版本历史（GET /api/v1/versions）" style={{ marginTop: 12 }}>
        <Table<Version> size="small" rowKey="v" pagination={false} dataSource={versions}
          columns={[
            { title: '版本', dataIndex: 'v', width: 70, render: (v: string) => <b>{v}</b> },
            { title: '日期', dataIndex: 'date', width: 90 },
            { title: '说明', dataIndex: 'desc' },
            { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v.startsWith('PUBLISHED') ? 'green' : 'default'}>{v}</Tag> },
          ]} />
      </Card>
    </div>
  );
}
