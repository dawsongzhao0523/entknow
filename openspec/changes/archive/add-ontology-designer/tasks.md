# Tasks

## 1. 状态机与写路径

- [x] 1.1 ElementNextStatus 纯函数 + 单测（合法/非法/重放）
- [x] 1.2 store/designer.go：三类元素幂等创建（校验 kind/cat、edge 两端 PUBLISHED + 事务引用计数）/ 全量编辑 / transition（重放幂等、409）
- [x] 1.3 API：六组端点（POST/PUT×3 + transition×3）

## 2. 测试

- [x] 2.1 集成：对象幂等/流转链/非法迁移；关系引用联动（refCount+1、非 PUBLISHED 拒绝）；函数 cat 校验；404
- [x] 2.2 go test 与 -tags integration 全绿

## 3. 前端

- [x] 3.1 Registry 升级：新建/编辑弹窗 + 行内流转（按状态显示）
- [x] 3.2 tsc/build 全绿

## 4. 收尾

- [x] 4.1 容器 E2E；归档；提交
