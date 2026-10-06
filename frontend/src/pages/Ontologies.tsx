import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  App, Button, Card, Col, Form, Input, Modal, Row,
  Space, Steps, Tag, Typography,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { api, type Ontology, type Version } from '../api';
import { useSession } from '../session';

const { Title, Text } = Typography;

const statusColor: Record<string, string> = { PUBLISHED: 'green', DRAFT: 'default', IN_REVIEW: 'orange' };
const INIT_OPTIONS = [
  { value: 'blank', label: '空白画布', desc: '仅创建本体元数据（名称/场景），你成为所有者' },
  { value: 'template', label: '供应链模板', desc: '最小可行集：4 对象 + 3 关系（画布草稿）' },
  { value: 'reverse', label: '数据资产逆向', desc: '从已探查的数据表生成对象草稿（上限 4 张）' },
];

/** 本体管理：卡片网格（对齐原型）+ 新建本体向导（三初始化路径，真实创建） */
export default function Ontologies() {
  const nav = useNavigate();
  const { message } = App.useApp();
  const { user, onto, chooseOnto } = useSession();
  const [ontos, setOntos] = useState<Ontology[]>([]);
  const [versions, setVersions] = useState<Version[]>([]);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [init, setInit] = useState<'blank' | 'template' | 'reverse'>('blank');
  const [form] = Form.useForm();

  const reload = useCallback(() => {
    api.ontologies(user).then(setOntos).catch(() => {});
  }, [user]);

  useEffect(() => { reload(); }, [reload]);
  useEffect(() => {
    if (onto) api.versions(onto).then(setVersions).catch(() => setVersions([]));
  }, [onto]);

  const create = async () => {
    const v = await form.validateFields();
    try {
      const o = await api.createOntology({ id: v.key, name: v.name, scene: v.scene, owner: user, init });
      message.success(`本体「${o.name}」已创建（你为所有者${o.objects > 0 ? `，初始化 ${o.objects} 对象 / ${o.edges} 关系` : ''}）`);
      setWizardOpen(false); setStep(0); form.resetFields();
      chooseOnto(o.id);
      reload();
    } catch (e) { message.error(String((e as Error).message)); }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>本体管理</Title>
          <Text type="secondary">本体的创建（三种初始化）、授权与生命周期 · 点击卡片设为工作本体，再点进入详情</Text>
        </div>
        <div style={{ flex: 1 }} />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setStep(0); setWizardOpen(true); }}>
          新建本体
        </Button>
      </div>

      <Row gutter={[12, 12]}>
        {ontos.map(o => (
          <Col span={6} key={o.id}>
            <Card size="small" hoverable style={{
              border: o.id === onto ? '2px solid #059669' : undefined,
              boxShadow: o.id === onto ? '0 2px 8px rgba(5,150,105,.18)' : undefined,
            }} onClick={() => chooseOnto(o.id)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <b style={{ fontSize: 15 }}>{o.name}</b>
                {o.id === onto && <Tag color="green">当前</Tag>}
              </div>
              <Text type="secondary" style={{ fontSize: 12 }}>{o.scene}</Text>
              <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <Tag color={statusColor[o.status]}>{o.status === 'DRAFT' ? '草稿' : '已发布'}</Tag>
                <Tag>{o.version}</Tag>
                <Tag>我的角色: {o.myRole}</Tag>
              </div>
              <div style={{ marginTop: 10, fontSize: 12, color: '#6b7688' }}>
                {o.objects} 对象 · {o.edges} 关系 · {o.members} 成员 · 所有者 {o.owner}
              </div>
              <div style={{ marginTop: 10 }}>
                <a onClick={e => { e.stopPropagation(); nav(`/modeling/ontology/detail?onto=${o.id}`); }}>详情与授权 →</a>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {onto && (
        <Card size="small" title={`${ontos.find(o => o.id === onto)?.name ?? onto} · 版本历史`} style={{ marginTop: 12 }}>
          {versions.map(v => (
            <div key={v.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '6px 0', borderBottom: '1px dashed #f1f3f5' }}>
              <b className="mono">{v.v}</b>
              <Tag color={v.status.includes('PUBLISHED') ? 'green' : v.status === 'RETRACTED' ? 'red' : 'default'}>{v.status}</Tag>
              <span style={{ fontSize: 12, color: '#6b7688' }}>{v.date} · {v.desc}</span>
            </div>
          ))}
        </Card>
      )}
      {!onto && (
        <Card size="small" style={{ marginTop: 12 }}>
          <Text type="secondary">尚未选择工作本体——点击上方任一本体卡片即可设为当前。</Text>
        </Card>
      )}

      <Modal title="新建本体" open={wizardOpen} footer={null} onCancel={() => setWizardOpen(false)} width={560}>
        <Steps current={step} size="small" items={[{ title: '初始化路径' }, { title: '基本信息' }, { title: '完成' }]} style={{ margin: '12px 0 20px' }} />
        {step === 0 && (
          <Space direction="vertical" style={{ width: '100%' }} size={10}>
            {INIT_OPTIONS.map(op => (
              <Card key={op.value} size="small" hoverable
                style={{ borderColor: init === op.value ? '#059669' : undefined }}
                onClick={() => setInit(op.value as typeof init)}>
                <b>{op.label}</b>{init === op.value && <Tag color="green" style={{ marginInlineStart: 8 }}>已选</Tag>}
                <div style={{ fontSize: 12, color: '#6b7688', marginTop: 4 }}>{op.desc}</div>
              </Card>
            ))}
            <Button type="primary" block onClick={() => setStep(1)}>下一步</Button>
          </Space>
        )}
        {step === 1 && (
          <Form form={form} layout="vertical">
            <Space style={{ display: 'flex' }} size={12}>
              <Form.Item name="key" label="Key（英文）" rules={[{ required: true }, { pattern: /^[a-z][a-z0-9-]*$/, message: '小写字母/数字/连字符' }]}
                style={{ width: 160 }}>
                <Input className="mono" placeholder="如 quality" />
              </Form.Item>
              <Form.Item name="name" label="名称" rules={[{ required: true }]} style={{ width: 160 }}>
                <Input placeholder="如 质量追溯本体" />
              </Form.Item>
            </Space>
            <Form.Item name="scene" label="场景" rules={[{ required: true }]}>
              <Input placeholder="一句话描述业务问题" />
            </Form.Item>
            <Space style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
              <Button onClick={() => setStep(0)}>上一步</Button>
              <Button type="primary" onClick={create}>创建（我为所有者）</Button>
            </Space>
          </Form>
        )}
      </Modal>
    </div>
  );
}
