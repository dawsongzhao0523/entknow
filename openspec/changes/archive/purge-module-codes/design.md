# Design: purge-module-codes

## 替换规则（唯一事实源）

- 英文模块键（路由/权限键/审计模块/mock 键）：
  模块一→assets · 模块二→knowledge · 模块三→modeling · 模块四→runtime · 模块五→reasoning · 模块六→sandbox · 模块七→apps · 模块八→governance · 模块九→admin
- 中文模块名（注释/文档叙述）：数据资产 · 知识运营 · 本体建模 · 本体运行时 · 推理演绎 · 推演沙盘 · 智能应用 · 治理演化 · 系统管理
- 功能编号 M<n>-F<nn>：整段删除（功能名已在上下文中）。

## 原型路由映射（叶子级）

sources/market/workbench/processing/logical-view（assets）· tree/governance（knowledge）·
ontology(+detail)/designer/ai-modeling/version-ops（modeling）· binding/instance-360/rules（runtime）·
workbench（reasoning）· compare（sandbox）· capabilities（apps）· release/evolution（governance）·
overview/org/ops/settings（admin）。旧路径 redirect 随前缀替换自动对齐新目标。

组件标识去 M 前缀（M1SourceHub → SourceHub …），目录 pages/m<n> → pages/<英文键>。

## 执行顺序

1. backend/frontend 注释与 seed 叙事（无行为变更，回归测试确认）
2. prototype 目录更名 → App.tsx 路由表重写 → 全 src 字符串替换（先整路由后前缀）→ 组件名去前缀 → lint
3. 文档区（README/AGENTS/docs/openspec）脚本替换 + 逐个清零
4. 架构图 mmd 更新 + 尝试 mmdc 重渲染
5. 全仓 grep 清零验证（`LC_ALL=C grep -rwE '[mM][1-9]'`，排除 .git/node_modules/vendor/dist/png）

## 测试策略

- backend：全量测试回归（无行为变更，seed 文案变更不影响断言——文案不在断言中）
- prototype：npm run lint（tsc）通过
- frontend：tsc + build
- 路由抽检：原型新地址可渲染
