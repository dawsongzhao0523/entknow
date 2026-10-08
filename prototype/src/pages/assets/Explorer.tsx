import { useState } from 'react';
import {
  Badge, Button, Card, Empty, Input, Space,
  Table, Tag, Tree, Typography, message,
} from 'antd';
import {
  ApartmentOutlined, AppstoreOutlined, ArrowRightOutlined, BookOutlined,
  DatabaseOutlined, FileTextOutlined, KeyOutlined,
  ReloadOutlined, SearchOutlined, TableOutlined,
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

/* ─── 类型定义 ─── */
type SourceKind = 'database' | 'kb' | 'api';
type ViewMode = 'schema' | 'data' | 'er';

interface TableColumn { name: string; type: string; nullable: boolean; key?: 'PK' | 'FK'; default?: string; comment: string }
interface TableData { name: string; rows: string; columns: TableColumn[]; sample: Record<string, string>[]; fks: { column: string; refTable: string; refColumn: string }[] }
interface KbDoc { id: string; title: string; content: string; sections: { heading: string; level: number }[] }
interface ApiEndpoint { id: string; method: 'GET' | 'POST' | 'PUT' | 'DELETE'; path: string; summary: string; params: { name: string; type: string; required: boolean; desc: string }[]; response: string }

/* ─── Mock 数据 ─── */
const TREE_DATA = [
  {
    key: 'pg-entknow', title: 'PostgreSQL (entknow)', kind: 'database' as SourceKind, icon: <DatabaseOutlined />,
    children: [
      { key: 'tbl:users', title: 'users', isLeaf: true, icon: <TableOutlined /> },
      { key: 'tbl:objects', title: 'objects', isLeaf: true, icon: <TableOutlined /> },
      { key: 'tbl:edges', title: 'edges', isLeaf: true, icon: <TableOutlined /> },
    ],
  },
  {
    key: 'mysql-scm', title: 'MySQL (scm_prod)', kind: 'database' as SourceKind, icon: <DatabaseOutlined />,
    children: [
      { key: 'tbl:purchase_order', title: 'purchase_order', isLeaf: true, icon: <TableOutlined /> },
      { key: 'tbl:supplier', title: 'supplier', isLeaf: true, icon: <TableOutlined /> },
    ],
  },
  {
    key: 'kb-supply', title: '知识库 (供应链)', kind: 'kb' as SourceKind, icon: <BookOutlined />,
    children: [
      { key: 'doc:sop-001', title: '来料检验规范 SOP', isLeaf: true, icon: <FileTextOutlined /> },
      { key: 'doc:sop-002', title: '供应商准入流程', isLeaf: true, icon: <FileTextOutlined /> },
      { key: 'doc:term-001', title: '供应链术语表', isLeaf: true, icon: <FileTextOutlined /> },
    ],
  },
  {
    key: 'api-srm', title: 'API (SRM 系统)', kind: 'api' as SourceKind, icon: <DatabaseOutlined />,
    children: [
      { key: 'ep:get-suppliers', title: 'GET /suppliers', isLeaf: true, icon: <ArrowRightOutlined /> },
      { key: 'ep:post-order', title: 'POST /orders', isLeaf: true, icon: <ArrowRightOutlined /> },
      { key: 'ep:put-supplier', title: 'PUT /suppliers/{id}', isLeaf: true, icon: <ArrowRightOutlined /> },
    ],
  },
];

const TABLE_DETAILS: Record<string, TableData> = {
  users: {
    name: 'users', rows: '4',
    columns: [
      { name: 'id', type: 'text', nullable: false, key: 'PK', comment: '用户ID' },
      { name: 'account', type: 'text', nullable: false, comment: '登录账号' },
      { name: 'name', type: 'text', nullable: false, comment: '姓名' },
      { name: 'roles', type: 'text[]', nullable: false, comment: '角色列表' },
      { name: 'status', type: 'text', nullable: false, default: '正常', comment: '状态' },
    ],
    sample: [
      { id: 'u1', account: 'zhangsan', name: '张三', roles: '[管理员,开发]', status: '正常' },
      { id: 'u2', account: 'wangwu', name: '王五', roles: '[评审员]', status: '正常' },
    ],
    fks: [],
  },
  purchase_order: {
    name: 'purchase_order', rows: '2,140,331',
    columns: [
      { name: 'po_id', type: 'varchar(32)', nullable: false, key: 'PK', comment: '订单号' },
      { name: 'supplier_id', type: 'varchar(16)', nullable: false, key: 'FK', comment: '供应商' },
      { name: 'amount', type: 'decimal(14,2)', nullable: false, comment: '金额' },
    ],
    sample: [
      { po_id: 'PO20260930001', supplier_id: 'S-0012', amount: '58,200.00' },
    ],
    fks: [{ column: 'supplier_id', refTable: 'supplier', refColumn: 'supplier_id' }],
  },
};

const KB_DOCS: Record<string, KbDoc> = {
  'doc:sop-001': {
    id: 'doc:sop-001', title: '来料检验规范 SOP',
    sections: [{ heading: '1. 目的', level: 2 }, { heading: '2. 适用范围', level: 2 }, { heading: '3. 检验流程', level: 2 }, { heading: '3.1 抽样标准', level: 3 }, { heading: '3.2 判定规则', level: 3 }, { heading: '4. 记录与追溯', level: 2 }],
    content: `## 1. 目的
规范来料检验流程，确保采购物料满足质量要求，防止不合格品流入产线。

## 2. 适用范围
适用于所有采购入库的原材料、辅料及外协件。

## 3. 检验流程

### 3.1 抽样标准
按 GB/T 2828.1 正常检验一次抽样方案执行：

| 批量范围 | 样本量 | AQL |
|---------|--------|-----|
| 26-50 | 8 | 1.5 |
| 51-90 | 13 | 1.5 |
| 91-150 | 20 | 1.0 |

### 3.2 判定规则
- **严重缺陷（A类）**：AQL = 0，发现即拒收
- **主要缺陷（B类）**：AQL = 1.5，超限拒收
- **次要缺陷（C类）**：AQL = 4.0，超限让步接收

## 4. 记录与追溯
所有检验记录需关联供应商编码和批次号，保存期限不少于 2 年。

\`\`\`sql
-- 查询某供应商的检验记录
SELECT * FROM inspection_records
WHERE supplier_id = 'S-0012'
  AND inspect_date >= '2026-01-01'
ORDER BY inspect_date DESC;
\`\`\`
`,
  },
  'doc:term-001': {
    id: 'doc:term-001', title: '供应链术语表',
    sections: [{ heading: "A", level: 2 }, { heading: "S", level: 2 }],
    content: `## A
- **ASN (Advanced Shipping Notice)**: 预先发货通知，供应商在发货前提供的物流信息
- **AQL (Acceptable Quality Limit)**: 可接受质量限制，抽样检验的判定标准

## S
- **SCM (Supply Chain Management)**: 供应链管理
- **SKU (Stock Keeping Unit)**: 库存量单位，最小库存管理单元
- **SLA (Service Level Agreement)**: 服务水平协议
`,
  },
};

const API_ENDPOINTS: Record<string, ApiEndpoint> = {
  'ep:get-suppliers': {
    id: 'ep:get-suppliers', method: 'GET', path: '/api/v1/suppliers',
    summary: '查询供应商列表（分页）',
    params: [
      { name: 'page', type: 'integer', required: false, desc: '页码，默认 1' },
      { name: 'size', type: 'integer', required: false, desc: '每页条数，默认 20' },
      { name: 'keyword', type: 'string', required: false, desc: '搜索关键词' },
    ],
    response: `{
  "code": 200,
  "data": {
    "total": 156,
    "items": [
      {
        "supplier_id": "S-0012",
        "name": "华兴电子",
        "level": "A",
        "ontime_rate": 0.924
      }
    ]
  }
}`,
  },
  'ep:post-order': {
    id: 'ep:post-order', method: 'POST', path: '/api/v1/orders',
    summary: '创建采购订单',
    params: [
      { name: 'supplier_id', type: 'string', required: true, desc: '供应商编码' },
      { name: 'material_id', type: 'string', required: true, desc: '物料编码' },
      { name: 'quantity', type: 'integer', required: true, desc: '采购数量' },
      { name: 'promise_date', type: 'string', required: true, desc: '承诺交期 (YYYY-MM-DD)' },
    ],
    response: `{
  "code": 201,
  "data": {
    "po_id": "PO20261008001",
    "status": "created"
  }
}`,
  },
};

/* ─── 方法颜色 ─── */
const METHOD_COLOR: Record<string, string> = { GET: '#3b82f6', POST: '#22c55e', PUT: '#f59e0b', DELETE: '#ef4444' };

/* ─── Markdown 渲染器（简化） ─── */
function MdReader({ content }: { content: string }) {
  const lines = content.split('\n');
  return (
    <div style={{ fontSize: 13.5, lineHeight: 1.8, maxWidth: 720 }}>
      {lines.map((line, i) => {
        if (line.startsWith('## ')) return <h2 key={i} style={{ fontSize: 18, fontWeight: 700, marginTop: 24, marginBottom: 8, borderBottom: '1px solid #e2e4e9', paddingBottom: 8 }}>{line.slice(3)}</h2>;
        if (line.startsWith('### ')) return <h3 key={i} style={{ fontSize: 15, fontWeight: 600, marginTop: 16, marginBottom: 6 }}>{line.slice(4)}</h3>;
        if (line.startsWith('- **')) {
          const m = line.match(/- \*\*(.+?)\*\*: (.+)/);
          if (m) return <div key={i} style={{ marginLeft: 16, marginBottom: 6 }}><b>{m[1]}</b>: {m[2]}</div>;
        }
        if (line.startsWith('- ')) return <div key={i} style={{ marginLeft: 16, marginBottom: 4 }}>• {line.slice(2)}</div>;
        if (line.startsWith('```')) return null;
        if (line.startsWith('|')) return null; // 表格简化
        if (line.trim() === '') return <div key={i} style={{ height: 8 }} />;
        return <p key={i} style={{ marginBottom: 8 }}>{line}</p>;
      })}
    </div>
  );
}

/* ─── API 文档渲染器 ─── */
function ApiViewer({ endpoint }: { endpoint: ApiEndpoint }) {
  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <Tag color={METHOD_COLOR[endpoint.method]} style={{ fontSize: 13, fontWeight: 700, padding: '2px 10px' }}>{endpoint.method}</Tag>
        <Text code style={{ fontSize: 14 }}>{endpoint.path}</Text>
      </div>
      <Paragraph type="secondary">{endpoint.summary}</Paragraph>

      <Title level={5}>请求参数</Title>
      <Table size="small" rowKey="name" pagination={false}
        dataSource={endpoint.params}
        columns={[
          { title: '参数名', dataIndex: 'name', render: (v: string) => <span className="mono">{v}</span> },
          { title: '类型', dataIndex: 'type', width: 90, render: (v: string) => <Tag>{v}</Tag> },
          { title: '必填', dataIndex: 'required', width: 60, render: (v: boolean) => v ? <Tag color="red">是</Tag> : <Tag>否</Tag> },
          { title: '说明', dataIndex: 'desc' },
        ]} />

      <Title level={5} style={{ marginTop: 16 }}>响应示例</Title>
      <pre style={{
        background: '#1e293b', color: '#e2e8f0', padding: 14, borderRadius: 8,
        fontSize: 12, overflowX: 'auto', fontFamily: 'monospace',
      }}>{endpoint.response}</pre>
    </div>
  );
}

/* ─── ER 图 ─── */
function ERDiagram({ tableName }: { tableName: string }) {
  const detail = TABLE_DETAILS[tableName];
  if (!detail || detail.fks.length === 0) return <Empty description="该表无外键关联" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  const cx = 400, cy = 180, r = 150;
  return (
    <svg viewBox="0 0 800 360" style={{ width: '100%', height: 360 }}>
      <rect x={cx-80} y={cy-28} width={160} height={56} rx={8} fill="#ecfdf5" stroke="#059669" strokeWidth={2} />
      <text x={cx} y={cy-6} textAnchor="middle" fontSize={14} fontWeight={700}>{tableName}</text>
      <text x={cx} y={cy+14} textAnchor="middle" fontSize={11} fill="#6b7688">{detail.rows} rows</text>
      {detail.fks.map((fk, i) => {
        const a = (2*Math.PI*i)/detail.fks.length - Math.PI/2;
        const x = cx + r*Math.cos(a), y = cy + r*Math.sin(a);
        return (
          <g key={i}>
            <line x1={cx} y1={cy} x2={x} y2={y} stroke="#94a3b8" strokeWidth={1.5} />
            <rect x={x-60} y={y-20} width={120} height={40} rx={6} fill="#fff" stroke="#dbe4f0" />
            <text x={x} y={y-4} textAnchor="middle" fontSize={12} fontWeight={600}>{fk.refTable}</text>
            <text x={x} y={y+12} textAnchor="middle" fontSize={10} fill="#6b7688">{fk.column}→{fk.refColumn}</text>
          </g>
        );
      })}
    </svg>
  );
}

/* ─── 主组件 ─── */
export default function Explorer() {
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('schema');
  const [searchKw] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

  const openItem = (key: string) => {
    if (!openTabs.includes(key)) setOpenTabs([...openTabs, key]);
    setActiveTab(key);
    // 自动选择合适的视图
    if (key.startsWith('tbl:')) setViewMode('schema');
    else if (key.startsWith('doc:')) setViewMode('schema');
    else if (key.startsWith('ep:')) setViewMode('schema');
  };

  const closeTab = (key: string) => {
    const rem = openTabs.filter(t => t !== key);
    setOpenTabs(rem);
    if (activeTab === key && rem.length) setActiveTab(rem[rem.length-1]);
  };

  const getTabInfo = (key: string) => {
    if (key.startsWith('tbl:')) return { label: key.slice(4), kind: 'database' as SourceKind };
    if (key.startsWith('doc:')) return { label: KB_DOCS[key]?.title ?? key.slice(4), kind: 'kb' as SourceKind };
    if (key.startsWith('ep:')) return { label: `${API_ENDPOINTS[key]?.method ?? ''} ${API_ENDPOINTS[key]?.path ?? key.slice(3)}`, kind: 'api' as SourceKind };
    return { label: key, kind: 'database' as SourceKind };
  };


  const tableDetail = activeTab?.startsWith('tbl:') ? TABLE_DETAILS[activeTab.slice(4)] : null;
  const kbDoc = activeTab?.startsWith('doc:') ? KB_DOCS[activeTab] : null;
  const apiEp = activeTab?.startsWith('ep:') ? API_ENDPOINTS[activeTab] : null;

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>数据探索</Title>
          <Text type="secondary">数据库 · 知识库文档 · API 接口 — 统一浏览有权限的数据资产</Text>
        </div>
        <div style={{ flex: 1 }} />
        <Button icon={<ReloadOutlined />} onClick={() => message.success('已刷新')}>刷新</Button>
      </div>

      <div style={{ display: 'flex', gap: 12, height: 'calc(100vh - 220px)' }}>
        {/* 左侧：数据源目录树 */}
        <Card size="small" title="数据源目录" style={{ width: 260, flex: 'none', overflowY: 'auto' }}
          extra={<Input size="small" placeholder="搜索" prefix={<SearchOutlined />} style={{ width: 100 }} />}>
          <Tree
            showIcon defaultExpandAll
            selectedKeys={selected}
            treeData={TREE_DATA.map(src => ({
              key: src.key,
              title: <Space size={4}><b style={{ fontSize: 12 }}>{src.title}</b><Badge status="success" /></Space>,
              icon: src.icon,
              children: src.children?.filter(c => !searchKw || String(c.title).toLowerCase().includes(searchKw.toLowerCase())),
            }))}
            onSelect={(keys) => {
              const key = String(keys[0] ?? '');
              setSelected(keys as string[]);
              if (key.includes(':')) openItem(key);
            }}
          />
        </Card>

        {/* 右侧：内容区 */}
        <Card size="small" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}
          styles={{ body: { flex: 1, minHeight: 0, overflowY: 'auto' } }}>
          {openTabs.length === 0 ? (
            <Empty description="点击左侧数据源开始探索 — 数据库看表结构/数据/ER，知识库读文档，API 看接口文档" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ marginTop: 60 }} />
          ) : (
            <>
              {/* Tab 栏 */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 10, borderBottom: '1px solid #e2e4e9', paddingBottom: 8, flexWrap: 'wrap' }}>
                {openTabs.map(key => {
                  const info = getTabInfo(key);
                  return (
                    <div key={key} onClick={() => setActiveTab(key)}
                      style={{
                        padding: '4px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12,
                        background: activeTab === key ? '#059669' : '#f1f3f5',
                        color: activeTab === key ? '#fff' : '#374151',
                        display: 'flex', alignItems: 'center', gap: 4, maxWidth: 200,
                      }}>
                      {info.kind === 'database' && <TableOutlined style={{ fontSize: 10 }} />}
                      {info.kind === 'kb' && <BookOutlined style={{ fontSize: 10 }} />}
                      {info.kind === 'api' && <span style={{ fontSize: 10 }}>🔌</span>}
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{info.label}</span>
                      <span onClick={e => { e.stopPropagation(); closeTab(key); }} style={{ marginLeft: 4, opacity: 0.7 }}>×</span>
                    </div>
                  );
                })}
              </div>

              {/* 数据库表：Schema / Data / ER */}
              {tableDetail && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                    <Space>
                      <Tag color="blue">{tableDetail.name}</Tag>
                      <Text type="secondary">{tableDetail.rows} rows · {tableDetail.columns.length} cols</Text>
                    </Space>
                    <div style={{ flex: 1 }} />
                    <Space>
                      <Button size="small" type={viewMode === 'schema' ? 'primary' : 'text'} icon={<AppstoreOutlined />} onClick={() => setViewMode('schema')}>Schema</Button>
                      <Button size="small" type={viewMode === 'data' ? 'primary' : 'text'} icon={<TableOutlined />} onClick={() => setViewMode('data')}>Data</Button>
                      <Button size="small" type={viewMode === 'er' ? 'primary' : 'text'} icon={<ApartmentOutlined />} onClick={() => setViewMode('er')}>ER</Button>
                    </Space>
                  </div>

                  {viewMode === 'schema' && (
                    <Table size="small" rowKey="name" pagination={false}
                      dataSource={tableDetail.columns}
                      columns={[
                        { title: '列名', dataIndex: 'name', render: (v: string, r) => (
                          <Space size={4}>
                            {r.key === 'PK' && <KeyOutlined style={{ color: '#f59e0b' }} />}
                            {r.key === 'FK' && <KeyOutlined style={{ color: '#3b82f6' }} />}
                            <span className="mono">{v}</span>
                          </Space>
                        ) },
                        { title: '类型', dataIndex: 'type', width: 130, render: (v: string) => <Tag>{v}</Tag> },
                        { title: '可空', dataIndex: 'nullable', width: 60, render: (v: boolean) => v ? <Tag color="green">Y</Tag> : <Tag color="red">N</Tag> },
                        { title: '键', dataIndex: 'key', width: 50, render: (v?: string) => v ? <Tag color={v === 'PK' ? 'orange' : 'blue'}>{v}</Tag> : '' },
                        { title: '备注', dataIndex: 'comment' },
                      ]} />
                  )}
                  {viewMode === 'data' && (
                    <Table size="small" rowKey={(_, i) => String(i)} pagination={false} scroll={{ x: true }}
                      dataSource={tableDetail.sample}
                      columns={Object.keys(tableDetail.sample[0] ?? {}).map(col => ({
                        title: col, dataIndex: col, ellipsis: true,
                        render: (v: string) => <span className="mono" style={{ fontSize: 12 }}>{v}</span>,
                      }))} />
                  )}
                  {viewMode === 'er' && <ERDiagram tableName={activeTab.slice(4)} />}
                </>
              )}

              {/* KB 文档：Markdown 阅读器 + 目录 */}
              {kbDoc && (
                <div style={{ display: 'flex', gap: 16 }}>
                  {/* 文档目录 */}
                  <div style={{ width: 180, flex: 'none', borderRight: '1px solid #e2e4e9', paddingRight: 12 }}>
                    <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>目录</Text>
                    {kbDoc.sections.map((sec, i) => (
                      <div key={i} style={{
                        padding: '4px 8px', fontSize: 12, cursor: 'pointer', borderRadius: 4,
                        paddingLeft: sec.level === 3 ? 20 : 8, color: '#374151',
                      }}>
                        {sec.heading}
                      </div>
                    ))}
                  </div>
                  {/* 文档内容 */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Title level={4}>{kbDoc.title}</Title>
                    <MdReader content={kbDoc.content} />
                  </div>
                </div>
              )}

              {/* API 接口文档 */}
              {apiEp && <ApiViewer endpoint={apiEp} />}
            </>
          )}
        </Card>
      </div>
    </>
  );
}
