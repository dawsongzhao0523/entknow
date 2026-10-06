# OpenSpec — 规格驱动开发（SDD）

本目录是 entKnow 的需求管理中枢。**规格先于代码**：`specs/` 描述系统"现在是什么"，`changes/` 描述"将要变成什么"。

## 目录

```
openspec/
├── config.yaml          # 上下文与规则（代理提案前必读）
├── specs/               # 现行能力规格（每个能力一个目录，归档后生效）
│   └── <capability>/spec.md
└── changes/             # 进行中的变更提案
    └── <change-id>/     # kebab-case，如 add-ontology-registry
        ├── proposal.md  # 背景 / 目标 / 范围（为什么做、做什么、不做什么）
        ├── design.md    # 技术方案（怎么做：结构、接口、取舍）
        ├── specs/       # 规格增量（该变更对能力规格的修改）
        │   └── <capability>/spec.md
        └── tasks.md     # 任务清单（checkbox，每任务带测试）
```

## 生命周期

```
docs/requirement/YYYYMMDD需求描述.md   ← 1. 草稿需求
        ↓
openspec/changes/<id>/ 四件套          ← 2. 提案（proposal → design → specs → tasks）
        ↓
用户确认 OK                            ← 3. 评审门禁（未确认不得写代码）
        ↓
按 tasks.md 开发（TDD 红→绿）          ← 4. 实现
        ↓
测试全绿 + tasks 全勾                  ← 5. 完成门禁
        ↓
specs 增量合入 openspec/specs/，归档    ← 6. archive
        ↓
git commit（关联 change-id）           ← 7. 提交门禁
```

## 规格文件格式（spec.md）

```markdown
# <capability> 规格

## Requirements

### Requirement: <能力点祈使句描述>
系统 SHALL <可验证的行为约束>。

#### Scenario: <场景名>
- **WHEN** <条件>
- **THEN** <可验证的结果>
```

- Requirement 用 SHALL 表述可验证行为，不写实现细节。
- 每个 Requirement 至少一个 Scenario，Scenario 直接对应单元测试用例。
- 能力命名 kebab-case；change-id 同样 kebab-case 且能表达意图。

## 归档方式

变更完成归档时：把 `changes/<id>/specs/<capability>/spec.md` 的增量合并进 `openspec/specs/<capability>/spec.md`（新建或追加 Requirement，冲突时以增量为准），然后在 `openspec/specs/CHANGELOG.md` 追加一行归档记录。
