import { Card, Table, Tag, Button, Input, Select, Space, Typography } from 'antd';
import { PlusOutlined, CloudSyncOutlined, ReloadOutlined } from '@ant-design/icons';
import { fmtStatus } from '../../mock/data';
import { ok, edit, run } from '../../components/proto';

const { Title, Text } = Typography;

interface SysUser {
  id: string; account: string; name: string; dept: string; post: string;
  roles: string[]; status: '正常' | '停用'; lastLogin: string;
}

const ROLE_COLORS: Record<string, string> = {
  本体管理员: 'gold', 业务专家: 'purple', 评审员: 'purple',
  数据开发: 'blue', 智能体开发: 'cyan', 系统集成: 'geekblue', 只读访客: 'default',
};

const USERS: SysUser[] = [
  { id: 'u1', account: 'zhangsan', name: '张三', dept: '平台部 / 数据AI部', post: '数据架构师', roles: ['本体管理员', '数据开发'], status: '正常', lastLogin: '2026-10-03 09:12' },
  { id: 'u2', account: 'wangwu', name: '王五', dept: '供应链 / 采购部', post: '业务专家', roles: ['评审员'], status: '正常', lastLogin: '2026-10-03 08:47' },
  { id: 'u3', account: 'sunqi', name: '孙七', dept: '平台部 / 数据AI部', post: '数据开发工程师', roles: ['数据开发'], status: '正常', lastLogin: '2026-10-02 19:31' },
  { id: 'u4', account: 'zhaoliu', name: '赵六', dept: '信息技术中心', post: '系统集成工程师', roles: ['系统集成'], status: '正常', lastLogin: '2026-10-02 17:05' },
  { id: 'u5', account: 'chenxl', name: '陈晓琳', dept: '供应链 / 计划部', post: '计划主管', roles: ['业务专家', '只读访客'], status: '正常', lastLogin: '2026-10-03 09:58' },
  { id: 'u6', account: 'liuyt', name: '刘雨桐', dept: 'AI 组', post: '智能体开发', roles: ['智能体开发'], status: '正常', lastLogin: '2026-10-01 16:22' },
  { id: 'u7', account: 'guest01', name: '外部审计', dept: '外部 / 德勤', post: '审计顾问', roles: ['只读访客'], status: '停用', lastLogin: '2026-08-19 11:40' },
];

export default function Users() {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>用户管理</Title>
          <Text type="secondary">共 186 人 · 本月活跃 94 · 账号与组织架构同步（M9-F01）</Text>
        </div>
        <div style={{ flex: 1 }} />
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => ok('用户列表已刷新：共 186 人 · 本月活跃 94')}>刷新</Button>
          <Button icon={<CloudSyncOutlined />} onClick={() => run('同步组织架构', '将从企业 HR 系统拉取部门与人员变更（增量），冲突项进入待处理列表。')}>同步组织架构</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => edit('新建用户', [
            ['账号', <Input key="a" className="mono" placeholder="domain account" />],
            ['姓名', <Input key="n" />],
            ['部门', <Input key="d" placeholder="如：平台部 / 数据AI部" />],
            ['岗位', <Input key="p" />],
          ])}>新建用户</Button>
        </Space>
      </div>
      <Card>
        <Space style={{ marginBottom: 12 }} wrap>
          <Input.Search placeholder="搜索账号 / 姓名" style={{ width: 240 }} allowClear />
          <Select defaultValue="all" style={{ width: 180 }} options={[
            { value: 'all', label: '部门：全部' },
            { value: 'd1', label: '平台部 / 数据AI部' },
            { value: 'd2', label: '供应链 / 采购部' },
            { value: 'd3', label: '信息技术中心' },
            { value: 'd4', label: 'AI 组' },
          ]} />
          <Select defaultValue="all" style={{ width: 140 }} options={[
            { value: 'all', label: '角色：全部' },
            { value: 'admin', label: '本体管理员' }, { value: 'expert', label: '业务专家' },
            { value: 'dev', label: '数据开发' }, { value: 'agent', label: '智能体开发' },
            { value: 'guest', label: '只读访客' },
          ]} />
          <Select defaultValue="all" style={{ width: 140 }} options={[
            { value: 'all', label: '状态：全部' }, { value: 'ok', label: '正常' }, { value: 'off', label: '停用' },
          ]} />
        </Space>
        <Table<SysUser> rowKey="id" size="middle" dataSource={USERS}
          pagination={{ total: 186, pageSize: 10, showTotal: t => `共 ${t} 人 · 本月活跃 94` }}
          columns={[
            {
              title: '用户', key: 'name',
              render: (_, r) => (
                <>
                  <div style={{ fontWeight: 600 }}>{r.name}</div>
                  <Text type="secondary" style={{ fontSize: 12 }} className="mono">{r.account}</Text>
                </>
              ),
            },
            { title: '部门', dataIndex: 'dept', key: 'dept' },
            { title: '岗位', dataIndex: 'post', key: 'post' },
            {
              title: '角色', dataIndex: 'roles', key: 'roles',
              render: (roles: string[]) => <Space size={4} wrap>{roles.map(x => <Tag key={x} color={ROLE_COLORS[x]}>{x}</Tag>)}</Space>,
            },
            { title: '状态', dataIndex: 'status', key: 'status', render: (v: string) => <Tag color={fmtStatus(v)}>{v}</Tag> },
            { title: '最近登录', dataIndex: 'lastLogin', key: 'lastLogin', render: (v: string) => <Text className="mono" style={{ fontSize: 12 }}>{v}</Text> },
            {
              title: '操作', key: 'ops',
              render: (_, r) => (
                <Space size={4}>
                  <Button size="small" type="link" onClick={() => edit(`编辑用户 · ${r.name}`, [
                    ['账号', <Input key="a" className="mono" defaultValue={r.account} />],
                    ['姓名', <Input key="n" defaultValue={r.name} />],
                    ['部门', <Input key="d" defaultValue={r.dept} />],
                    ['岗位', <Input key="p" defaultValue={r.post} />],
                  ])}>编辑</Button>
                  <Button size="small" type="link" onClick={() => edit(`分配角色 · ${r.name}`, [
                    ['当前角色', <span key="c">{r.roles.join('、')}</span>],
                    ['调整', <Input key="n" placeholder="如：数据开发、只读访客" />],
                  ])}>分配角色</Button>
                  {r.status === '正常'
                    ? <Button size="small" type="link" danger onClick={() => run(`停用账号 · ${r.name}`, '停用后该账号立即失去登录与 API 访问权限；已有审计记录保留。')}>停用</Button>
                    : <Button size="small" type="link" onClick={() => run(`启用账号 · ${r.name}`, '启用后恢复登录与既有角色权限。')}>启用</Button>}
                </Space>
              ),
            },
          ]} />
      </Card>
    </>
  );
}
