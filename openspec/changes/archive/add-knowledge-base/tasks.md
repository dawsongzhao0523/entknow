# Tasks

## 1. 数据层

- [x] 1.1 schema：kb_domains / kb_entries（version 乐观锁 + terms jsonb）/ synonyms（幂等 ALTER 演进兼容）
- [x] 1.2 seed：领域树（供应链/质量域）+ 5 条知识条目（对照原型 KbNode）+ 4 组同义词（1 已归并 + 3 待归并）

## 2. API

- [x] 2.1 读：kb/domains（含计数）、kb/entries（domain/kw 过滤）、kb/entries/{id}、synonyms（status 过滤）
- [x] 2.2 写：POST kb/entries（幂等）、PUT kb/entries/{id}（expectedVersion → 409，版本自增，支持发布）、DELETE（软删幂等）、POST synonyms/{id}/merge（同词幂等/换词 409）

## 3. 测试

- [x] 3.1 集成：创建幂等 / 版本冲突 409 / 正常更新版本自增 / 软删幂等 / 发布流转 / 领域计数与过滤 / 归并幂等与 409 / 404
- [x] 3.2 `go test ./...` 与 `-tags integration` 全绿

## 4. 前端 M2

- [x] 4.1 KnowledgeBase 页面：领域树+条目表+详情抽屉+新建/编辑/软删/发布（409 文案直达）
- [x] 4.2 Synonyms 页面：归并操作台（选标准词归并）
- [x] 4.3 路由 m2/knowledge、m2/synonyms + 导航；tsc/build 全绿

## 5. 收尾

- [x] 5.1 容器 E2E（CRUD + 归并）验证；归档提案；提交
