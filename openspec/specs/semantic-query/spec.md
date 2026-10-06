# semantic-query 规格

## Requirements

### Requirement: 统一检索
GET /api/v1/search?q= SHALL 对对象（名称/英文/映射/属性）、知识条目（标题/术语，不含已失效）、实例（实例号/属性值）、同义词组（词条）执行关键词检索，分类返回且每类至多 20 条；q 为空 SHALL 400。

### Requirement: 查询执行与幂等历史
POST /api/v1/queries {id, question, by} SHALL 执行检索并返回：确定性 DSL（命中驱动模板）、分类结果、总命中数与真实延迟；同 id 重复执行 SHALL 幂等（历史不重复、返回既有记录语义）。question/by 必填（400）。

### Requirement: 查询历史
GET /api/v1/queries SHALL 返回倒序历史并支持 by 过滤；记录含问题/DSL/命中数/延迟/执行人/时间。
