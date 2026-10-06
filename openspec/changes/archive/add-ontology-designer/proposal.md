# Proposal: add-ontology-designer（本体建模 设计器写路径）

## Background

注册中心（objects/edges/functions）目前只读。设计器的创建/编辑/生命周期流转是本体治理的核心写路径；权限矩阵规定「仅 PUBLISHED 元素可被引用」，引用计数需随关系创建联动。

## Goal

1. **元素创建（幂等）**：POST objects（kind 三类校验）/ edges（两端对象必须存在且 PUBLISHED）/ functions（cat 四类校验）。
2. **编辑**：PUT 全量编辑（对象：名称/映射/属性/状态机；关系：边属性；函数：签名/实现）。
3. **生命周期流转**：POST {type}/{id}/transition {action: submit|publish|deprecate, by}——DRAFT→IN_REVIEW→PUBLISHED→DEPRECATED；同向重放幂等，非法迁移 409。
4. **引用计数联动**：关系创建事务内两端对象 ref_count +1。
5. 前端注册中心升级：三类元素的新建/编辑弹窗 + 行内流转操作。

## Scope

- store/designer.go：元素状态机纯函数（单测）+ 三类元素 CRUD 与流转 + 引用联动
- API：objects/edges/functions 各 POST/PUT + {id}/transition
- frontend：Registry 页升级

## 非目标（后续提案）

- 画布式设计器（拖拽/布局）、函数实现 DSL 与真实求值、评审流转与 治理演化 RV 记录自动联动
- 权限矩阵的按人 enforcement（myRole 判定已就绪， enforcement 随认证提案）

## 原型落地情况（UI 原型先行门槛）

本体建模 Designer/EdgeEditor/Ontology 注册中心编辑弹窗已落地并确认；复用其表单字段与流转文案（提交评审/发布/废弃）。

## 输入需求

docs/requirement/20261006本体设计器写路径与沙盘.md
