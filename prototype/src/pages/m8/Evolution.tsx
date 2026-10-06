import { Alert, Button, Card, List, Progress, Space, Steps, Tag, Typography } from 'antd';
import { SettingOutlined } from '@ant-design/icons';
import { ok, info } from '../../components/proto';

const { Title, Text } = Typography;

const QUEUE = [
  {
    title: '语义查询「齐套率」解析失败 ×14',
    status: <Tag color="green">✓ 已自动应用</Tag>,
    border: '#f1f3f5',
    lines: [
      <>归因：缺同义词「配套率」</>,
      <>补丁：<Tag color="blue">+同义词</Tag> 已自动应用 · 低风险自动合并 ✓</>,
    ],
  },
  {
    title: '推理规则 R7 误报率 31%',
    status: <Tag color="orange">高风险必审</Tag>,
    border: '#c9861a',
    lines: [
      <>归因：阈值过紧 <Progress percent={31} size="small" style={{ width: 140, display: 'inline-flex', marginLeft: 8 }} strokeColor="#c9861a" /></>,
      <>补丁：阈值 <Text className="mono">0.7 → 0.8</Text> <Tag>草稿</Tag> → 需评审 <Button size="small" type="link" onClick={() => info('自进化补丁 · R7 阈值', [
        ['补丁', <span key="p" className="mono">R7.threshold: 0.7 → 0.8</span>],
        ['证据', '近 30 天 R7 误报 31%（阈值 0.7 区间样本）'],
        ['风险', <Tag key="r" color="orange">高风险必审</Tag>],
        ['去向', '已提交治理评审台（M8），通过后自动应用'],
      ])}>查看</Button></>,
    ],
  },
];

export default function Evolution() {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>自进化闭环 <Text className="mono" type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>EvoOntology</Text></Title>
          <Text type="secondary">M8-F04（P2）· 「Schema 变成系统状态」</Text>
        </div>
        <div style={{ flex: 1 }} />
        <Button icon={<SettingOutlined />} onClick={() => ok('自进化策略设置：低风险自动合并 ✓ · 高风险必审 ✓ · 每日回溯窗口 30 天')}>设置</Button>
      </div>
      <Card style={{ marginBottom: 12 }}>
        <Steps
          size="small"
          items={[
            { title: '失败轨迹', description: '「齐套率」×14 · R7 31%' },
            { title: '诊断', description: '解析失败 · 误报偏高' },
            { title: '归因', description: '缺同义词 · 阈值过紧' },
            { title: '补丁', description: '+同义词 · 阈值 0.7→0.8' },
            { title: '门控发布', description: '自动合并 ✓ · 人审+沙盘' },
          ]}
        />
      </Card>
      <Card title="本周进化队列" extra={<Text type="secondary" style={{ fontSize: 12 }}>轨迹 2 · 自动合并 1 · 待评审 1</Text>}>
        <List
          dataSource={QUEUE}
          renderItem={item => (
            <div style={{ border: `1px solid ${item.border}`, borderRadius: 8, overflow: 'hidden', marginBottom: 12 }}>
              <div style={{ background: '#f8fbfa', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Tag>轨迹</Tag>
                <b style={{ fontSize: 13 }}>{item.title}</b>
                <span style={{ marginLeft: 'auto' }}>{item.status}</span>
              </div>
              <div style={{ padding: '11px 14px', display: 'grid', gap: 7, fontSize: 13 }}>
                {item.lines.map((l, i) => <div key={i}><Space size={4} wrap>{l}</Space></div>)}
              </div>
            </div>
          )}
        />
        <Alert type="info" showIcon style={{ background: '#f9f0ff', border: '1px solid #d3adf7' }}
          message="门禁规则：低风险补丁自动应用 │ 高风险（规则/Action）必须人审 + 沙盘验证" />
      </Card>
    </>
  );
}
