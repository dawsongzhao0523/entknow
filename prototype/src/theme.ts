import type { ThemeConfig } from 'antd';

/** 设计令牌对齐 OpenOntology：祖母绿主色 + 暖灰中性色 + 白色侧栏（Supabase 系观感） */
export const theme: ThemeConfig = {
  token: {
    colorPrimary: '#059669',
    colorInfo: '#2563eb',
    colorSuccess: '#2d8a4e',
    colorWarning: '#c9861a',
    colorError: '#c23b3b',
    colorBgLayout: '#f8fbfa',
    colorText: '#1a1a2e',
    colorTextSecondary: '#5a5a72',
    colorTextTertiary: '#6b7688',
    colorBorderSecondary: '#e2e4e9',
    borderRadius: 8,
    fontSize: 13,
  },
  components: {
    Layout: { siderBg: '#ffffff', headerBg: '#ffffff', headerHeight: 52 },
    Menu: {
      itemBg: 'transparent',
      subMenuItemBg: 'transparent',
      itemColor: '#5a5a72',
      itemHoverBg: '#f1f3f5',
      itemSelectedBg: '#059669',
      itemSelectedColor: '#ffffff',
      itemHeight: 36,
    },
    Table: { headerBg: '#f1f3f5' },
    Card: { paddingLG: 16 },
  },
};
