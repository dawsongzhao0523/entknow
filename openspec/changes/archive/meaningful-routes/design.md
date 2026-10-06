# Design: meaningful-routes

## 键映射（唯一事实源）

| 旧（m1-m9） | 新键 = URL 前缀 = 权限键 = 审计模块 | 子路由 |
|---|---|---|
| m1 | assets | datasources · views · pipelines |
| m2 | knowledge | entries · synonyms |
| m3 | modeling | ontologies · registry |
| m4 | runtime | instances · rules |
| m5 | reasoning | query |
| m6 | sandbox | compare |
| m7 | apps | capabilities |
| m8 | governance | reviews |
| m9 | admin | overview · org · permissions · menus · monitor · logs · settings |

菜单 id 即路由前缀的既有设计保持不变，仅换词。

## 变更点

1. seed.sql：menus 全量重播（新 id/route）；六角色 perms 换新键；audit_logs.module 换新键；
   notifications.to_path `/m8/reviews` → `/governance/reviews`。
2. server/audit.go moduleRoutes：路径前缀 → 新模块键；默认（未登记资源）→ admin。
3. store.go / runtime.go 通知 to_path 对齐。
4. 前端：App.tsx 全路由；AppShell 回退常量 + selectedKeys/openKey 逻辑不变（前缀仍为一级段）；
   Home/Overview 跳转；Settings 落地页选项；Logs 过滤选项（九个新键）；Permissions/OrgAdmin 回退常量；
   Menus 页示例文案；pages/m9 → pages/admin 目录更名。
5. 数据迁移：不做存量 UPDATE（demo 阶段库可重置）；文档注明 `make demo` 后一致。

## 测试策略

- 单元：audit moduleOf 新键表驱动更新。
- 集成：menus?user=wangwu 断言改为 knowledge/modeling/governance；audit 查询 module=admin；
  roles perms 断言换新键；其余回归不变。
- 前端：tsc + build；浏览器抽检新路由可达与导航高亮。
