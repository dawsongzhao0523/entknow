import { useState } from 'react';
import { Alert, Badge, Button, Card, Col, Input, Row, Select, Space, Statistic, Table, Tabs, Tag, Typography, message } from 'antd';
import { ApiOutlined, ArrowRightOutlined, CheckCircleFilled, CloudDownloadOutlined, CloudUploadOutlined, NodeIndexOutlined, SyncOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

/** ① 文档推送任务：M2 知识条目 → Utopia API source（稳定 ID 幂等） */
const PUSH_JOBS = [
  { id: 'kb-001', entry: '供应商准入 SOP', stableId: 'entknow:kb-001', ver: 3, last: '10:02', status: '已同步' },
  { id: 'kb-002', entry: '价格审批规则', stableId: 'entknow:kb-002', ver: 1, last: '09:47', status: '已同步' },
  { id: 'kb-003', entry: '齐套检查作业指导', stableId: 'entknow:kb-003', ver: 5, last: '09:15', status: '重试中 (2/5)' },
  { id: 'kb-004', entry: '来料检验规范 GB/T 2828.1', stableId: 'entknow:kb-004', ver: 2, last: '08:30', status: '已同步' },
  { id: 'kb-005', entry: '库存周转分析月报', stableId: 'entknow:kb-005', ver: 1, last: '—', status: '待推送' },
];

/** ② 观测推送：Statements source，不过 LLM */
const STATEMENTS = [
  { thing: 'PO20261002091', relation: 'status', value: 'FROZEN', when: '2026-10-03 10:17', src: '行动类 · 冻结订单', status: '已入账' },
  { thing: 'AGV-07', relation: 'located_in', value: '华南仓 B2 区', when: '2026-10-03 09:52', src: 'M4 运行时事件', status: '已入账' },
  { thing: 'PO20261002031', relation: 'risk_score', value: '83', when: '2026-10-03 09:30', src: '规则 · 风险重算', status: '已入账' },
];

/** ④ MCP 工具源：挂到 M5 智能问答 / M7 能力出口 */
const MCP_TOOLS = [
  { name: 'entity_facts', desc: '实体事实（含有效期）', time: 'at + as_of', on: true },
  { name: 'search_chunks', desc: '语料全文+语义检索', time: 'as_of', on: true },
  { name: 'paths_between', desc: '两实体间事实链（≤3 跳）', time: 'at + as_of', on: true },
  { name: 'timeline', desc: '实体时序事实', time: 'at', on: true },
  { name: 'changes', desc: '记录时间轴上的变更', time: '记录时间', on: true },
  { name: 'remember', desc: '写入一句事实（待人审）', time: '—', on: false },
];

const FLOWS = [
  { icon: <CloudUploadOutlined />, t: '① 文档推送', d: 'M2 知识条目 → API source', dir: 'entKnow → Utopia', color: '#059669' },
  { icon: <NodeIndexOutlined />, t: '② 观测推送', d: '运行时事件 → Statements（不过 LLM）', dir: 'entKnow → Utopia', color: '#8b5cf6' },
  { icon: <CloudDownloadOutlined />, t: '③ 提案回流', d: 'REST/RDF 拉取 → 语料提取页队列', dir: 'Utopia → entKnow', color: '#0891b2' },
  { icon: <ApiOutlined />, t: '④ MCP 工具源', d: '挂载到 M5 问答 / M7 能力出口', dir: '双向调用', color: '#2d8a4e' },
];

export default function UtopiaIntegration() {
  const nav = useNavigate();
  const [testing, setTesting] = useState(false);

  const tabs = [
    {
      key: 'push', label: '① 文档推送',
      children: (
        <>
          <Alert style={{ marginBottom: 12 }} type="info" showIcon
            message="稳定 ID 幂等：同一 ID 重复推送 = 原地更新，旧内容保留为版本，自动重索引并重提取。删除推送带 deleted:true。推送任务复用 M1 加工流水线调度（UTOPIA_PUSH 节点）。" />
          <Card size="small" title="推送任务" extra={<Button size="small" icon={<SyncOutlined />} onClick={() => message.success('已触发增量推送：2 条待推，1 条重试')}>立即推送</Button>}>
            <Table rowKey="id" size="small" pagination={false} dataSource={PUSH_JOBS}
              columns={[
                { title: '知识条目', dataIndex: 'entry', render: v => <b>{v}</b> },
                { title: '稳定 ID', dataIndex: 'stableId', render: v => <Text code style={{ fontSize: 12 }}>{v}</Text> },
                { title: 'Utopia 版本', dataIndex: 'ver', width: 100, render: v => <Tag>v{v}</Tag> },
                { title: '最近推送', dataIndex: 'last', width: 100, render: v => <Text className="mono" style={{ fontSize: 12 }}>{v}</Text> },
                { title: '状态', dataIndex: 'status', width: 110, render: v => <Tag color={v === '已同步' ? 'green' : v.startsWith('重试') ? 'orange' : 'default'}>{v}</Tag> },
              ]} />
          </Card>
        </>
      ),
    },
    {
      key: 'observe', label: '② 观测推送',
      children: (
        <>
          <Alert style={{ marginBottom: 12 }} type="info" showIcon
            message="Statements source：直接推送抽取契约 {thing, relation, value, when}，不经过 LLM。函数型属性在新观测到达时自动关闭旧值——形成系统观测账本，支撑「08:05 它在哪」类时序问答。" />
          <Card size="small">
            <Table rowKey={r => `${r.thing}${r.when}`} size="small" pagination={false} dataSource={STATEMENTS}
              columns={[
                { title: 'thing', dataIndex: 'thing', render: v => <Text code style={{ fontSize: 12 }}>{v}</Text> },
                { title: 'relation', dataIndex: 'relation', render: v => <Text code style={{ fontSize: 12 }}>{v}</Text> },
                { title: 'value', dataIndex: 'value' },
                { title: 'when', dataIndex: 'when', render: v => <Text className="mono" style={{ fontSize: 12 }}>{v}</Text> },
                { title: '来源', dataIndex: 'src', render: v => <Tag>{v}</Tag> },
                { title: '状态', dataIndex: 'status', width: 90, render: v => <Tag color="green">{v}</Tag> },
              ]} />
          </Card>
        </>
      ),
    },
    {
      key: 'pull', label: '③ 提案回流',
      children: (
        <>
          <Alert style={{ marginBottom: 12 }} type="success" showIcon
            message="裁决单一事实源在 Utopia：entKnow 只缓存展示快照，采纳/拒绝/合并全部回写 Utopia review；采纳的提案映射为注册中心草稿（DRAFT），走既有 IN_REVIEW → PUBLISHED 生命周期。" />
          <Row gutter={12}>
            <Col span={9}>
              <Card size="small" title="拉取配置" style={{ height: '100%' }}>
                <Space direction="vertical" size={10} style={{ width: '100%' }}>
                  <div><Text type="secondary" style={{ fontSize: 12 }}>拉取间隔</Text><div><Select defaultValue="15m" style={{ width: 160 }} options={['5m', '15m', '1h', '手动'].map(v => ({ value: v, label: v }))} /></div></div>
                  <div><Text type="secondary" style={{ fontSize: 12 }}>最近拉取</Text><div><Text className="mono">10:05 · 提案 +3 / 消歧对 +1</Text></div></div>
                  <div><Text type="secondary" style={{ fontSize: 12 }}>初次回填</Text><div><Text className="mono" style={{ fontSize: 12 }}>export?format=jsonld 全量快照（09:00 完成）</Text></div></div>
                  <Button icon={<CloudDownloadOutlined />} onClick={() => message.success('拉取完成：提案 +0 / 消歧对 +0，已是最新')}>立即拉取</Button>
                </Space>
              </Card>
            </Col>
            <Col span={15}>
              <Card size="small" title="回流队列（在语料提取页处理）" style={{ height: '100%' }}>
                {[
                  ['本体提案', 5, '新类/新关系/新属性 → 采纳进注册中心草稿'],
                  ['实体消歧', 3, '合并可逆；人审过的对不再询问'],
                  ['一致性违反', 3, '撤回事实 / 放宽公理 / 接受共存'],
                  ['丢弃记录', 35, '只读展示，定位提取损耗'],
                ].map(([t, n, d]) => (
                  <div key={t as string} onClick={() => nav('/m3/modeling?tab=extract')}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 4px', borderTop: '1px solid #f1f3f5', cursor: 'pointer' }}>
                    <Badge count={n as number} color="#059669" />
                    <b style={{ width: 90 }}>{t}</b>
                    <Text type="secondary" style={{ fontSize: 12, flex: 1 }}>{d}</Text>
                    <ArrowRightOutlined style={{ color: '#6b7688' }} />
                  </div>
                ))}
              </Card>
            </Col>
          </Row>
        </>
      ),
    },
    {
      key: 'mcp', label: '④ MCP 工具源',
      children: (
        <>
          <Alert style={{ marginBottom: 12 }} type="warning" showIcon
            message="remember 写入一律待人审：Agent 经 MCP 写入的内容进入 Utopia 评审队列，并在 M8 评审台露出——双端治理闭环，写路径无绕过。" />
          <Card size="small" title="Utopia KB 挂载的工具（M5 智能问答 / M7 能力出口可调用）"
            extra={<a onClick={() => nav('/m7/capability')}>能力出口配置 →</a>}>
            <Table rowKey="name" size="small" pagination={false} dataSource={MCP_TOOLS}
              columns={[
                { title: '工具', dataIndex: 'name', render: v => <Text code>{v}</Text> },
                { title: '能力', dataIndex: 'desc' },
                { title: '时间轴', dataIndex: 'time', width: 130, render: v => <Tag color="purple">{v}</Tag> },
                { title: '状态', dataIndex: 'on', width: 90, render: v => v ? <Tag color="green">已挂载</Tag> : <Tag>未启用</Tag> },
              ]} />
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 10 }}>
              at = 世界时间（何时成立）· as_of = 记录时间（当时库里知道什么）——支撑「2024 年 3 月适用的条款」与「当时库里的记录」两类问题。
            </Text>
          </Card>
        </>
      ),
    },
  ];

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>Utopia 集成</Title>
          <Text type="secondary">语料提取引擎 + 双时态事实账本作为外部服务接入；仅使用官方接口边界（REST / Ingest 契约 / MCP / RDF export）</Text>
        </div>
        <div style={{ flex: 1 }} />
      </div>

      {/* 连接配置 */}
      <Card size="small" style={{ marginBottom: 12 }}
        title={<Space><CheckCircleFilled style={{ color: '#2d8a4e' }} /> 连接配置 <Tag color="green">已连通 · 延迟 42ms</Tag></Space>}
        extra={<Button size="small" loading={testing} onClick={() => { setTesting(true); setTimeout(() => { setTesting(false); message.success('连通正常：kb_supply_chain · 12 文档 · 138 实体'); }, 800); }}>测试连接</Button>}>
        <Space size={24} wrap>
          <div><Text type="secondary" style={{ fontSize: 12 }}>服务地址</Text><div><Input defaultValue="https://utopia.internal:8443" style={{ width: 260 }} /></div></div>
          <div><Text type="secondary" style={{ fontSize: 12 }}>访问令牌 (PAT)</Text><div><Input.Password defaultValue="utp_pat_demo_token" style={{ width: 220 }} /></div></div>
          <div><Text type="secondary" style={{ fontSize: 12 }}>绑定知识库</Text><div><Select defaultValue="kb1" style={{ width: 220 }} options={[{ value: 'kb1', label: 'kb_supply_chain（供应链）' }, { value: 'kb2', label: 'kb_contracts（合同链）' }]} /></div></div>
          <div><Text type="secondary" style={{ fontSize: 12 }}>令牌范围</Text><div><Space size={4}><Tag color="blue">read</Tag><Tag color="orange">write</Tag></Space></div></div>
        </Space>
      </Card>

      {/* 四条集成链路 */}
      <Row gutter={12} style={{ marginBottom: 12 }}>
        {FLOWS.map(f => (
          <Col span={6} key={f.t}>
            <Card size="small">
              <Space align="start">
                <span style={{ fontSize: 20, color: f.color }}>{f.icon}</span>
                <div>
                  <b>{f.t}</b> <Tag style={{ marginLeft: 2, fontSize: 11 }}>{f.dir}</Tag>
                  <div><Text type="secondary" style={{ fontSize: 12 }}>{f.d}</Text></div>
                </div>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>

      <Card size="small" style={{ marginBottom: 12 }}>
        <Space size={48} wrap>
          <Statistic title="已推送文档" value={4} suffix="/ 5" />
          <Statistic title="观测入账" value={1286} />
          <Statistic title="回流提案（累计）" value={41} />
          <Statistic title="MCP 今日调用" value={312} />
        </Space>
      </Card>

      <Tabs items={tabs} />
    </>
  );
}
