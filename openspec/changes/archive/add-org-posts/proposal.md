# Proposal: add-org-posts（组织架构与岗位维护）

## Background

用户指令（2026-10-07，见需求草稿）：组织/岗位改为可搜索下拉（组织为树选择），新增组织维护与岗位维护界面，同步各归各 tab。

## Goal

1. org_units 组织树（id/parent_id/name/path/sort）与 posts 岗位字典两张表 + seed（对齐现有用户数据）。
2. API：组织树读取（树形）、幂等新增、编辑（重命名联动用户部门路径）、删除（子组织/用户引用 409）、同步（users.dept 归集 upsert）；
   岗位 CRUD（引用保护、重命名联动）与同步（users.post 归集）。
3. 前端：组织与权限页新增「组织维护」「岗位维护」两 tab（含各自同步按钮）；用户表单部门改 TreeSelect、岗位改可搜索 Select。

## Scope

backend：schema/seed + store/org.go + API（挂 modules_api）+ 集成测试；frontend：api.ts + OrgAdmin 改造。

## 原型落地情况（UI 原型先行门槛）

原型组织页已有「同步组织架构」交互占位；本提案将其落为真实归集同步并补维护界面。

## 确认记录

用户于 2026-10-07 直接下达指令（docs/requirement/20261007组织与岗位维护.md）。

## 输入需求

docs/requirement/20261007组织与岗位维护.md
