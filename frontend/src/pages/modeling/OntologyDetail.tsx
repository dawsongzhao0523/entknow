import { useCallback, useEffect, useState } from 'react';
import {
  App, Alert, Button, Card, Descriptions, Input, Menu, Modal, Popconfirm, Select, Space, Upload,
  Table, Tag, Timeline, Typography,
} from 'antd';
import { useSearchParams } from 'react-router-dom';
import { CloudUploadOutlined, DeleteOutlined, FileTextOutlined, UploadOutlined } from '@ant-design/icons';
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
  const [importPreview, setImportPreview] = useState<{objects: {en: string; label: string; kind: string; props: {name: string; type: string}[] | null}[]; edges: {name: string; label: string; from: string; to: string}[]; stats: Record<string, number>} | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
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
      <Card size="small" style={{ marginBottom: 12 }} extra={
        <Upload accept=".owl,.rdf,.ttl" showUploadList={false} beforeUpload={async (file) => {
          const formData = new FormData();
          formData.append('file', file);
          try {
            const res = await fetch(`/api/v1/ontologies/${onto}/import/preview`, { method: 'POST', body: formData });
            if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? '解析失败');
            setImportPreview(await res.json());
            setImportOpen(true);
          } catch (e) { message.error(String((e as Error).message)); }
          return false; // 阻止自动上传
        }}>
          <Button icon={<UploadOutlined />}>导入 OWL/RDF 文件</Button>
        </Upload>
      }>
        <Alert type="info" showIcon message="支持导入 Protégé 等工具构建的 OWL/RDF 本体文件（.owl / .rdf / .ttl），解析后预览并确认导入。" />
      </Card>
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
    <Card size="small" extra={<Button size="small" type="primary" onClick={() => setCreateType('edge')}>新建关系</Button>}>
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
    <Card size="small" extra={<Button size="small" type="primary" onClick={() => setCreateType('function')}>新建函数</Button>}>
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

      <Modal title="导入预览" open={importOpen} width={680} onCancel={() => setImportOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setImportOpen(false)}>取消</Button>,
          <Button key="confirm" type="primary" loading={importing} onClick={async () => {
            if (!importPreview) return;
            setImporting(true);
            try {
              const res = await fetch(`/api/v1/ontologies/${onto}/import/confirm?owner=${encodeURIComponent(user)}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(importPreview),
              });
              if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? '导入失败');
              const created = await res.json();
              message.success(`导入完成：${created.objects} 个对象 · ${created.edges} 个关系（幂等，重复导入不产生重复数据）`);
              setImportOpen(false);
              reload();
            } catch (e) { message.error(String((e as Error).message)); }
            finally { setImporting(false); }
          }}>确认导入</Button>,
        ]}>
        {importPreview && (
          <>
            <Space size={16} style={{ marginBottom: 12 }}>
              <Tag color="blue">{importPreview.stats.objects} 个对象</Tag>
              <Tag color="green">{importPreview.stats.edges} 个关系</Tag>
              <Tag color="orange">{importPreview.stats.props || 0} 个属性</Tag>
            </Space>
            {importPreview.objects.length > 0 && (
              <>
                <Text strong>对象</Text>
                <Table size="small" rowKey="en" pagination={false} style={{ marginBottom: 12 }}
                  dataSource={importPreview.objects}
                  columns={[
                    { title: '英文名', dataIndex: 'en', render: (v: string) => <span className="mono">{v}</span> },
                    { title: '中文名', dataIndex: 'label' },
                    { title: '类型', dataIndex: 'kind', width: 90, render: (v: string) => <Tag>{v}</Tag> },
                    { title: '属性数', key: 'props', width: 70, render: (_, r: { props: unknown[] | null }) => (r.props?.length ?? 0) },
                  ]} />
              </>
            )}
            {importPreview.edges.length > 0 && (
              <>
                <Text strong>关系</Text>
                <Table size="small" rowKey="name" pagination={false}
                  dataSource={importPreview.edges}
                  columns={[
                    { title: '关系名', dataIndex: 'name', render: (v: string) => <span className="mono">{v}</span> },
                    { title: '标签', dataIndex: 'label' },
                    { title: '起点 → 终点', key: 'ft', render: (_, r: { from: string; to: string }) => `${r.from} → ${r.to}` },
                  ]} />
              </>
            )}
          </>
        )}
      </Modal>

      <ElementCreate
        type={createType ?? 'object'}
        open={!!createType}
        onClose={() => setCreateType(null)}
        onCreated={reload}
        ontology={ontoName}
        objects={objects.map(o => ({ id: o.id, name: o.name }))}
      />
    </div>
  );
}
