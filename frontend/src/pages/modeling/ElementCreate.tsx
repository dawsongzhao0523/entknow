import React, { useState } from 'react';
import { App, Form, Input, Modal, Radio, Select, Space } from 'antd';
import { api } from '../../api';
import { useSession } from '../../session';

const { TextArea } = Input;
const KINDS = ['静态事实', '单体动态', '立方动态'];
const EDGE_KINDS = ['一对多', '多对多', '一对一'];
const FUNC_CATS = ['指标', '派生', '行动', '权限'];
const RULE_KINDS = ['V→V', 'V→E', 'E→V', 'E→E'];

export type ElementType = 'object' | 'edge' | 'function' | 'rule';

/** 统一的元素创建弹窗：对象 / 关系 / 函数 / 规则（设计器与详情页共用） */
export default function ElementCreate({
  type, open, onClose, onCreated, ontology,
  objects = [], // 供关系选择 from/to
  initialFrom, initialTo, // 拖拽连线时预填
}: {
  type: ElementType; open: boolean; onClose: () => void; onCreated: () => void;
  ontology: string; objects?: { id: string; name: string }[];
  initialFrom?: string; initialTo?: string;
}) {
  const { message } = App.useApp();
  const { user } = useSession();
  const [form] = Form.useForm();

  // 打开时预填拖拽连线的起点/终点
  React.useEffect(() => {
    if (open && type === 'edge' && initialFrom && initialTo) {
      form.setFieldsValue({ from: initialFrom, to: initialTo });
    }
  }, [open, type, initialFrom, initialTo, form]);
  const [saving, setSaving] = useState(false);

  const title = { object: '新建对象', edge: '新建关系', function: '新建函数', rule: '新建规则' }[type];

  const handleCreate = async () => {
    const v = await form.validateFields();
    setSaving(true);
    try {
      const id = `${type[0]}-${Date.now().toString(36)}`;
      if (type === 'object') {
        await api.createObject({
          id, name: v.name, en: v.en, kind: v.kind, version: 'v0.1', status: 'DRAFT',
          owner: user, ontology, refCount: 0, shared: v.shared ?? false,
          props: v.props ? v.props.split('\n').filter(Boolean).map((line: string) => {
            const [name, comment] = line.split(/[：:]/).map(s => s.trim());
            return { name: name || line.trim(), type: 'string', comment: comment ?? '' };
          }) : [{ name: v.en + '_id', type: 'string', comment: '新建，待补全' }],
        });
      } else if (type === 'edge') {
        const edgeProps = v.edgeProps ? v.edgeProps.split('\n').filter(Boolean).map((line: string) => {
          const [name, type, comment] = line.split(/[：:]/).map(s2 => s2.trim());
          return { name: name || line.trim(), type: type || 'string', comment: comment ?? '', temporal: v.temporal ?? '', agg: v.agg ?? '' };
        }) : [];
        await api.createEdge({
          id, name: v.name, from: v.from, to: v.to, version: 'v0.1', status: 'DRAFT',
          refCount: 0, props: edgeProps, perm: '',
        });
      } else if (type === 'function') {
        await api.createFunction({
          id, name: v.name, cat: v.cat, version: 'v0.1', status: 'DRAFT',
          tests: '', signature: v.signature ?? '', impl: v.impl ?? '', perm: '',
        });
      } else if (type === 'rule') {
        await api.createRule({ id, def: v.def, kind: v.kind, status: '草稿', fired: 0 });
      }
      message.success(`${title.replace('新建', '')}「${v.name || v.def?.slice(0, 20)}」已创建（DRAFT）`);
      form.resetFields();
      onClose();
      onCreated();
    } catch (e) {
      message.error(String((e as Error).message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={title} open={open} onOk={handleCreate} onCancel={onClose}
      okText="创建" cancelText="取消" confirmLoading={saving} width={520}>
      <Form form={form} layout="vertical">
        {type === 'object' && (
          <>
            <Space style={{ display: 'flex' }} size={12}>
              <Form.Item name="name" label="中文名" rules={[{ required: true }]} style={{ width: 160 }}>
                <Input placeholder="如 来料检验记录" />
              </Form.Item>
              <Form.Item name="en" label="英文名" rules={[{ required: true }]} style={{ width: 160 }}>
                <Input placeholder="如 IncomingInspection" />
              </Form.Item>
            </Space>
            <Space style={{ display: 'flex' }} size={12}>
              <Form.Item name="kind" label="类型" initialValue="静态事实" style={{ width: 140 }}>
                <Radio.Group options={KINDS.map(k => ({ value: k, label: k }))} optionType="button" />
              </Form.Item>
              <Form.Item name="shared" label="是否共享" initialValue={false} style={{ width: 120 }}>
                <Select options={[{ value: false, label: '空间内' }, { value: true, label: '全集团共享' }]} />
              </Form.Item>
            </Space>
            <Form.Item name="props" label="属性清单（每行一个：名称：说明）">
              <TextArea rows={3} placeholder={'检验单号：唯一标识\n供应商：关联供应商对象'} />
            </Form.Item>
          </>
        )}
        {type === 'edge' && (
          <>
            <Form.Item name="name" label="关系名" rules={[{ required: true }]}>
              <Input placeholder="如 SUPPLY（供应）" />
            </Form.Item>
            <Space style={{ display: 'flex' }} size={12}>
              <Form.Item name="from" label="起点对象" rules={[{ required: true, message: '请选择起点' }]} style={{ width: 200 }}>
                <Select showSearch optionFilterProp="label" placeholder="搜索并选择对象"
                  options={objects.map(o => ({ value: o.name, label: o.name }))} />
              </Form.Item>
              <Form.Item name="to" label="终点对象" rules={[{ required: true, message: '请选择终点' }]} style={{ width: 200 }}>
                <Select showSearch optionFilterProp="label" placeholder="搜索并选择对象"
                  options={objects.map(o => ({ value: o.name, label: o.name }))} />
              </Form.Item>
            </Space>
            <Space style={{ display: 'flex' }} size={12}>
              <Form.Item name="kind" label="基数" initialValue="一对多" style={{ width: 140 }}>
                <Select options={EDGE_KINDS.map(k => ({ value: k, label: k }))} />
              </Form.Item>
              <Form.Item name="temporal" label="时序约束" style={{ width: 140 }}>
                <Select allowClear placeholder="选择时序" options={[
                  { value: '月度', label: '月度' }, { value: '季度', label: '季度' },
                  { value: '年度', label: '年度' }, { value: '实时', label: '实时' },
                ]} />
              </Form.Item>
              <Form.Item name="agg" label="聚合方式" style={{ width: 120 }}>
                <Select allowClear placeholder="聚合" options={[
                  { value: 'sum', label: '求和' }, { value: 'avg', label: '均值' },
                  { value: 'max', label: '最大' }, { value: 'min', label: '最小' },
                ]} />
              </Form.Item>
            </Space>
            <Form.Item name="edgeProps" label="边属性（每行一个：属性名：类型：说明）">
              <TextArea rows={3} placeholder='供货量：decimal：月度供货金额 · 时延：int：平均交付天数 · 成本：decimal：单价成本' />
            </Form.Item>
            <Form.Item name="constraint" label="约束规则（选填）">
              <Select allowClear placeholder="关联规则（在规则管理中创建）" options={[
                { value: 'delay>20%', label: '时延变化>20% → 下游风险重算' },
                { value: 'cost>threshold', label: '成本超阈值 → 触发预警' },
              ]} />
            </Form.Item>
          </>
        )}
        {type === 'function' && (
          <>
            <Space style={{ display: 'flex' }} size={12}>
              <Form.Item name="name" label="函数名" rules={[{ required: true }]} style={{ width: 180 }}>
                <Input placeholder="如 交付风险分" />
              </Form.Item>
              <Form.Item name="cat" label="类型" initialValue="指标" style={{ width: 140 }}>
                <Radio.Group options={FUNC_CATS.map(c => ({ value: c, label: c }))} optionType="button" />
              </Form.Item>
            </Space>
            <Form.Item name="signature" label="签名">
              <Input className="mono" placeholder="(po: 采购订单) → score: decimal" />
            </Form.Item>
            <Form.Item name="impl" label="实现说明">
              <TextArea rows={2} placeholder="计算逻辑 / 约束条件 / 回滚策略" />
            </Form.Item>
          </>
        )}
        {type === 'rule' && (
          <>
            <Form.Item name="def" label="规则定义" rules={[{ required: true }]}>
              <TextArea rows={3} placeholder={'如：SUPPLY.delay 变化>20% → 采购订单.交付风险分 重算'} />
            </Form.Item>
            <Form.Item name="kind" label="类型" initialValue="V→V">
              <Radio.Group options={RULE_KINDS.map(k => ({ value: k, label: k }))} optionType="button" />
            </Form.Item>
          </>
        )}
      </Form>
    </Modal>
  );
}
