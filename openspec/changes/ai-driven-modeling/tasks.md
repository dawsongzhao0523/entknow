# Tasks

## 1. LLM 接入层
- [x] 1.1 internal/llm/llm.go — 统一 LLM 客户端（OpenAI Chat Completions / Anthropic Messages / Ollama），ENTKNOW_LLM_PROVIDER/_API_KEY/_BASE_URL/_MODEL 环境变量切换，未配置时禁用态回退
- [x] 1.2 POST /api/v1/llm/chat — 统一 LLM 调用端点（system + user）；GET /api/v1/llm/status 配置探针（key 脱敏）
- [x] 1.3 无 LLM key 时全部 AI 能力回退确定性规则引擎（aiGenerateRules）

## 2. 29 句话模板库
- [x] 2.1 GET /api/v1/templates — 7 类 29 种模板（3+4+4+4+5+4+5：业务术语SKOS/资源描述RDF/分层约束OWL/控制规则SWRL/流程操作OWL-S/权限管控ODRL/数据操作SPARQL）；GET /api/v1/templates/categories ✅ TestTemplates
- [x] 2.2 前端「智能建模 → 29 句话模板」Tab：分类筛选 + 句式 + 示例展示
- [x] 2.3 集成测试 ✅

## 3. AI 建模
- [x] 3.1 POST /api/v1/modeling/ai-generate — input/apply/ontology/by；LLM 输出结构化本体 JSON（markdown 围栏剥离），失败自动回退规则引擎并记 WARN 日志
- [x] 3.2 前端「智能建模 → AI 自动建模」Tab：场景描述 → 预览对象/关系表 → 确认入库（含 LLM 接入状态提示）
- [x] 3.3 LLM 未配置回退确定性规则引擎：「X有A/B/C属性」属性声明模式 + 「X供应/生产/监测/审批Y 等 23 个动词」关系模式 + 类型推断（金额→decimal/交期→date…）✅ TestAIGeneratePreview
- [x] 3.4 集成测试（预览 + 入库）✅ TestAIGenerateApply

## 4. 知识萃取增强
- [x] 4.1 POST /api/v1/kb/entries/{id}/extract — 从知识条目（标题+术语+SOP）提取候选，LLM 优先/规则引擎兜底 ✅ TestKbExtract
- [x] 4.2 提取结果写入 onto_candidates（幂等去重、跳过已显式建模）走隐式收敛裁决流
- [x] 4.3 集成测试 ✅

## 5. 验收
- [x] 5.1 「采购订单有订单号/供应商/金额/交期四个属性，供应商供应物料，工厂生产工单」→ 5 对象（含工厂/工单）+ 2 关系（供应/生产），采购订单 4 属性 ✅
- [x] 5.2 全量测试绿（unit + integration）
