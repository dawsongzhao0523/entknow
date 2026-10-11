import { useCallback, useEffect, useState } from 'react';
import {
  App, Button, Card, Input, Select, Space, Table, Tag, Typography,
} from 'antd';

const { TextArea: InputTextArea } = Input;
import { DownloadOutlined, FileTextOutlined } from '@ant-design/icons';
import { api, type Ontology, type Version } from '../../api';
import { useSession } from '../../session';

const { Title, Text } = Typography;

type Fmt = 'owl' | 'rdf' | 'skos';
const FMT_FILE: Record<Fmt, { ext: string; mime: string }> = {
  owl: { ext: 'ttl', mime: 'text/turtle' },
  rdf: { ext: 'nt', mime: 'text/plain' },
  skos: { ext: 'rdf', mime: 'application/rdf+xml' },
};

/** 版本与导出：版本历史（真实 versions）+ OWL/RDF/SKOS 标准导出（实时生成） */
export default function VersionOps() {
  const { message } = App.useApp();
  const { user } = useSession();
  const [ontos, setOntos] = useState<Ontology[]>([]);
  const [onto, setOnto] = useState('scm');
  const [versions, setVersions] = useState<Version[]>([]);
  const [format, setFormat] = useState<Fmt>('owl');
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
      const out = format === 'owl'
        ? await api.ontologyOWL(onto)
        : format === 'skos'
          ? await api.skosExport()
          : await api.exportOntology(onto, 'rdf');
      setText(out);
      const label = format === 'owl' ? 'OWL Turtle（含 rdfs:domain/range，可导入 Protégé）'
        : format === 'skos' ? 'SKOS RDF/XML（prefLabel/altLabel 术语表）'
        : 'RDF NTriples';
      message.success(`已生成 ${onto} 的 ${label}`);
    } catch (e) {
      message.error(String((e as Error).message));
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    message.success('已复制到剪贴板');
  };

  const download = () => {
    const meta = FMT_FILE[format];
    const blob = new Blob([text], { type: meta.mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${onto}-ontology.${meta.ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <Title level={4}>版本与导出</Title>
      <Text type="secondary">本体版本历史（真实 versions）· OWL / RDF / SKOS W3C 标准导出（由对象/关系/属性实时生成）</Text>
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
        <Card size="small" title="W3C 标准导出" style={{ flex: 1 }}
          extra={
            <Space>
              <Select size="small" style={{ width: 130 }} value={format} onChange={setFormat}
                options={[
                  { value: 'owl' as const, label: 'OWL Turtle' },
                  { value: 'rdf' as const, label: 'RDF NTriples' },
                  { value: 'skos' as const, label: 'SKOS 术语' },
                ]} />
              <Button size="small" type="primary" icon={<FileTextOutlined />} onClick={doExport}>生成</Button>
            </Space>
          }>
          <InputTextArea value={text} readOnly rows={14} className="mono" style={{ fontSize: 12 }}
            placeholder={'点击「生成」输出本体 W3C 标准文本…\n\n示例（OWL Turtle）：\n@prefix : <http://entknow.example/ontology/scm/> .\n:Supplier a owl:Class ; rdfs:label "供应商"@zh .\n:supplies a owl:ObjectProperty ; rdfs:domain :Supplier ; rdfs:range :Material .'} />
          {text && (
            <Space style={{ marginTop: 8 }}>
              <Button size="small" onClick={copy}>复制全文</Button>
              <Button size="small" icon={<DownloadOutlined />} onClick={download}>下载文件</Button>
            </Space>
          )}
        </Card>
      </div>
    </div>
  );
}
