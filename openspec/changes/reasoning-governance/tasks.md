# Tasks

## 1. 事实-事理-行动贯通
- [x] 1.1 rules 表增加 action_func（关联 functions.id）+ constraint_level 字段；R1 → f3 冻结订单（行动类）
- [x] 1.2 RunRule 增强：主事务提交后对每个触发实例自动经行动网关执行 action_func（trigger=rule，执行者=推理引擎系统账号）；强约束+风险>90 转人工复核（人机协同介入点）
- [x] 1.3 集成测试 ✅ TestRunRuleActionPipeline：R1 触发 → 自动执行冻结订单 → 风险分更新 → 行动记录落库

## 2. 推理结果治理
- [x] 2.1 新表 reasoning_trails（rule_id/instance_id/rules_hit/steps jsonb/conclusion/created_at + 双索引）
- [x] 2.2 RunRule 每个触发实例写入三步轨迹（事实/事理/行动）
- [x] 2.3 GET /api/v1/reasoning/trails — 按实例/规则过滤 + limit
- [x] 2.4 前端推理引擎页新增「推理链路」Tab：轨迹表格 + 展开垂直步骤链
- [x] 2.5 集成测试 ✅（三步链路断言 + 实例过滤）

## 3. 约束强度分级
- [x] 3.1 objects/edges/rules 表增加 constraint_level（strong/weak/advisory）
- [x] 3.2 行动网关分级：strong 风险>60 未确认 → 403 拦截；weak 风险>80 未确认 → 400 需确认；advisory 放行仅记录；PUT /api/v1/constraint 设置接口
- [x] 3.3 前端：元素创建弹窗（对象/关系/规则）约束强度选择；规则表约束等级在线切换
- [x] 3.4 集成测试 ✅ TestStrongConstraintGate（403 拦截 + 确认放行）

## 4. 本体健康度自动巡检
- [x] 4.1 调度器每小时执行一次全本体 Consistency（maybeHealthCheck，原子时间戳防重入）
- [x] 4.2 结果写入 system_logs（ERROR/WARN/INFO 分级）
- [x] 4.3 调度器逻辑随既有 tick 单测覆盖（一致性函数本身有集成断言）

## 5. 验收
- [x] 5.1 规则 R1 触发后自动执行关联 Action 并更新实例属性 ✅
- [x] 5.2 推理链路可追溯（规则/步骤/结论全链路落库可查）✅
- [x] 5.3 strong 约束违规被行动网关 403 拦截 ✅
- [x] 5.4 全量测试绿（unit + integration）
