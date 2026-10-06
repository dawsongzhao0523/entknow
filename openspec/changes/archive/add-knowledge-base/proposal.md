# Proposal: add-knowledge-base（M2 知识库与同义词治理）

## Background

评审流转（add-review-workflow）打通了治理闭环的第一个写路径。M2 知识运营是业务专家的主战场：把企业的业务模式、术语口径、SOP 沉淀为结构化知识条目，并治理同义词。原型（KnowledgeTree/Synonym 页面）已定义完整交互。

## Goal

1. **知识条目 CRUD**：POST（幂等）/ PUT（乐观并发 expectedVersion → 409）/ DELETE（软删除，幂等）/ 发布（待评审→已评审，经 PUT status）。
2. **领域树**：kb_domains 层级 + 条目计数接口；条目按领域与关键字过滤。
3. **同义词治理**：归并确认（选标准词 → 已归并，幂等；换标准词重复归并 → 409）。
4. 前端 M2 页面：知识库（领域树 + 条目表 + 详情抽屉 + 新建/编辑/删除/发布）、同义词治理（归并操作台）。

## Scope

- schema：kb_domains / kb_entries（version 乐观锁，terms jsonb，sops/roles text[]）/ synonyms 三表 + demo seed
- API：GET kb/domains、kb/entries（过滤）、kb/entries/{id}；POST/PUT/DELETE kb/entries；GET synonyms、POST synonyms/{id}/merge
- frontend：KnowledgeBase + Synonyms 页面、路由与导航

## 非目标（后续提案）

- 条目评审与 M8 review-workflow 的深度联动（提交评审自动建 RV 记录）
- CSV 批量导入、跨本体链接（crosslink）、隐式本体收敛
- 知识到期（K 等级临期）与定时任务来源同步

## 原型落地情况（UI 原型先行门槛）

M2 知识库（领域树/条目详情/来源体系）与同义词工作台已在 prototype/m2 页面落地并确认；本提案页面复用其信息结构与文案（来源四类、术语来源标签、归并语义）。

## 输入需求

docs/requirement/20261006知识库与同义词治理.md
