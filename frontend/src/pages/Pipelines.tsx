import { useCallback, useEffect, useState } from 'react';
import { App, Button, Card, Drawer, Form, Input, Modal, Popconfirm, Select, Space, Table, Tag, Typography } from 'antd';
import { CaretRightOutlined, HistoryOutlined, PlusOutlined } from '@ant-design/icons';
import { api, type PipelineRun, type PipelineTask } from '../api';

const { Title, Text } = Typography;

const TYPE_COLOR: Record<string, string> = { 采集: 'blue', 清洗: 'cyan', 探查: 'purple', 转换: 'geekblue', UTOPIA_PUSH: 'green' };
const empty = { name: '', type: '探查', source: '', target: '', schedule: '' };

/** 数据加工：流水线任务注册 / 启停 / 手动运行（幂等执行记录） */
export default function Pipelines() {
  const { message } = App.useApp();
  const [tasks, setTasks] = useState<PipelineTask[]>([]);
  const [runs, setRuns] = useState<PipelineRun[]>([]);
  const [detailTask, setDetailTask] = useState<PipelineTask | null>(null);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const reload = useCallback(() => {
    api.pipelineTasks().then(setTasks).catch(e => message.error(String((e as Error).message)));
  }, [message]);

  const openRuns = useCallback(async (t: PipelineTask) => {
    setDetailTask(t);
    try { setRuns(await api.pipelineRuns(t.id)); } catch { setRuns([]); }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const run = async (t: PipelineTask) => {
    try {
      const out = await api.runPipelineTask(t.id, `run-${Date.now().toString(36)}`, `手动触发 · ${t.name}`);
      message.success(`已运行：${out.run.status} · 任务最近运行 ${out.task.lastRun}`);
      reload();
      if (detailTask?.id === t.id) openRuns(t);
    } catch (e) {
      message.error(String((e as Error).message)); // 停用 409 / 未知 404
    }
  };

  const save = async () => {
    const v = await form.validateFields();
    try {
      const id = `p-${Date.now().toString(36)}`;
      await api.createPipelineTask({ ...v, id, status: '运行中' });
      message.success(`任务已注册：${id}（幂等）`);
      setOpen(false);
      reload();
    } catch (e) {
      message.error(String((e as Error).message));
    }
  };

  return (
    <div>
      <Title level={4}>数据加工</Title>
      <Text type="secondary">加工流水线：采集 / 清洗 / 探查 / 转换 / UTOPIA_PUSH，手动运行产生真实执行记录（幂等）</Text>

      <Card size="small" style={{ marginTop: 12 }} extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setOpen(true); }}>注册任务</Button>
      }>
        <Table<PipelineTask> size="small" rowKey="id" pagination={false} dataSource={tasks}
          columns={[
            { title: '任务', dataIndex: 'name', render: (v: string) => <b>{v}</b> },
            { title: '类型', dataIndex: 'type', width: 110,
              render: (v: string) => <Tag color={TYPE_COLOR[v]}>{v}</Tag> },
            { title: '源 → 目标', key: 'st', render: (_, p) => (
              <span style={{ fontSize: 12 }}>{p.source || '—'} <Text type="secondary">→</Text> {p.target || '—'}</span>
            ) },
            { title: '调度', dataIndex: 'schedule', width: 120 },
            { title: '状态', dataIndex: 'status', width: 84,
              render: (v: string) => <Tag color={v === '运行中' ? 'green' : v === '失败' ? 'red' : 'default'}>{v}</Tag> },
            { title: '最近运行', dataIndex: 'lastRun', width: 140 },
            { title: '操作', key: 'op', width: 230, render: (_, t) => (
              <Space size={0}>
                {t.status !== '已停用' && (
                  <Button size="small" type="link" icon={<CaretRightOutlined />} onClick={() => run(t)}>运行</Button>
                )}
                <Button size="small" type="link" icon={<HistoryOutlined />} onClick={() => openRuns(t)}>记录</Button>
                <Popconfirm title={t.status === '已停用' ? `启用「${t.name}」？` : `停用「${t.name}」？`}
                  onConfirm={async () => {
                    try {
                      await api.setPipelineTaskStatus(t.id, t.status === '已停用' ? '运行中' : '已停用');
                      message.success('已更新'); reload();
                    } catch (e) { message.error(String((e as Error).message)); }
                  }}>
                  <Button size="small" type="link" danger={t.status !== '已停用'}>
                    {t.status === '已停用' ? '启用' : '停用'}
                  </Button>
                </Popconfirm>
              </Space>
            ) },
          ]} />
      </Card>

      <Drawer title={detailTask ? `${detailTask.name} · 执行记录` : ''} width={560}
        open={!!detailTask} onClose={() => setDetailTask(null)}>
        <Table size="small" rowKey="id" pagination={false} dataSource={runs}
          columns={[
            { title: '状态', dataIndex: 'status', width: 70,
              render: (v: string) => <Tag color={v === '成功' ? 'green' : 'red'}>{v}</Tag> },
            { title: '明细', dataIndex: 'detail' },
            { title: '时间', dataIndex: 'at', width: 140 },
          ]} />
      </Drawer>

      <Modal title="注册加工任务" open={open} onOk={save} onCancel={() => setOpen(false)} okText="注册（幂等）" cancelText="取消">
        <Form form={form} layout="vertical" initialValues={empty}>
          <Form.Item name="name" label="任务名" rules={[{ required: true }]}><Input placeholder="如 客户域探查" /></Form.Item>
          <Form.Item name="type" label="类型">
            <Select options={['采集', '清洗', '探查', '转换', 'UTOPIA_PUSH'].map(v => ({ value: v, label: v }))} />
          </Form.Item>
          <Space style={{ display: 'flex' }} size={12}>
            <Form.Item name="source" label="源" style={{ width: 220 }}><Input placeholder="scm_prod（MySQL）" /></Form.Item>
            <Form.Item name="target" label="目标" style={{ width: 200 }}><Input placeholder="数据资产画像" /></Form.Item>
          </Space>
          <Form.Item name="schedule" label="调度"><Input placeholder="CRON 0 5 * * * / EVENT" /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
