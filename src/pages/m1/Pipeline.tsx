import React from 'react';
import { Card, Tag, Button, Space, Typography, Alert, Input } from 'antd';
import { ArrowRightOutlined, ArrowDownOutlined, PlusOutlined } from '@ant-design/icons';
import { ok, run, edit, info } from '../../components/proto';

const { Title, Text } = Typography;

const NODES = [
  { id: 'src', title: '源', en: 'purchase_order', color: '#059669' },
  { id: 'dedup', title: '去重', en: 'po_id', color: '#0ea5e9' },
  { id: 'map', title: '值映射', en: 'status', color: '#8b5cf6', selected: true },
  { id: 'unit', title: '单位', en: '分→元', color: '#c9861a' },
  { id: 'out', title: '输出', en: '联邦层', color: '#2d8a4e' },
];

const MAPPINGS = [
  { from: '0', to: '待审批' },
  { from: '1', to: '已审批' },
  { from: '2', to: '已下达' },
  { from: '3', to: '已发货' },
  { from: '4', to: '已收货' },
  { from: '9', to: '已关闭' },
];

const nodeStyle = (selected?: boolean): React.CSSProperties => ({
  border: selected ? '2px solid #8b5cf6' : '1px solid #d9d9d9',
  borderRadius: 8, padding: '8px 14px', minWidth: 110, background: '#fff',
  boxShadow: selected ? '0 0 0 3px rgba(124,58,237,0.12)' : undefined,
});

export default function Pipeline() {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>
            <Tag>草稿</Tag>
            <span className="mono">po_clean_pipeline</span>
          </Title>
          <Text type="secondary">管道编排 · 5 个节点 + 1 条异常分支</Text>
        </div>
        <div style={{ flex: 1 }} />
        <Space>
          <Button onClick={() => ok('试运行完成：1,000 行 → 998 行 · 2 行进入异常队列 · 耗时 3.4s')}>试运行</Button>
          <Button type="primary" onClick={() => run('发布管道', '发布后按调度计划生效，下游逻辑视图将自动感知新版本。')}>发布</Button>
        </Space>
      </div>

      <Card title="执行画布" extra={<Text type="secondary" style={{ fontSize: 12 }}>选中节点：值映射 status · 双击节点编辑配置</Text>} style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '16px 0' }}>
          {NODES.map((n, i) => (
            <React.Fragment key={n.id}>
              {i > 0 && <ArrowRightOutlined style={{ color: '#6b7688' }} />}
              <div style={nodeStyle(n.selected)}>
                <Space size={8}>
                  <span style={{ width: 20, height: 20, borderRadius: 4, background: n.color, display: 'inline-block' }} />
                  <span>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{n.title}</div>
                    <Text type="secondary" className="mono" style={{ fontSize: 11 }}>{n.en}</Text>
                  </span>
                </Space>
              </div>
            </React.Fragment>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 150 }}>
          <ArrowDownOutlined style={{ color: '#c9861a' }} />
          <Tag color="warning">异常分支</Tag>
          <div style={nodeStyle()}>
            <Space size={8}>
              <span style={{ width: 20, height: 20, borderRadius: 4, background: '#dc2626', display: 'inline-block' }} />
              <span>
                <div style={{ fontWeight: 600, fontSize: 13 }}>异常标记</div>
                <Text type="secondary" className="mono" style={{ fontSize: 11 }}>amount&lt;0</Text>
              </span>
            </Space>
          </div>
          <Text type="secondary" style={{ fontSize: 12 }}>⇢ 异常队列（虚线汇入输出前）</Text>
        </div>
      </Card>

      <Card
        title={<span>节点配置：值映射 <Text className="mono">status</Text></span>}
        extra={<Tag color="purple">画布选中节点</Tag>}
      >
        <Text strong style={{ fontSize: 13 }}>映射关系（源值 → 目标值）</Text>
        <Space wrap size={8} style={{ marginTop: 8, marginBottom: 8 }}>
          {MAPPINGS.map(m => (
            <Tag key={m.from} style={{ height: 24, lineHeight: '22px' }}>
              <span className="mono">{m.from}</span> → {m.to}
            </Tag>
          ))}
          <Button size="small" icon={<PlusOutlined />} onClick={() => edit('新增映射关系', [
            ['源值', <Input key="f" className="mono" placeholder="5" style={{ width: 120 }} />],
            ['目标值', <Input key="t" placeholder="已完成" style={{ width: 160 }} />],
          ])}>映射</Button>
        </Space>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            作用于字段 <Text className="mono">status</Text>（tinyint）· 在去重节点之后执行
          </Text>
        </div>
        <Alert
          style={{ marginTop: 12 }} type="info" showIcon
          message={<span><b>试运行结果：</b>输入 <b className="mono">1,000</b> 行 → 输出 <b className="mono">998</b> 行（<b className="mono">2</b> 行进入异常队列）</span>}
          action={<Button size="small" type="link" onClick={() => info('异常样本（2 行）', [
            ['ROW-0407', <span key="a" className="mono">po_id=PO-E-0407 · amount=-320.00</span>],
            ['ROW-0912', <span key="b" className="mono">po_id=PO-E-0912 · amount=-88.50</span>],
            ['处理建议', '负金额 → 校验采购红冲流程；进入异常队列后可人工修复重放'],
          ])}>查看样本</Button>}
        />
      </Card>
    </>
  );
}
