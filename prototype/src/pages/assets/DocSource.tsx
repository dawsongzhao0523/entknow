import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Steps, Radio, Select, Checkbox, Button, Space, Typography, Alert, Statistic, Row, Col } from 'antd';
import { FileTextOutlined, BookOutlined, CloudOutlined, CodeOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const TYPES = [
  { value: 'upload', label: '文档上传', icon: <FileTextOutlined /> },
  { value: 'lib', label: '文档库', icon: <BookOutlined /> },
  { value: 'netdisk', label: '网盘同步', icon: <CloudOutlined /> },
  { value: 'code', label: '代码仓库', icon: <CodeOutlined /> },
];

export default function DocSource() {
  const [step, setStep] = useState(1);
  const nav = useNavigate();

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>新增非结构化数据源</Title>
          <Text type="secondary">文档 / 网盘 / 代码仓库插件化接入，附件走  多模态解析</Text>
        </div>
      </div>

      <Card>
        <Steps
          current={step} size="small" style={{ maxWidth: 640, marginBottom: 24 }}
          items={[{ title: '类型选择' }, { title: '插件配置' }, { title: '接入预估' }]}
        />

        <div style={{ marginBottom: 20 }}>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>类型 <Text type="danger">*</Text></Text>
          <Radio.Group defaultValue="lib" onChange={() => setStep(1)}>
            <Space wrap>
              {TYPES.map(t => <Radio key={t.value} value={t.value}>{t.icon} {t.label}</Radio>)}
            </Space>
          </Radio.Group>
        </div>

        <div style={{ marginBottom: 16 }}>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>文档库插件</Text>
          <Space wrap size={12}>
            <span><Text type="secondary" style={{ fontSize: 12, display: 'block' }}>插件</Text><Select defaultValue="fs" style={{ width: 180 }} options={[{ value: 'fs', label: '飞书知识库' }]} /></span>
            <span><Text type="secondary" style={{ fontSize: 12, display: 'block' }}>空间</Text><Select defaultValue="kb" style={{ width: 180 }} options={[{ value: 'kb', label: 'KB-供应链' }]} /></span>
            <span><Text type="secondary" style={{ fontSize: 12, display: 'block' }}>节点</Text><Select defaultValue="all" style={{ width: 180 }} options={[{ value: 'all', label: '全空间' }]} /></span>
          </Space>
        </div>

        <Space align="center" wrap style={{ marginBottom: 12 }}>
          <Text strong>范围</Text>
          <Checkbox defaultChecked>正文</Checkbox>
          <Checkbox defaultChecked>附件（png / drawio / pdf）</Checkbox>
          <Checkbox>评论</Checkbox>
        </Space>

        <Space align="center" style={{ marginBottom: 12 }}>
          <Text strong>更新</Text>
          <Radio.Group defaultValue="incr">
            <Radio value="incr">在线增量（15min）</Radio>
            <Radio value="once">一次性导入</Radio>
          </Radio.Group>
        </Space>

        <Alert type="info" showIcon style={{ marginBottom: 20 }}
          message={<span><b>解析：</b>正文 → Markdown 结构化 ｜ 图片 → OCR + 多模态（走 <Text className="mono"></Text> 策略）</span>} />

        <Card size="small" style={{ marginBottom: 20, background: '#f8fbfa' }}>
          <Space align="center" split={<Text type="secondary">│</Text>} wrap>
            <Text strong>接入预估</Text>
            <span>文档 <Statistic value={1240} prefix="~" valueStyle={{ fontSize: 16, display: 'inline' }} /> 篇</span>
            <span>附件 <Text className="mono" strong>~3,800</Text> 个</span>
            <span>首批解析 <Text className="mono" strong>~40min</Text></span>
          </Space>
        </Card>

        <Row>
          <Col flex="auto" />
          <Space>
            <Button onClick={() => nav('/assets/sources')}>取消</Button>
            <Button type="primary" onClick={() => setStep(2)}>保存并接入</Button>
          </Space>
        </Row>
      </Card>
    </>
  );
}
