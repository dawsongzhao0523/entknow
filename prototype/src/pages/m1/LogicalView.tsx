import { useState } from 'react';
import { Card, Table, Tag, Button, Input, Space, Typography, Drawer, Tabs, Alert, Timeline } from 'antd';
import { PlusOutlined, ImportOutlined } from '@ant-design/icons';
import { VIEWS, fmtStatus, type LogicalView } from '../../mock/data';
import { ok, run, edit, info } from '../../components/proto';

const { Title, Text } = Typography;

const SQL = `-- 只读视图 · 发布前由平台校验，禁止 DDL / DML
SELECT po.po_id, po.promise_dt, s.name AS supplier_name,
       po.amount, po.status
FROM   hive.scm_prod.purchase_order po
JOIN   pg.srm.supplier s ON s.supplier_id = po.supplier_id
WHERE  po.status >= 2`;

const OUT_FIELDS = [
  { field: 'po_id', src: 'purchase_order.po_id', comment: '采购订单号' },
  { field: 'promise_dt', src: 'purchase_order.promise_dt', comment: '承诺交期', warn: '上游类型变更待确认' },
  { field: 'supplier_name', src: 'supplier.name（AS 别名）', comment: '供应商名称' },
  { field: 'amount', src: 'purchase_order.amount', comment: '订单金额(元)' },
  { field: 'status', src: 'purchase_order.status', comment: '订单状态（≥ 2 为已下达后）' },
];

const VERSION_TL = [
  { v: 'v1', date: '09-02', desc: '首版：订单 + 供应商基础字段' },
  { v: 'v2', date: '09-20', desc: '+amount / status，接入交付分析报表' },
  { v: 'v3', date: '10-01', desc: '过滤条件调整为 status >= 2，当前生产版本' },
];

export default function LogicalViewPage() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<LogicalView>(VIEWS[0]);

  const show = (v: LogicalView) => { setCurrent(v); setOpen(true); };

  const columns = [
    { title: '名称', dataIndex: 'name', render: (v: string) => <Text className="mono" strong>{v}</Text> },
    { title: '类型', dataIndex: 'kind', render: (v: string) => <Tag color={v === 'LOGICAL' ? 'cyan' : 'geekblue'}>{v}</Tag> },
    { title: '版本', dataIndex: 'version', render: (v: string) => <Text className="mono">{v}</Text> },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={fmtStatus(v)}>{v}</Tag> },
    { title: '业务域', dataIndex: 'domain' },
    { title: '敏感级', dataIndex: 'sensitive', render: (v: string) => <Tag color={v >= 'L3' ? 'orange' : 'default'}>{v}</Tag> },
    { title: '被绑定数', key: 'bound', render: (_: unknown, r: LogicalView) => <Text className="mono">{r.boundBy.length}</Text> },
    { title: '负责人', dataIndex: 'owner' },
    {
      title: '操作', key: 'ops',
      render: (_: unknown, r: LogicalView) => (
        <Button size="small" type="link" onClick={e => { e.stopPropagation(); show(r); }}>详情</Button>
      ),
    },
  ];

  const drawerTabs = [
    {
      key: 'sql',
      label: '定义SQL',
      children: (
        <>
          <Space style={{ marginBottom: 8 }}>
            <Button size="small" onClick={() => ok('SQL 校验通过 · 只读 SELECT · 未检测到 DDL / DML')}>校验</Button>
            <Button size="small" type="primary" onClick={() => ok('试跑完成：返回 100 行 · 扫描 12,431 行 · 耗时 1.2s')}>试跑 100 行</Button>
            <Text type="secondary" style={{ fontSize: 12 }}>只读 SELECT · 发布前由平台校验，禁止 DDL / DML</Text>
          </Space>
          <pre className="mono" style={{ background: '#f6f8fa', padding: 16, borderRadius: 8, fontSize: 12.5, lineHeight: 1.7, overflow: 'auto' }}>{SQL}</pre>
          <Title level={5}>输出字段（{OUT_FIELDS.length}）</Title>
          <Table
            rowKey="field" size="small" pagination={false} dataSource={OUT_FIELDS}
            columns={[
              { title: '字段', dataIndex: 'field', render: v => <Text className="mono" strong>{v}</Text> },
              { title: '来源列', dataIndex: 'src', render: v => <Text className="mono" style={{ fontSize: 12 }}>{v}</Text> },
              { title: '说明', dataIndex: 'comment', render: (v: string, r) => <span>{v}{r.warn && <Text type="warning" style={{ marginLeft: 6, fontSize: 12 }}>⚠ {r.warn}</Text>}</span> },
            ]}
          />
        </>
      ),
    },
    {
      key: 'deps',
      label: '依赖与绑定',
      children: (
        <>
          <div style={{ marginBottom: 12 }}>
            <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>上游 <Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>← 自动血缘</Text></Text>
            <Space wrap>
              {current.upstream.map(u => <Tag key={u} color="blue"><span className="mono">{u}</span></Tag>)}
            </Space>
          </div>
          <div style={{ marginBottom: 12 }}>
            <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>被绑定</Text>
            <Space wrap>
              <Tag color="purple">对象[采购订单].supplier_name</Tag>
              <Tag color="purple">对象[采购订单].promise_dt</Tag>
              <Tag color="purple">对象[采购订单].status</Tag>
              <Text type="secondary" style={{ fontSize: 12 }}>等 3 处</Text>
              <Tag>语义查询 × 2</Tag>
            </Space>
          </div>
          <Alert
            type="warning" showIcon
            message={<span>上游变更：<Text className="mono">supplier</Text> 新增列 <Text className="mono">tax_id</Text>（不影响）；<Text className="mono">promise_dt</Text> 类型变更 → 需确认影响范围</span>}
            action={<Button size="small" onClick={() => run('确认上游变更影响', 'promise_dt 类型 varchar→date：影响绑定字段 3 处、语义查询 2 处，确认后自动升级视图版本至 v4。')}>影响确认</Button>}
          />
        </>
      ),
    },
    {
      key: 'versions',
      label: '版本',
      children: (
        <Timeline
          items={VERSION_TL.slice().reverse().map((v, i) => ({
            color: i === 0 ? 'green' : 'blue',
            children: (
              <>
                <Text strong className="mono">{v.v}</Text>
                <Text type="secondary" style={{ fontSize: 12, margin: '0 8px' }}>{v.date}</Text>
                {i === 0 && <Tag color="green">已发布</Tag>}
                <div><Text type="secondary" style={{ fontSize: 12 }}>{v.desc}</Text></div>
              </>
            ),
          }))}
        />
      ),
    },
  ];

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>逻辑视图管理</Title>
          <Text type="secondary">联邦层只读视图：SQL 定义、自动血缘、版本与绑定治理（M1-F09）</Text>
        </div>
        <div style={{ flex: 1 }} />
        <Space>
          <Button icon={<ImportOutlined />} onClick={() => edit('注册已有视图', [
            ['视图名', <Input key="n" className="mono" placeholder="starrocks.custom_view" />],
            ['业务域', <Input key="d" defaultValue="供应链" />],
            ['敏感级', <Input key="s" defaultValue="L2" />],
          ])}>注册已有视图</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => edit('新建视图', [
            ['名称', <Input key="n" className="mono" placeholder="v_po_delivery" />],
            ['类型', <Input key="k" defaultValue="LOGICAL" />],
            ['定义 SQL', <Input.TextArea key="q" rows={4} className="mono" placeholder="SELECT ..." />],
          ])}>新建视图</Button>
        </Space>
      </div>

      <Card>
        <Table<LogicalView>
          rowKey="id" columns={columns as never} dataSource={VIEWS} size="middle" pagination={false}
          onRow={r => ({ onClick: () => show(r), style: { cursor: 'pointer' } })}
        />
      </Card>

      <Drawer
        width={720} open={open} onClose={() => setOpen(false)}
        title={
          <Space wrap>
            <Text className="mono" strong style={{ fontSize: 15 }}>{current.name}</Text>
            <Tag color="cyan">{current.kind} 视图 · StarRocks</Tag>
            <Tag>业务域：{current.domain}</Tag>
            <Tag color="orange">敏感：{current.sensitive}（取依赖最高）</Tag>
            <Tag color={fmtStatus(current.status)}>{current.version} {current.status === 'PUBLISHED' ? '已发布' : current.status}</Tag>
          </Space>
        }
        extra={<Space>
          <Button size="small" onClick={() => run('新建版本', `基于 ${current.version} 定义创建下一版本草稿。`)}>新建版本</Button>
          <Button size="small" onClick={() => info(`血缘 · ${current.name}`, [
            ['上游', <Space key="u" wrap>{current.upstream.map(u => <Tag key={u} color="blue"><span className="mono">{u}</span></Tag>)}</Space>],
            ['下游', <span key="d">对象[采购订单] · 语义查询 ×2 · 交付分析报表</span>],
          ])}>血缘</Button>
        </Space>}
      >
        <Tabs items={drawerTabs} />
      </Drawer>
    </>
  );
}
