# Design: add-org-posts

## 表

```sql
org_units (id text PK, parent_id text DEFAULT '', name text, sort int DEFAULT 0)  -- path 由查询时递归拼接
posts     (id text PK, name text, descr text DEFAULT '', sort int DEFAULT 0)
```

用户表 users.dept 存组织全路径字符串（如「平台部 / 数据AI部」），users.post 存岗位名——组织/岗位作为字典维护，选择时写入路径/名称。

## 关键语义

- 组织树读取：一次查询在 Go 侧组树，节点携带 path（父路径 + 名称）。
- 新增组织：幂等（客户端 id）；parent 必须存在（400）。
- 重命名：更新本节点，并以其旧 path 为前缀批量更新 users.dept（联动）；子节点 path 由读取时计算自然跟随。
- 删除：有子组织 409；path 前缀命中任何 users.dept 409。
- 同步组织：SELECT DISTINCT dept FROM users → 按「 / 」拆链逐级 upsert（按 parent+name 查存在），返回新增数；幂等。
- 岗位：CRUD；删除时 users.post 引用 409；重命名联动 users.post；同步 = DISTINCT post upsert。

## API

GET /org-units（树）· POST /org-units · PUT /org-units/{id} · DELETE /org-units/{id} · POST /org-units/sync
GET /posts · POST /posts · PUT /posts/{id} · DELETE /posts/{id} · POST /posts/sync

## 前端

OrgAdmin 四 tab：用户（表单部门 TreeSelect、岗位 Select，均可搜索）/ 角色 / 组织维护（树表 + 同步）/ 岗位维护（表 + 同步）。
