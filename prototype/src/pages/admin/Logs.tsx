import { Button, Card, DatePicker, Input, Select, Space, Table, Tag, Typography } from 'antd';
import { ok, info } from '../../components/proto';
import { DownloadOutlined, SearchOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface LogRow {
  id: string; time: string; module: string; level: 'INFO' | 'WARN' | 'ERROR';
  operator: string; content: string; traceId: string;
}

const LEVEL_COLOR = { INFO: 'blue', WARN: 'orange', ERROR: 'red' } as const;

const LOGS: LogRow[] = [
  { id: 'l1', time: '2026-10-03 09:58:12', module: '数据资产', level: 'INFO', operator: '系统', content: 'CDC 断连恢复：mes_prod 重连成功，补拉 binlog 位点 882311 → 884207', traceId: 'tr-9f2a01' },
  { id: 'l2', time: '2026-10-03 09:45:37', module: '数据资产', level: 'INFO', operator: '张三', content: '视图发布推送：CREATE VIEW lv_order_delivery v3 成功（StarRocks 联邦层，12 字段）', traceId: 'tr-8c1e55' },
  { id: 'l3', time: '2026-10-03 09:31:04', module: '本体运行时', level: 'INFO', operator: '计划主管(陈晓琳)', content: 'Action 冻结订单 执行回执：PO20260930001 → 已冻结，确认令牌 ack-7721，可回滚', traceId: 'tr-77aa19' },
  { id: 'l4', time: '2026-10-02 18:44:02', module: '本体运行时', level: 'INFO', operator: '系统', content: '传播引擎规则 R1 触发：SUPPLY.delay 月均值 +23% → 采购订单.交付风险分 71→76 重算', traceId: 'tr-5d09c3' },
  { id: 'l5', time: '2026-10-02 17:12:48', module: '知识运营', level: 'WARN', operator: '王五', content: '术语归并冲突：「供应商 ≈ 供货商」与既有锚点 QUALIFIES 边存在 2 处引用，转评审 RV-2026-1002-001', traceId: 'tr-41bf08' },
  { id: 'l6', time: '2026-10-02 15:03:11', module: '推理演绎', level: 'INFO', operator: '王五', content: '语义查询：「华兴电子近三月准时率」→ DSL 编译成功，命中 lv_supplier_ontime，耗时 842ms', traceId: 'tr-33d7e2' },
  { id: 'l7', time: '2026-10-02 11:26:55', module: '治理演化', level: 'WARN', operator: '系统', content: '发布门禁告警：沙盘验证 warn（交付风险分 v0.2 未回归），评审 RV-2026-1002-003 挂起', traceId: 'tr-2a91f6' },
  { id: 'l8', time: '2026-10-02 08:12:30', module: '数据资产', level: 'ERROR', operator: '系统', content: 'scm_prod CRON 抽取超时（>30min）：purchase_order 增量批次 #4812 失败，已自动重试成功', traceId: 'tr-10ce77' },
  { id: 'l9', time: '2026-10-01 22:40:19', module: '系统管理', level: 'INFO', operator: '赵六', content: '角色权限变更：智能体开发 角色新增 本体运行时 Action 执行网关（编辑），已发布生效', traceId: 'tr-0e5b42' },
  { id: 'l10', time: '2026-10-01 16:02:03', module: '智能应用', level: 'INFO', operator: '系统', content: '能力出口调用：supplier_risk_agent 经 MCP 调用 run_action（dry-run），返回沙箱结果', traceId: 'tr-08d319' },
];

export default function Logs() {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>日志查询</Title>
          <Text type="secondary">平台运行日志与审计事件统一检索</Text>
        </div>
        <div style={{ flex: 1 }} />
        <Button icon={<DownloadOutlined />} onClick={() => ok('日志已导出：audit_20261004.csv（12,841 条，后台生成后可下载）')}>导出</Button>
      </div>
      <Card>
        <Space style={{ marginBottom: 12 }} wrap>
          <DatePicker.RangePicker showTime style={{ width: 340 }} />
          <Select defaultValue="all" style={{ width: 150 }} options={[
            { value: 'all', label: '模块：全部' },
            ...['数据资产', '知识运营', '本体建模', '本体运行时', '推理演绎', '推演沙盘', '智能应用', '治理演化', '系统管理'].map(m => ({ value: m, label: m })),
          ]} />
          <Select defaultValue="all" style={{ width: 130 }} options={[
            { value: 'all', label: '级别：全部' },
            { value: 'INFO', label: 'INFO' }, { value: 'WARN', label: 'WARN' }, { value: 'ERROR', label: 'ERROR' },
          ]} />
          <Input placeholder="关键字 / TraceID" style={{ width: 220 }} allowClear />
          <Button type="primary" icon={<SearchOutlined />} onClick={() => ok('查询完成：命中 12,841 条 · 耗时 0.4s')}>查询</Button>
        </Space>
        <Table<LogRow>
          rowKey="id" size="middle" dataSource={LOGS}
          pagination={{ total: 12841, pageSize: 10, showTotal: t => `共 ${t.toLocaleString()} 条` }}
          columns={[
            { title: '时间', dataIndex: 'time', key: 'time', width: 170, render: (v: string) => <Text className="mono" style={{ fontSize: 12 }}>{v}</Text> },
            { title: '模块', dataIndex: 'module', key: 'module', width: 70, render: (v: string) => <Tag>{v}</Tag> },
            { title: '级别', dataIndex: 'level', key: 'level', width: 80, render: (v: LogRow['level']) => <Tag color={LEVEL_COLOR[v]}>{v}</Tag> },
            { title: '操作人', dataIndex: 'operator', key: 'operator', width: 140 },
            { title: '内容', dataIndex: 'content', key: 'content' },
            { title: 'TraceID', dataIndex: 'traceId', key: 'traceId', width: 110, render: (v: string) => <Text className="mono" style={{ fontSize: 12 }}>{v}</Text> },
            { title: '操作', key: 'ops', width: 70, render: (_: unknown, r: LogRow) => <Button size="small" type="link" onClick={() => info(`日志详情 · ${r.id}`, [
              ['时间', <span key="t" className="mono">{r.time}</span>],
              ['模块 / 级别', `${r.module} · ${r.level}`],
              ['操作人', r.operator],
              ['内容', r.content],
              ['TraceID', <span key="tr" className="mono">{r.traceId}</span>],
              ['上下文', '调用链 6 跳 · 关联 Action ACT-1003-1017（原型示意）'],
            ])}>详情</Button> },
          ]} />
      </Card>
    </>
  );
}
