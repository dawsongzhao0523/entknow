import React from 'react';
import { Card, Table, Tag, Button, Space, Typography, Alert, Statistic, Row, Col, Progress } from 'antd';
import { ArrowRightOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

const PARSERS = [
  { type: 'png / jpg', parser: 'PaddleOCR', sub: '本地 OCR 服务', output: '文字块', cost: '低', costColor: 'green' },
  { type: 'drawio', parser: '多模态小模型（qwen 7B）', sub: '本地推理 · 敏感数据不出域', output: '实体 + 关系', cost: '中', costColor: 'orange' },
  { type: 'pdf', parser: '版式解析 + OCR', sub: '表格 / 版式还原', output: '结构化段落', cost: '低', costColor: 'green' },
];

const ROUTES = [
  { lv: 'L1', name: 'hanlp 分词', tag: { text: '免费', color: 'green' }, desc: '分词 / 命名实体预处理', active: false },
  { lv: 'L2', name: 'qwen 7B / 17B 本地', tag: { text: '敏感数据默认', color: 'blue' }, desc: '实体 + 关系抽取 · 私有化推理', active: true },
  { lv: 'L3', name: 'dsv4 flash', tag: { text: '云端兜底', color: 'default' }, desc: '复杂版式 / 低置信度兜底', active: false },
];

export default function ParseProfile() {
  const nav = useNavigate();
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>
            <Tag color="purple">KB 插件</Tag>
            <span className="mono">KB-供应链</span> · 多模态解析与分级提取
          </Title>
          <Text type="secondary">doc_source · 解析策略 <Text className="mono"></Text></Text>
        </div>
        <div style={{ flex: 1 }} />
        <Tag color="green">在线增量 · 15min</Tag>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card title="附件解析器" extra={<Text type="secondary" style={{ fontSize: 12 }}>按附件类型自动路由</Text>} style={{ marginBottom: 16 }}>
            <Table
              rowKey="type" size="small" pagination={false} dataSource={PARSERS}
              columns={[
                { title: '附件类型', dataIndex: 'type', render: v => <Text className="mono" strong>{v}</Text> },
                {
                  title: '解析器', dataIndex: 'parser',
                  render: (v: string, r) => <div>{v}<div><Text type="secondary" style={{ fontSize: 12 }}>{r.sub}</Text></div></div>,
                },
                { title: '产出', dataIndex: 'output' },
                { title: '成本档', dataIndex: 'cost', render: (v: string, r) => <Tag color={r.costColor}>{v}</Tag> },
              ]}
            />
          </Card>

          <Card title="分级模型路由" extra={<Tag>三级路由</Tag>}>
            <div style={{ display: 'flex', alignItems: 'stretch', gap: 10 }}>
              {ROUTES.map((r, i) => (
                <React.Fragment key={r.lv}>
                  {i > 0 && <ArrowRightOutlined style={{ alignSelf: 'center', color: '#bbb' }} />}
                  <div style={{
                    flex: r.active ? 1.3 : 1, borderRadius: 8, padding: '10px 12px',
                    border: r.active ? '1px solid #a7f3d0' : '1px solid #d9d9d9',
                    background: r.active ? '#e6f4ff' : '#fff',
                  }}>
                    <Space>
                      <Tag color={r.active ? 'blue' : 'default'}>{r.lv}</Tag>
                      <Text strong style={{ fontSize: 13 }}>{r.name}</Text>
                      <Tag color={r.tag.color}>{r.tag.text}</Tag>
                    </Space>
                    <div><Text type="secondary" style={{ fontSize: 12 }}>{r.desc}</Text></div>
                  </div>
                </React.Fragment>
              ))}
            </div>
            <Alert style={{ marginTop: 12 }} type="warning" showIcon
              message={<span><b>升级条件：</b>L2 置信度 &lt; 0.8 且 非敏感，才升级至 L3 处理</span>} />
            <div style={{ marginTop: 12 }}>
              <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>本月成本 <Text className="mono" strong style={{ color: 'rgba(0,0,0,0.88)' }}>¥312</Text> / 预算 ¥800</Text>
                <Text type="secondary" className="mono" style={{ fontSize: 12 }}>39%</Text>
              </Space>
              <Progress percent={39} showInfo={false} />
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card title="提取结果" extra={<Tag color="cyan">KB-供应链</Tag>}>
            <Row gutter={12}>
              <Col span={12}>
                <Card size="small"><Statistic title="实体候选" value={8412} /><Text type="secondary" style={{ fontSize: 12 }}>待同义词归并</Text></Card>
              </Col>
              <Col span={12}>
                <Card size="small"><Statistic title="关系候选" value={3207} /><Text type="secondary" style={{ fontSize: 12 }}>待同义词归并</Text></Card>
              </Col>
            </Row>
            <Alert
              style={{ marginTop: 12 }} type="info" showIcon
              message={<span>候选将进入<b>同义词归并</b>，归并后写入本体草稿</span>}
              action={<Button size="small" type="primary" onClick={() => nav('/knowledge/synonym')}>查看队列</Button>}
            />
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 12 }}>
              抽取由 L2 本地模型完成，敏感文档不出域；归并队列由数据治理员处理。
            </Text>
          </Card>
        </Col>
      </Row>

      <Alert style={{ marginTop: 14 }} type="info" showIcon
        message="策略按 doc_source 生效：增量文档实时应用当前策略，存量文档可在提取队列中重跑解析。" />
    </>
  );
}
