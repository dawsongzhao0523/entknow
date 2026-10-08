import { useCallback, useEffect, useState } from 'react';
import {
  App, Button, Card, Empty, Input, Space,
  Table, Tag, Tree, Typography,
} from 'antd';
import {
  ApartmentOutlined, AppstoreOutlined, ArrowRightOutlined, BookOutlined,
  DatabaseOutlined, KeyOutlined,
  ReloadOutlined, SearchOutlined, TableOutlined,
} from '@ant-design/icons';
import { api } from '../../api';
import MarkdownDoc from '../../components/MarkdownDoc';

const { Title, Text } = Typography;

/* ─── 类型 ─── */
type ViewMode = 'schema' | 'data' | 'er';
interface ExploreSource { key: string; title: string; kind: string; children?: { key: string; title: string; isLeaf: boolean }[] }
interface TableColumn { name: string; type: string; nullable: boolean; key?: string; default?: string; comment: string }
interface TableData { name: string; rows: string; columns: TableColumn[]; sample: Record<string, string>[]; fks: { column: string; refTable: string; refColumn: string }[] }
interface KbDoc { id: string; title: string; content: string }

const KIND_ICON: Record<string, React.ReactNode> = {
  database: <DatabaseOutlined />,
  kb: <BookOutlined />,
  api: <DatabaseOutlined />,
};

/** 数据探索：数据库(Schema/Data/ER) + 知识库文档(Markdown) + API 接口 */
export default function Explorer() {
  const { message } = App.useApp();
  const [tree, setTree] = useState<ExploreSource[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('schema');
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [kbDoc, setKbDoc] = useState<KbDoc | null>(null);
  const [apiInfo, setApiInfo] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchKw, setSearchKw] = useState('');

  const loadTree = useCallback(() => {
    api.exploreTree().then(setTree).catch(e => message.error(String(e.message)));
  }, [message]);

  useEffect(() => { loadTree(); }, [loadTree]);

  const openItem = async (key: string) => {
    if (!openTabs.includes(key)) setOpenTabs([...openTabs, key]);
    setActiveTab(key);
    setTableData(null); setKbDoc(null); setApiInfo(null);
    setLoading(true);
    try {
      if (key.startsWith('tbl:')) {
        setViewMode('schema');
        const td = await api.exploreTable(key.slice(4));
        setTableData({ ...td, columns: td.columns ?? [], sample: td.sample ?? [], fks: td.fks ?? [] });
      } else if (key.startsWith('doc:')) {
        setKbDoc(await api.exploreDoc(key.slice(4)));
      } else if (key.startsWith('ep:')) {
        setApiInfo(await api.exploreApi(key.slice(3)));
      }
    } catch (e) { message.error(String((e as Error).message)); }
    finally { setLoading(false); }
  };

  const closeTab = (key: string) => {
    const rem = openTabs.filter(t => t !== key);
    setOpenTabs(rem);
    if (activeTab === key && rem.length) setActiveTab(rem[rem.length - 1]);
  };

  const getTabLabel = (key: string) => {
    for (const src of tree) {
      for (const child of src.children ?? []) {
        if (child.key === key) return child.title;
      }
    }
    return key.split(':').pop() ?? key;
  };

  const getTabIcon = (key: string) => {
    if (key.startsWith('tbl:')) return <TableOutlined style={{ fontSize: 10 }} />;
    if (key.startsWith('doc:')) return <BookOutlined style={{ fontSize: 10 }} />;
    return <ArrowRightOutlined style={{ fontSize: 10 }} />;
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>数据探索</Title>
          <Text type="secondary">数据库 · 知识库文档 · API 接口 — 统一浏览有权限的数据资产</Text>
        </div>
        <div style={{ flex: 1 }} />
        <Button icon={<ReloadOutlined />} onClick={loadTree}>刷新</Button>
      </div>

      <div style={{ display: 'flex', gap: 12, height: 'calc(100vh - 220px)' }}>
        {/* 左侧目录树 */}
        <Card size="small" title="数据源目录" style={{ width: 260, flex: 'none', overflowY: 'auto' }}
          extra={<Input size="small" placeholder="搜索" prefix={<SearchOutlined />} style={{ width: 90 }}
            value={searchKw} onChange={e => setSearchKw(e.target.value)} />}>
          <Tree
            key={`t-${tree.length}`}
            showIcon
            defaultExpandAll
            defaultExpandedKeys={tree.map(s => s.key)}
            selectedKeys={selected}
            treeData={tree.map(src => ({
              key: src.key,
              title: <Space size={4}><b style={{ fontSize: 12 }}>{src.title}</b></Space>,
              icon: KIND_ICON[src.kind] ?? <DatabaseOutlined />,
              children: (src.children ?? [])
                .filter(c => !searchKw || c.title.toLowerCase().includes(searchKw.toLowerCase()))
                .map(c => ({
                  key: c.key,
                  title: c.title,
                  icon: c.key.startsWith('tbl:') ? <TableOutlined /> : c.key.startsWith('doc:') ? <BookOutlined /> : <ArrowRightOutlined />,
                  isLeaf: true,
                })),
            }))}
            onExpand={() => { /* 允许展开收起 */ }}
            onSelect={keys => {
              const key = String(keys[0] ?? '');
              setSelected(keys as string[]);
              if (key.includes(':')) openItem(key);
            }}
          />
        </Card>

        {/* 右侧内容 */}
        <Card size="small" loading={loading} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}
          styles={{ body: { flex: 1, minHeight: 0, overflowY: 'auto' } }}>
          {openTabs.length === 0 ? (
            <Empty description="点击左侧数据源开始探索" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ marginTop: 60 }} />
          ) : (
            <>
              {/* Tab 栏 */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 10, borderBottom: '1px solid #e2e4e9', paddingBottom: 8, flexWrap: 'wrap' }}>
                {openTabs.map(key => (
                  <div key={key} onClick={() => openItem(key)}
                    style={{
                      padding: '4px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12,
                      background: activeTab === key ? '#059669' : '#f1f3f5',
                      color: activeTab === key ? '#fff' : '#374151',
                      display: 'flex', alignItems: 'center', gap: 4, maxWidth: 200,
                    }}>
                    {getTabIcon(key)}
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getTabLabel(key)}</span>
                    <span onClick={e => { e.stopPropagation(); closeTab(key); }} style={{ marginLeft: 4, opacity: 0.7 }}>×</span>
                  </div>
                ))}
              </div>

              {/* 数据库表 */}
              {tableData && activeTab.startsWith('tbl:') && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                    <Space>
                      <Tag color="blue">{tableData.name}</Tag>
                      <Text type="secondary">{tableData.columns.length} cols · {tableData.fks.length} FKs</Text>
                    </Space>
                    <div style={{ flex: 1 }} />
                    <Space>
                      <Button size="small" type={viewMode === 'schema' ? 'primary' : 'text'} icon={<AppstoreOutlined />} onClick={() => setViewMode('schema')}>Schema</Button>
                      <Button size="small" type={viewMode === 'data' ? 'primary' : 'text'} icon={<TableOutlined />} onClick={() => setViewMode('data')}>Data</Button>
                      <Button size="small" type={viewMode === 'er' ? 'primary' : 'text'} icon={<ApartmentOutlined />} onClick={() => setViewMode('er')}>ER</Button>
                    </Space>
                  </div>

                  {viewMode === 'schema' && (
                    <Table<TableColumn> size="small" rowKey="name" pagination={false}
                      dataSource={tableData.columns}
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
                  {viewMode === 'data' && tableData.sample && tableData.sample.length > 0 && (
                    <Table size="small" rowKey={(_, i) => String(i)} pagination={false} scroll={{ x: true }}
                      dataSource={tableData.sample}
                      columns={Object.keys(tableData.sample[0]).map(col => ({
                        title: col, dataIndex: col, ellipsis: true,
                        render: (v: string) => <span className="mono" style={{ fontSize: 12 }}>{v}</span>,
                      }))} />
                  )}
                  {viewMode === 'er' && (
                    tableData.fks.length > 0 ? (
                      <svg viewBox="0 0 800 360" style={{ width: '100%', height: 360 }}>
                        <rect x={320} y={152} width={160} height={56} rx={8} fill="#ecfdf5" stroke="#059669" strokeWidth={2} />
                        <text x={400} y={174} textAnchor="middle" fontSize={14} fontWeight={700}>{tableData.name}</text>
                        <text x={400} y={194} textAnchor="middle" fontSize={11} fill="#6b7688">{tableData.columns.length} cols</text>
                        {tableData.fks.map((fk, i) => {
                          const a = (2 * Math.PI * i) / tableData.fks.length - Math.PI / 2;
                          const x = 400 + 180 * Math.cos(a), y = 180 + 150 * Math.sin(a);
                          return (
                            <g key={i}>
                              <line x1={400} y1={180} x2={x} y2={y} stroke="#94a3b8" strokeWidth={1.5} />
                              <rect x={x - 60} y={y - 22} width={120} height={44} rx={6} fill="#fff" stroke="#dbe4f0" />
                              <text x={x} y={y - 4} textAnchor="middle" fontSize={12} fontWeight={600}>{fk.refTable}</text>
                              <text x={x} y={y + 12} textAnchor="middle" fontSize={10} fill="#6b7688">{fk.column}→{fk.refColumn}</text>
                            </g>
                          );
                        })}
                      </svg>
                    ) : <Empty description="该表无外键关联" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                  )}
                </>
              )}

              {/* 知识库文档 */}
              {kbDoc && activeTab.startsWith('doc:') && (
                <div style={{ display: 'flex', gap: 16 }}>
                  <div style={{ width: 180, flex: 'none', borderRight: '1px solid #e2e4e9', paddingRight: 12 }}>
                    <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>文档信息</Text>
                    <div style={{ fontSize: 12, color: '#6b7688' }}>
                      <div>标题：{kbDoc.title}</div>
                      <div style={{ marginTop: 4 }}>来源：知识库</div>
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Title level={4}>{kbDoc.title}</Title>
                    <div style={{ maxWidth: 720 }}>
                      <MarkdownDoc markdown={kbDoc.content || '（文档内容为空，请在知识库模块编辑）'} />
                    </div>
                  </div>
                </div>
              )}

              {/* API 接口 */}
              {apiInfo && activeTab.startsWith('ep:') && (
                <div style={{ maxWidth: 720 }}>
                  <Title level={4}>{String(apiInfo.name)}</Title>
                  <Text type="secondary">{String(apiInfo.desc)}</Text>
                  <div style={{ marginTop: 16 }}>
                    <Text strong>协议</Text>
                    <div style={{ marginTop: 8 }}><Tag color="blue">{String(apiInfo.proto)}</Tag></div>
                  </div>
                  <div style={{ marginTop: 16 }}>
                    <Text strong>负责人</Text>
                    <div style={{ marginTop: 8 }}><Tag>{String(apiInfo.owner)}</Tag></div>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
