// 原型交互助手：为占位按钮提供统一的最小真实反馈（toast / 确认 / 详情弹窗）
import { message, Modal } from 'antd';
import type { ReactNode } from 'react';

export const ok = (t: string) => message.success(t);

/** 编辑/新建类按钮：轻量表单弹窗，保存后反馈 */
export function edit(title: string, fields: [string, ReactNode][], onOk?: () => void) {
  Modal.confirm({
    title, width: 600, okText: '保存', cancelText: '取消', icon: null,
    content: (
      <div style={{ display: 'grid', gridTemplateColumns: '92px 1fr', gap: '10px 12px', alignItems: 'center', marginTop: 14 }}>
        {fields.map(([k, v]) => [
          <div key={k} style={{ color: '#5a5a72', textAlign: 'right' }}>{k}</div>,
          <div key={`${k}#v`}>{v}</div>,
        ])}
      </div>
    ),
    onOk: () => { onOk?.(); message.success(`「${title}」已保存`); },
  });
}

/** 危险/重操作按钮：二次确认后反馈完成 */
export function run(title: string, content?: string, onOk?: () => void) {
  Modal.confirm({
    title,
    content,
    okText: '确认执行',
    okButtonProps: { danger: true },
    cancelText: '取消',
    onOk: () => { onOk?.(); message.success(`「${title}」已提交`); },
  });
}

/** 查看/详情/文档类按钮：键值表弹窗 */
export function info(title: string, rows: [string, ReactNode][]) {
  Modal.info({
    title,
    width: 640,
    okText: '关闭',
    content: (
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginTop: 8 }}>
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k}>
              <td style={{ padding: '6px 10px', color: '#5a5a72', width: 132, verticalAlign: 'top', border: '1px solid #f1f3f5', background: '#f8fbfa' }}>{k}</td>
              <td style={{ padding: '6px 10px', border: '1px solid #f1f3f5' }}>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    ),
  });
}
