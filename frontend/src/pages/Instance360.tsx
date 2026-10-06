import { useCallback, useEffect, useState } from 'react';
import {
  App, Button, Card, Checkbox, Col, Descriptions, Modal, Row, Select, Space,
  Statistic, Steps, Tag, Timeline, Typography,
} from 'antd';
import { LockOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { api, type Func, type Instance } from '../api';

const { Title, Text } = Typography;
const ME = '张三';

const riskColor = (s: number) => (s > 80 ? '#c23b3b' : s > 60 ? '#c9861a' : '#2d8a4e');

/** 实例 360°：属性 / 状态机 / 时间线 / 治理化行动执行（风险分>80 强制二次确认） */
export default function Instance360() {
  const { message } = App.useApp();
  const [list, setList] = useState<Instance[]>([]);
  const [cur, setCur] = useState<Instance | null>(null);
  const [funcs, setFuncs] = useState<Func[]>([]);
  const [execOpen, setExecOpen] = useState(false);
  const [funcId, setFuncId] = useState('f3');
  const [confirm, setConfirm] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback((id: string) => {
    api.instance(id).then(setCur).catch(e => { setErr(String((e as Error).message)); setCur(null); });
  }, []);

  useEffect(() => {
    api.instances().then(l => { setList(l); if (l.length) load(l[0].id); }).catch(e => setErr(String(e.message)));
    api.functions().then(f => setFuncs(f.filter(x => x.cat === '行动'))).catch(() => {});
  }, [load]);

  const exec = async () => {
    if (!cur) return;
    if (cur.riskScore > 80 && !confirm) {
      message.warning(`实例风险分 ${cur.riskScore} > 80，必须勾选二次确认`); return;
    }
    try {
      const out = await api.executeAction({
        id: `ACT-${Date.now().toString(36).toUpperCase()}`, funcId, instanceId: cur.id, user: ME, confirm,
      });
      message.success(`行动已执行：${out.status}（${out.detail}）`);
      setExecOpen(false); setConfirm(false);
      load(cur.id);
    } catch (e) {
      message.error(String((e as Error).message)); // 403 鉴权 / 400 未确认文案直达
    }
  };

  const highRisk = !!cur && cur.riskScore > 80;

  return (
    <div>
      <Title level={4}>实例 360°</Title>
      <Text type="secondary">对象实例的全息视图：属性、状态机、风险分与时间线；行动经治理网关执行（真实写路径）</Text>
      {err && <Card style={{ marginTop: 12 }}>{err}</Card>}

      <Card size="small" style={{ marginTop: 12 }}>
        <Space>
          <span style={{ color: '#6b7688' }}>选择实例</span>
          <Select style={{ width: 320 }} value={cur?.id} showSearch optionFilterProp="label"
            options={list.map(i => ({ value: i.id, label: `${i.id} · ${i.props?.supplier ?? ''}（风险 ${i.riskScore}）` }))}
            onChange={id => { setConfirm(false); load(id); }} />
          <Button type="primary" danger icon={<ThunderboltOutlined />} disabled={!cur}
            onClick={() => setExecOpen(true)}>执行行动</Button>
        </Space>
      </Card>

      {cur && (
        <Row gutter={12} style={{ marginTop: 12 }}>
          <Col span={16}>
            <Card size="small" title={`属性 · ${cur.id}`} extra={<Tag color="blue">{cur.props?.type ?? cur.objectId}</Tag>}>
              <Descriptions size="small" column={2}>
                {Object.entries(cur.props ?? {}).filter(([k]) => k !== 'type').map(([k, v]) => (
                  <Descriptions.Item key={k} label={k}><Text code>{String(v)}</Text></Descriptions.Item>
                ))}
                <Descriptions.Item label="下单 / 承诺交期">{cur.orderDt || '—'} → {cur.promiseDt || '—'}</Descriptions.Item>
              </Descriptions>
              {cur.objectId === 'o4' && (
                <Steps size="small" current={['草稿', '已下达', '已发货', '已收货', '已关闭'].indexOf(cur.status)}
                  items={['草稿', '已下达', '已发货', '已收货', '已关闭'].map(s => ({ title: s }))} />
              )}
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small">
              <Statistic title="交付风险分" value={cur.riskScore} valueStyle={{ color: riskColor(cur.riskScore) }}
                suffix={highRisk ? <Tag color="red" style={{ marginInlineStart: 8 }}>需二次确认</Tag> : undefined} />
              <div style={{ marginTop: 8 }}>
                {funcs.map(f => (
                  <div key={f.id} style={{ fontSize: 12, color: '#5a5a72', marginTop: 4 }}>
                    <LockOutlined style={{ color: '#059669' }} /> {f.name} · <Text code style={{ fontSize: 11 }}>{f.signature}</Text>
                  </div>
                ))}
              </div>
            </Card>
          </Col>
        </Row>
      )}

      {cur && (
        <Card size="small" title="时间线（实例事件 · 追加幂等）" style={{ marginTop: 12 }}>
          <Timeline items={(cur.timeline ?? []).map(ev => ({
            children: <span style={{ fontSize: 13 }}>{ev.e} <Text type="secondary" style={{ fontSize: 12 }}>· {ev.t}</Text></span>,
          }))} />
        </Card>
      )}

      <Modal title={`执行行动 · ${cur?.id ?? ''}`} open={execOpen} onOk={exec} onCancel={() => setExecOpen(false)}
        okText="执行（幂等）" cancelText="取消" okButtonProps={{ danger: true }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Select style={{ width: '100%' }} value={funcId} onChange={setFuncId}
            options={funcs.map(f => ({ value: f.id, label: `${f.name}（${f.id}）· ${f.signature}` }))} />
          {highRisk && (
            <Card size="small" style={{ background: '#fff1f0', borderColor: '#ffa39e' }}>
              <Checkbox checked={confirm} onChange={e => setConfirm(e.target.checked)}>
                二次确认：风险分 {cur?.riskScore} &gt; 80，我已核实行情并承担行动后果
              </Checkbox>
            </Card>
          )}
          <Text type="secondary" style={{ fontSize: 12 }}>
            执行经网关治理：账号鉴权（403）→ 风险分&gt;80 强制二次确认（400）→ 成功后执行记录 + 实例事件 + 通知同事务落库。
          </Text>
        </Space>
      </Modal>
    </div>
  );
}
