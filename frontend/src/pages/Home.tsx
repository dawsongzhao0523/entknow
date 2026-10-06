import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, Col, List, Row, Space, Statistic, Table, Tag, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  api, type ConsistencyIssue, type Instance, type Notification,
  type Ontology, type Review, type RuleFiring, type User,
} from '../api';
import { useSession } from '../session';

const { Title, Text } = Typography;

const statusColor: Record<string, string> =
  { PUBLISHED: 'green', DRAFT: 'default', IN_REVIEW: 'orange', 评审中: 'orange', 待评审: 'blue', 已通过: 'green' };

type ViewKey = 'architect' | 'reviewer' | 'operator';
const VIEW_LABEL: Record<ViewKey, string> = {
  architect: '架构治理视角', reviewer: '评审知识视角', operator: '运营风险视角',
};
const VIEW_DESC: Record<ViewKey, string> = {
  architect: '本体全生命周期 · 评审与一致性',
  reviewer: '待裁决评审 · 知识治理 · 语义查询',
  operator: '订单交付风险 · 规则触发 · 数据运营',
};

/** 按当前用户角色推导首页视角：本体管理员→架构治理；评审员→评审知识；其余→运营风险 */
function viewOf(roles: string[]): ViewKey {
  if (roles.some(r => r === '本体管理员')) return 'architect';
  if (roles.some(r => r === '评审员')) return 'reviewer';
  return 'operator';
}

export default function Home() {
  const nav = useNavigate();
  const { user, prefs, prefsLoaded } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [ontos, setOntos] = useState<Ontology[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [firings, setFirings] = useState<RuleFiring[]>([]);
  const [issues, setIssues] = useState<ConsistencyIssue[]>([]);
  const [pendingSyn, setPendingSyn] = useState(0);
  const [pendingCand, setPendingCand] = useState(0);
  const [pendingReq, setPendingReq] = useState(0);
  const [err, setErr] = useState('');

  const curUser = users.find(u => u.account === user);
  const view = viewOf(curUser?.roles ?? []);

  useEffect(() => {
    Promise.all([
      api.users(), api.ontologies(user), api.reviews(), api.notifications(user),
      api.instances(), api.ruleFirings(), api.consistency(),
      api.synonyms('待归并'), api.candidates('待裁决'), api.marketRequests(),
    ]).then(([us, o, r, n, inst, f, iss, syn, cand, mreq]) => {
      setUsers(us); setOntos(o); setReviews(r); setNotifs(n);
      setInstances(inst); setFirings(f); setIssues(iss);
      setPendingSyn(syn.length); setPendingCand(cand.length);
      setPendingReq(mreq.filter(x => x.status === '待审批').length);
    }).catch(e => setErr(String(e.message ?? e)));
  }, [user]);

  // 个性化设置：默认落地页（每会话仅首次进入时跳转，之后可正常回到首页）
  useEffect(() => {
    if (prefsLoaded && prefs.landingPage && !sessionStorage.getItem('entknow.landed')) {
      sessionStorage.setItem('entknow.landed', '1');
      nav('/' + prefs.landingPage);
    }
  }, [prefsLoaded, prefs.landingPage, nav]);

  const shown = useMemo(() =>
    prefs.notifyCats?.length ? notifs.filter(n => prefs.notifyCats!.includes(n.cat)) : [],
    [notifs, prefs.notifyCats]);
  const unread = shown.filter(n => n.unread).length;

  const pendingReviews = reviews.filter(r => r.status === '待评审' || r.status === '评审中');
  const highRisk = instances.filter(i => i.riskScore >= 80);

  if (err) return <Card>无法连接后端 API（{err}）。请确认后端已启动：cd backend && go run ./cmd/entknow</Card>;

  // 视角统计卡
  const cards = view === 'architect' ? [
    { t: '本体', v: ontos.length, s: `草稿 ${ontos.filter(o => o.status === 'DRAFT').length} / 已发布 ${ontos.filter(o => o.status === 'PUBLISHED').length}`, to: '/modeling/ontologies' },
    { t: '待评审', v: pendingReviews.length, s: `共 ${reviews.length} 条评审记录`, to: '/governance/reviews' },
    { t: '一致性问题', v: issues.length, s: issues.length === 0 ? '本体健康' : '建议处理', to: '/reasoning/engine' },
    { t: '未读通知', v: unread, s: `共 ${shown.length} 条（按个人设置过滤）`, to: '/' },
  ] : view === 'reviewer' ? [
    { t: '待裁决评审', v: pendingReviews.length, s: '评审台待处理', to: '/governance/reviews' },
    { t: '待归并同义词', v: pendingSyn, s: '知识治理', to: '/knowledge/synonyms' },
    { t: '收敛候选', v: pendingCand, s: '知识 → 本体', to: '/knowledge/convergence' },
    { t: '未读通知', v: unread, s: `共 ${shown.length} 条`, to: '/' },
  ] : [
    { t: '高风险实例', v: highRisk.length, s: `风险分 ≥80（共 ${instances.length} 个实例）`, to: '/runtime/instances' },
    { t: '最近规则触发', v: firings.length, s: '传播引擎', to: '/runtime/rules' },
    { t: '待审批申请', v: pendingReq, s: '数据集市', to: '/assets/market' },
    { t: '未读通知', v: unread, s: `共 ${shown.length} 条`, to: '/' },
  ];

  return (
    <div>
      <div style={{ background: 'linear-gradient(90deg,#ecfdf5,#f8fbfa)', borderRadius: 10, padding: '20px 24px', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>
          {curUser?.name ?? user} 的工作台
          <Tag color="green" style={{ marginInlineStart: 12 }}>{VIEW_LABEL[view]}</Tag>
        </Title>
        <div style={{ color: '#6b7688', marginTop: 6, fontSize: 13 }}>
          {VIEW_DESC[view]} · 角色：{(curUser?.roles ?? []).join(' / ') || '—'} · 数据来自真实后端（PostgreSQL）
        </div>
      </div>
      <Row gutter={12} style={{ marginBottom: 16 }}>
        {cards.map(c => (
          <Col span={6} key={c.t}>
            <Card size="small" hoverable onClick={() => nav(c.to)}>
              <Statistic title={c.t} value={c.v} suffix={<span style={{ fontSize: 13, fontWeight: 400, color: '#5a5a72' }}> {c.s}</span>} />
            </Card>
          </Col>
        ))}
      </Row>

      {view === 'reviewer' && (
        <Row gutter={12} style={{ marginBottom: 12 }}>
          <Col span={24}>
            <Card size="small" title="待我处理" extra={<a onClick={() => nav('/governance/reviews')}>去评审 →</a>}>
              <Table size="small" rowKey="id" pagination={false} dataSource={pendingReviews.slice(0, 5)}
                locale={{ emptyText: '暂无待裁决评审' }}
                columns={[
                  { title: '评审项', dataIndex: 'title' },
                  { title: '类型', dataIndex: 'type', width: 100 },
                  { title: '提出人', dataIndex: 'from', width: 80 },
                  { title: 'SLA', dataIndex: 'sla', width: 90 },
                ]} />
            </Card>
          </Col>
        </Row>
      )}

      {view === 'operator' && (
        <Row gutter={12} style={{ marginBottom: 12 }}>
          <Col span={14}>
            <Card size="small" title="高风险订单（风险分 ≥80）" extra={<a onClick={() => nav('/runtime/instances')}>实例 360° →</a>}>
              <Table<Instance> size="small" rowKey="id" pagination={false} dataSource={highRisk.slice(0, 5)}
                locale={{ emptyText: '当前无高风险实例' }}
                columns={[
                  { title: '实例', dataIndex: 'id', render: (v: string) => <span className="mono">{v}</span> },
                  { title: '状态', dataIndex: 'status', width: 90 },
                  { title: '风险分', dataIndex: 'riskScore', width: 90, render: (v: number) => <Tag color={v >= 90 ? 'red' : 'orange'}>{v}</Tag> },
                  { title: '承诺交期', dataIndex: 'promiseDt', width: 110 },
                ]} />
            </Card>
          </Col>
          <Col span={10}>
            <Card size="small" title="最近规则触发">
              <List size="small" dataSource={firings.slice(0, 5)} locale={{ emptyText: '暂无触发' }}
                renderItem={f => (
                  <List.Item>
                    <List.Item.Meta
                      title={<span style={{ fontSize: 13 }}>{f.detail}</span>}
                      description={<span className="mono" style={{ fontSize: 12 }}>{f.ruleId} · {f.firedAt}</span>}
                    />
                  </List.Item>
                )} />
            </Card>
          </Col>
        </Row>
      )}

      {view === 'architect' && (
        <Row gutter={12} style={{ marginBottom: 12 }}>
          <Col span={14}>
            <Card size="small" title="评审队列" extra={<a onClick={() => nav('/governance/reviews')}>去裁决 →</a>}>
              <Table size="small" rowKey="id" pagination={false} dataSource={reviews.slice(0, 5)}
                columns={[
                  { title: '评审项', dataIndex: 'title' },
                  { title: '类型', dataIndex: 'type', width: 100 },
                  { title: '状态', dataIndex: 'status', width: 90, render: (v: string) => <Tag color={statusColor[v]}>{v}</Tag> },
                  { title: 'SLA', dataIndex: 'sla', width: 90 },
                ]} />
            </Card>
          </Col>
          <Col span={10}>
            <Card size="small" title="一致性检查摘要" extra={<a onClick={() => nav('/reasoning/engine')}>推理引擎 →</a>}>
              {issues.length === 0
                ? <Text type="secondary">本体一致：边引用 / 数据映射 / 状态机 / 绑定均正常</Text>
                : issues.slice(0, 4).map((it, i) => (
                  <div key={i} style={{ marginBottom: 6 }}>
                    <Badge status={it.level === 'error' ? 'error' : 'warning'} text={<span style={{ fontSize: 12 }}>{it.detail}</span>} />
                  </div>
                ))}
            </Card>
          </Col>
        </Row>
      )}

      <Card size="small" title="消息通知" extra={<Space>
        <Tag>{unread} 未读</Tag>
        <Button size="small" type="link" onClick={async () => {
          await api.markAllNotificationsRead(user).catch(() => {});
          setNotifs(await api.notifications(user));
        }}>全部已读</Button>
      </Space>}>
        <List size="small" dataSource={shown}
          locale={{ emptyText: prefs.notifyCats?.length ? '暂无消息' : '通知类别已全部关闭（个性化设置）' }}
          renderItem={n => (
            <List.Item style={{ opacity: n.unread ? 1 : 0.55, cursor: n.to ? 'pointer' : 'default' }}
              onClick={async () => {
                if (!n.to) return;
                if (n.unread) {
                  await api.markNotificationRead(n.id, user).catch(() => {});
                  setNotifs(await api.notifications(user));
                }
                nav(n.to);
              }}>
              <List.Item.Meta
                avatar={<Badge status={n.cat === '待办处理' ? 'error' : n.cat === '治理任务' ? 'warning' : 'processing'} />}
                title={<span style={{ fontSize: 13, fontWeight: n.unread ? 600 : 400 }}>{n.title}</span>}
                description={<span style={{ fontSize: 12 }}>{n.cat} · {n.time}{n.toUser && n.toUser === user ? ' · 定向给我' : ''}</span>}
              />
            </List.Item>
          )} />
      </Card>
    </div>
  );
}
