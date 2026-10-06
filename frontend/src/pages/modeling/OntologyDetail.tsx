import { useCallback, useEffect, useState } from 'react';
import {
  App, Button, Card, Descriptions, Modal, Popconfirm, Select, Space,
  Table, Tag, Timeline, Typography,
} from 'antd';
import { useSearchParams } from 'react-router-dom';
import { CloudUploadOutlined, DeleteOutlined } from '@ant-design/icons';
import { api, type GateCheck, type Member, type Ontology, type User, type Version } from '../../api';
import { useSession } from '../../session';

const { Title, Text } = Typography;

const ROLES = ['所有者', '建模者', '评审者', '查看者'];
/** 本体详情：成员与授权（真实 memberships）· 版本时间线 · 发布（门禁校验） */
export default function OntologyDetail() {
  const { message } = App.useApp();
  const { user } = useSession();
  const [params] = useSearchParams();
  const onto = params.get('onto') ?? 'scm';
  const [ontos, setOntos] = useState<Ontology[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [versions, setVersions] = useState<Version[]>([]);
  const [gate, setGate] = useState<GateCheck[] | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newUser, setNewUser] = useState('');
  const [newRole, setNewRole] = useState('查看者');

  const reload = useCallback(() => {
    api.ontologies(user).then(setOntos).catch(() => {});
    api.members(onto).then(setMembers).catch(() => {});
    api.users().then(setUsers).catch(() => {});
    api.versions(onto).then(setVersions).catch(() => {});
    api.releaseGate(onto).then(setGate).catch(() => {});
  }, [onto, user]);

  useEffect(() => { reload(); }, [reload]);

  const cur = ontos.find(o => o.id === onto);

  const setRole = async (m: Member, role: string) => {
    try {
      await api.setMember(onto, m.userId, role);
      message.success(`${m.name} → ${role}`);
      reload();
    } catch (e) { message.error(String((e as Error).message)); }
  };

  const addMember = async () => {
    if (!newUser) { message.warning('请选择用户'); return; }
    await setRole({ ontoId: onto, userId: newUser, name: newUser, role: newRole }, newRole);
    setAddOpen(false); setNewUser('');
  };

  const removeMember = async (m: Member) => {
    try {
      await api.removeMember(onto, m.userId);
      message.success(`已移除 ${m.name}`);
      reload();
    } catch (e) { message.error(String((e as Error).message)); }
  };

  const publish = async () => {
    try {
      const res = await api.publishOntology(onto, user);
      message.success(`已发布 ${res.version.v}（对象快照已入版本库）`);
      reload();
    } catch (e) {
      const msg = String((e as Error).message);
      message.error({ content: msg.includes('checks') ? '门禁未通过，详见下方检查项' : msg, duration: 4 });
      api.releaseGate(onto).then(setGate).catch(() => {});
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>本体详情 · {cur?.name ?? onto}</Title>
          <Text type="secondary">成员与授权 · 版本时间线 · 发布门禁（{cur?.version} {cur?.status === 'DRAFT' ? '草稿' : '已发布'}）</Text>
        </div>
        <div style={{ flex: 1 }} />
        <Popconfirm title={`发布 ${cur?.name ?? onto}？门禁全过才会执行。`} onConfirm={publish}>
          <Button type="primary" icon={<CloudUploadOutlined />}>发布新版本</Button>
        </Popconfirm>
      </div>

      <Card size="small" title="发布门禁（发布前确定性评估）" style={{ marginBottom: 12 }}>
        <Space size={12} wrap>
          {(gate ?? []).map(c => (
            <Tag key={c.key} color={c.passed ? 'green' : 'red'} style={{ padding: '4px 10px' }}>
              {c.passed ? '✓' : '✗'} {c.name}：{c.passed ? '通过' : c.reason}
            </Tag>
          ))}
          {gate === null && <Text type="secondary">评估中…</Text>}
        </Space>
      </Card>

      <div style={{ display: 'flex', gap: 12 }}>
        <Card size="small" title="成员与授权" style={{ flex: 1 }} extra={
          <Button size="small" onClick={() => setAddOpen(true)}>添加成员</Button>}>
          <Table<Member> size="small" rowKey="userId" pagination={false} dataSource={members}
            columns={[
              { title: '成员', dataIndex: 'name', render: (v: string, m) => <Space size={6}><b>{v}</b><Text type="secondary" className="mono" style={{ fontSize: 12 }}>{m.userId}</Text></Space> },
              { title: '角色', dataIndex: 'role', width: 140, render: (v: string, m) => (
                <Select size="small" value={v} style={{ width: 110 }}
                  options={ROLES.map(r => ({ value: r, label: r }))}
                  onChange={role => setRole(m, role)} />) },
              { title: '', key: 'op', width: 70, render: (_, m) => (
                <Popconfirm title={`移除 ${m.name}？`} onConfirm={() => removeMember(m)}>
                  <Button size="small" type="link" danger icon={<DeleteOutlined />} />
                </Popconfirm>) },
            ]} />
        </Card>

        <Card size="small" title="版本时间线" style={{ flex: 1 }}>
          <Timeline items={versions.map(v => ({
            color: v.status.includes('PUBLISHED') ? 'green' : v.status === 'RETRACTED' ? 'red' : 'blue',
            children: (
              <div>
                <Space size={6}><b className="mono">{v.v}</b><Tag>{v.status}</Tag></Space>
                <div style={{ fontSize: 12, color: '#6b7688' }}>{v.date} · {v.desc}</div>
              </div>
            ),
          }))} />
        </Card>
      </div>

      <Card size="small" title="概览" style={{ marginTop: 12 }}>
        {cur && (
          <Descriptions size="small" column={4}>
            <Descriptions.Item label="场景">{cur.scene}</Descriptions.Item>
            <Descriptions.Item label="对象/关系">{cur.objects} / {cur.edges}</Descriptions.Item>
            <Descriptions.Item label="成员数">{cur.members}</Descriptions.Item>
            <Descriptions.Item label="我的角色">{cur.myRole}</Descriptions.Item>
          </Descriptions>
        )}
      </Card>

      <Modal title="添加成员" open={addOpen} onOk={addMember} onCancel={() => setAddOpen(false)} okText="添加" cancelText="取消">
        <Space style={{ display: 'flex' }}>
          <Select showSearch optionFilterProp="label" style={{ width: 240 }} value={newUser || undefined}
            onChange={setNewUser} placeholder="选择用户"
            options={users.map(u => ({ value: u.account, label: `${u.name}（${u.account}）` }))} />
          <Select style={{ width: 120 }} value={newRole} onChange={setNewRole}
            options={ROLES.map(r => ({ value: r }))} />
        </Space>
      </Modal>
    </div>
  );
}
