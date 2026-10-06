# Proposal: complete-remaining-modules（其余模块功能补齐）

## Background

系统管理（complete-sysadmin）已全功能生产化。对照原型，其余模块仍有 12 项原型已定义、生产端缺失的功能。
用户指令（2026-10-07）：同样完成其他功能模块（生产级、可点击、非 demo）。

## Goal

按模块补齐（全部真实读写路径或确定性派生）：

1. **数据集市**：market_items 目录（表/VIEW/API/文档/代码索引）+ 权限申请 market_requests（申请→审批）。
2. **数据工作台**：聚合端点（采集任务状态/我的资产/治理待办/最近运行，全部由真实库表计数）。
3. **数据源中心深化**：现有页加 tabs——更新策略（mode 字段编辑）、元数据探查（table-profiles 真实 API）、文档源（kind 非结构化过滤）。
4. **隐式收敛与跨源对齐**：onto_candidates（由知识条目/同义词确定性生成候选：采纳→创建对象 DRAFT / 丢弃）；entity_alignments（跨源术语对齐裁决：合并/丢弃）。
5. **本体详情**：成员与授权（memberships CRUD + 角色变更）、版本时间线（versions）、发布（草稿→已发布 + 版本落库）。
6. **智能建模**：七步向导（确定性模板产出对象+属性 DRAFT，真实入库）；语料候选队列（复用 onto_candidates，标注来源）。
7. **版本与导出**：版本时间线 + OWL/RDF 文本导出（由 objects/edges 确定性生成）。
8. **数据绑定与同步**：bindings（对象↔视图 + 字段映射 jsonb + 同步模式）CRUD + 手动同步（binding_runs 落历史、last_sync 更新）。
9. **推理引擎**：规则执行（对 instances 确定性求值 → rule_firings + 风险分重算）；本体一致性检查（边引用完整/映射缺失/状态机孤立，派生 issues）；OWL 预览。
10. **发布门禁**：GET /release-gate?onto= 确定性检查（元数据完整/评审通过/沙盘验证/绑定覆盖），Reviews 页加 tab。
11. **演化与撤回**：版本撤回（PUBLISHED→RETRACTED + 对账报告：受影响对象/绑定/视图派生计数）+ 环境对比（草稿/已发布对象数）。
12. **CLI 出口**：CapabilityOutlet 加 CLI tab，由 capabilities 数据渲染真实命令模板（复制可用）。

## Scope

- backend：6 张新表 + seed；store 六个新文件（market/binding/convergence/versionops/reasoning/workbench）+ 派生引擎；API 端点约 25 个；集成测试。
- frontend：9 个新页面 + 3 个页面扩展 + 路由 + 菜单 seed 扩展。
- 既有页面行为不变。

## 非目标

画布式设计器、真实 LLM/Utopia 在线对接、本体分支克隆（见需求草稿）。

## 原型落地情况（UI 原型先行门槛）

全部 12 项对应原型页均已落地并确认；本提案复用其信息架构，数据全部换真实 API。

## 确认记录

用户于 2026-10-07 直接下达指令（docs/requirement/20261007其余模块功能补齐.md）。

## 输入需求

docs/requirement/20261007其余模块功能补齐.md
