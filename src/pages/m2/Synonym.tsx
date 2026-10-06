import React, { useState } from 'react';
import { Alert, Button, Card, Input, Select, Space, Table, Tag, Typography } from 'antd';
import { DownloadOutlined, RobotOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { ok, run, info } from '../../components/proto';

const { Title, Text } = Typography;

const MERGED = [
  { key: 'm1', group: ['物料', '料号', 'Material'], standard: '物料', by: '张三', at: '2026-09-28' },
];

export default function Synonym() {
  const nav = useNavigate();
  const [std, setStd] = useState('供应商');
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>同义词与归一化工作台</Title>
          <Text type="secondary">AI 归并建议需专家确认后，才会写回各源（M2-F05）</Text>
        </div>
        <div style={{ flex: 1 }} />
        <Space>
          <Tag color="blue" style={{ marginRight: 0 }}>待处理 38 组</Tag>
          <Input.Search placeholder="搜索同义词组" style={{ width: 220 }} allowClear />
          <Button icon={<RobotOutlined />} onClick={() => run('批量 AI 建议', '对 38 组待处理同义词组批量生成归并建议与置信度（约 2 分钟）。')}>批量 AI 建议</Button>
          <Button icon={<DownloadOutlined />} onClick={() => ok('同义词词典已导出：synonym_dict_20261004.xlsx（1,286 条）')}>导出词典</Button>
        </Space>
      </div>

      <Card size="small" style={{ marginBottom: 12, borderColor: '#a7f3d0' }}>
        <Space size={8} wrap>
          <b style={{ fontSize: 14 }}>「供应商」≈「供货商」≈「Vendor」</b>
          <Tag color="blue">相似度 0.94</Tag>
          <Text type="secondary" style={{ fontSize: 12 }}>证据：三源共现 <Text className="mono" strong>47</Text> 次</Text>
        </Space>
        <div style={{ marginTop: 12 }}>
          <Space size={8} wrap>
            <Text type="secondary" style={{ fontSize: 12 }}>归并为标准词：</Text>
            <Select value={std} onChange={setStd} style={{ width: 160 }}
              options={['供应商', '供货商', 'Vendor'].map(v => ({ value: v, label: v }))} />
            <Text type="secondary" style={{ fontSize: 12 }}>映射写回范围：</Text>
            <Tag>KB 词条 ×12</Tag><Tag>表字段 ×3</Tag><Tag>指标 ×2</Tag>
          </Space>
        </div>
        <div style={{ marginTop: 12 }}>
          <Space>
            <Button type="primary" onClick={() => run('确认归并', `以「${std}」为标准词归并，映射写回 KB 词条 ×12 / 表字段 ×3 / 指标 ×2，并记入 G 轴版本流。`)}>确认归并</Button>
            <Button onClick={() => ok('已拆分为独立词条：「供应商」/「供货商」/「Vendor」（原型示意）')}>拆分</Button>
            <Button onClick={() => ok('已标记不相关，该组移出待处理队列并反馈给 AI 归并模型')}>标记不相关</Button>
          </Space>
        </div>
      </Card>

      <Card size="small" style={{ marginBottom: 12, borderColor: '#ffa39e', background: '#fff2f0' }}>
        <Space size={8} wrap>
          <b style={{ fontSize: 14 }}>「客户」≈「会员」</b>
          <Tag color="blue">相似度 0.71</Tag>
          <Tag color="red">⚠ 存在口径冲突</Tag>
        </Space>
        <div style={{ marginTop: 12, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Card size="small" style={{ flex: 1, minWidth: 220, background: '#fff' }}>
            <Tag color="purple">CRM</Tag> 客户 = <b>签约主体</b>
          </Card>
          <Card size="small" style={{ flex: 1, minWidth: 220, background: '#fff' }}>
            <Tag color="blue">数仓</Tag> 会员 = <b>注册账号</b>
          </Card>
        </div>
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center' }}>
          <Text style={{ fontSize: 12.5, color: '#d46b08', fontWeight: 600 }}>→ 建议不归并，建跨源链</Text>
          <Button type="primary" style={{ marginLeft: 'auto' }} onClick={() => nav('/m2/crosslink')}>
            保持分立 ＋ 建 crosslink → M2-F06
          </Button>
        </div>
      </Card>

      <Alert type="info" showIcon style={{ marginBottom: 12 }}
        message="归并写回即治理事件" description="确认归并后，映射将写回 KB 词条 / 表字段 / 指标，并记入 G 轴版本流。" />

      <Card title="已归并（最近）" size="small"
        extra={<Text type="secondary" style={{ fontSize: 12 }}>归并结果写回 KB / 表字段 / 指标</Text>}>
        <Table rowKey="key" size="small" pagination={false} dataSource={MERGED}
          columns={[
            { title: '同义词组', dataIndex: 'group', render: (g: string[]) => <Space size={4}>{g.map((w, i) => <React.Fragment key={w}>{i > 0 && <Text type="secondary">≈</Text>}<Tag>{w}</Tag></React.Fragment>)}</Space> },
            { title: '标准词', dataIndex: 'standard', width: 120, render: (v: string) => <b>「{v}」</b> },
            { title: '归并人', dataIndex: 'by', width: 100 },
            { title: '归并时间', dataIndex: 'at', width: 120, render: (v: string) => <Text className="mono" style={{ fontSize: 12 }}>{v}</Text> },
            { title: '操作', key: 'ops', width: 80, render: () => <Button size="small" type="link" onClick={() => info('归并详情 · 物料', [
              ['同义词组', '物料 ≈ 料号 ≈ Material'],
              ['写回范围', 'KB 词条 ×8 · 表字段 ×2 · 指标 ×1'],
              ['治理事件', <span key="g" className="mono">G-2026-0928-03 · 归并人 张三</span>],
            ])}>查看</Button> },
          ] as never} />
      </Card>
    </>
  );
}
