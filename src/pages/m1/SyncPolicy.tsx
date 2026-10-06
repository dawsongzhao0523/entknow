import { Card, Descriptions, Radio, Input, Checkbox, Table, Tag, Button, Space, Typography, Alert } from 'antd';
import { EditOutlined, ApiOutlined, StopOutlined } from '@ant-design/icons';
import { DATASOURCES } from '../../mock/data';
import { ok, run, edit, info } from '../../components/proto';

const { Title, Text } = Typography;

const DS = DATASOURCES[0]; // scm_prod

const RUNS = [
  { time: '2026-10-02 02:00', status: '成功', delta: '+12,431 行', cost: '4m12s' },
];

const MODES = [
  { value: 'NONE', label: 'NONE 一次性', sub: '仅手动执行' },
  { value: 'CRON', label: 'CRON 定时', sub: '每日 02:00' },
  { value: 'CDC', label: 'CDC 实时', sub: 'Binlog 订阅' },
  { value: 'EVENT', label: 'EVENT 事件', sub: '上游消息触发' },
];

export default function SyncPolicy() {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>
            <Tag color="blue">MySQL</Tag>
            <span className="mono">{DS.name}</span> · 更新策略
          </Title>
          <Text type="secondary">{DS.host} · 最近心跳 09:58</Text>
        </div>
        <div style={{ flex: 1 }} />
        <Space>
          <Button icon={<EditOutlined />} onClick={() => edit('编辑数据源', [
            ['名称', <Input key="n" defaultValue={DS.name} />],
            ['连接串', <Input key="h" className="mono" defaultValue={DS.host} />],
            ['敏感级', <Input key="s" defaultValue={DS.sensitive} />],
          ])}>编辑</Button>
          <Button icon={<ApiOutlined />} onClick={() => ok('连接测试通过 · 延迟 89ms · 版本 8.0.36')}>测试连接</Button>
          <Button danger icon={<StopOutlined />} onClick={() => run('停用数据源', '停用后停止所有同步任务与心跳监控，已同步数据保留。')}>停用</Button>
        </Space>
      </div>

      <Card title="连接信息" extra={<Tag color="green">正常</Tag>} style={{ marginBottom: 14 }}>
        <Descriptions size="small" column={3}>
          <Descriptions.Item label="数据源"><Text className="mono" strong>{DS.name}</Text> · {DS.type}</Descriptions.Item>
          <Descriptions.Item label="连接串"><Text className="mono">{DS.host}</Text></Descriptions.Item>
          <Descriptions.Item label="状态"><Tag color="green">正常</Tag></Descriptions.Item>
          <Descriptions.Item label="最近心跳"><Text className="mono">09:58</Text></Descriptions.Item>
          <Descriptions.Item label="库内表"><Text className="mono">{DS.tables}</Text> 张</Descriptions.Item>
          <Descriptions.Item label="敏感级"><Tag>{DS.sensitive}</Tag></Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="更新策略" extra={<Tag color="green">已启用</Tag>}>
        <div style={{ marginBottom: 16 }}>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>采集模式</Text>
          <Radio.Group defaultValue={DS.mode}>
            <Space wrap>
              {MODES.map(m => (
                <Radio key={m.value} value={m.value}>
                  <span>{m.label}</span>
                  <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>{m.sub}</Text>
                </Radio>
              ))}
            </Space>
          </Radio.Group>
        </div>

        <Space align="center" style={{ marginBottom: 12 }}>
          <Text strong>CRON 表达式</Text>
          <Input className="mono" defaultValue="0 2 * * *" style={{ width: 160 }} />
          <Text type="secondary">（每日 02:00）</Text>
          <Text type="secondary">下次执行：<Text className="mono" strong>2026-10-03 02:00</Text></Text>
        </Space>

        <Space align="center" wrap style={{ marginBottom: 8 }}>
          <Text strong>高级</Text>
          <Checkbox defaultChecked>失败重试 ×3</Checkbox>
          <Checkbox defaultChecked>增量水位字段 <Text className="mono">updated_at</Text></Checkbox>
          <Checkbox>全量覆盖</Checkbox>
        </Space>

        <Alert type="info" showIcon style={{ marginBottom: 16 }}
          message="修改更新策略后从下一调度周期生效；「立即执行」不影响既有调度计划。" />

        <div style={{ display: 'flex', marginBottom: 8 }}>
          <Text strong>最近执行</Text>
          <div style={{ flex: 1 }} />
          <Button type="link" size="small" onClick={() => info('同步执行日志', [
            ['数据源', <span key="1" className="mono">{DS.name}</span>],
            ['2026-10-02 02:00', '成功 · +12,431 行 · 4m12s（增量水位 updated_at=2026-10-02 01:59:47）'],
            ['2026-10-01 02:00', '成功 · +9,208 行 · 3m51s'],
            ['2026-09-30 02:00', '成功 · 失败重试 ×1 后成功 · 7m03s'],
          ])}>查看全部日志</Button>
        </div>
        <Table
          rowKey="time" size="small" pagination={false} dataSource={RUNS}
          columns={[
            { title: '时间', dataIndex: 'time', render: v => <Text className="mono">{v}</Text> },
            { title: '状态', dataIndex: 'status', render: v => <Tag color="green">{v}</Tag> },
            { title: '增量', dataIndex: 'delta', render: v => <Text className="mono">{v}</Text> },
            { title: '耗时', dataIndex: 'cost', render: v => <Text className="mono">{v}</Text> },
            { title: '操作', key: 'ops', align: 'right', render: () => <Space size={4}>
              <Button size="small" type="link" onClick={() => info('执行日志 · 2026-10-02 02:00', [
                ['状态', '成功'], ['增量', '+12,431 行'], ['耗时', '4m12s'],
                ['读取批次', '12 批（每批 5,000 行）'], ['写入目标', 'hive.scm_prod.purchase_order'],
              ])}>日志</Button>
              <Button size="small" type="link" onClick={() => run('立即执行同步', '手动触发一次增量同步，不影响既有调度计划。')}>立即执行</Button>
            </Space> },
          ]}
        />
        <Text type="secondary" style={{ fontSize: 12 }}>显示最近 1 次 · 执行记录保留 30 天</Text>
      </Card>
    </>
  );
}
