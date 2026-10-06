import { useState } from 'react';
import { Avatar, Button, Card, Input, List, Space, Tag, Typography, message } from 'antd';
import { RollbackOutlined, SendOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Text, Paragraph } = Typography;

const PROPOSAL = `object 采购订单 {
  kind: 单体动态
  state: 草稿 → 已下达 → 已发货 → 已收货 → 已关闭
  异常态: 已取消 / 已冻结
}
edge SUPPLY {
  from: 供应商, to: 工厂, cardinality: N:M
  props: qty, delay, cost〔时序·月度〕
}
func 交付风险分(po: 采购订单) → score: decimal(0-100) {
  0.5*norm(SUPPLY.delay趋势) + 0.3*(1-齐套率) + 0.2*(1-在途覆盖)
}`;

const GAPS = [
  { text: 'SUPPLY 缺时延约束（max_delay）', level: 'warning' },
  { text: '采购订单缺权限函数（金额字段可见性）', level: 'warning' },
  { text: '状态机异常态未闭环：已取消 / 已冻结无迁移出口', level: 'error' },
] as const;

interface Snapshot { id: string; title: string; time: string }

export default function AiSession() {
  const nav = useNavigate();
  const [applied, setApplied] = useState(false);
  const [draft, setDraft] = useState('');
  const [extra, setExtra] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([
    { id: 'S-014', title: '需求澄清 · 目标问题已确认', time: '10:12' },
    { id: 'S-015', title: '数据选择 · scm_prod.purchase_order', time: '10:18' },
  ]);

  const send = () => {
    const v = draft.trim();
    if (!v) return;
    setExtra(c => [...c, { role: 'user', text: v }, { role: 'ai', text: '已理解。该变更将以草稿形式加入提案，提交评审后生效（mock 应答）。' }]);
    setDraft('');
  };

  const adopt = () => {
    if (applied) return;
    setApplied(true);
    setSnapshots(s => [...s, { id: 'S-016', title: '建模提案 #12 已采纳（对象1 + 关系2 + 函数1）', time: '10:26' }]);
    message.success('提案已应用到画布，快照 S-016 已生成');
  };

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>AI 协作建模 · 会话 #47</Title>
          <Text type="secondary">AI FDE：自然语言 → 声明式建模提案 → 专家采纳入库（M3-F05）</Text>
        </div>
        <div style={{ flex: 1 }} />
        <Space>
          <Tag color="blue">订单交付风险场景</Tag>
          <Tag color="green">● 进行中</Tag>
        </Space>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        {/* 左：会话流 */}
        <Card size="small" style={{ flex: 1, minWidth: 0 }} title="会话流">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <Avatar style={{ background: '#0ea5e9', flex: 'none' }}>张</Avatar>
              <div style={{ background: '#f1f3f5', borderRadius: '4px 12px 12px 12px', padding: '8px 14px', fontSize: 13 }}>
                <div style={{ fontSize: 11, color: '#6b7688', marginBottom: 2 }}>张工</div>
                把订单交付风险建出来 —— 我要能回答「这张订单会不会逾期，逾期会拖累哪些客户」
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <Avatar style={{ background: '#8b5cf6', flex: 'none' }}>AI</Avatar>
              <div style={{ flex: 1, background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: '4px 12px 12px 12px', padding: '10px 14px', fontSize: 13 }}>
                <div style={{ fontSize: 11, color: '#6b7688', marginBottom: 4 }}>ontology-agent · 建模提案 #12（对象 1 + 关系 2 + 派生函数 1）</div>
                <Paragraph style={{ marginBottom: 8, fontSize: 12.5 }}>
                  基于 scm_prod 数据资产与 KB-供应链语料，生成以下声明式提案（BKN DSL）：
                </Paragraph>
                <pre style={{ background: '#0d1420', color: '#e2e4e9', borderRadius: 8, padding: '12px 14px', fontSize: 11.5, lineHeight: 1.7, overflow: 'auto', margin: 0 }}>
                  {PROPOSAL}
                </pre>
                <div style={{ fontSize: 11.5, color: '#6b7688', margin: '8px 0' }}>影响：新增 2 个对象引用 · Lint 通过 · 预计绑定 3 张表</div>
                <Space>
                  <Button size="small" type="primary" disabled={applied} onClick={adopt}>{applied ? '✓ 已采纳' : '采纳全部'}</Button>
                  <Button size="small" disabled={applied} onClick={() => nav('/m3/designer')}>逐条评审</Button>
                </Space>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#cbd5e1', fontSize: 11.5, margin: '14px 0' }}>
            <div style={{ flex: 1, height: 1, background: '#e2e4e9' }} />
            本轮快照已保存，可随时回滚
            <div style={{ flex: 1, height: 1, background: '#e2e4e9' }} />
          </div>

          <Space.Compact style={{ width: '100%' }}>
            <Input
              placeholder="输入消息，@ 可指定 planning / ontology / executor 执行…"
              value={draft} onChange={e => setDraft(e.target.value)} onPressEnter={send}
            />
            <Button type="primary" icon={<SendOutlined />} onClick={send}>发送</Button>
          </Space.Compact>
          {extra.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
              {extra.map((m, i) => (
                <div key={i} style={{ display: 'flex', gap: 10 }}>
                  <Avatar style={{ background: m.role === 'user' ? '#0ea5e9' : '#8b5cf6', flex: 'none' }}>{m.role === 'user' ? '张' : 'AI'}</Avatar>
                  <div style={{ background: m.role === 'user' ? '#f1f3f5' : '#faf5ff', border: m.role === 'user' ? undefined : '1px solid #e9d5ff', borderRadius: '4px 12px 12px 12px', padding: '8px 14px', fontSize: 13 }}>{m.text}</div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* 右：缺口检查 + 快照 */}
        <div style={{ width: 330, flex: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Card size="small" title="设计缺口检查" extra={<Tag color="orange">3 项</Tag>}>
            <List
              size="small" dataSource={GAPS as unknown as { text: string; level: string }[]}
              renderItem={g => (
                <List.Item style={{ padding: '6px 0', fontSize: 12.5 }}>
                  <Tag color={g.level === 'error' ? 'red' : 'orange'} style={{ flex: 'none' }}>⚠</Tag>
                  {g.text}
                </List.Item>
              )}
            />
          </Card>

          <Card size="small" title="快照列表" extra={<Text type="secondary" style={{ fontSize: 12 }}>可回滚</Text>}>
            <List
              size="small" dataSource={snapshots}
              renderItem={s => (
                <List.Item
                  style={{ padding: '6px 0' }}
                  actions={[<Button key="r" size="small" type="link" icon={<RollbackOutlined />}
                    onClick={() => message.success(`已回滚到快照 ${s.id}`)}>回滚</Button>]}
                >
                  <div style={{ fontSize: 12.5 }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, marginRight: 8 }}>{s.id}</span>
                    {s.title}
                    <div style={{ fontSize: 11, color: '#6b7688' }}>{s.time}</div>
                  </div>
                </List.Item>
              )}
            />
          </Card>
        </div>
      </div>
    </>
  );
}
