# Design: add-ontology-designer

## 元素状态机（纯函数，单测）

```
DRAFT --submit--> IN_REVIEW --publish--> PUBLISHED --deprecate--> DEPRECATED
     └────────── publish ──────────┘（所有者快捷发布）
```

`ElementNextStatus(action, cur)`：submit（DRAFT→IN_REVIEW）、publish（DRAFT|IN_REVIEW→PUBLISHED）、deprecate（PUBLISHED→DEPRECATED）；cur 已为该 action 结果 → 重放（调用方幂等返回）；其余 409。

## 引用联动

CreateEdge 单事务：校验 from/to 对象存在且 status=PUBLISHED（否则 400，对齐「仅 PUBLISHED 可引用」）→ INSERT edge → UPDATE 两端 objects.ref_count = ref_count + 1。

## API

- POST /api/v1/objects（幂等，kind ∈ 静态事实/单体动态/立方动态，status 强制 DRAFT）
- PUT /api/v1/objects/{id}
- POST /api/v1/edges（幂等 + 引用联动）/ PUT /api/v1/edges/{id}
- POST /api/v1/functions（幂等，cat ∈ 指标/派生/行动/权限）/ PUT /api/v1/functions/{id}
- POST /api/v1/{objects|edges|functions}/{id}/transition {action, by}

## 前端

Registry 三 Tab 增加顶部「新建」按钮与行内操作：编辑（弹窗）、提交评审/发布/废弃（按当前状态显示）、DRAFT 徽标；409 文案直达。
