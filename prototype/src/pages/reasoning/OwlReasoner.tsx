import { Alert, Button, Card, Radio, Space, Statistic, Tag, Typography } from 'antd';
import { ok } from '../../components/proto';

const { Title, Text } = Typography;

export default function OwlReasoner() {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>OWL 推理机集成</Title>
          <Text type="secondary">本体：供应链 <Tag color="blue">v0.3</Tag>（OWL 导出） · P2）</Text>
        </div>
        <div style={{ flex: 1 }} />
        <Button type="primary" onClick={() => ok('推理完成：一致性检查通过 · 分类树已刷新 · 新推导 3 条隐含关系（耗时 2.8s）')}>▶ 运行推理</Button>
      </div>

      <Card title="推理配置" style={{ marginBottom: 16 }}>
        <Space size={40} wrap align="start">
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>推理机</Text>
            <div style={{ marginTop: 6 }}>
              <Radio.Group defaultValue="elk" options={[{ value: 'elk', label: '内置 ELK' }, { value: 'hermit', label: '外部 HermiT' }]} />
            </div>
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>Profile</Text>
            <div style={{ marginTop: 6 }}>
              <Tag color="purple">OWL 2 EL</Tag>
              <Text type="secondary" style={{ fontSize: 12 }}>与内置 ELK 推理机匹配</Text>
            </div>
          </div>
        </Space>
      </Card>

      <Card title="推理结果" style={{ marginBottom: 16 }}>
        <Space style={{ marginBottom: 12 }}>
          <b>分类推断</b>
          <Tag color="green">新推断子类关系 ×4</Tag>
        </Space>
        <div style={{ marginBottom: 16 }}>
          <Tag>战略供应商 ⊑ 准入供应商</Tag>
          <Text type="secondary" style={{ fontSize: 12 }}>… 其余 3 条</Text>
        </div>
        <Space size={48} wrap>
          <Statistic title="一致性" value="一致 ✓" valueStyle={{ color: '#2d8a4e' }} />
          <Statistic title="不可满足类" value={0} />
        </Space>
      </Card>

      <Card title="边界说明">
        <Alert
          type="info"
          showIcon
          message={<span><b>OWL 层只管「是什么」的分类与一致性</b>；时序 / Action / 传播不进入 OWL，由平台规则引擎负责（→ 。</span>}
        />
        <Space style={{ marginTop: 16 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>推理结果回写为建议，需评审后入本体：</Text>
          <Tag>推理建议</Tag> → <Tag color="blue">人工评审</Tag> → <Tag color="green">写入本体</Tag>
        </Space>
      </Card>
    </>
  );
}
