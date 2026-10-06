import type { ReactNode } from 'react';
import { Tabs } from 'antd';
import { useSearchParams } from 'react-router-dom';

/** Tab 容器：将同一主线的多个页面收进一个菜单项。tab 状态同步到 URL ?tab= 参数。 */
export default function TabHub({ items }: { items: { key: string; label: string; el: ReactNode }[] }) {
  const [sp, setSp] = useSearchParams();
  const active = sp.get('tab') ?? items[0].key;
  return (
    <Tabs
      activeKey={items.some(i => i.key === active) ? active : items[0].key}
      onChange={k => setSp({ tab: k })}
      items={items.map(i => ({ key: i.key, label: i.label, children: i.el }))}
    />
  );
}
