# Proposal: modeling-parity（建模模块对齐原型）

## Background
用户指令（2026-10-07，见需求草稿盘点）：生产端本体建模与原型差异最大（无卡片管理/新建向导/建模画布，且缺创建本体能力）；数据源中心缺更新策略视图；其余模块形态等价。

## Goal
1. POST /api/v1/ontologies（幂等，三初始化 blank/template/reverse，创建者=所有者）+ 集成测试。
2. Ontologies 卡片化 + 新建向导；当前工作本体高亮保留。
3. 新页 modeling/designer：SVG 建模画布（选中面板/生命周期/拖拽布局/新建对象关系）；菜单 seed + 回退导航。
4. Datasources 增「更新策略」tab（行内模式切换真实落库）。

## Scope
backend：store CreateOntology、API、测试、菜单 seed；frontend：Ontologies 重构、Designer 新页、Datasources tab、路由。

## 原型落地情况
直接以原型 Designer/Ontology 为蓝本（AI 助手除外，见非目标）。

## 确认记录
用户于 2026-10-07 直接下达指令（docs/requirement/20261007建模模块对齐原型.md）。

## 输入需求
docs/requirement/20261007建模模块对齐原型.md
