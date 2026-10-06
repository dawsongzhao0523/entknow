import { Alert, Card, Col, Row, Space, Tag, Typography } from 'antd';

const { Title, Text } = Typography;

const TERMINAL = `$ entknow get object 供应商 S-0012 --as-context
  → 返回最小本体切片(JSON): 对象+直接关系+权限内属性 · 1.2KB
{
  "object": { "id": "SUP-0012", "type": "供应商", "name": "S-0012" },
  "props": { "risk_score": 87, "on_time_rate": 0.91 },
  "relations": [ { "rel": "supplies", "to": "PO/PO20260930001" } ],
  "acl": "filtered_by_caller" }

$ entknow query "逾期的高风险采购订单" --format table
  PO_ID            供应商    逾期天  风险分  状态
  PO20260930001    S-0012      9       87    高风险 · 建议冻结
  PO20260921004    S-208      14       93    高风险 · 断供关联
  2 行 · 213ms · 结果已按调用者权限过滤

$ entknow action run 冻结订单 --po PO20260930001 --dry-run
  → 沙盘预览影响后输出确认令牌，人工确认才真正执行
  ⏳ 沙盘预览: 30 天内影响 PO 1 张 · 关联工单 2 个 · 交付风险总分 -120
  ✅ 预览完成 · 确认令牌: FRZ-9F3A-7QK2 (10 分钟内有效)

$ entknow action run 冻结订单 --po PO20260930001 --token FRZ-9F3A-7QK2
  ✅ 已执行 · 回执 RC-20261002-0448 · 审计已记录
$ ▊`;

const CHANNELS = [
  { tag: 'MCP', color: 'blue', title: 'Agent 内嵌', desc: 'Agent 在对话与编排中直接调用本体工具', code: 'ontology.query.semantic(…)' },
  { tag: 'REST', color: 'purple', title: '系统集成', desc: 'ERP / MES 等外部系统经 API 网关调用', code: 'POST /api/v1/action/po.freeze' },
  { tag: 'CLI', color: 'default', title: '工程师与脚本', desc: '本地终端与自动化脚本直接操作本体', code: '$ entknow query "…"' },
];

export default function Cli() {
  return (
    <>
      <div style={{ marginBottom: 12 }}>
        <Title level={4} style={{ margin: 0 }}>CLI 出口</Title>
        <Text type="secondary">工程师与脚本专用出口· 已登录 · 企业 SSO</Text>
      </div>
      <Row gutter={12}>
        <Col span={15}>
          <Card styles={{ body: { padding: 0 } }} style={{ background: '#0d1420', border: 'none' }}>
            <pre className="mono" style={{ margin: 0, padding: 20, color: '#e5e7eb', fontSize: 12.5, lineHeight: 1.85, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {TERMINAL}
            </pre>
          </Card>
        </Col>
        <Col span={9}>
          <Card title="与 MCP / REST 的关系" style={{ height: '100%' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              同一能力出口层三种封装，底层是同一份能力与数据：
            </Text>
            <Space direction="vertical" size={10} style={{ width: '100%', marginTop: 12 }}>
              {CHANNELS.map(c => (
                <div key={c.tag} style={{ border: '1px solid #f1f3f5', borderRadius: 10, padding: '10px 12px' }}>
                  <Space><Tag color={c.color}>{c.tag}</Tag><b>{c.title}</b></Space>
                  <div><Text type="secondary" style={{ fontSize: 12 }}>{c.desc}</Text></div>
                  <div className="mono" style={{ background: '#f8fbfa', borderRadius: 6, padding: '4px 10px', fontSize: 11, marginTop: 6 }}>{c.code}</div>
                </div>
              ))}
            </Space>
          </Card>
        </Col>
      </Row>
      <Alert type="info" showIcon style={{ marginTop: 12 }}
        message="三种封装共用同一能力出口层：无论从哪个入口调用，权限按调用者身份过滤、回执结构一致、审计写入同一日志流。" />
    </>
  );
}
