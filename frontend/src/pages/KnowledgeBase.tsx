import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  App, Button, Card, Col, Drawer, Form, Input, Modal, Popconfirm, Row, Select,
  Space, Table, Tag, Tree, Typography,
} from 'antd';
import { DeleteOutlined, EditOutlined, FileTextOutlined, PlusOutlined, SendOutlined } from '@ant-design/icons';
import type { DataNode } from 'antd/es/tree';
import { api, type KbDomain, type KbEntry } from '../api';

const { Title, Text, Paragraph } = Typography;

const statusColor: Record<string, string> = { 已评审: 'green', 待评审: 'blue', 已失效: 'default' };
const SRC_COLOR: Record<string, string> = { 定时任务: 'blue', OneData: 'purple', 'CSV 导入': 'cyan', 手工: 'green' };
const ME = '张三';
const SOURCES = ['手工', 'CSV 导入', 'OneData', '定时任务'];

interface FormState {
  id?: string; title: string; domainId: string; source: string; onto: string;
  dataRef: string; flow: string; mode: string; roles: string; sops: string;
}

const emptyForm: FormState = { title: '', domainId: '', source: '手工', onto: '', dataRef: '', flow: '', mode: '', roles: '', sops: '' };

/** 知识库：领域树 + 知识条目 CRUD（乐观并发/软删除/发布均为真实写路径） */
export default function KnowledgeBase() {
  const { message } = App.useApp();
  const [domains, setDomains] = useState<KbDomain[]>([]);
  const [entries, setEntries] = useState<KbEntry[]>([]);
  const [domain, setDomain] = useState('');
  const [kw, setKw] = useState('');
  const [detail, setDetail] = useState<KbEntry | null>(null);
  const [editing, setEditing] = useState<KbEntry | null>(null);
  const [form] = Form.useForm<FormState>();
  const [open, setOpen] = useState(false);

  const reload = useCallback(() => {
    api.kbDomains().then(setDomains).catch(() => {});
    api.kbEntries(domain, kw).then(setEntries).catch(e => message.error(String((e as Error).message)));
  }, [domain, kw, message]);

  useEffect(() => { reload(); }, [reload]);

  // 领域树（顶级 → 子域），选中即过滤
  const treeData: DataNode[] = useMemo(() => {
    const roots = domains.filter(d => !d.parentId);
    const children = (pid: string) => domains.filter(d => d.parentId === pid).map(d => ({
      title: `${d.name} (${d.entryCount})`, key: d.id,
    }));
    return [
      { title: `全部领域 (${domains.reduce((s, d) => s + (d.parentId ? d.entryCount : 0), 0)})`, key: '' },
      ...roots.map(r => ({
        title: r.name, key: r.id,
        children: children(r.id).length ? children(r.id) : undefined,
      })),
    ];
  }, [domains]);

  const openCreate = () => { setEditing(null); form.resetFields(); setOpen(true); };
  const openEdit = async (e: KbEntry) => {
    const full = await api.kbEntry(e.id);
    setEditing(full);
    form.setFieldsValue({
      title: full.title, domainId: full.domainId, source: full.source, onto: full.onto ?? '',
      dataRef: full.dataRef ?? '', flow: full.flow ?? '', mode: full.mode ?? '',
      roles: (full.roles ?? []).join('\n'), sops: (full.sops ?? []).join('\n'),
    });
    setOpen(true);
  };

  const save = async () => {
    const v = await form.validateFields();
    const payload = {
      title: v.title.trim(), domainId: v.domainId, source: v.source, onto: v.onto ?? '',
      dataRef: v.dataRef ?? '', flow: v.flow ?? '', mode: v.mode ?? '',
      roles: (v.roles ?? '').split('\n').map(s => s.trim()).filter(Boolean),
      sops: (v.sops ?? '').split('\n').map(s => s.trim()).filter(Boolean),
      terms: editing?.terms ?? [], status: editing?.status ?? '待评审',
      updatedBy: ME,
    };
    try {
      if (editing) {
        const out = await api.updateKbEntry(editing.id, { ...payload, id: editing.id, expectedVersion: editing.version });
        message.success(`已保存（版本 v${out.version}）`);
      } else {
        const id = `kb-${Date.now().toString(36)}`;
        await api.createKbEntry({ ...payload, id });
        message.success(`知识条目已创建：${id}`);
      }
      setOpen(false);
      reload();
    } catch (e) {
      message.error(String((e as Error).message)); // 版本冲突 409 文案直达
    }
  };

  const publish = async (e: KbEntry) => {
    try {
      const out = await api.updateKbEntry(e.id, {
        ...e, status: '已评审', expectedVersion: e.version, updatedBy: ME,
      });
      message.success(`「${e.title}」已发布（v${out.version}）`);
      reload();
    } catch (err) {
      message.error(String((err as Error).message));
    }
  };

  const remove = async (e: KbEntry) => {
    try {
      await api.deleteKbEntry(e.id);
      message.success(`「${e.title}」已失效（软删除，记录保留可追溯）`);
      reload();
    } catch (err) {
      message.error(String((err as Error).message));
    }
  };

  return (
    <div>
      <Title level={4}>知识库</Title>
      <Text type="secondary">按业务领域组织的知识条目：业务模式 / 术语 / SOP（真实写路径：幂等创建 · 乐观并发 · 软删除）</Text>
      <Row gutter={12} style={{ marginTop: 12 }}>
        <Col span={6}>
          <Card size="small" title="领域目录">
            <Tree defaultExpandAll selectedKeys={[domain]}
              onSelect={keys => setDomain(String(keys[0] ?? ''))} treeData={treeData} />
          </Card>
        </Col>
        <Col span={18}>
          <Card size="small"
            title={`知识条目（${entries.length}）`}
            extra={<Space>
              <Input.Search placeholder="搜索标题 / 术语" allowClear style={{ width: 200 }}
                onSearch={v => setKw(v)} />
              <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新建条目</Button>
            </Space>}>
            <Table<KbEntry> size="small" rowKey="id" pagination={false} dataSource={entries}
              onRow={e => ({ onClick: () => setDetail(e), style: { cursor: 'pointer' } })}
              columns={[
                { title: '条目', dataIndex: 'title', render: (v: string, r) => (
                  <Space size={6}><FileTextOutlined style={{ color: '#059669' }} />
                    <span><b>{v}</b>{r.onto && <Tag style={{ marginInlineStart: 6 }}>{r.onto}</Tag>}</span></Space>
                ) },
                { title: '来源', dataIndex: 'source', width: 92,
                  render: (v: string) => <Tag color={SRC_COLOR[v]}>{v}</Tag> },
                { title: '状态', dataIndex: 'status', width: 84,
                  render: (v: string) => <Tag color={statusColor[v]}>{v}</Tag> },
                { title: '版本', dataIndex: 'version', width: 64, render: (v: number) => `v${v}` },
                { title: '最近更新', key: 'u', width: 170,
                  render: (_, r) => <Text type="secondary" style={{ fontSize: 12 }}>{r.updatedBy} · {r.updatedAt}</Text> },
                { title: '操作', key: 'op', width: 200, render: (_, e) => (
                  <Space size={0} onClick={ev => ev.stopPropagation()}>
                    {e.status === '待评审' && (
                      <Button size="small" type="link" icon={<SendOutlined />} onClick={() => publish(e)}>发布</Button>
                    )}
                    <Button size="small" type="link" icon={<EditOutlined />} onClick={() => openEdit(e)}>编辑</Button>
                    <Popconfirm title={`删除「${e.title}」？（软删除，可追溯）`} onConfirm={() => remove(e)}>
                      <Button size="small" type="link" danger icon={<DeleteOutlined />}>删除</Button>
                    </Popconfirm>
                  </Space>
                ) },
              ]} />
          </Card>
        </Col>
      </Row>

      <Drawer title={detail?.title} width={560} open={!!detail} onClose={() => setDetail(null)}>
        {detail && <>
          <Space wrap size={6} style={{ marginBottom: 12 }}>
            <Tag color={statusColor[detail.status]}>{detail.status}</Tag>
            <Tag color={SRC_COLOR[detail.source]}>{detail.source}</Tag>
            {detail.onto && <Tag>本体 {detail.onto}</Tag>}
            <Tag>v{detail.version}</Tag>
          </Space>
          <Paragraph style={{ whiteSpace: 'pre-wrap', background: '#f8fbfa', padding: 12, borderRadius: 8 }}>
            {detail.mode || '（暂无业务模式描述）'}
          </Paragraph>
          {detail.flow && <Paragraph type="secondary">流程：{detail.flow} · 数据：{detail.dataRef || '—'}</Paragraph>}
          {detail.roles?.length > 0 && (
            <Card size="small" title="角色分工" style={{ marginBottom: 12 }}>
              {detail.roles.map(r => <div key={r}>· {r}</div>)}
            </Card>
          )}
          {detail.terms?.length > 0 && (
            <Card size="small" title={`术语表（${detail.terms.length}）`} style={{ marginBottom: 12 }}>
              <Table size="small" rowKey="term" pagination={false} dataSource={detail.terms}
                columns={[
                  { title: '术语', dataIndex: 'term', render: (v: string) => <b>{v}</b> },
                  { title: '英文/字段', dataIndex: 'en', render: (v: string) => <Text code>{v}</Text> },
                  { title: '定义', dataIndex: 'def' },
                  { title: '来源', dataIndex: 'source', width: 90,
                    render: (v: string) => <Tag color={SRC_COLOR[v] ?? 'default'}>{v}</Tag> },
                ]} />
            </Card>
          )}
          {detail.sops?.length > 0 && (
            <Card size="small" title="SOP 规则">
              {detail.sops.map(s => <div key={s}>· {s}</div>)}
            </Card>
          )}
        </>}
      </Drawer>

      <Modal title={editing ? `编辑：${editing.title}` : '新建知识条目'} open={open} onOk={save}
        onCancel={() => setOpen(false)} okText="保存" cancelText="取消" width={640}>
        <Form form={form} layout="vertical" initialValues={emptyForm}>
          <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder="如：采购订单" />
          </Form.Item>
          <Space style={{ display: 'flex' }} size={12}>
            <Form.Item name="domainId" label="所属领域" rules={[{ required: true, message: '请选择领域' }]} style={{ width: 200 }}>
              <Select options={domains.filter(d => d.parentId).map(d => ({ value: d.id, label: d.name }))} />
            </Form.Item>
            <Form.Item name="source" label="来源" style={{ width: 140 }}>
              <Select options={SOURCES.map(v => ({ value: v, label: v }))} />
            </Form.Item>
            <Form.Item name="onto" label="关联本体对象" style={{ width: 180 }}>
              <Input placeholder="如 PO" />
            </Form.Item>
          </Space>
          <Form.Item name="mode" label="业务模式（Markdown）">
            <Input.TextArea rows={5} placeholder="## 业务模式 …" />
          </Form.Item>
          <Form.Item name="roles" label="角色分工（每行一条）">
            <Input.TextArea rows={3} placeholder={'采购员（创建）\n采购主管（审批）'} />
          </Form.Item>
          <Form.Item name="sops" label="SOP 规则（每行一条）">
            <Input.TextArea rows={3} placeholder={'金额 > 5 万 → 财务复核'} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
