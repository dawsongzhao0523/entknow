# Tasks

## 1. 后端

- [x] 1.1 seed.sql：menus 新键重播；roles perms 换键；audit_logs.module 换键；notifications.to_path 换新路由
- [x] 1.2 audit.go moduleRoutes → 新模块键；schema.sql 注释更新；store.go/runtime.go 通知路径
- [x] 1.3 测试：audit_test 新键；集成断言（wangwu 三模块、module=admin、perms 键）

## 2. 前端

- [x] 2.1 App.tsx 全路由语义化；pages/m9 → pages/admin 目录更名
- [x] 2.2 AppShell 回退导航；Home/Overview 跳转；Settings 落地页选项
- [x] 2.3 Logs 模块过滤选项；Permissions/OrgAdmin 回退模块常量；Menus 页示例文案
- [x] 2.4 tsc + build 全绿

## 3. 收尾

- [x] 3.1 后端全量测试（unit + integration）+ gofmt/vet；make demo 重置库
- [x] 3.2 浏览器抽检新路由（导航高亮、权限过滤、审计模块过滤）
- [x] 3.3 归档提案（specs 合入现行）+ git commit
