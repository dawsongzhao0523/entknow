import { Card, Row, Col, Statistic, List, Tag, Button, Space, Typography, Badge, Segmented } from 'antd';
import { useNavigate } from 'react-router-dom';
import { TODOS } from '../../mock/data';
import { ok, run } from '../../components/proto';

const { Title, Text } = Typography;

const TASKS = [
  {
    id: 't1', name: 'scm_prod / po_line', alert: 'CDC 延迟 12min',
    desc: '增量同步滞后 · 影响下游订单交付视图时效', err: true,
  },
  { id: 't2', name: 'kb_supply_chain', desc: '文档增量 +36 篇 · 今日 09:45 完成', err: false },
  { id: 't3', name: 'scm_prod / purchase_order', desc: 'CRON 增量 +12,431 行 · 今日 02:00 · 耗时 4m12s', err: false },
];

const LEVEL_COLOR: Record<string, string> = { error: 'red', warn: 'orange', info: 'blue' };
const ACTION_ROUTE: Record<string, string> = { 影响确认: '/assets/logical-view', 去处理: '/knowledge/synonym' };

export default function Workbench() {
  const nav = useNavigate();
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>数据工作台</Title>
          <Text type="secondary">采集任务 · 我的资产 · 治理待办 一览</Text>
        </div>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title={<Space><Badge status="processing" />采集任务 · 运行中</Space>} value={12} />
            <Text type="warning" style={{ fontSize: 12 }}><Badge status="warning" />1 个异常</Text>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title="我的资产" value={46} />
            <Text type="secondary" style={{ fontSize: 12 }}>表 · VIEW · 文档 · 代码</Text>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title="治理待办" value={7} />
            <Text type="secondary" style={{ fontSize: 12 }}>含 schema 变更确认 · 同义词归并</Text>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card title="采集任务" extra={<Segmented size="small" defaultValue="all" options={[{ value: 'all', label: '全部' }, { value: 'err', label: '异常' }, { value: 'doc', label: '文档' }]} />}>
            <List
              dataSource={TASKS}
              renderItem={t => (
                <List.Item
                  actions={[
                    <Button key="v" size="small" onClick={() => ok(`任务详情：${t.name} · ${t.desc}`)}>查看</Button>,
                    ...(t.err ? [<Button key="r" size="small" onClick={() => run('重跑任务', `从上次成功水位重新拉取 ${t.name} 的增量数据。`)}>重跑</Button>] : []),
                  ]}
                >
                  <List.Item.Meta
                    avatar={<Badge status={t.err ? 'warning' : 'success'} />}
                    title={
                      <Space>
                        <Text className="mono" strong>{t.name}</Text>
                        {t.alert && <Tag color="orange">{t.alert}</Tag>}
                      </Space>
                    }
                    description={t.desc}
                  />
                </List.Item>
              )}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>今日 12 个任务 · 运行中 12 · 异常 1 · <Button type="link" size="small" style={{ padding: 0 }} onClick={() => ok('已展开全部 12 个采集任务（原型示意）')}>查看全部任务 →</Button></Text>
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="治理待办" extra={<Tag>7 项</Tag>}>
            <List
              dataSource={TODOS}
              renderItem={t => (
                <List.Item
                  actions={[
                    <Button key="a" size="small" type={t.action === 'AI 补全' ? 'primary' : 'default'}
                      onClick={() => {
                        const r = ACTION_ROUTE[t.action];
                        if (r) nav(r);
                        else if (t.action === 'AI 补全') ok('AI 补全完成：13 个字段备注已生成（LLM 建议 · 保存前可逐条修改）');
                        else ok(`已打开详情：${t.text}`);
                      }}>
                      {t.action}
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={<Badge color={LEVEL_COLOR[t.level]} />}
                    title={<Text style={{ fontSize: 13 }}>{t.text}</Text>}
                  />
                </List.Item>
              )}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>共 7 项待办 · 已显示 4 项 · <Button type="link" size="small" style={{ padding: 0 }} onClick={() => ok('已展开全部 7 项治理待办（原型示意）')}>查看全部 →</Button></Text>
          </Card>
        </Col>
      </Row>
    </>
  );
}
