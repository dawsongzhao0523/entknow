import { useState } from 'react';
import { App, Button, Card, Form, Input, Modal, Space, Steps, Tag } from 'antd';

const INIT_OPTIONS = [
  { value: 'blank', label: '空白画布', desc: '仅创建本体元数据，你成为所有者' },
  { value: 'template', label: '供应链模板', desc: '最小可行集：4 对象 + 3 关系草稿' },
  { value: 'reverse', label: '数据资产逆向', desc: '从已探查数据表生成对象草稿' },
];

/** 新建本体向导（独立组件文件） */
export default function OntologyWizard({ open, onClose, onCreate }: {
  open: boolean; onClose: () => void;
  onCreate: (v: { key: string; name: string; scene: string }, init: string) => Promise<void>;
}) {
  const { message } = App.useApp();
  const [step, setStep] = useState(0);
  const [init, setInit] = useState('blank');
  const [form] = Form.useForm();

  const handleCreate = async () => {
    try {
      const v = await form.validateFields();
      await onCreate(v, init);
      form.resetFields(); setStep(0); onClose();
    } catch (e: unknown) {
      if ((e as Error).message) message.error(String((e as Error).message));
    }
  };

  return (
    <Modal title="新建本体" open={open} footer={null} onCancel={onClose} width={520}>
      <Steps current={step} size="small" items={[{ title: '初始化路径' }, { title: '基本信息' }]} style={{ margin: '12px 0 20px' }} />
      {step === 0 && (
        <Space direction="vertical" style={{ width: '100%' }} size={10}>
          {INIT_OPTIONS.map(op => (
            <Card key={op.value} size="small" hoverable
              style={{ borderColor: init === op.value ? '#059669' : undefined }}
              onClick={() => setInit(op.value)}>
              <b>{op.label}</b>
              {init === op.value && <Tag color="green" style={{ marginInlineStart: 8 }}>已选</Tag>}
              <div style={{ fontSize: 12, color: '#6b7688', marginTop: 4 }}>{op.desc}</div>
            </Card>
          ))}
          <Button type="primary" block onClick={() => setStep(1)}>下一步</Button>
        </Space>
      )}
      {step === 1 && (
        <Form form={form} layout="vertical">
          <Form.Item name="key" label="Key（英文）" rules={[{ required: true }, { pattern: /^[a-z][a-z0-9-]*$/, message: '小写字母/数字/连字符' }]}>
            <Input placeholder="如 quality" />
          </Form.Item>
          <Form.Item name="name" label="名称" rules={[{ required: true }]}>
            <Input placeholder="如 质量追溯本体" />
          </Form.Item>
          <Form.Item name="scene" label="场景" rules={[{ required: true }]}>
            <Input placeholder="一句话描述业务问题" />
          </Form.Item>
          <Space style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <Button onClick={() => setStep(0)}>上一步</Button>
            <Button type="primary" onClick={handleCreate}>创建（我为所有者）</Button>
          </Space>
        </Form>
      )}
    </Modal>
  );
}
