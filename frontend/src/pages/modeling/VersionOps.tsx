import { useCallback, useEffect, useState } from 'react';
import {
  App, Button, Card, Input, Select, Space, Table, Tag, Typography,
} from 'antd';

const { TextArea: InputTextArea } = Input;
import { FileTextOutlined } from '@ant-design/icons';
import { api, type Ontology, type Version } from '../../api';
import { useSession } from '../../session';

const { Title, Text } = Typography;

/** 版本与导出：版本历史（真实 versions）+ OWL/RDF 文本导出（确定性生成） */
export default function VersionOps() {
  const { message } = App.useApp();
  const { user } = useSession();
  const [ontos, setOntos] = useState<Ontology[]>([]);
  const [onto, setOnto] = useState('scm');
  const [versions, setVersions] = useState<Version[]>([]);
  const [format, setFormat] = useState<'owl' | 'rdf'>('owl');
  const [text, setText] = useState('');

  const reloadVersions = useCallback((id: string) => {
    api.versions(id).then(setVersions).catch(() => {});
  }, []);


  useEffect(() => {
    api.ontologies(user).then(setOntos).catch(() => {});
  }, [user]);

  useEffect(() => { reloadVersions(onto); }, [onto, reloadVersions]);

  const doExport = async () => {
    try {
      const out = await api.exportOntology(onto, format);
      setText(out);
      message.success(`已导出 ${onto} 的 ${format === 'owl' ? 'OWL（Turtle）' : 'RDF（NTriples）'} 文本`);
    } catch (e) {
      message.error(String((e as Error).message));
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    message.success('已复制到剪贴板');
  };

  return (
    <div>
      <Title level={4}>版本与导出</Title>
      <Text type="secondary">本体版本历史（真实 versions）· OWL / RDF 确定性导出（由对象/关系/属性实时生成）</Text>
      <div style={{ margin: '12px 0' }}>
        <Select value={onto} onChange={setOnto} style={{ width: 240 }} variant="filled"
          options={ontos.map(o => ({ value: o.id, label: `${o.name}（${o.version}）` }))} />
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
        <Card size="small" title="版本历史" style={{ flex: 1 }}>
          <Table<Version> size="small" rowKey="id" pagination={false} dataSource={versions}
            columns={[
              { title: '版本', dataIndex: 'v', width: 70, render: (v: string) => <b className="mono">{v}</b> },
              { title: '日期', dataIndex: 'date', width: 80 },
              { title: '说明', dataIndex: 'desc' },
              { title: '状态', dataIndex: 'status', width: 120, render: (v: string) => (
                <Tag color={v.includes('PUBLISHED') ? 'green' : v === 'RETRACTED' ? 'red' : 'blue'}>{v}</Tag>) },
            ]} />
        </Card>
        <Card size="small" title="导出" style={{ flex: 1 }}
          extra={
            <Space>
              <Select size="small" style={{ width: 110 }} value={format} onChange={setFormat}
                options={[{ value: 'owl' as const, label: 'OWL Turtle' }, { value: 'rdf' as const, label: 'RDF NTriples' }]} />
              <Button size="small" type="primary" icon={<FileTextOutlined />} onClick={doExport}>导出</Button>
            </Space>
          }>
          <InputTextArea value={text} readOnly rows={14} className="mono" style={{ fontSize: 12 }}
            placeholder={'点击「导出」生成本体 OWL/RDF 文本…\n\n示例（OWL Turtle）：\n@prefix entknow: <http://entknow.example/ontology/> .\nentknow:PO a owl:Class ; rdfs:label "采购订单"@zh .'} />
          {text && (
            <Button size="small" style={{ marginTop: 8 }} onClick={copy}>复制全文</Button>
          )}
        </Card>
      </div>
    </div>
  );
}
