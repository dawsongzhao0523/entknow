import { Card, Collapse, Table, Tag, Button, Space, Typography, Alert } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { PO_FIELDS, PO_TABLE, type FieldProfile } from '../../mock/data';
import { run } from '../../components/proto';

const { Title, Text } = Typography;

const fieldColumns = [
  { title: '字段', dataIndex: 'name', render: (v: string) => <Text className="mono" strong>{v}</Text> },
  { title: '类型', dataIndex: 'type', render: (v: string) => <Text className="mono" style={{ fontSize: 12 }}>{v}</Text> },
  { title: '空值率', dataIndex: 'nullRate', render: (v: string) => <Text className="mono">{v}</Text> },
  { title: '样本值', dataIndex: 'sample', render: (v: string) => <Text className="mono" style={{ fontSize: 12 }}>{v}</Text> },
  {
    title: '备注', dataIndex: 'comment',
    render: (v: string, r: FieldProfile) => (
      <>
        {v}
        {r.aiFilled && <Tag color="purple" style={{ marginLeft: 6 }}>AI 补全*</Tag>}
      </>
    ),
  },
];

const SIBLINGS = [
  { name: 'supplier', comment: '供应商' },
  { name: 'material', comment: '物料' },
  { name: 'po_line', comment: '订单行' },
];

export default function ProfileReport() {
  const nav = useNavigate();

  const poContent = (
    <>
      <Space wrap size={12} style={{ marginBottom: 12 }}>
        <Text type="secondary">字段 <Text className="mono" strong>{PO_TABLE.fields}</Text></Text>
        <Text type="secondary">推断主键：<Text className="mono" strong>{PO_TABLE.pk}</Text></Text>
        <Text type="secondary">
          推断外键：{PO_TABLE.fks.map((fk, i) => (
            <Text key={i} className="mono" style={{ fontSize: 12, marginRight: 8 }}>{fk}</Text>
          ))}
        </Text>
      </Space>
      <Table<FieldProfile>
        rowKey="name" size="small" pagination={false}
        columns={fieldColumns as never} dataSource={PO_FIELDS}
      />
      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
        ⓘ 备注 = 源库字段 COMMENT 直采；缺省时 AI 按命名 + 样本值补全并标 * 待确认
      </Text>
      <Alert
        style={{ marginTop: 12 }} type="info" showIcon
        message={<span><b>AI 建模建议：</b>该表适合建为<b>【单体动态对象 · 采购订单】</b>，status 字段呈现状态机特征（7 个离散值），建议生成状态机草稿</span>}
        action={<Button size="small" type="primary" onClick={() => nav('/m3/designer')}>采纳 → 建模</Button>}
      />
    </>
  );

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>
            <Tag color="blue"><span className="mono">scm_prod</span> · MySQL</Tag>
            元数据探查报告
          </Title>
          <Text type="secondary">
            库 <Text className="mono" strong>scm_prod</Text> · 表 <Text className="mono" strong>142</Text> · 探查时间 <Text className="mono">2026-10-01 09:30</Text>
          </Text>
        </div>
        <div style={{ flex: 1 }} />
        <Button type="primary" icon={<ReloadOutlined />} onClick={() => run('重新探查', '全量重扫 142 张表：字段、类型、空值率、主外键推断（约 8 分钟，后台执行）。')}>重新探查</Button>
      </div>

      <Card>
        <Collapse
          defaultActiveKey={['purchase_order']}
          items={[
            {
              key: 'purchase_order',
              label: (
                <Space>
                  <Text className="mono" strong>{PO_TABLE.name}</Text>
                  <Text type="secondary">（{PO_TABLE.comment}）</Text>
                  <Tag color="blue">表</Tag>
                  <Text type="secondary" style={{ fontSize: 12 }}>行数 <Text className="mono" strong>~{PO_TABLE.rows}</Text></Text>
                </Space>
              ),
              children: poContent,
            },
            ...SIBLINGS.map(t => ({
              key: t.name,
              label: (
                <Space>
                  <Text className="mono">{t.name}</Text>
                  <Text type="secondary">（{t.comment}）</Text>
                  <Tag>表</Tag>
                </Space>
              ),
              children: <Text type="secondary">字段明细与主外键推断加载中…</Text>,
            })),
          ]}
        />
        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 12 }}>
          ⋯ 其余 138 张表，展开查看字段明细与主外键推断 · 共 142 张表 · 上次探查 2026-10-01 09:30
        </Text>
      </Card>
    </>
  );
}
