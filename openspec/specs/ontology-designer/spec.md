# ontology-designer 规格

## Requirements

### Requirement: 本体创建（三初始化）
POST /api/v1/ontologies SHALL 以客户端 id 幂等创建；init=blank 仅元数据、template 生成供应链最小集（4 对象 + 3 关系画布草稿）、reverse 从 table_profiles 生成对象草稿（上限 4）；非法 init 400；创建者 SHALL 自动成为所有者（myRole=所有者）。

### Requirement: 建模画布
建模画布 SHALL 渲染当前工作本体的画布对象（节点，按类型着色）与关系（贝塞尔连线 + 名称标签 + 箭头）；点击对象 SHALL 打开属性面板（属性表/状态机/生命周期流转：提交评审/发布/废弃，走既有治理 API）；点击关系 SHALL 展示边属性；节点 SHALL 可拖拽且布局按本体本地保存、支持保存/重排；新建对象 SHALL 真实写路径（DRAFT 草稿）。

### Requirement: 本体管理卡片化
本体管理 SHALL 以卡片网格展示（场景/版本/状态/我的角色/对象关系成员计数），当前工作本体高亮；点击卡片设为工作本体；新建向导 SHALL 提供三初始化路径并真实创建。
