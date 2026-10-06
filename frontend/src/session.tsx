import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api, type PrefSettings, type User } from './api';

/** 当前演示用户（无登录态，localStorage 持久化；权限治理效果可观察的关键开关） */
const USER_KEY = 'entknow.user';

interface SessionCtx {
  user: string;
  setUser: (account: string) => void;
  users: User[];
  prefs: PrefSettings;
  savePrefs: (p: PrefSettings) => Promise<void>;
  prefsLoaded: boolean;
  /** 权限/菜单变更信号：bump 后导航（menus）重新拉取，即时生效 */
  permVersion: number;
  bumpPerms: () => void;
}

const Ctx = createContext<SessionCtx>({
  user: 'zhangsan', setUser: () => {}, users: [],
  prefs: {}, savePrefs: async () => {}, prefsLoaded: false,
  permVersion: 0, bumpPerms: () => {},
});

export function useSession() { return useContext(Ctx); }

const DEFAULT_PREFS: PrefSettings = {
  theme: 'light', density: 'default', monoFont: true,
  landingPage: '', defaultOnto: '', notifyCats: ['待办处理', '治理任务', '协同分享'],
};

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState(() => localStorage.getItem(USER_KEY) || 'zhangsan');
  const [users, setUsers] = useState<User[]>([]);
  const [prefs, setPrefs] = useState<PrefSettings>({});
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [permVersion, setPermVersion] = useState(0);
  const bumpPerms = useCallback(() => setPermVersion(v => v + 1), []);

  const setUser = useCallback((account: string) => {
    localStorage.setItem(USER_KEY, account);
    setUserState(account);
  }, []);

  useEffect(() => {
    api.users().then(list => {
      setUsers(list.filter(u => u.status === '正常'));
    }).catch(() => {}); // 用户列表失败不阻塞：切换器为空但导航可用
  }, []);

  // 设置随账号切换重载
  useEffect(() => {
    setPrefsLoaded(false);
    api.settings(user)
      .then(s => { setPrefs({ ...DEFAULT_PREFS, ...s.settings }); setPrefsLoaded(true); })
      .catch(() => { setPrefs(DEFAULT_PREFS); setPrefsLoaded(true); });
  }, [user]);

  const savePrefs = useCallback(async (p: PrefSettings) => {
    const merged = { ...DEFAULT_PREFS, ...p };
    await api.saveSettings({ account: user, settings: merged });
    setPrefs(merged);
  }, [user]);

  // 副作用 1：等宽字体开关（body class）
  useEffect(() => {
    document.body.classList.toggle('no-mono', prefs.monoFont === false);
  }, [prefs.monoFont]);

  const value = useMemo(() => (
    { user, setUser, users, prefs, savePrefs, prefsLoaded, permVersion, bumpPerms }
  ), [user, setUser, users, prefs, savePrefs, prefsLoaded, permVersion, bumpPerms]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
