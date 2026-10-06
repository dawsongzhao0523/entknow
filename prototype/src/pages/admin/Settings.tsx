import type { ReactNode } from 'react';
import { Button, Card, Checkbox, Radio, Select, Switch, Tabs, Typography } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { ok } from '../../components/proto';

const { Title, Text } = Typography;

function Item({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
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

export default function Settings() {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>个性化设置</Title>
          <Text type="secondary">当前用户：张三 · 数据架构师（仅影响本人账号，</Text>
        </div>
        <div style={{ flex: 1 }} />
        <Button type="primary" icon={<SaveOutlined />} onClick={() => ok('设置已保存：界面偏好 / 默认本体 / 通知策略（仅本人生效）')}>保存设置</Button>
      </div>
      <Card>
        <Tabs
          defaultActiveKey="ui"
          items={[
            {
              key: 'ui', label: '界面偏好',
              children: (
                <>
                  <Item label="主题" hint="工作区配色方案">
                    <Radio.Group defaultValue="light" options={[
                      { value: 'light', label: '浅色' }, { value: 'dark', label: '深色' }, { value: 'system', label: '跟随系统' },
                    ]} />
                  </Item>
                  <Item label="密度" hint="表格与列表行距">
                    <Radio.Group defaultValue="default" options={[
                      { value: 'default', label: '默认' }, { value: 'compact', label: '紧凑' }, { value: 'loose', label: '宽松' },
                    ]} />
                  </Item>
                  <Item label="默认语言">
                    <Select defaultValue="zh" style={{ width: 200 }} options={[
                      { value: 'zh', label: '简体中文' }, { value: 'en', label: 'English' },
                    ]} />
                  </Item>
                  <Item label="代码/ID 字体" hint="mono 等宽字体渲染">
                    <Switch defaultChecked />
                  </Item>
                </>
              ),
            },
            {
              key: 'notify', label: '通知',
              children: (
                <>
                  <Item label="治理待办" hint="评审分配、门禁告警、撤回通知">
                    <Switch defaultChecked />
                  </Item>
                  <Item label="评审超时提醒" hint="SLA 剩余 4 小时时催办">
                    <Switch defaultChecked />
                  </Item>
                  <Item label="自进化补丁通知" hint="系统生成规则/术语补丁待确认">
                    <Switch defaultChecked />
                  </Item>
                  <Item label="数据源异常" hint="CDC 断连 / 抽取失败">
                    <Switch defaultChecked />
                  </Item>
                  <Item label="通知渠道">
                    <Checkbox.Group defaultValue={['feishu']} options={[
                      { value: 'feishu', label: '飞书' }, { value: 'mail', label: '邮件' }, { value: 'sms', label: '短信（仅 ERROR）' },
                    ]} />
                  </Item>
                </>
              ),
            },
            {
              key: 'home', label: '工作台默认页',
              children: (
                <>
                  <Item label="登录后默认页">
                    <Select defaultValue="admin/overview" style={{ width: 260 }} options={[
                      { value: 'admin/overview', label: '系统运营' },
                      { value: 'assets/workbench', label: '数据工作台' },
                      { value: 'modeling/designer', label: '本体设计器' },
                      { value: 'governance/review', label: '治理评审台' },
                    ]} />
                  </Item>
                  <Item label="工作台默认视角" hint="总览页指标卡片组合">
                    <Select defaultValue="architect" style={{ width: 260 }} options={[
                      { value: 'architect', label: '数据架构师（治理+运行时）' },
                      { value: 'expert', label: '业务专家（评审+查询）' },
                      { value: 'dev', label: '数据开发（管道+视图）' },
                      { value: 'ops', label: '运维（监控+日志）' },
                    ]} />
                  </Item>
                  <Item label="默认业务域">
                    <Select defaultValue="sc" style={{ width: 260 }} options={[
                      { value: 'sc', label: '供应链' }, { value: 'mfg', label: '生产制造' }, { value: 'fin', label: '财务' },
                    ]} />
                  </Item>
                </>
              ),
            },
          ]} />
      </Card>
    </>
  );
}
