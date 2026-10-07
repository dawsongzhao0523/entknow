import { useCallback, useEffect, useState } from 'react';
import {
  App, Button, Card, Descriptions, Input, Menu, Modal, Popconfirm, Select, Space,
  Table, Tag, Timeline, Typography,
} from 'antd';
import { useSearchParams } from 'react-router-dom';
import { CloudUploadOutlined, DeleteOutlined, FileTextOutlined } from '@ant-design/icons';
import {
  api, type Edge, type Func, type GateCheck, type Member, type OntoObject,
  type Ontology, type User, type Version,
} from '../../api';
import { useSession } from '../../session';
import ElementCreate, { type ElementType } from './ElementCreate';

const { Title, Text } = Typography;
const { TextArea } = Input;

const ROLES = ['所有者', '建模者', '评审者', '查看者'];
type SecKey = 'overview' | 'objects' | 'edges' | 'funcs' | 'versions' | 'members';
const SEC_LABEL: Record<SecKey, string> = {
  overview: '概览', objects: '对象', edges: '关系', funcs: '函数',
  versions: '版本', members: '成员与授权',
};

/** 本体详情：六 section（概览/对象/关系/函数/版本[含导出]/成员），对齐原型信息架构 */
export default function OntologyDetail() {
  const { message } = App.useApp();
  const { user } = useSession();
  const [params, setParams] = useSearchParams();
  const { onto: globalOnto } = useSession();
  const onto = params.get('onto') ?? globalOnto ?? 'scm';
  const sec = (params.get('sec') as SecKey) ?? 'overview';
  const setSec = (k: SecKey) => setParams({ onto, sec: k }, { replace: true });

  const [ontos, setOntos] = useState<Ontology[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [versions, setVersions] = useState<Version[]>([]);
  const [gate, setGate] = useState<GateCheck[] | null>(null);
  const [objects, setObjects] = useState<OntoObject[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [funcs, setFuncs] = useState<Func[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [createType, setCreateType] = useState<ElementType | null>(null);
  const [newUser, setNewUser] = useState('');
  const [newRole, setNewRole] = useState('查看者');
  const [exportFmt, setExportFmt] = useState<'owl' | 'rdf'>('owl');
  const [exportText, setExportText] = useState('');

  const reload = useCallback(() => {
    api.ontologies(user).then(setOntos).catch(() => {});
    api.members(onto).then(setMembers).catch(() => {});
    api.users().then(setUsers).catch(() => {});
    api.versions(onto).then(setVersions).catch(() => {});
    api.releaseGate(onto).then(setGate).catch(() => {});
    api.objects().then(setObjects).catch(() => {});
    api.edges().then(setEdges).catch(() => {});
    api.functions().then(setFuncs).catch(() => {});
  }, [onto, user]);

  useEffect(() => { reload(); }, [reload]);

  const cur = ontos.find(o => o.id === onto);
  const ontoName = cur?.name ?? onto;
  const myObjects = objects.filter(o => o.ontology === ontoName);
  const myEdges = edges; // edges 全局，通过 from/to 关联对象
  const myFuncs = funcs;

  const setRole = async (m: Member, role: string) => {
    try {
      await api.setMember(onto, m.userId, role);
      message.success(`${m.name} → ${role}`);
      reload();
    } catch (e) { message.error(String((e as Error).message)); }
  };

  const publish = async () => {
    try {
      const res = await api.publishOntology(onto, user);
      message.success(`已发布 ${res.version.v}`);
      reload();
    } catch (e) {
      message.error(String((e as Error).message));
      api.releaseGate(onto).then(setGate).catch(() => {});
    }
  };

  const doExport = async () => {
    try {
      const text = await api.exportOntology(onto, exportFmt);
      setExportText(text);
      message.success(`已导出 ${exportFmt === 'owl' ? 'OWL Turtle' : 'RDF NTriples'}`);
    } catch (e) { message.error(String((e as Error).message)); }
  };

  const statusColor = (s: string) =>
    s === 'PUBLISHED' ? 'green' : s === 'IN_REVIEW' ? 'orange' : s === 'DEPRECATED' ? 'red' : 'default';

  // ─── Section 渲染 ───
  const overview = cur && (
    <>
      <Card size="small" title="发布门禁" style={{ marginBottom: 12 }}>
        <Space size={12} wrap>
          {(gate ?? []).map(c => (
            <Tag key={c.key} color={c.passed ? 'green' : 'red'} style={{ padding: '4px 10px' }}>
              {c.passed ? '✓' : '✗'} {c.name}：{c.passed ? '通过' : c.reason}
            </Tag>
          ))}
        </Space>
      </Card>
      <Card size="small" title="基本信息">
        <Descriptions column={3} size="small">
          <Descriptions.Item label="中文名">{cur.name}</Descriptions.Item>
          <Descriptions.Item label="业务场景">{cur.scene}</Descriptions.Item>
          <Descriptions.Item label="状态">
            <Tag color={cur.status === 'DRAFT' ? 'default' : 'green'}>{cur.status === 'DRAFT' ? '构建中' : '生产中'}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="当前版本">{cur.version}</Descriptions.Item>
          <Descriptions.Item label="负责人">{cur.owner}</Descriptions.Item>
          <Descriptions.Item label="成员">{cur.members} 人</Descriptions.Item>
          <Descriptions.Item label="对象/关系">{cur.objects} / {cur.edges}</Descriptions.Item>
          <Descriptions.Item label="创建">{cur.created}</Descriptions.Item>
          <Descriptions.Item label="我的角色"><Tag>{cur.myRole}</Tag></Descriptions.Item>
        </Descriptions>
      </Card>
    </>
  );

  const objectsSec = (
    <Card size="small" extra={<Space>
      <Button size="small" type="primary" onClick={() => setCreateType('object')}>新建对象</Button>
      <Popconfirm title={`发布新版本？`} onConfirm={publish}>
        <Button icon={<CloudUploadOutlined />}>发布</Button>
      </Popconfirm>
    </Space>}>
      <Table<OntoObject> size="small" rowKey="id" pagination={false} dataSource={myObjects}
        columns={[
          { title: '对象', dataIndex: 'name', render: (v: string, o) => (
            <Space size={6}><b>{v}</b><Text type="secondary" className="mono" style={{ fontSize: 11 }}>{o.en}</Text></Space>) },
          { title: '类型', dataIndex: 'kind', width: 90, render: (v: string) => <Tag>{v}</Tag> },
          { title: '版本', dataIndex: 'version', width: 70 },
          { title: '状态', dataIndex: 'status', width: 90, render: (v: string) => <Tag color={statusColor(v)}>{v}</Tag> },
          { title: '引用', dataIndex: 'refCount', width: 60, align: 'center' },
          { title: '负责人', dataIndex: 'owner', width: 80 },
          { title: '数据映射', dataIndex: 'mapping', ellipsis: true },
        ]} />
    </Card>
  );

  const edgesSec = (
    <Card size="small" extra={<Button size="small" onClick={() => setCreateType('edge')}>新建关系</Button>}>
      <Table<Edge> size="small" rowKey="id" pagination={false} dataSource={myEdges}
        columns={[
          { title: '关系', dataIndex: 'name', render: (v: string) => <b>{v}</b> },
          { title: 'from → to', key: 'ft', render: (_, e) => (
            <span className="mono" style={{ fontSize: 12 }}>
              {objects.find(o => o.id === e.from)?.name ?? e.from} → {objects.find(o => o.id === e.to)?.name ?? e.to}
            </span>) },
          { title: '版本', dataIndex: 'version', width: 70 },
          { title: '状态', dataIndex: 'status', width: 90, render: (v: string) => <Tag color={statusColor(v)}>{v}</Tag> },
          { title: '引用', dataIndex: 'refCount', width: 60, align: 'center' },
          { title: '边属性', key: 'props', render: (_, e) => (
            <Space size={4}>{(e.props ?? []).map(p => <Tag key={p.name}>{p.name}</Tag>)}</Space>) },
        ]} />
    </Card>
  );

  const funcsSec = (
    <Card size="small" extra={<Button size="small" onClick={() => setCreateType('function')}>新建函数</Button>}>
      <Table<Func> size="small" rowKey="id" pagination={false} dataSource={myFuncs}
        columns={[
          { title: '函数', dataIndex: 'name', render: (v: string) => <b>{v}</b> },
          { title: '类型', dataIndex: 'cat', width: 70, render: (v: string) => (
            <Tag color={v === '指标' ? 'blue' : v === '行动' ? 'green' : v === '权限' ? 'orange' : 'default'}>{v}</Tag>) },
          { title: '版本', dataIndex: 'version', width: 70 },
          { title: '状态', dataIndex: 'status', width: 90, render: (v: string) => <Tag color={statusColor(v)}>{v}</Tag> },
          { title: '签名', dataIndex: 'signature', render: (v: string) => <Text className="mono" style={{ fontSize: 12 }}>{v || '—'}</Text> },
          { title: '测试', dataIndex: 'tests', width: 70 },
        ]} />
    </Card>
  );

  const versionsSec = (
    <div style={{ display: 'flex', gap: 12 }}>
      <Card size="small" title="版本历史" style={{ flex: 1 }}>
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
      <Card size="small" title="标准互操作（OWL / RDF 导出）" style={{ flex: 1 }}
        extra={(
          <Space>
            <Select size="small" style={{ width: 110 }} value={exportFmt} onChange={setExportFmt}
              options={[{ value: 'owl' as const }, { value: 'rdf' as const }].map(v => ({ value: v.value, label: v.value === 'owl' ? 'OWL Turtle' : 'RDF NTriples' }))} />
            <Button size="small" type="primary" icon={<FileTextOutlined />} onClick={doExport}>导出</Button>
          </Space>
        )}>
        <TextArea readOnly rows={12} className="mono" style={{ fontSize: 12 }} value={exportText}
          placeholder="点击导出生成本体 OWL/RDF 文本…" />
        {exportText && <Button size="small" style={{ marginTop: 8 }} onClick={async () => {
          await navigator.clipboard.writeText(exportText); message.success('已复制');
        }}>复制全文</Button>}
      </Card>
    </div>
  );

  const membersSec = (
    <Card size="small" title="成员与授权" extra={<Button size="small" onClick={() => setAddOpen(true)}>添加成员</Button>}>
      <Table<Member> size="small" rowKey="userId" pagination={false} dataSource={members}
        columns={[
          { title: '成员', dataIndex: 'name', render: (v: string, m) => (
            <Space size={6}><b>{v}</b><Text type="secondary" className="mono" style={{ fontSize: 11 }}>{m.userId}</Text></Space>) },
          { title: '角色', dataIndex: 'role', width: 140, render: (v: string, m) => (
            <Select size="small" value={v} style={{ width: 110 }}
              options={ROLES.map(r => ({ value: r }))}
              onChange={role => setRole(m, role)} />) },
          { title: '', key: 'op', width: 60, render: (_, m) => (
            <Popconfirm title={`移除 ${m.name}？`} onConfirm={async () => {
              try { await api.removeMember(onto, m.userId); message.success('已移除'); reload(); }
              catch (e) { message.error(String((e as Error).message)); }
            }}>
              <Button size="small" type="link" danger icon={<DeleteOutlined />} />
            </Popconfirm>) },
        ]} />
    </Card>
  );

  const sections: Record<SecKey, React.ReactNode> = {
    overview, objects: objectsSec, edges: edgesSec, funcs: funcsSec,
    versions: versionsSec, members: membersSec,
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>本体详情 · {ontoName}</Title>
          <Text type="secondary">{cur?.scene} · {cur?.version} {cur?.status === 'DRAFT' ? '构建中' : '生产中'}</Text>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <Menu mode="inline" selectedKeys={[sec]} style={{ width: 160, flexShrink: 0 }}
          items={(Object.keys(SEC_LABEL) as SecKey[]).map(k => ({ key: k, label: SEC_LABEL[k] }))}
          onClick={({ key }) => setSec(key as SecKey)} />
        <div style={{ flex: 1, minWidth: 0 }}>{sections[sec]}</div>
      </div>

      <Modal title="添加成员" open={addOpen} onOk={async () => {
        if (!newUser) { message.warning('请选择用户'); return; }
        await setRole({ ontoId: onto, userId: newUser, name: newUser, role: newRole }, newRole);
        setAddOpen(false); setNewUser('');
      }} onCancel={() => setAddOpen(false)} okText="添加" cancelText="取消">
        <Space style={{ display: 'flex' }}>
          <Select showSearch optionFilterProp="label" style={{ width: 240 }} value={newUser || undefined}
            onChange={setNewUser} placeholder="选择用户"
            options={users.map(u => ({ value: u.account, label: `${u.name}（${u.account}）` }))} />
          <Select style={{ width: 120 }} value={newRole} onChange={setNewRole} options={ROLES.map(r => ({ value: r }))} />
        </Space>
      </Modal>

      <ElementCreate
        type={createType ?? 'object'}
        open={!!createType}
        onClose={() => setCreateType(null)}
        onCreated={reload}
        ontology={ontoName}
        objects={myObjects.map(o => ({ id: o.id, name: o.name }))}
      />
    </div>
  );
}
