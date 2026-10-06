import { useEffect, useState } from 'react';
import { Card, Col, List, Row, Statistic, Table, Tag, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { api, type Notification, type Ontology, type Review } from '../api';

const { Title } = Typography;

const statusColor: Record<string, string> =
  { PUBLISHED: 'green', DRAFT: 'default', IN_REVIEW: 'orange', 评审中: 'orange', 待评审: 'blue', 已通过: 'green' };

export default function Home() {
  const nav = useNavigate();
  const [ontos, setOntos] = useState<Ontology[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [err, setErr] = useState('');

  useEffect(() => {
    Promise.all([api.ontologies(), api.reviews(), api.notifications()])
      .then(([o, r, n]) => { setOntos(o); setReviews(r); setNotifs(n); })
      .catch(e => setErr(String(e.message ?? e)));
  }, []);

  if (err) return <Card>无法连接后端 API（{err}）。请确认后端已启动：cd backend && go run ./cmd/entknow</Card>;

  const draft = ontos.filter(o => o.status === 'DRAFT').length;
  const pendingReviews = reviews.filter(r => r.status !== '已通过').length;
  const unread = notifs.filter(n => n.unread).length;

  return (
    <div>
      <div style={{ background: 'linear-gradient(90deg,#ecfdf5,#f8fbfa)', borderRadius: 10, padding: '20px 24px', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>entKnow 数据总览</Title>
        <div style={{ color: '#6b7688', marginTop: 6, fontSize: 13 }}>
          数据来自真实后端（PostgreSQL demo 数据集）· 供应链「订单交付风险」场景
        </div>
      </div>
      <Row gutter={12} style={{ marginBottom: 16 }}>
        {[
          { t: '本体', v: ontos.length, s: `草稿 ${draft} / 已发布 ${ontos.length - draft}`, to: '/m3/ontologies' },
          { t: '待评审', v: pendingReviews, s: `共 ${reviews.length} 条评审记录`, to: '/m8/reviews' },
          { t: '未读通知', v: unread, s: `共 ${notifs.length} 条`, to: '/' },
          { t: '画布对象', v: 7, s: '注册中心 11 个对象', to: '/m3/registry' },
        ].map(c => (
          <Col span={6} key={c.t}>
            <Card size="small" hoverable onClick={() => nav(c.to)}>
              <Statistic title={c.t} value={c.v} suffix={<span style={{ fontSize: 13, fontWeight: 400, color: '#5a5a72' }}> {c.s}</span>} />
            </Card>
          </Col>
        ))}
      </Row>
      <Row gutter={12}>
        <Col span={14}>
          <Card size="small" title="评审队列" extra={<a onClick={() => nav('/m8/reviews')}>去裁决 →</a>}>
            <Table size="small" rowKey="id" pagination={false} dataSource={reviews}
              columns={[
                { title: '评审项', dataIndex: 'title' },
                { title: '类型', dataIndex: 'type', width: 100 },
                { title: '提出人', dataIndex: 'from', width: 80 },
                { title: '状态', dataIndex: 'status', width: 90, render: (v: string) => <Tag color={statusColor[v]}>{v}</Tag> },
                { title: 'SLA', dataIndex: 'sla', width: 90 },
              ]} />
          </Card>
        </Col>
        <Col span={10}>
          <Card size="small" title="消息通知" extra={<Tag>{unread} 未读</Tag>}>
            <List size="small" dataSource={notifs} renderItem={n => (
              <List.Item style={{ opacity: n.unread ? 1 : 0.55 }}>
                <List.Item.Meta
                  title={<span style={{ fontSize: 13, fontWeight: n.unread ? 600 : 400 }}>{n.title}</span>}
                  description={<span style={{ fontSize: 12 }}>{n.cat} · {n.time}</span>}
                />
              </List.Item>
            )} />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
