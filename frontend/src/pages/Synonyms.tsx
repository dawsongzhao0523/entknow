import { useCallback, useEffect, useState } from 'react';
import { App, Card, Select, Space, Table, Tag, Typography } from 'antd';
import { api, type Synonym } from '../api';

const { Title, Text } = Typography;
const ME = '张三';

/** 同义词治理：AI 归并建议的专家确认闭环（归并幂等，换词重复归并 409） */
export default function Synonyms() {
  const { message } = App.useApp();
  const [rows, setRows] = useState<Synonym[]>([]);

  const reload = useCallback(() => {
    api.synonyms().then(setRows).catch(e => message.error(String((e as Error).message)));
  }, [message]);

  useEffect(() => { reload(); }, [reload]);

  const merge = async (y: Synonym, standard: string) => {
    try {
      const out = await api.mergeSynonym(y.id, standard, ME);
      message.success(`已归并：标准词「${out.standard}」（${out.by} · ${out.at}）`);
      reload();
    } catch (e) {
      message.error(String((e as Error).message)); // 幂等重放静默；换词 409 / 非组内词 400 直达
    }
  };

  const pending = rows.filter(r => r.status === '待归并').length;

  return (
    <div>
      <Title level={4}>同义词治理</Title>
      <Text type="secondary">AI 归并建议需专家确认：选定标准词后归并写回，重复归并幂等、换词归并被拒绝</Text>
      <Card size="small" style={{ marginTop: 12 }} extra={<Tag color="blue">待处理 {pending} 组</Tag>}>
        <Table<Synonym> size="small" rowKey="id" pagination={false} dataSource={rows}
          columns={[
            { title: '同义词组', dataIndex: 'terms', render: (terms: string[]) => (
              <Space size={4} wrap>
                {terms.map(t => <Tag key={t} color={t === '物料' || t === '供应商' ? 'green' : 'default'}>{t}</Tag>)}
              </Space>
            ) },
            { title: '标准词', dataIndex: 'standard', width: 120,
              render: (v: string) => v ? <Tag color="green">{v}</Tag> : <Text type="secondary">待定</Text> },
            { title: '状态', dataIndex: 'status', width: 90,
              render: (v: string) => <Tag color={v === '已归并' ? 'green' : 'orange'}>{v}</Tag> },
            { title: '归并人 / 时间', key: 'by', width: 170,
              render: (_, r) => r.by ? <Text type="secondary" style={{ fontSize: 12 }}>{r.by} · {r.at}</Text> : '—' },
            { title: '操作', key: 'op', width: 200, render: (_, y) => y.status === '待归并' ? (
              <Select size="small" style={{ width: 180 }} placeholder="选定标准词后归并"
                options={y.terms.map(t => ({ value: t, label: `归并到「${t}」` }))}
                onChange={v => merge(y, v)} />
            ) : (
              <Text type="secondary" style={{ fontSize: 12 }}>已完结</Text>
            ) },
          ]} />
      </Card>
    </div>
  );
}
