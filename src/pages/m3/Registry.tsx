import { useMemo, useState } from 'react';
import { Alert, Button, Card, Descriptions, Drawer, Form, Input, Select, Space, Table, Tabs, Tag, Tree, Typography, message } from 'antd';
import { PlayCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { EDGES, FUNCS, OBJECTS, REGISTRY_OBJECTS, REGISTRY_TREE, filterRegistry, fmtStatus, type OntoEdge, type OntoFunc, type RegistryObject } from '../../mock/data';

const { Title, Text } = Typography;

type PropRow = { name: string; type: string; comment: string };

/** 按字段类型生成样例值（数据预览 mock） */
const sampleVal = (t: string, i: number): string =>
  t === 'string' ? ['S-0012 华兴电子', 'S-0031 翔宇科技', 'RCBJ-YK', 'M-100233', 'C-2046 格力'][i % 5]
    : t === 'int' ? String(120 + i * 37)
    : t === 'decimal' ? (97.6 - i * 1.31).toFixed(2)
    : t === 'datetime' ? `2026-10-0${(i % 3) + 1} 10:2${i}`
    : t === 'bool' ? (i % 2 ? '是' : '否')
    : t === 'enum' ? ['已发货', '已下达', '已收货'][i % 3]
    : '—';

const previewRows = (props: PropRow[]) =>
  Array.from({ length: 5 }, (_, i) => Object.fromEntries(props.map(p => [p.name, sampleVal(p.type, i)])));

/** 属性编辑表（对象/关系编辑器共用） */
function PropsEditor({ rows, setRows }: { rows: PropRow[]; setRows: (r: PropRow[]) => void }) {
  const set = (i: number, key: keyof PropRow, v: string) => setRows(rows.map((x, j) => j === i ? { ...x, [key]: v } : x));
  return (
    <Table size="small" rowKey={(_, i) => String(i)} pagination={false}
      columns={[
        { title: '字段', dataIndex: 'name', render: (v: string, _: PropRow, i: number) => <Input size="small" value={v} onChange={e => set(i, 'name', e.target.value)} /> },
        { title: '类型', dataIndex: 'type', width: 110, render: (v: string, _: PropRow, i: number) => (
          <Select size="small" value={v} style={{ width: 96 }} onChange={nv => set(i, 'type', nv)}
            options={['string', 'int', 'decimal', 'datetime', 'bool', 'enum'].map(t => ({ value: t, label: t }))} />
        ) },
        { title: '备注', dataIndex: 'comment', render: (v: string, _: PropRow, i: number) => <Input size="small" value={v} onChange={e => set(i, 'comment', e.target.value)} /> },
        { title: '', width: 50, render: (_: unknown, __: PropRow, i: number) => (
          <Button size="small" type="link" danger onClick={() => setRows(rows.filter((_, x) => x !== i))}>删</Button>
        ) },
      ]}
      dataSource={rows}
      footer={() => <Button size="small" type="dashed" onClick={() => setRows([...rows, { name: `field_${rows.length + 1}`, type: 'string', comment: '' }])}>+ 添加属性</Button>}
    />
  );
}

/** 对象编辑抽屉 */
function ObjectEditor({ obj, onClose }: { obj: RegistryObject; onClose: () => void }) {
  const [props, setProps] = useState<PropRow[]>(obj.props);
  return (
    <Drawer title={<>编辑对象 · {obj.name} <Text type="secondary" style={{ fontFamily: 'monospace', fontSize: 12 }}>{obj.en}</Text></>}
      open onClose={onClose} width={620}
      extra={<Space>
        <Button onClick={() => { message.success('已保存为草稿（DRAFT）'); onClose(); }}>保存草稿</Button>
        <Button type="primary" onClick={() => { message.success('已提交评审（IN_REVIEW），发布门禁将校验破坏性变更'); onClose(); }}>提交评审</Button>
      </Space>}>
      {obj.status === 'PUBLISHED' && (
        <Alert style={{ marginBottom: 12 }} type="warning" showIcon
          message={`该对象为 PUBLISHED 且被引用 ${obj.refCount} 处：删除/改型属性属破坏性变更，将强制升大版本并通知全部引用方`} />
      )}
      <Form layout="vertical" size="middle">
        <Space.Compact block>
          <Form.Item label="中文名" style={{ flex: 1, marginRight: 8 }}><Input defaultValue={obj.name} /></Form.Item>
          <Form.Item label="英文标识" style={{ flex: 1 }}><Input defaultValue={obj.en} /></Form.Item>
        </Space.Compact>
        <Space.Compact block>
          <Form.Item label="对象类型" style={{ flex: 1, marginRight: 8 }}>
            <Select defaultValue={obj.kind} options={['静态事实', '单体动态', '立方动态'].map(k => ({ value: k, label: k }))} />
          </Form.Item>
          <Form.Item label="生命周期" style={{ flex: 1 }}>
            <Select defaultValue={obj.status} options={['DRAFT', 'IN_REVIEW', 'PUBLISHED', 'DEPRECATED'].map(s => ({ value: s, label: s }))} />
          </Form.Item>
        </Space.Compact>
        <Form.Item label="数据映射（对象实例化的数据来源）">
          <Select defaultValue={obj.mapping}
            options={[obj.mapping, 'lv_order_delivery（逻辑视图）', 'lv_supplier（逻辑视图）', 'ods_purchase_order（物理表）'].map(m => ({ value: m, label: m }))} />
        </Form.Item>
        <Form.Item label={`属性（${props.length}）`}><PropsEditor rows={props} setRows={setProps} /></Form.Item>
      </Form>
    </Drawer>
  );
}

/** 关系编辑抽屉 */
function EdgeEditor({ edge, onClose }: { edge: OntoEdge; onClose: () => void }) {
  const [props, setProps] = useState<PropRow[]>(edge.props);
  return (
    <Drawer title={<>编辑关系 · {edge.name}</>} open onClose={onClose} width={620}
      extra={<Space>
        <Button onClick={() => { message.success('已保存为草稿'); onClose(); }}>保存草稿</Button>
        <Button type="primary" onClick={() => { message.success('已提交评审'); onClose(); }}>提交评审</Button>
      </Space>}>
      {edge.refCount > 0 && (
        <Alert style={{ marginBottom: 12 }} type="warning" showIcon
          message={`被引用 ${edge.refCount} 处：调整两端对象或删除属性为破坏性变更`} />
      )}
      <Form layout="vertical" size="middle">
        <Form.Item label="关系名"><Input defaultValue={edge.name} /></Form.Item>
        <Space.Compact block>
          <Form.Item label="起点对象" style={{ flex: 1, marginRight: 8 }}>
            <Select defaultValue={edge.from} options={OBJECTS.map(o => ({ value: o.name, label: `${o.name} (${o.en})` }))} />
          </Form.Item>
          <Form.Item label="终点对象" style={{ flex: 1 }}>
            <Select defaultValue={edge.to} options={OBJECTS.map(o => ({ value: o.name, label: `${o.name} (${o.en})` }))} />
          </Form.Item>
        </Space.Compact>
        <Form.Item label={`边属性（${props.length}）· 支持时序/聚合`}><PropsEditor rows={props} setRows={setProps} /></Form.Item>
      </Form>
    </Drawer>
  );
}

/** 函数测试弹窗：样例入参 → 求值输出（Palantir function test 语义） */
function FuncTestModal({ fn, onClose }: { fn: OntoFunc | null; onClose: () => void }) {
  const [ran, setRan] = useState(false);
  return (
    <Modal title={<>运行测试 · <Text code>{fn?.name}</Text></>} open={!!fn} width={560} onCancel={() => { setRan(false); onClose(); }}
      footer={<Space>
        <Button onClick={() => { setRan(false); onClose(); }}>关闭</Button>
        <Button type="primary" icon={<PlayCircleOutlined />} onClick={() => { setRan(true); message.success(`测试通过：${fn?.tests} 个用例全绿（不落库）`); }}>运行测试</Button>
      </Space>}>
      {fn && <>
        <Table size="small" rowKey="name" pagination={false} style={{ margin: '12px 0' }}
          title={() => <Text type="secondary" style={{ fontSize: 12 }}>样例入参（可编辑）</Text>}
          dataSource={fn.signature.match(/\(([^)]*)\)/)?.[1].split(',').filter(Boolean).map((a, i) => ({ name: a.trim().split(':')[0], type: a.trim().split(':')[1] ?? 'decimal', v: ['0.86', 'true', "'S-0012'"][i % 3] })) ?? []}
          columns={[
            { title: '参数', dataIndex: 'name', render: v => <Text code>{v}</Text> },
            { title: '类型', dataIndex: 'type', width: 90 },
            { title: '值', dataIndex: 'v', render: v => <Input size="small" defaultValue={v} /> },
          ]} />
        {ran && (
          <Alert type="success" showIcon
            message={<>输出 <Text code strong>{fn.cat === '指标' ? 'risk_score = 82.4' : fn.cat === '派生' ? 'kitted_rate = 0.93' : fn.cat === '权限' ? 'allowed = true' : 'executed = true（dry-run）'}</Text> · 耗时 46ms · 用例 {fn.tests}/{fn.tests} 通过</>}
            description={<Text type="secondary" style={{ fontSize: 12 }}>测试在隔离会话执行：派生/指标函数不写库；行动函数仅 dry-run，不触发回写与副作用。</Text>} />
        )}
      </>}
    </Modal>
  );
}

/** 函数编辑抽屉 */
function FuncEditor({ fn, onClose }: { fn: OntoFunc; onClose: () => void }) {
  const [testOpen, setTestOpen] = useState(false);
  return (
    <Drawer title={<>编辑{fn.cat}函数 · {fn.name}</>} open onClose={onClose} width={620}
      extra={<Space>
        <Button onClick={() => setTestOpen(true)}>运行测试</Button>
        <Button onClick={() => { message.success('已保存为草稿'); onClose(); }}>保存草稿</Button>
        <Button type="primary" onClick={() => { message.success('已提交评审'); onClose(); }}>提交评审</Button>
      </Space>}>
      <Form layout="vertical" size="middle">
        <Space.Compact block>
          <Form.Item label="函数名" style={{ flex: 1, marginRight: 8 }}><Input defaultValue={fn.name} /></Form.Item>
          <Form.Item label="类别" style={{ flex: 1 }}>
            <Select defaultValue={fn.cat} options={['指标', '派生', '行动', '权限'].map(c => ({ value: c, label: `${c}函数` }))} />
          </Form.Item>
        </Space.Compact>
        <Form.Item label="签名"><Input defaultValue={fn.signature} style={{ fontFamily: 'monospace' }} /></Form.Item>
        <Form.Item label="实现（BKN Lang）">
          <Input.TextArea defaultValue={fn.impl} rows={4} style={{ fontFamily: 'monospace' }} />
        </Form.Item>
        <Alert type="info" showIcon message="行动函数需配置：执行条件 / 所需角色 / 二次确认 / 回滚函数；发布后进入函数目录供推理与智能体调用" />
      </Form>
      <FuncTestModal fn={testOpen ? fn : null} onClose={() => setTestOpen(false)} />
    </Drawer>
  );
}

/** 对象详情抽屉：注册中心与设计器「选对象」弹窗共用，用于快速判断是否为目标对象 */
export function ObjectDetailDrawer({ obj, onClose }: { obj: RegistryObject | null; onClose: () => void }) {
  const [preview, setPreview] = useState(false);
  return (
    <Drawer title={obj ? <>对象详情 · {obj.name} <Text type="secondary" style={{ fontFamily: 'monospace', fontSize: 12 }}>{obj.en}</Text></> : ''}
      open={!!obj} onClose={onClose} width={520}>
      {obj && (
        <>
          {(obj.perm === 'view' || !obj.shared) && (
            <Alert style={{ marginBottom: 12 }} type="warning" showIcon
              message={!obj.shared ? '私有跨本体对象：仅可见，不可引用' : '你在该对象上无引用权限：仅可见'}
              description={<>可查看详情以避免重复创建；如需引用，<a onClick={() => message.success(`已向 ${obj.owner} 发起引用权限申请`)}>{!obj.shared ? '申请共享 →' : '申请引用权限 →'}</a></>} />
          )}
          <Descriptions size="small" column={2} bordered
            items={[
              { key: '1', label: '类型', children: obj.kind },
              { key: '2', label: '状态', children: <Tag color={fmtStatus(obj.status)}>{obj.status}</Tag> },
              { key: '3', label: '版本', children: obj.version },
              { key: '4', label: '被引用', children: `${obj.refCount} 处` },
              { key: '5', label: '负责人', children: obj.owner },
              { key: '6', label: '所属本体', children: obj.shared ? obj.ontology : <Tag>{obj.ontology} · 私有</Tag> },
            ]} />
          {/* 数据映射 + 实例数据预览 */}
          <div style={{ marginTop: 12, padding: '10px 12px', background: '#f8fbfa', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>数据映射</Text>
              <div style={{ fontFamily: 'monospace', fontSize: 12 }}>{obj.mapping}</div>
              <Text type="secondary" style={{ fontSize: 11 }}>来源：scm_prod（MySQL）· 同步策略 15min · 字段一一映射</Text>
            </div>
            <Button size="small" type="primary" ghost onClick={() => setPreview(true)}>预览数据</Button>
          </div>
          {obj.stateMachine && (
            <div style={{ margin: '12px 0' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>状态机：</Text>
              <Space size={4} wrap style={{ marginLeft: 6 }}>{obj.stateMachine.map(s => <Tag key={s}>{s}</Tag>)}</Space>
            </div>
          )}
          <Table
            style={{ marginTop: 12 }} size="small" rowKey="name" pagination={false}
            title={() => <b style={{ fontSize: 13 }}>属性（{obj.props.length}）</b>}
            columns={[
              { title: '字段', dataIndex: 'name', render: (v: string) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v}</span> },
              { title: '类型', dataIndex: 'type', width: 80 },
              { title: '备注', dataIndex: 'comment' },
            ]}
            dataSource={obj.props}
          />
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 12 }}>
            被引用：{obj.refCount} 处（画布 ×{Math.max(1, Math.round(obj.refCount / 3))} · 函数 ×{Math.max(1, Math.round(obj.refCount / 4))} · 规则 ×{Math.max(0, Math.round(obj.refCount / 5))}）。
            引用按版本钉住，破坏性变更将强制升大版本。
          </Text>
          {/* 嵌套抽屉：按映射字段预览实例数据 */}
          <Drawer title={<>数据预览 · <span style={{ fontFamily: 'monospace', fontSize: 13 }}>{obj.mapping}</span></>}
            open={preview} onClose={() => setPreview(false)} width={680}>
            <Alert style={{ marginBottom: 10 }} type="info" showIcon
              message="按对象属性与源字段的一一映射实时查询，仅取前 5 行（受行级权限与敏感级约束）" />
            <Table size="small" rowKey={(_, i) => String(i)} pagination={false} scroll={{ x: true }}
              columns={obj.props.map(p => ({
                title: <>{p.name}<div style={{ fontWeight: 400, fontSize: 11, color: '#6b7688' }}>{p.comment}</div></>,
                dataIndex: p.name, render: (v: string) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v}</span>,
              }))}
              dataSource={previewRows(obj.props)} />
          </Drawer>
        </>
      )}
    </Drawer>
  );
}

export default function Registry({ embedded, tab }: { embedded?: boolean; tab?: string }) {
  const [treeKey, setTreeKey] = useState('all');
  const [kw, setKw] = useState('');
  const [kind, setKind] = useState('all');
  const [status, setStatus] = useState('all');
  const [detail, setDetail] = useState<RegistryObject | null>(null);
  const [editObj, setEditObj] = useState<RegistryObject | null>(null);
  const [editEdge, setEditEdge] = useState<OntoEdge | null>(null);
  const [editFunc, setEditFunc] = useState<OntoFunc | null>(null);
  const objects = useMemo(() => filterRegistry(REGISTRY_OBJECTS, { treeKey, kw, kind, status }), [treeKey, kw, kind, status]);

  const objColumns = [
    { title: '对象', key: 'name', render: (_: unknown, r: RegistryObject) => <><b>{r.name}</b> <Text type="secondary" style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.en}</Text></> },
    { title: '类型', dataIndex: 'kind', width: 90 },
    { title: '版本', dataIndex: 'version', width: 70 },
    { title: '状态', key: 'status', width: 140, render: (_: unknown, r: RegistryObject) =>
      !r.shared ? <Tag>私有 · 需申请共享</Tag>
        : r.perm === 'view' ? <Tag color="warning">仅可见 · 无引用权限</Tag>
          : <Tag color={fmtStatus(r.status)}>{r.status}</Tag> },
    { title: '被引用', dataIndex: 'refCount', width: 80 },
    { title: '负责人', dataIndex: 'owner', width: 90 },
    { title: '操作', key: 'op', width: 130, render: (_: unknown, r: RegistryObject) => (
      <Space size={4}>
        <Button size="small" type="link" onClick={e => { e.stopPropagation(); setDetail(r); }}>详情</Button>
        <Button size="small" type="link" disabled={r.perm === 'view' || !r.shared}
          onClick={e => { e.stopPropagation(); setEditObj(r); }}>编辑</Button>
      </Space>
    ) },
  ];

  const objTab = (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <Card size="small" title="本体域 / 类型" style={{ width: 210, flex: 'none' }}>
        <Tree
          treeData={[{ title: `全部 (${REGISTRY_OBJECTS.length})`, key: 'all' }, ...REGISTRY_TREE]}
          defaultExpandAll selectedKeys={[treeKey]}
          onSelect={k => setTreeKey(String(k[0] ?? 'all'))}
        />
      </Card>
      <Card size="small" style={{ flex: 1, minWidth: 0 }}>
        <Space style={{ marginBottom: 10 }} wrap>
          <Input.Search allowClear placeholder="搜索 名称 / 英文标识" style={{ width: 220 }} onSearch={setKw} onChange={e => !e.target.value && setKw('')} />
          <Select value={kind} onChange={setKind} style={{ width: 130 }} options={[{ value: 'all', label: '类型：全部' }, ...['静态事实', '单体动态', '立方动态'].map(k => ({ value: k, label: k }))]} />
          <Select value={status} onChange={setStatus} style={{ width: 130 }} options={[{ value: 'all', label: '状态：全部' }, ...['DRAFT', 'IN_REVIEW', 'PUBLISHED', 'DEPRECATED'].map(s => ({ value: s, label: s })), { value: 'PRIVATE', label: '私有（跨本体）' }]} />
          <Text type="secondary" style={{ fontSize: 12 }}>{objects.length} 个对象</Text>
        </Space>
        <Table<RegistryObject> rowKey="id" size="middle" columns={objColumns as never} dataSource={objects}
          pagination={false} onRow={r => ({ onClick: () => setDetail(r), style: { cursor: 'pointer' } })} />
      </Card>
    </div>
  );

  return (
    <>
      {!embedded && (
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <Title level={4} style={{ margin: 0 }}>注册中心</Title>
            <Text type="secondary">本体元素事实源：对象 / 关系 / 函数统一注册，版本与生命周期（DRAFT→IN_REVIEW→PUBLISHED→DEPRECATED）在此维护，画布只是它的视图。检索对全员可见（防重复创建），引用需要权限（可见 ≠ 可用）</Text>
          </div>
          <div style={{ flex: 1 }} />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => message.success('已进入新建对象向导（草稿态 DRAFT）')}>注册新对象</Button>
        </div>
      )}
      <Card>
        <Tabs defaultActiveKey={tab ?? 'obj'} items={[
          { key: 'obj', label: `对象 (${REGISTRY_OBJECTS.length})`, children: objTab },
          {
            key: 'edge', label: `关系 (${EDGES.length})`, children: (
              <Table rowKey="id" size="middle" pagination={false}
                columns={[
                  { title: '关系', dataIndex: 'name', render: (v: string) => <b>{v}</b> },
                  { title: '两端', key: 'ends', render: (_: unknown, r: OntoEdge) => `${r.from} → ${r.to}` },
                  { title: '属性', key: 'props', render: (_: unknown, r: OntoEdge) => r.props.map(p => p.name).join(' · ') || '—' },
                  { title: '版本', dataIndex: 'version', width: 70 },
                  { title: '状态', key: 'status', width: 140, render: (_: unknown, r: OntoEdge) =>
                    r.perm === 'view' ? <Tag color="warning">仅可见 · 无引用权限</Tag> : <Tag color={fmtStatus(r.status)}>{r.status}</Tag> },
                  { title: '被引用', dataIndex: 'refCount', width: 80 },
                  { title: '操作', key: 'op', width: 80, render: (_: unknown, r: OntoEdge) => (
                    <Button size="small" type="link" disabled={r.perm === 'view'} onClick={() => setEditEdge(r)}>编辑</Button>
                  ) },
                ]}
                dataSource={EDGES} />
            ),
          },
          {
            key: 'func', label: `函数 (${FUNCS.length})`, children: (
              <Table rowKey="id" size="middle" pagination={false}
                columns={[
                  { title: '函数', key: 'name', render: (_: unknown, r: OntoFunc) => <><b>{r.name}</b> <Text type="secondary" style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.signature}</Text></> },
                  { title: '类别', dataIndex: 'cat', width: 90, render: (v: string) => <Tag color={{ 指标: 'blue', 派生: 'purple', 行动: 'orange', 权限: 'default' }[v]}>{v}函数</Tag> },
                  { title: '实现', dataIndex: 'impl', ellipsis: true, render: (v: string) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v}</span> },
                  { title: '版本', dataIndex: 'version', width: 70 },
                  { title: '状态', key: 'status', width: 140, render: (_: unknown, r: OntoFunc) =>
                    r.perm === 'view' ? <Tag color="warning">仅可见 · 无引用权限</Tag> : <Tag color={fmtStatus(r.status)}>{r.status}</Tag> },
                  { title: '测试', dataIndex: 'tests', width: 80 },
                  { title: '操作', key: 'op', width: 80, render: (_: unknown, r: OntoFunc) => (
                    <Button size="small" type="link" disabled={r.perm === 'view'} onClick={() => setEditFunc(r)}>编辑</Button>
                  ) },
                ]}
                dataSource={FUNCS} />
            ),
          },
        ]} />
      </Card>
      <ObjectDetailDrawer obj={detail} onClose={() => setDetail(null)} />
      {editObj && <ObjectEditor key={editObj.id} obj={editObj} onClose={() => setEditObj(null)} />}
      {editEdge && <EdgeEditor key={editEdge.id} edge={editEdge} onClose={() => setEditEdge(null)} />}
      {editFunc && <FuncEditor key={editFunc.id} fn={editFunc} onClose={() => setEditFunc(null)} />}
    </>
  );
}
