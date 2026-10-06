import { Alert, Button, Card, Col, Row, Space, Steps, Tag, Typography, message } from 'antd';
import { LeftOutlined, RightOutlined, SaveOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

const STEPS = [
  { title: '确定范围', sub: '订单交付域' },
  { title: '考察复用', sub: '引用域共享对象 ×3' },
  { title: '枚举术语', sub: '已收集 64 个术语' },
  { title: '定义对象与层级' },
  { title: '定义属性' },
  { title: '定义约束' },
  { title: '创建实例' },
];

const TERMS: { t: string; c: string }[] = [
  { t: '物料', c: 'blue' }, { t: '仓库', c: 'blue' }, { t: '供应商', c: 'blue' }, { t: '工厂', c: 'blue' }, { t: '客户', c: 'blue' },
  { t: '采购订单', c: 'default' }, { t: '生产工单', c: 'default' }, { t: '设备', c: 'default' },
  { t: '齐套率', c: 'cyan' }, { t: '在途库存', c: 'cyan' }, { t: '安全库存', c: 'cyan' },
  { t: '交付风险分', c: 'purple' },
];

const IMPORTERS = [
  { icon: '📥', title: '从  抽取结果导入', desc: '本体学习辅助 · 术语 412 · 关系候选 96' },
  { icon: '📖', title: '从术语词典  选择', desc: '复用已评审的领域术语与同义词归并结果' },
  { icon: '✏️', title: '＋ 手工录入', desc: '逐条录入，自动查重与冲突提示', primary: true },
];

export default function Wizard() {
  const nav = useNavigate();
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>建模向导 · 新建本体</Title>
          <Text type="secondary">斯坦福七步法 · 结构化引导产出可评审的本体草稿</Text>
        </div>
        <div style={{ flex: 1 }} />
        <Tag color="blue">第 3 / 7 步</Tag>
      </div>

      <Card size="small" style={{ marginBottom: 12 }}>
        <Steps
          size="small" current={2}
          items={STEPS.map((s, i) => ({
            title: s.title,
            description: s.sub ? <span style={{ fontSize: 10.5 }}>{s.sub}</span> : undefined,
            status: i < 2 ? 'finish' : i === 2 ? 'process' : 'wait',
          }))}
        />
      </Card>

      <Card size="small" title="本步产出 · 枚举术语"
        extra={<Space><Tag color="purple">当前步</Tag><Text type="secondary" style={{ fontSize: 12 }}>从语料导入 / 手工录入</Text></Space>}>
        <div style={{ marginBottom: 12 }}>
          <Text type="secondary" style={{ fontSize: 12, marginRight: 12 }}>说明</Text>
          <span style={{ fontSize: 13 }}>从语料导入 / 手工录入，已收集 <b style={{ fontFamily: 'monospace' }}>64</b> 个术语</span>
        </div>

        <Row gutter={12} style={{ marginBottom: 12 }}>
          {IMPORTERS.map(i => (
            <Col span={8} key={i.title}>
              <div
                onClick={() => message.info(`打开「${i.title}」`)}
                style={{
                  border: `1px ${i.primary ? 'dashed #a7f3d0' : 'solid #e2e4e9'}`, borderRadius: 10,
                  padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'center', cursor: 'pointer',
                  background: i.primary ? '#f0f7ff' : '#fff',
                }}
              >
                <span style={{ fontSize: 22 }}>{i.icon}</span>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: i.primary ? '#059669' : undefined }}>{i.title}</div>
                  <div style={{ fontSize: 11.5, color: '#6b7688', marginTop: 2 }}>{i.desc}</div>
                </div>
              </div>
            </Col>
          ))}
        </Row>

        <div style={{ borderTop: '1px solid #f1f3f5', paddingTop: 12, marginBottom: 12 }}>
          <Space style={{ marginBottom: 8 }}>
            <b style={{ fontSize: 13 }}>术语清单（64）</b>
            <Text type="secondary" style={{ fontSize: 12 }}>→ 下一步自动预分</Text>
          </Space>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {TERMS.map(t => <Tag key={t.t} color={t.c}>{t.t}</Tag>)}
            <Tag>… +52</Tag>
          </div>
        </div>

        <Alert
          type="info" showIcon
          message={<span><b>本步产出:</b> 术语清单 64 → 自动预分：对象候选 <b>12</b> │ 属性候选 <b>31</b> │ 关系候选 <b>9</b>（待第 4 / 5 步确认）</span>}
        />

        <Space style={{ marginTop: 16, width: '100%' }}>
          <Button icon={<LeftOutlined />} onClick={() => message.info('已返回上一步：场景选择（原型示意）')}>上一步</Button>
          <Button icon={<SaveOutlined />} onClick={() => message.success('草稿已保存')}>保存草稿</Button>
          <div style={{ flex: 1 }} />
          <Button type="primary" onClick={() => nav('/modeling/designer')}>
            下一步: 定义对象 <RightOutlined />
          </Button>
        </Space>
      </Card>
    </>
  );
}
