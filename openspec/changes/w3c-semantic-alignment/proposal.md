# Proposal: w3c-semantic-alignment（W3C 语义标准对齐）

## Background
基于华为《本体驱动的AI数据管理》评审，entKnow 最大差距是未采用 W3C 语义标准（RDF/OWL/SKOS/SWRL），无法与 Protégé 生态和大模型深度集成。

## Goal
1. **OWL 双向同步**：内部模型变更→自动生成 OWL Turtle 文件（GET /ontologies/{id}/owl 实时生成）；OWL 导入→自动创建/更新内部对象
2. **SKOS 术语规范**：同义词治理升级为 SKOS 标准格式（skos:ConceptScheme / skos:Concept / skos:prefLabel / skos:altLabel）；术语导出 SKOS RDF
3. **SPARQL 查询端点**：POST /api/v1/sparql，接受 SPARQL SELECT 查询，将内部对象/关系/属性实时映射为 RDF 三元组返回结果
4. **SWRL 规则导出**：规则定义导出为 SWRL 规则格式（swrl:Imp + swrl:body + swrl:head）

## 输入需求
docs/requirement/20261008基于华为本体驱动AI数据管理一书的评审与优化方案.md
