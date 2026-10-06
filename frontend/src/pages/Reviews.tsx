import { useCallback, useEffect, useState } from 'react';
import { App, Button, Card, Input, Modal, Popconfirm, Select, Space, Table, Tag, Tooltip, Typography } from 'antd';
import { CheckOutlined, CloseOutlined, PlusOutlined, RollbackOutlined } from '@ant-design/icons';
import { api, type Review } from '../api';

const { Title, Text } = Typography;

const statusColor: Record<string, string> =
  { 评审中: 'orange', 待评审: 'blue', 已通过: 'green', 已驳回: 'red', 已撤回: 'default' };
const TERMINAL = ['已通过', '已驳回', '已撤回'];
const ME = '张三';
const TYPES = ['本体发布', '术语归并', '冲突裁决', '自进化补丁'];

/** 评审与发布：替代原型 proto.tsx 弹窗的真实裁决闭环（事务 + 幂等 + 乐观并发） */
export default function Reviews() {
  const { message } = App.useApp();
  const [rows, setRows] = useState<Review[]>([]);
  const [err, setErr] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [rejecting, setRejecting] = useState<Review | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [form, setForm] = useState({ title: '', type: TYPES[0], sla: '剩 3 天' });

  const reload = useCallback(() => {
    api.reviews().then(setRows).catch(e => setErr(String(e.message ?? e)));
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const decide = async (r: Review, action: 'approve' | 'reject' | 'withdraw', comment?: string) => {
    try {
      const out = await api.decideReview(r.id, action, ME, comment, r.status);
      message.success(`「${r.title}」→ ${out.status}${out.decidedBy ? `（${out.decidedBy}）` : ''}`);
      setRejecting(null);
      setRejectReason('');
      reload();
    } catch (e) {
      message.error(String((e as Error).message));
    }
  };

  const create = async () => {
    if (!form.title.trim()) { message.warning('请填写评审项标题'); return; }
    const id = `RV-${Date.now().toString(36).toUpperCase()}`;
    try {
      await api.createReview({ id, title: form.title.trim(), type: form.type, from: ME, sla: form.sla });
      message.success(`评审已创建：${id}（重复提交同 ID 将幂等返回）`);
      setCreateOpen(false);
      setForm({ title: '', type: TYPES[0], sla: '剩 3 天' });
      reload();
    } catch (e) {
      message.error(String((e as Error).message));
    }
  };

  return (
    <div>
      <Title level={4}>评审与发布</Title>
      <Text type="secondary">治理闭环的第一个真实写路径：裁决经状态机校验，事务内落库并生成通知
        （POST /api/v1/reviews · PUT /api/v1/reviews/:id/decision）</Text>
      {err && <Card style={{ marginTop: 12 }}>API 异常：{err}</Card>}

      <Card size="small" style={{ marginTop: 12 }}
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>新建评审</Button>}>
        <Table<Review> size="small" rowKey="id" pagination={false} dataSource={rows}
          columns={[
            { title: '评审项', dataIndex: 'title', render: (v: string) => <b>{v}</b> },
            { title: '类型', dataIndex: 'type', width: 100 },
            { title: '提出人', dataIndex: 'from', width: 76 },
            { title: '状态', dataIndex: 'status', width: 84, render: (v: string) => <Tag color={statusColor[v]}>{v}</Tag> },
            { title: 'SLA', dataIndex: 'sla', width: 84 },
            { title: '裁决人', dataIndex: 'decidedBy', width: 76, render: (v?: string) => v || '—' },
            { title: '裁决说明', dataIndex: 'comment', ellipsis: true,
              render: (v?: string) => v ? <Tooltip title={v}><Text type="secondary">{v}</Text></Tooltip> : '—' },
            { title: '操作', key: 'op', width: 210, render: (_, r) => TERMINAL.includes(r.status) ? (
              <Text type="secondary" style={{ fontSize: 12 }}>已完结</Text>
            ) : (
              <Space size={4}>
                <Popconfirm title={`通过「${r.title}」？`} onConfirm={() => decide(r, 'approve')}>
                  <Button size="small" type="link" icon={<CheckOutlined />}>通过</Button>
                </Popconfirm>
                <Button size="small" type="link" danger icon={<CloseOutlined />}
                  onClick={() => { setRejecting(r); setRejectReason(''); }}>驳回</Button>
                <Popconfirm title={`撤回「${r.title}」？`} onConfirm={() => decide(r, 'withdraw')}>
                  <Button size="small" type="link" icon={<RollbackOutlined />}>撤回</Button>
                </Popconfirm>
              </Space>
            ) },
          ]} />
      </Card>

      <Modal title="驳回评审（必填原因）" open={!!rejecting} onOk={() => {
        if (!rejectReason.trim()) { message.warning('驳回必须填写原因'); return; }
        decide(rejecting!, 'reject', rejectReason.trim());
      }} onCancel={() => setRejecting(null)} okText="确认驳回" okButtonProps={{ danger: true }} cancelText="取消">
        <Text type="secondary">{rejecting?.title}</Text>
        <Input.TextArea rows={3} style={{ marginTop: 8 }} placeholder="驳回原因（将随通知发给提交人）"
          value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
      </Modal>

      <Modal title="新建评审" open={createOpen} onOk={create} onCancel={() => setCreateOpen(false)}
        okText="创建（幂等）" cancelText="取消">
        <Space direction="vertical" style={{ width: '100%' }} size={10}>
          <Input placeholder="评审项标题，如：质量追溯本体 v1.1：+批次关系"
            value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          <Select style={{ width: '100%' }} value={form.type} options={TYPES.map(v => ({ value: v, label: v }))}
            onChange={v => setForm(f => ({ ...f, type: v }))} />
          <Input placeholder="SLA 展示文案" value={form.sla} onChange={e => setForm(f => ({ ...f, sla: e.target.value }))} />
          <Text type="secondary" style={{ fontSize: 12 }}>评审 ID 由前端确定性生成（RV-时间戳），重复提交幂等返回既有记录。</Text>
        </Space>
      </Modal>
    </div>
  );
}
