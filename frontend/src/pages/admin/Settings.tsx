import { useEffect, useState } from 'react';
import {
  App, Button, Card, Checkbox, Radio, Select, Space, Spin, Switch, Tabs, Tag, Typography,
} from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { api, type Ontology, type PrefSettings } from '../../api';
import { useSession } from '../../session';

const { Title, Text } = Typography;

const LANDING_OPTIONS = [
  { value: '', label: '首页（数据总览）' },
  { value: 'assets/datasources', label: '数据源中心' },
  { value: 'modeling/registry', label: '注册中心' },
  { value: 'reasoning/query', label: '语义查询' },
  { value: 'governance/reviews', label: '治理评审台' },
  { value: 'admin/overview', label: '系统运营' },
];

const NOTIFY_CATS = ['待办处理', '治理任务', '协同分享'];

function Item({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '14px 0', borderBottom: '1px dashed #f1f3f5' }}>
      <div style={{ width: 200 }}>
        <div style={{ fontWeight: 600 }}>{label}</div>
        {hint && <Text type="secondary" style={{ fontSize: 12 }}>{hint}</Text>}
      </div>
      <div>{children}</div>
    </div>
  );
}

/** M9 个性化设置：按账号持久化，保存后主题/密度/字体/落地页/默认本体/通知过滤即时生效 */
export default function Settings() {
  const { message } = App.useApp();
  const { user, prefs, savePrefs, prefsLoaded } = useSession();
  const [draft, setDraft] = useState<PrefSettings>({});
  const [saving, setSaving] = useState(false);
  const [ontos, setOntos] = useState<Ontology[]>([]);

  useEffect(() => { setDraft(prefs); }, [prefs]);
  useEffect(() => { api.ontologies(user).then(setOntos).catch(() => {}); }, [user]);

  if (!prefsLoaded) return <Card><Spin /></Card>;

  const set = <K extends keyof PrefSettings>(k: K, v: PrefSettings[K]) =>
    setDraft(d => ({ ...d, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await savePrefs(draft);
      message.success('设置已保存并全局生效（仅影响本人账号）');
    } catch (e) {
      message.error(String((e as Error).message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>个性化设置</Title>
          <Text type="secondary">当前用户：{user}（仅影响本人账号，保存即生效）</Text>
        </div>
        <div style={{ flex: 1 }} />
        <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={save}>保存设置</Button>
      </div>
      <Card>
        <Tabs
          defaultActiveKey="ui"
          items={[
            {
              key: 'ui', label: '界面偏好',
              children: (
                <>
                  <Item label="主题" hint="全局配色（立即生效）">
                    <Radio.Group value={draft.theme} onChange={e => set('theme', e.target.value)} options={[
                      { value: 'light', label: '浅色' }, { value: 'dark', label: '深色' },
                    ]} />
                  </Item>
                  <Item label="密度" hint="表格与组件尺寸（立即生效）">
                    <Radio.Group value={draft.density} onChange={e => set('density', e.target.value)} options={[
                      { value: 'compact', label: '紧凑' }, { value: 'default', label: '默认' }, { value: 'loose', label: '宽松' },
                    ]} />
                  </Item>
                  <Item label="代码 / ID 字体" hint="关闭后等宽字段回退系统字体">
                    <Switch checked={draft.monoFont !== false} onChange={v => set('monoFont', v)} />
                  </Item>
                </>
              ),
            },
            {
              key: 'work', label: '工作台',
              children: (
                <>
                  <Item label="登录后默认页" hint="每次会话首次进入首页时跳转">
                    <Select value={draft.landingPage ?? ''} onChange={v => set('landingPage', v)}
                      style={{ width: 260 }} options={LANDING_OPTIONS} />
                  </Item>
                  <Item label="默认本体" hint="顶栏本体选择器初始值">
                    <Select value={draft.defaultOnto ?? ''} onChange={v => set('defaultOnto', v)}
                      style={{ width: 320 }} allowClear placeholder="跟随系统默认"
                      options={ontos.map(o => ({ value: o.id, label: `${o.name}（${o.version}）` }))} />
                  </Item>
                </>
              ),
            },
            {
              key: 'notify', label: '通知',
              children: (
                <>
                  <Item label="消息类别" hint="首页消息中心仅展示勾选类别">
                    <Checkbox.Group value={draft.notifyCats ?? []} onChange={v => set('notifyCats', v as string[])}
                      options={NOTIFY_CATS.map(c => ({ value: c, label: c }))} />
                  </Item>
                  <Item label="当前过滤效果">
                    <Space size={6}>
                      {(draft.notifyCats ?? []).length === 0
                        ? <Tag>全部隐藏</Tag>
                        : (draft.notifyCats ?? []).map(c => <Tag key={c} color="blue">{c}</Tag>)}
                    </Space>
                  </Item>
                </>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
