# Proposal: modeling-nav-parity（本体建模菜单收敛对齐原型）

## Background
用户指出本体建模子菜单比原型多（原型 3 项，生产 5 项），界面也不完全一致。

## 处置
1. 菜单收敛为原型 3 项：本体管理 / 本体设计器 / 智能建模（去掉「注册中心」「版本与导出」独立叶子）。
2. 本体详情页重写为原型的六 section 结构（左侧 Menu + 右侧内容）：概览 / 对象 / 关系 / 函数 / 版本（含 OWL/RDF 导出）/ 成员与授权——注册中心和版本导出的功能全部合并进来。
3. 旧路由 301 重定向：/modeling/registry → /modeling/ontology/detail?sec=objects；/modeling/version-ops → ?sec=versions。
4. 通知 to_path 引用同步更新。

## 确认记录
用户于 2026-10-07 对照原型指出。
