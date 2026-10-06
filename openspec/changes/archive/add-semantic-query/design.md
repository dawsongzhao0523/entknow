# Design: add-semantic-query

## 检索（确定性内核）

四类实体各一条 ILIKE 查询（Go 内聚合，各限 20）：
- objects：name / en / mapping / props::text
- kb_entries（不含已失效）：title / terms::text
- instances：id / props::text
- synonyms：terms 数组元素匹配（= ANY 或 array_to_string ILIKE）

## 查询执行

ExecuteQuery(question, by, clientID)：
1. `start` 计时 → 四类检索
2. DSL 模板（命中驱动，确定性）：`检索「{q}」→ MATCH 对象×a, 知识×b, 实例×c, 同义词×d RETURN 语义切片`；命中最多的类别给出 `重点域: {类别}` 行
3. INSERT query_history（ON CONFLICT id DO NOTHING 幂等；重放回读既有记录并返回其结果计数）
4. 返回 {question, dsl, results, hits, latencyMs, by, at}

## API

- GET /api/v1/search?q=（q 必填 400）
- POST /api/v1/queries {id, question, by}（必填 400；重放 X-Idempotent-Replay）
- GET /api/v1/queries?by=&limit=

## 前端

- 查询输入（回车/按钮）→ POST queries → 结果四区（Tag 计数）+ DSL 代码块 + 延迟徽标
- 历史表：问题/DSL 摘要/命中/延迟/执行人/时间 + 「重问」按钮（带新 ID 重执行）
