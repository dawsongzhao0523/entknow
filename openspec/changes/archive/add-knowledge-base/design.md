# Design: add-knowledge-base

## 数据建模（对照原型 KbNode）

- `kb_domains(id, name, parent_id)`：两级领域树（供应链域 → 采购/计划…），不设 FK（与 objects.ontology 同策略）。
- `kb_entries`：title/status(待评审|已评审|已失效)/source(定时任务|OneData|CSV 导入|手工)/onto/data_ref/flow/roles[]/mode(markdown)/terms(jsonb: term,en,def,source)/sops[] + **version int（乐观并发）** + updated_by/updated_at。
- `synonyms(id, terms[], standard, status(待归并|已归并), by, at)`。

## 写路径语义（沿用 review-workflow 已确立的范式）

- **创建幂等**：客户端 ID 幂等键 + ON CONFLICT DO NOTHING + 回读（replay 头）。
- **更新乐观并发**：`UPDATE ... WHERE id=$1 AND version=$2 RETURNING version, version+1`；无返回行时区分 404（不存在）与 409（版本过期）。发布是 PUT 的 status 变更（待评审→已评审），同版本次数递增。
- **软删除幂等**：DELETE 置 status=已失效；已是已失效则直接返回现状（200）。
- **归并**：POST merge；若已归且 standard 相同 → 幂等返回现状；standard 不同 → 409（防止重复归并覆盖历史裁决）。

## API

- GET /api/v1/kb/domains → [{id,name,parentId,entryCount}]
- GET /api/v1/kb/entries?domain=&kw= · GET /api/v1/kb/entries/{id}
- POST /api/v1/kb/entries（201/replay）· PUT /api/v1/kb/entries/{id}（expectedVersion 必填）· DELETE /api/v1/kb/entries/{id}
- GET /api/v1/synonyms?status= · POST /api/v1/synonyms/{id}/merge {standard, by}

## 前端

- KnowledgeBase：左领域树（计数徽标，选中过滤）+ 右条目表；详情 Drawer 展示 mode/terms/sops/roles；新建/编辑 Modal；删除（Popconfirm，软删）；发布按钮（待评审行内）。版本冲突 → message.error 展示后端 409 文案。
- Synonyms：同义词组表（terms 标签组、标准词、状态、归并人/时间）；待归并行内选标准词 → 归并。
