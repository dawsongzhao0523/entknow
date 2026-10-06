# Proposal: purge-module-codes（全仓清除模块编号）

## Background

meaningful-routes 完成了生产路由与三重内部标识的语义化，但模块编号仍残留在生产代码注释、
seed 叙事、原型（prototype/）完整路由体系、mock/页面文案（含  功能编号）与全部文档中。
用户指令（2026-10-06）：所有代码和文档里都不要出现编号式字符，要用有含义的词。

## Goal

全仓（除 git 历史与无法重渲染的 PNG）不再出现任何模块编号（编号前缀、编号式功能号）：

1. 生产代码注释（backend/frontend）与 seed 叙事 → 中文模块名或英文键；
2. 原型路由全量语义化：pages/编号目录 → pages/assets..admin；路由表/导航/页内链接/mock 键同步；
   组件标识去 M 前缀；页面文案与功能编号替换；
3. 文档（README/AGENTS/docs/openspec specs+archive/CHANGELOG）同步替换；
4. 架构图 Mermaid 源更新并尝试重渲染。

## Scope

见 tasks.md。无后端行为变更（注释与 seed 文案除外）；原型路由为行为变更需 lint 验证。

## 原型落地情况（UI 原型先行门槛）

原型即本次改造对象本身；页面信息架构与交互不变，仅路由/标识/文案语义化。

## 确认记录

用户于 2026-10-06 直接下达指令（docs/requirement/20261006清除模块编号.md）。

## 输入需求

docs/requirement/20261006清除模块编号.md
