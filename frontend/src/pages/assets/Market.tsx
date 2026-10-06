import { useCallback, useEffect, useState } from 'react';
import {
  App, Badge, Button, Card, Col, Form, Input, Modal, Popconfirm, Row, Select,
  Space, Table, Tabs, Tag, Typography,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { api, type MarketItem, type MarketRequest } from '../../api';
import { useSession } from '../../session';

const { Title, Text } = Typography;

const TYPE_COLOR: Record<string, string> = { '表': 'blue', VIEW: 'cyan', API: 'default', 'KB 文档': 'purple', '代码索引': 'geekblue' };
const empty = { id: '', name: '', comment: '', type: '表', source: '', domain: '供应链', sensitive: 'L2', owner: '', freq: '', status: '审核中', subscribers: 0 };

/** 数据集市：可消费资产目录（真实 CRUD）+ 权限申请审批流 */
export default function Market() {
  const { message } = App.useApp();
  const { user } = useSession();
  const [items, setItems] = useState<MarketItem[]>([]);
  const [reqs, setReqs] = useState<MarketRequest[]>([]);
  const [form] = Form.useForm();
  const [editing, setEditing] = useState<MarketItem | null>(null);
  const [open, setOpen] = useState(false);

  const reload = useCallback(() => {
    api.marketItems().then(setItems).catch(e => message.error(String(e.message)));
    api.marketRequests().then(setReqs).catch(() => {});
  }, [message]);

  useEffect(() => { reload(); }, [reload]);

  const save = async () => {
    const v = await form.validateFields();
    try {
      if (editing) {
        await api.updateMarketItem(editing.id, { ...editing, ...v, id: editing.id });
        message.success('资产已更新');
      } else {
        await api.createMarketItem({ ...empty, ...v, id: `mk-${Date.now().toString(36)}` });
        message.success('资产已登记（审核中）');
      }
      setOpen(false); reload();
    } catch (e) { message.error(String((e as Error).message)); }
  };

  const catalog = (
    <Card size="small" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => {
      setEditing(null); form.resetFields(); setOpen(true);
    }}>登记资产</Button>}>
      <Row gutter={[12, 12]}>
        {items.map(m => (
          <Col span={8} key={m.id}>
            <Card size="small" hoverable actions={[
              <span key="req" onClick={() => {
                api.requestMarketItem(m.id, { applicant: user, reason: '工作台申请' })
                  .then(() => { message.success('申请已提交（待审批）'); reload(); })
                  .catch(e => message.error(String((e as Error).message)));
              }}>{m.status === '上架' ? '申请权限' : '不可申请'}</span>,
              <span key="edit" onClick={() => {
                setEditing(m);
                form.setFieldsValue({ name: m.name, comment: m.comment, type: m.type, source: m.source, domain: m.domain, sensitive: m.sensitive, owner: m.owner, freq: m.freq, status: m.status });
                setOpen(true);
              }}>编辑</span>,
              <Popconfirm key="del" title={`下架并删除「${m.name}」？`} onConfirm={async () => {
                try { await api.deleteMarketItem(m.id); message.success('已删除'); reload(); }
                catch (e) { message.error(String((e as Error).message)); }
              }}><span style={{ color: '#c23b3b' }}>删除</span></Popconfirm>,
            ]}>
              <Card.Meta
                title={<Space><b className="mono">{m.name}</b><Tag color={TYPE_COLOR[m.type] ?? 'default'}>{m.type}</Tag></Space>}
                description={<>
                  <div>{m.comment} · <Text type="secondary">{m.source}</Text></div>
                  <div style={{ marginTop: 6 }}>
                    <Tag>{m.domain}</Tag><Tag color={m.sensitive === 'L3' ? 'orange' : 'default'}>{m.sensitive}</Tag>
                    <Badge status={m.status === '上架' ? 'success' : m.status === '审核中' ? 'processing' : 'default'} text={`${m.status} · ${m.subscribers} 订阅`} />
                  </div>
                </>} />
            </Card>
          </Col>
        ))}
      </Row>
    </Card>
  );

  const approvals = (
    <Card size="small">
      <Table<MarketRequest> size="small" rowKey="id" dataSource={reqs} pagination={false}
        columns={[
          { title: '资产', dataIndex: 'itemName', render: (v: string) => <b className="mono">{v}</b> },
          { title: '申请人', dataIndex: 'applicant', width: 90 },
          { title: '理由', dataIndex: 'reason' },
          { title: '状态', dataIndex: 'status', width: 90, render: (v: string) => (
            <Tag color={v === '已通过' ? 'green' : v === '已驳回' ? 'red' : 'blue'}>{v}</Tag>) },
          { title: '时间', dataIndex: 'at', width: 130, render: (v: string) => <span className="mono" style={{ fontSize: 12 }}>{v}</span> },
          { title: '操作', key: 'op', width: 140, render: (_, r) => r.status === '待审批' ? (
            <Space size={0}>
              <Button size="small" type="link" onClick={async () => {
                try { await api.decideMarketRequest(r.id, 'approve'); message.success('已通过'); reload(); }
                catch (e) { message.error(String((e as Error).message)); }
              }}>通过</Button>
              <Button size="small" type="link" danger onClick={async () => {
                try { await api.decideMarketRequest(r.id, 'reject'); message.success('已驳回'); reload(); }
                catch (e) { message.error(String((e as Error).message)); }
              }}>驳回</Button>
            </Space>
          ) : <Text type="secondary">已决</Text> },
        ]} />
    </Card>
  );

  return (
    <div>
      <Title level={4}>数据集市</Title>
      <Text type="secondary">全部可消费资产：表 / VIEW / API / 文档 / 代码索引 · 权限申请与审批（订阅数实时累计）</Text>
      <div style={{ marginTop: 12 }}>
        <Tabs items={[
          { key: 'catalog', label: `资产目录（${items.length}）`, children: catalog },
          { key: 'requests', label: `申请审批（${reqs.filter(r => r.status === '待审批').length}）`, children: approvals },
        ]} />
      </div>

      <Modal title={editing ? `编辑资产：${editing.name}` : '登记资产'} open={open}
        onOk={save} onCancel={() => setOpen(false)} okText="保存" cancelText="取消">
        <Form form={form} layout="vertical" initialValues={empty}>
          <Form.Item name="name" label="资产名" rules={[{ required: true }]}>
            <Input className="mono" placeholder="如 purchase_order" disabled={!!editing} />
          </Form.Item>
          <Form.Item name="comment" label="说明"><Input placeholder="如 采购订单" /></Form.Item>
          <Space style={{ display: 'flex' }} size={12}>
            <Form.Item name="type" label="类型" style={{ width: 130 }}><Select options={['表', 'VIEW', 'API', 'KB 文档', '代码索引'].map(v => ({ value: v }))} /></Form.Item>
            <Form.Item name="sensitive" label="敏感级" style={{ width: 100 }}><Select options={['L1', 'L2', 'L3'].map(v => ({ value: v }))} /></Form.Item>
            <Form.Item name="domain" label="业务域" style={{ width: 130 }}><Input /></Form.Item>
          </Space>
          <Form.Item name="source" label="来源"><Input placeholder="如 scm_prod / MySQL" /></Form.Item>
          <Form.Item name="freq" label="频率/规模"><Input placeholder="如 214万行 · 日更" /></Form.Item>
          <Form.Item name="owner" label="负责人"><Input /></Form.Item>
          <Form.Item name="status" label="状态"><Select options={['审核中', '上架', '下架'].map(v => ({ value: v }))} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
