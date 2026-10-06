# Proposal: home-roles-notify（角色化首页与通知中心）

## Background
用户指令（2026-10-07，见需求草稿）：原型首页按角色差异化而生产端未实现；通知功能仅有全局表与静态列表（无铃铛/已读/定向）。

## Goal
1. 通知模型升级：notifications.to_user（空=广播）+ notification_reads（user×通知 已读）；GET /notifications?user=（未读派生）、PUT /{id}/read、PUT /read-all；评审裁决通知定向提出人。
2. 首页按角色视角（架构治理 / 评审知识 / 运营风险），全部真实 API 取数，卡片可点击跳转。
3. 顶栏铃铛：未读徽标 + 弹层（分类点/标题/时间/跳转标已读/全部已读）。

## Scope
backend：schema（to_user 列 + reads 表）、seed 定向示例、store/notify.go、API、评审裁决发件人定向、集成测试。
frontend：api.ts、AppShell 铃铛、Home 角色视角重构。

## 原型落地情况
信息架构参照原型 persona 首页（架构师/总监/专家），数据全部换真实 API；通知中心为生产端新增（用户指定）。

## 确认记录
用户于 2026-10-07 直接下达指令（docs/requirement/20261007角色首页与通知中心.md）。

## 输入需求
docs/requirement/20261007角色首页与通知中心.md
