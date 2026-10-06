import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App as AntdApp, ConfigProvider, theme as antdTheme } from 'antd';
import type { ThemeConfig } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { theme } from './theme';
import { SessionProvider, useSession } from './session';
import './index.css';

const DENSITY: Record<string, 'small' | 'middle' | 'large'> =
  { compact: 'small', default: 'middle', loose: 'large' };

/** 深色模式：去掉写死的浅色 token（白底/深字等），交给 darkAlgorithm 接管；品牌色保留 */
function buildTheme(dark: boolean): ThemeConfig {
  if (!dark) return theme;
  const {
    colorBgLayout, colorText, colorTextSecondary, colorTextTertiary, colorBorderSecondary,
    ...tokens
  } = theme.token ?? {};
  return {
    ...theme,
    token: tokens,
    components: {}, // siderBg/headerBg 等均为浅色定制，深色下全部交回算法
    algorithm: antdTheme.darkAlgorithm,
  };
}

/** 主题/密度随个性化设置实时生效（ConfigProvider 在 Session 内层按设置重建） */
function Root() {
  const { prefs } = useSession();
  const dark = prefs.theme === 'dark';
  return (
    <ConfigProvider
      locale={zhCN}
      componentSize={DENSITY[prefs.density ?? 'default']}
      theme={buildTheme(dark)}
    >
      <AntdApp>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AntdApp>
    </ConfigProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SessionProvider>
      <Root />
    </SessionProvider>
  </StrictMode>,
);
