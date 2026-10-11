# Tasks

## 1. OWL 实时生成
- [x] 1.1 GET /api/v1/ontologies/{id}/owl — 实时生成 OWL Turtle（owl:Class / owl:ObjectProperty 含 domain+range / owl:DatatypeProperty 含 XSD 类型 / 术语对齐注释）
- [ ] 1.2 PUT /api/v1/ontologies/{id}/owl — 上传 OWL Turtle → diff 内部模型 → 返回变更预览
- [ ] 1.3 POST /api/v1/ontologies/{id}/owl/apply — 应用变更（幂等，创建/更新/标记删除）
- [x] 1.4 集成测试：OWL Turtle 内容断言（prefix/Class/label）✅ TestW3COWLGeneration
- 备注：1.2/1.3 双向同步依赖 Turtle 完整解析器（owlimport.go 已有解析能力，diff/apply 合入下一变更批次）

## 2. SKOS 术语规范
- [x] 2.1 同义词导出为 prefLabel（标准词）/ altLabel（同义表达）
- [x] 2.2 GET /api/v1/skos — 导出 SKOS Core RDF/XML（ConceptScheme + Concept）✅ TestW3CSKOSExport
- [x] 2.3 前端「版本与导出」页 + 推理引擎「W3C 标准」Tab 支持 SKOS 查看/下载

## 3. SPARQL 查询端点
- [x] 3.1 POST /api/v1/sparql — SPARQL SELECT 引擎（本体映射为 RDF 三元组 + 回溯绑定联查）
- [x] 3.2 多三元组模式共享变量联查（?s ?p ?o / rdf:type / rdfs:label / :谓词 / a），SELECT * 展开 ✅ 7 项单测
- [x] 3.3 集成测试 ✅ TestW3CSPARQLConsole

## 4. SWRL 规则导出
- [x] 4.1 GET /api/v1/rules/{id}/swrl — 导出 SWRL RuleML XML ✅ TestW3CSWRLExport（含 404 分支）
- [x] 4.2 集成测试 ✅

## 5. 验收
- [x] 5.1 全量测试绿（unit + integration）
- [x] 5.2 OWL 导入已有 FOAF 验证（owlimport.go）；本轮补齐导出侧（Turtle 实时生成）
- [x] 5.3 SPARQL 查询返回正确三元组（联查/变量冲突/归一化写法均有断言）
