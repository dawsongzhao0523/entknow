import { Alert, Button, Card, Checkbox, Col, Descriptions, Radio, Row, Space, Table, Tag, Typography, message } from 'antd';
import { DownloadOutlined, MergeCellsOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const MAPPING = [
  { el: '对象', owl: 'Class', owlColor: 'blue', note: 'owl:Class' },
  { el: '属性', owl: 'DataProperty', owlColor: 'cyan', note: '对象属性字段' },
  { el: '关系', owl: 'ObjectProperty', owlColor: 'purple', note: '边属性 → Reification 注解' },
  { el: '函数', owl: '不导出', owlColor: 'default', note: '私有' },
];

const IMPORT_DIFF = [
  { kind: '新增', target: '新增类 ×2', detail: '合并进新草稿，不直接影响生产', color: 'green' },
  { kind: '删除', target: '删除类 ×1', detail: '本地已发布 ⚠ 需确认', color: 'red' },
  { kind: '修改', target: '属性变更 ×5', detail: '域 / 范围调整，逐项确认', color: 'orange' },
];

const OWL_SNIPPET = `<!-- supply_chain.owl 导出片段 -->
<owl:Class rdf:about="PurchaseOrder"/>
<owl:ObjectProperty rdf:about="SUPPLY">
  <rdfs:domain rdf:resource="Supplier"/>
  <rdfs:range rdf:resource="Plant"/>
</owl:ObjectProperty>`;

export default function Owl() {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>标准互操作 · RDF / OWL</Title>
          <Text type="secondary">OWL 2 标准互操作 · 时序 / 函数 / 传播为平台扩展，不进入 OWL（M3-F08）</Text>
        </div>
        <div style={{ flex: 1 }} />
        <Tag color="green">供应链本体 v0.3 · 生产中</Tag>
      </div>

      <Row gutter={12}>
        <Col span={12}>
          <Card size="small" title="导出" extra={<Tag color="blue">OWL 2</Tag>}>
            <Space style={{ marginBottom: 12 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>格式</Text>
              <Radio.Group defaultValue="rdfxml" optionType="button" buttonStyle="solid" size="small"
                options={[{ value: 'rdfxml', label: 'RDF/XML' }, { value: 'turtle', label: 'Turtle' }]} />
            </Space>
            <Table
              rowKey="el" size="small" pagination={false} style={{ marginBottom: 12 }}
              columns={[
                { title: '本体元素', dataIndex: 'el', width: 90, render: (v: string) => <b>{v}</b> },
                { title: 'OWL 映射', dataIndex: 'owl', width: 150, render: (v: string, r: (typeof MAPPING)[number]) => <Tag color={r.owlColor}>{v}</Tag> },
                { title: '说明', dataIndex: 'note', render: (v: string) => <Text type="secondary" style={{ fontSize: 12 }}>{v}</Text> },
              ]}
              dataSource={MAPPING}
            />
            <Space size={16} style={{ marginBottom: 12 }}>
              <Checkbox defaultChecked>对象</Checkbox>
              <Checkbox defaultChecked>属性</Checkbox>
              <Checkbox defaultChecked>关系</Checkbox>
              <Checkbox disabled>函数（私有 · 不可选）</Checkbox>
            </Space>
            <pre style={{ background: '#f8fbfa', border: '1px solid #e2e4e9', borderRadius: 8, padding: '10px 12px', fontSize: 11, lineHeight: 1.7, overflow: 'auto' }}>
              {OWL_SNIPPET}
            </pre>
            <Button type="primary" icon={<DownloadOutlined />} style={{ marginTop: 12 }}
              onClick={() => message.success('已导出 supply_chain.owl')}>导出</Button>
          </Card>
        </Col>

        <Col span={12}>
          <Card size="small" title="导入（Protégé 治理结果回灌）" extra={<Tag>RDF / OWL</Tag>}>
            <Descriptions size="small" column={1} style={{ marginBottom: 12 }}
              items={[
                { key: 'f', label: '文件', children: <span style={{ fontFamily: 'monospace' }}>supply_chain_v2.owl</span> },
                { key: 's', label: '来源', children: 'Protégé · 治理结果回灌' },
                { key: 'p', label: '解析', children: <span>Class <b style={{ fontFamily: 'monospace' }}>34</b> ｜ ObjectProperty <b style={{ fontFamily: 'monospace' }}>12</b></span> },
              ]}
            />
            <Table
              rowKey="target" size="small" pagination={false} style={{ marginBottom: 12 }}
              columns={[
                { title: '变更', dataIndex: 'kind', width: 70, render: (v: string, r: (typeof IMPORT_DIFF)[number]) => <Tag color={r.color}>{v}</Tag> },
                { title: '项', dataIndex: 'target', width: 140, render: (v: string) => <b>{v}</b> },
                { title: '说明', dataIndex: 'detail', render: (v: string, r: (typeof IMPORT_DIFF)[number]) => <Text type="secondary" style={{ fontSize: 12, color: r.color === 'red' ? '#c9861a' : undefined }}>{v}</Text> },
              ]}
              dataSource={IMPORT_DIFF}
            />
            <Space style={{ marginBottom: 12 }}>
              <Button onClick={() => message.info('diff 预览（mock）')}>预览 diff</Button>
              <Button type="primary" icon={<MergeCellsOutlined />}
                onClick={() => message.success('已合并为新草稿 v0.5，进入评审流程')}>合并为新草稿 v0.5</Button>
            </Space>
            <div style={{ borderTop: '1px solid #f1f3f5', paddingTop: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#5a5a72', marginBottom: 8 }}>冲突策略</div>
              <Radio.Group defaultValue="platform"
                options={[{ value: 'platform', label: '平台为准' }, { value: 'file', label: '文件为准' }]} />
            </div>
          </Card>
        </Col>
      </Row>

      <Alert
        style={{ marginTop: 12 }} type="info" showIcon
        message={<span><b>回灌保护:</b> 导入永不直接覆盖生产版本，一律合并为新草稿（v0.5）并进入评审流程；函数 / 时序 / 传播等平台私有元素不受导入影响。</span>}
      />
    </>
  );
}
