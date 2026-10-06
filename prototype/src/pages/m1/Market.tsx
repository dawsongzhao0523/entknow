import React from 'react';
import { Card, Row, Col, Tag, Button, Input, Select, Space, Typography, Divider } from 'antd';
import { TableOutlined, ApiOutlined, FileTextOutlined, CodeOutlined, DeploymentUnitOutlined, DatabaseOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { ok, info } from '../../components/proto';

const { Title, Text } = Typography;

interface Asset {
  id: string; name: string; comment: string; type: '表' | 'VIEW' | 'API' | 'KB 文档' | '代码索引';
  typeColor: string; source: string; freq: string; sensitive: string; owner?: string;
  ops: ('preview' | 'lineage' | 'bind' | 'perm')[];
  icon: React.ReactNode;
}

const ASSETS: Asset[] = [
  { id: 'a1', name: 'purchase_order', comment: '采购订单', type: '表', typeColor: 'blue', source: 'scm_prod / MySQL', freq: '214万行 · 日更', sensitive: 'L2', owner: '张三', ops: ['preview', 'lineage', 'bind'], icon: <TableOutlined /> },
  { id: 'a2', name: 'lv_order_delivery', comment: '订单交付视图', type: 'VIEW', typeColor: 'cyan', source: '联邦层 StarRocks', freq: '逻辑视图 · 已发布 v3', sensitive: 'L3', owner: '继承依赖', ops: ['preview', 'lineage', 'bind'], icon: <DeploymentUnitOutlined /> },
  { id: 'a3', name: 'supplier', comment: '供应商', type: 'API', typeColor: 'default', source: 'SRM 系统', freq: '主数据 · 实时', sensitive: 'L2', ops: ['preview', 'perm'], icon: <ApiOutlined /> },
  { id: 'a4', name: 'material', comment: '物料', type: '表', typeColor: 'blue', source: 'scm_prod · dwd 层', freq: '主数据 · 日更', sensitive: 'L2', ops: ['preview', 'lineage', 'bind'], icon: <DatabaseOutlined /> },
  { id: 'a5', name: 'kb_sop', comment: '质量 SOP 文档', type: 'KB 文档', typeColor: 'purple', source: 'KB 知识库 · 在线增量 15min', freq: '附件 png / drawio / pdf', sensitive: 'L2', ops: ['preview', 'bind'], icon: <FileTextOutlined /> },
  { id: 'a6', name: 'code_biz_logic', comment: '订单拆分逻辑', type: '代码索引', typeColor: 'default', source: 'CodeNexus · 每日 03:00', freq: '函数级索引 · 不复制源码', sensitive: 'L2', ops: ['preview', 'lineage', 'bind'], icon: <CodeOutlined /> },
];

const OP_LABEL: Record<Asset['ops'][number], string> = { preview: '预览', lineage: '血缘', bind: '绑定本体', perm: '申请权限' };

export default function Market() {
  const nav = useNavigate();
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>数据集市</Title>
          <Text type="secondary">全部可消费资产：表 / VIEW / API / 文档 / 代码索引，按业务域与敏感级治理</Text>
        </div>
      </div>
      <Card>
        <Space style={{ marginBottom: 16 }} wrap>
          <Input.Search placeholder="搜索资产" defaultValue="采购" style={{ width: 220 }} allowClear />
          <Select defaultValue="all" style={{ width: 130 }} options={[{ value: 'all', label: '来源：全部' }, { value: 'scm', label: 'scm_prod' }, { value: 'srm', label: 'srm' }]} />
          <Select defaultValue="all" style={{ width: 130 }} options={[{ value: 'all', label: '类型：全部' }, { value: 't', label: '表' }, { value: 'v', label: 'VIEW' }, { value: 'a', label: 'API' }]} />
          <Select defaultValue="sc" style={{ width: 150 }} options={[{ value: 'sc', label: '业务域：供应链' }, { value: 'all', label: '业务域：全部' }]} />
        </Space>
        <Row gutter={[16, 16]}>
          {ASSETS.map(a => (
            <Col xs={24} sm={12} lg={8} key={a.id}>
              <Card size="small" styles={{ body: { minHeight: 200, display: 'flex', flexDirection: 'column' } }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: '#059669', fontSize: 16 }}>{a.icon}</span>
                  <div style={{ minWidth: 0 }}>
                    <div className="mono" style={{ fontWeight: 600 }}>{a.name}</div>
                    <Text type="secondary" style={{ fontSize: 12 }}>{a.comment}</Text>
                  </div>
                  <div style={{ flex: 1 }} />
                  <Tag color={a.typeColor}>{a.type}</Tag>
                </div>
                <div style={{ marginTop: 10, fontSize: 12, color: 'rgba(0,0,0,0.65)' }}>
                  <div>源：<span className="mono">{a.source}</span></div>
                  <div style={{ marginTop: 6 }}>{a.freq}</div>
                  <div style={{ marginTop: 6, display: 'flex', alignItems: 'center' }}>
                    敏感：<Tag color={a.sensitive >= 'L3' ? 'orange' : 'blue'} style={{ marginLeft: 4 }}>{a.sensitive}</Tag>
                    {a.owner && <><div style={{ flex: 1 }} /><Text type="secondary" style={{ fontSize: 12 }}>owner：{a.owner}</Text></>}
                  </div>
                </div>
                <div style={{ flex: 1 }} />
                <Divider style={{ margin: '10px 0 8px' }} />
                <Space size={12}>
                  {a.ops.map(op => (
                    <Button key={op} type="link" size="small" style={{ padding: 0 }}
                      onClick={() => {
                        if (op === 'bind') nav('/m4/binding');
                        else if (op === 'lineage') ok(`${a.name} 血缘已生成（原型示意）`);
                        else if (op === 'perm') ok(`已提交 ${a.name} 的权限申请，等待数据 Owner 审批`);
                        else info(`预览 · ${a.name}`, [
                          ['资产', `${a.name}（${a.comment}）`],
                          ['来源', a.source],
                          ['规模', a.freq],
                          ['样本', <span key="s" className="mono">PO20260930001 · 供应链一部 · 已下达 · ¥486,000</span>],
                        ]);
                      }}>
                      {OP_LABEL[op]}
                    </Button>
                  ))}
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 16 }}>
          共 46 个资产 · 业务域「供应链」命中 6 个
        </Text>
      </Card>
    </>
  );
}
