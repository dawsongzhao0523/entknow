-- entKnow demo 数据（= 原型 mock，已脱敏）。TRUNCATE + INSERT，可重复执行。
BEGIN;

TRUNCATE users, ontologies, memberships, objects, edges, functions, views,
         datasources, rules, reviews, notifications, capabilities, versions, table_profiles,
         kb_domains, kb_entries, synonyms, instances, instance_events, rule_firings, actions, roles,
         capability_calls, query_history, pipeline_tasks, pipeline_runs, sandbox_branches,
         menus, data_rules, dep_services, dep_checks, audit_logs, user_settings,
         market_items, market_requests, bindings, binding_runs, onto_candidates, entity_alignments,
         org_units, posts, system_logs, notification_reads, parse_profiles
         RESTART IDENTITY;

INSERT INTO users (id, account, name, dept, post, roles, status, last_login) VALUES
('u1', 'zhangsan', '张三', '平台部 / 数据AI部', '数据架构师', ARRAY['本体管理员','数据开发'], '正常', '2026-10-03 09:12'),
('u2', 'wangwu',   '王五', '供应链 / 采购部',   '业务专家',     ARRAY['评审员'],              '正常', '2026-10-03 08:47'),
('u3', 'sunqi',    '孙七', '平台部 / 数据AI部', '数据开发工程师', ARRAY['数据开发'],           '正常', '2026-10-02 19:31'),
('u4', 'zhaoliu',  '赵六', '信息技术中心',     '系统集成工程师', ARRAY['系统集成'],           '正常', '2026-10-02 17:05');

INSERT INTO roles (id, name, descr, perms, built_in) VALUES
('admin',     '本体管理员', '本体全生命周期管理与发布', ARRAY['assets','knowledge','modeling','runtime','reasoning','sandbox','apps','governance','admin'], true),
('data-dev',  '数据开发',   '数据资产接入与加工',       ARRAY['assets','knowledge','modeling'], false),
('reviewer',  '评审员',     '知识与本体评审',           ARRAY['knowledge','modeling','governance'], false),
('integrator','系统集成',   '外部系统与数据源集成',     ARRAY['assets','apps'], false),
('agent-dev', '智能体开发', 'Agent 能力消费与行动开发', ARRAY['runtime','reasoning','apps'], false),
('readonly',  '只读访客',   '只读浏览',                 ARRAY['assets','knowledge','modeling','runtime','reasoning'], false);

INSERT INTO ontologies (id, name, scene, version, status, owner, members, object_count, edge_count, created) VALUES
('scm',       '供应链本体',   '订单交付风险场景',       'v0.4', 'DRAFT',     '张三', 6,  7, 4, '2026-08-12'),
('quality',   '质量追溯本体', '来料-制程-出货追溯',     'v1.0', 'PUBLISHED', '王五', 9, 12, 9, '2026-05-20'),
('equipment', '设备运维本体', '设备故障预测与派单',     'v0.1', 'DRAFT',     '赵六', 3,  2, 1, '2026-09-28');

INSERT INTO memberships (onto_id, user_id, role) VALUES
('scm', 'zhangsan', '建模者'),
('quality', 'zhangsan', '查看者'),
('equipment', 'zhaoliu', '所有者');

INSERT INTO objects (id, name, en, kind, version, status, ref_count, owner, state_machine, ontology, canvas, shared, perm, mapping, props) VALUES
('o1', '供应商',   'Supplier',       '静态事实', 'v2.1', 'PUBLISHED', 14, '张三', NULL, '供应链本体', true,  true,  'use',  'lv_supplier（逻辑视图）',
 '[{"name":"supplier_id","type":"string","comment":"供应商编码"},{"name":"name","type":"string","comment":"供应商名称"},{"name":"ontime_rate","type":"decimal","comment":"准时交付率"},{"name":"level","type":"string","comment":"分级 A/B/C"}]'),
('o2', '工厂',     'Plant',          '静态事实', 'v1.4', 'PUBLISHED', 11, '张三', NULL, '供应链本体', true,  true,  'use',  'lv_plant（逻辑视图）',
 '[{"name":"plant_code","type":"string","comment":"工厂代码"},{"name":"name","type":"string","comment":"工厂名称"},{"name":"region","type":"string","comment":"所属区域"}]'),
('o3', '物料',     'Material',       '静态事实', 'v1.2', 'PUBLISHED',  9, '王五', NULL, '供应链本体', true,  true,  'use',  'ods_material（物理表）',
 '[{"name":"material_id","type":"string","comment":"物料编码"},{"name":"category","type":"string","comment":"物料分类"},{"name":"uom","type":"string","comment":"基本单位"}]'),
('o4', '采购订单', 'PO',             '单体动态', 'v0.4', 'DRAFT',       9, '张三', ARRAY['草稿','已下达','已发货','已收货','已关闭'], '供应链本体', true, true, 'use', 'lv_order_delivery（逻辑视图）',
 '[{"name":"po_no","type":"string","comment":"采购订单号"},{"name":"amount","type":"decimal","comment":"订单金额"},{"name":"promise_dt","type":"datetime","comment":"承诺交期"},{"name":"status","type":"enum","comment":"订单状态（状态机）"}]'),
('o5', '生产工单', 'WO',             '单体动态', 'v1.0', 'PUBLISHED',   6, '孙七', ARRAY['待排产','生产中','已完工'], '供应链本体', true, true, 'use', 'ods_work_order（物理表）',
 '[{"name":"wo_no","type":"string","comment":"工单号"},{"name":"qty","type":"int","comment":"生产数量"},{"name":"priority","type":"int","comment":"优先级"}]'),
('o6', '设备',     'Equipment',      '立方动态', 'v0.2', 'IN_REVIEW',   3, '赵六', NULL, '供应链本体', true,  true,  'use',  'lv_equipment_rt（实时视图）',
 '[{"name":"equip_id","type":"string","comment":"设备编号"},{"name":"fault","type":"bool","comment":"故障状态"},{"name":"oee","type":"decimal","comment":"综合效率"}]'),
('o7', '准入评估', 'QualAssessment', '单体动态', 'v0.2', 'PUBLISHED',   4, '王五', NULL, '供应链本体', true,  true,  'use',  'ods_qual_assessment（物理表）',
 '[{"name":"assess_id","type":"string","comment":"评估单号"},{"name":"score","type":"decimal","comment":"准入评分"},{"name":"conclusion","type":"enum","comment":"结论"}]'),
('o8', '客户',     'Customer',       '静态事实', 'v3.0', 'PUBLISHED',  21, '王五', NULL, '供应链本体', false, true,  'use',  'lv_customer（逻辑视图）',
 '[{"name":"cust_id","type":"string","comment":"客户编码"},{"name":"name","type":"string","comment":"客户名称"},{"name":"channel","type":"string","comment":"销售渠道"}]'),
('o9', '仓库',     'Warehouse',      '静态事实', 'v1.1', 'PUBLISHED',   8, '孙七', NULL, '供应链本体', false, true,  'use',  'ods_warehouse（物理表）',
 '[{"name":"wh_code","type":"string","comment":"仓库代码"},{"name":"capacity","type":"int","comment":"容量"}]'),
('o10','物流单',   'Shipment',       '单体动态', 'v0.3', 'IN_REVIEW',   5, '赵六', NULL, '供应链本体', false, true,  'use',  'ods_shipment（物理表）',
 '[{"name":"ship_no","type":"string","comment":"物流单号"},{"name":"carrier","type":"string","comment":"承运商"},{"name":"eta","type":"datetime","comment":"预计到达"}]'),
('o11','成本中心', 'CostCenter',     '静态事实', 'v2.0', 'PUBLISHED',  17, '财务域', NULL, '财务本体',   false, false, 'view', 'fin_cc（财务库表）',
 '[{"name":"cc_code","type":"string","comment":"成本中心代码"},{"name":"budget","type":"decimal","comment":"年度预算"}]');

INSERT INTO edges (id, name, from_obj, to_obj, version, status, ref_count, props, perm) VALUES
('e1', 'SUPPLY（供应）',   '供应商',   '工厂',     'v1.0', 'PUBLISHED', 11,
 '[{"name":"qty","type":"decimal","comment":"供货量","temporal":"月度","agg":"SUM"},{"name":"delay","type":"int","comment":"时延(天)","temporal":"月度","agg":"AVG"},{"name":"cost","type":"decimal","comment":"单位成本","temporal":"月度","agg":"AVG"}]', ''),
('e2', 'QUALIFIES（准入）', '供应商',   '准入评估', 'v0.2', 'PUBLISHED',  4,
 '[{"name":"score","type":"decimal","comment":"准入评分"}]', ''),
('e3', 'FULFILLS（履约）',  '准入评估', '采购订单', 'v0.1', 'DRAFT',      2, '[]', ''),
('e4', 'PRODUCES（生产）',  '工厂',     '生产工单', 'v1.0', 'PUBLISHED',  5,
 '[{"name":"yield_rate","type":"decimal","comment":"良率"}]', ''),
('e5', 'SETTLES（结算）',   '采购订单', '成本中心', 'v2.0', 'PUBLISHED',  9,
 '[{"name":"settle_amt","type":"decimal","comment":"结算金额"}]', 'view');

INSERT INTO functions (id, name, cat, version, status, tests, calls_7d, signature, impl, perm) VALUES
('f1', '逾期订单数',   '指标', 'v1.1', 'PUBLISHED', '5/5 ✓', '12,401', '() → int', 'count(po where promise_dt < now() and status != ''已收货'')', ''),
('f2', '交付风险分',   '派生', 'v0.2', 'IN_REVIEW', '8/8 ✓', '',       '(po: 采购订单) → score: decimal(0-100)', '0.5*norm(SUPPLY.delay趋势) + 0.3*(1-齐套率) + 0.2*(1-在途覆盖)', ''),
('f3', '冻结订单',     '行动', 'v1.2', 'PUBLISHED', '6/6 ✓', '',       '(po: 采购订单) → receipt', '条件: 风险分>80 │ 权限: 计划主管 │ 二次确认 │ 回滚: 解冻订单', ''),
('f4', '金额可见性',   '权限', 'v1.0', 'PUBLISHED', '3/3 ✓', '',       '(user, po) → bool', '范围: 采购域 + 财务', ''),
('f5', '成本归集',     '指标', 'v2.3', 'PUBLISHED', '7/7 ✓', '',       '(cc: 成本中心) → decimal', 'sum(settle_amt by 成本中心, 月度)', 'view');

INSERT INTO views (id, name, kind, version, status, domain, sensitive, upstream, bound_by, owner, refresh) VALUES
('v1', 'lv_order_delivery',   'LOGICAL',     'v3', 'PUBLISHED', '供应链', 'L3', ARRAY['purchase_order(scm_prod)','supplier(srm)'], ARRAY['对象[采购订单].supplier_name 等 3 处','语义查询 2 处'], '张三', ''),
('v2', 'lv_supplier_ontime',  'MATERIALIZED', 'v1', 'PUBLISHED', '供应链', 'L2', ARRAY['supplier(srm)','purchase_order(scm_prod)'], ARRAY['指标[供应商准时率]'], '王五', 'CRON 0 3 * * *'),
('v3', 'lv_inventory_kit',    'LOGICAL',     'v2', 'DRAFT',     '供应链', 'L2', ARRAY['inventory(mes_prod)','bom(mes_prod)'], ARRAY[]::text[], '孙七', '');

INSERT INTO datasources (id, name, type, kind, host, status, mode, tables, sensitive, owner, last_sync) VALUES
('ds-001', 'scm_prod',         'MySQL',        '结构化',   'mysql://192.0.2.3:3306/scm_prod', '正常', 'CRON', 142, 'L2', '张三', '2026-10-03 02:00'),
('ds-002', 'srm',              'PostgreSQL',   '结构化',   'pg://192.0.2.4:5432/srm',        '正常', 'CDC',   38, 'L3', '王五', '2026-10-03 09:58'),
('ds-003', 'mes_prod',         'SQLServer',    '结构化',   'mssql://192.0.2.8:1433/mes_prod','异常', 'CDC',   96, 'L2', '孙七', '2026-10-03 08:12'),
('ds-004', 'kb_supply_chain',  '飞书知识库',   '非结构化', '',                               '正常', 'EVENT', NULL, 'L2', '张三', '2026-10-03 09:45'),
('ds-005', 'erp_oracle',       'Oracle',       '结构化',   'oracle://192.0.2.2:1521/ERP',    '正常', 'CRON', 210, 'L3', '赵六', '2026-10-02 23:00'),
('ds-006', 'wms_clickhouse',   'ClickHouse',   '结构化',   'ck://192.0.2.6:9000/wms',        '停用', 'NONE',  24, 'L1', '张三', '2026-09-20 02:00');

INSERT INTO rules (id, def, kind, status, fired) VALUES
('R1', 'SUPPLY.delay 月均值变化>20% → 采购订单.交付风险分 重算', 'V→E', '运行中', 412),
('R2', '采购订单.状态→已收货 → 供应商.准时率 更新',             'V→V', '运行中', 986),
('R3', '设备.故障状态=是 → 关联工单.优先级 +1',                 'E→V', '运行中', 21),
('R4', '齐套率<80% → SUPPLY 边标记「风险」',                    'E→E', '运行中', 423);

INSERT INTO reviews (id, title, type, from_user, status, sla, decided_by, decided_at, comment) VALUES
('RV-2026-1002-003', '供应链本体 v0.4：+交付风险分函数',            '本体发布',   '张三', '评审中', '剩 1 天', '', '', ''),
('RV-2026-1002-001', '术语归并：供应商 ≈ 供货商 ≈ Vendor',         '术语归并',   '王五', '待评审', '剩 2 天', '', '', ''),
('RV-2026-1001-007', '概念锚「客户」口径冲突裁决',                 '冲突裁决',   '系统', '待评审', '剩 4 小时', '', '', ''),
('RV-2026-0930-002', '规则补丁：R7 阈值 0.7→0.8',                 '自进化补丁', '系统', '已通过', '-', '王五', '2026-10-01 18:20', '阈值调整口径已与业务确认');

INSERT INTO notifications (id, cat, title, time, to_path, unread, to_user) VALUES
('n1', '待办处理', '本体发布评审待处理：供应链本体 v0.4（+交付风险分函数）', '10 分钟前', '/governance/reviews', true, 'zhangsan'),
('n2', '待办处理', '术语归并「供应商 ≈ 供货商」待你裁决',                 '1 小时前',  '/knowledge/synonyms', true, 'wangwu'),
('n3', '治理任务', 'K3 知识临期：3 条知识将在 7 天内到期',               '今天 08:30','/knowledge/entries', true, 'zhangsan'),
('n4', '治理任务', '映射断链：lv_order_delivery 上游 schema 变更，需影响确认', '昨天 18:02', '/assets/pipelines', false, 'zhangsan'),
('n5', '协同分享', '王五 分享了画布「订单交付风险 v0.4」给你',           '昨天 15:40', '/modeling/ontologies', false, 'zhangsan'),
('n6', '协同分享', '赵六 邀请你加入「设备运维本体」评审组',             '2 天前',     '/modeling/ontologies', false, 'wangwu');

INSERT INTO capabilities (id, name, description, proto, calls, owner, base_calls) VALUES
('c1', 'get_object',           '获取对象实例最小上下文切片',         'MCP/REST/CLI', '', '平台组', 8412),
('c2', 'semantic_query',       '自然语言 → DSL → 执行',              'MCP/REST/CLI', '', '平台组', 12401),
('c3', 'run_action',           '执行 Action（dry-run + 确认令牌）',  'MCP/REST/CLI', '', '平台组', 231),
('c4', 'supplier_risk_agent',  '供应商风险智能体（消费方）',         'MCP',          '', 'AI 组', 1204);

INSERT INTO query_history (id, question, dsl, hits, latency_ms, by_user, at) VALUES
('q-seed-1', '华兴电子近三月准时率',
 '检索「华兴电子近三月准时率」→ MATCH 对象×0, 知识×0, 实例×1, 同义词×0 RETURN 语义切片；重点域: 实例', 1, 842, '李四', '2026-10-03 09:12'),
('q-seed-2', '采购订单的交付风险怎么看',
 '检索「采购订单的交付风险怎么看」→ MATCH 对象×1, 知识×1, 实例×2, 同义词×0 RETURN 语义切片；重点域: 实例', 4, 1260, '王五', '2026-10-02 16:40');

INSERT INTO pipeline_tasks (id, name, type, source, target, schedule, status, last_run) VALUES
('p1', '元数据探查 · scm_prod',   '探查',       'scm_prod（MySQL）',     '数据资产画像',    'CRON 0 2 * * *',  '运行中', '2026-10-03 02:00'),
('p2', '订单清洗 · purchase_order','清洗',      'purchase_order(scm_prod)', 'lv_order_delivery', 'CRON 0 3 * * *', '运行中', '2026-10-03 03:00'),
('p3', '知识推送 · 知识库 → Utopia',  'UTOPIA_PUSH', '知识库条目',        'Utopia API source', 'EVENT',          '运行中', '2026-10-03 09:45'),
('p4', '库存采集 · wms_clickhouse','采集',      'wms_clickhouse',        'ods_inventory',    'CRON 0 4 * * *',  '已停用', '2026-09-20 04:00');

INSERT INTO pipeline_runs (id, task_id, status, detail, at) VALUES
('run-seed-1', 'p1', '成功', '探查 142 表 · 新增字段备注 13 条', '2026-10-03 02:00'),
('run-seed-2', 'p2', '成功', '清洗 21.4 万行 · 脏数据 0.02%', '2026-10-03 03:00');

INSERT INTO sandbox_branches (id, name, hypothesis, base_instance, risk_before, risk_after, cost, note, status, by_user, at) VALUES
('b1', '分支 A · 基准', '不干预', 'PO20261002091', 92, 92, '—', '当前生产口径', '已对比', '张三', '2026-10-04 09:00'),
('b2', '分支 B · 切换备选供应商', 'S-0012 → S-0031（delay -4 天）', 'PO20261002091', 92, 52, '+2.1%', '推荐', '已对比', '张三', '2026-10-04 09:10'),
('b3', '分支 C · 提前下单 7 天', 'order_dt -7d', 'PO20261002091', 92, 61, '库存占用 +¥1.2M', '', '推演中', '李四', '2026-10-04 09:20');

INSERT INTO versions (onto_id, v, date, description, status) VALUES
('scm', 'v0.1', '08-12', '最小可行本体（4对象+3关系+2Action）', 'PUBLISHED'),
('scm', 'v0.2', '08-29', '+准入评估对象 +QUALIFIES 关系',       'PUBLISHED'),
('scm', 'v0.3', '09-15', '+传播规则×4',                        'PUBLISHED（生产中）'),
('scm', 'v0.4', '10-01', '+交付风险分函数（评审中）',           'DRAFT');

INSERT INTO kb_domains (id, name, parent_id) VALUES
('scm',      '供应链域', ''),
('purchase', '采购域',   'scm'),
('plan',     '计划域',   'scm'),
('quality',  '质量域',   '');

INSERT INTO kb_entries (id, domain_id, title, status, source, onto, data_ref, flow, roles, mode, terms, sops, version, updated_by, updated_at) VALUES
('po', 'purchase', '采购订单', '已评审', '定时任务', 'PO', 'scm_prod.purchase_order', 'PROC-000062 采购订单下达',
 ARRAY['采购员（创建）','采购主管（审批）','财务（超5万复核）'],
 '## 业务模式 · 采购订单

企业向**供应商**发出的正式采购要约，经审批后生效。

- 创建：采购员按采购计划创建，关联物料与工厂
- 审批：采购主管审批，金额 > 5 万需财务复核
- 履约：供应商确认 → 发货 → 收货，全程回写状态机',
 '[{"term":"采购订单","en":"Purchase Order","def":"企业向供应商发出的正式采购要约，经审批后生效","source":"KB 词条"},{"term":"承诺交期","en":"promise_dt","def":"供应商承诺的最晚交付时间","source":"表字段"},{"term":"齐套率","en":"kit_rate","def":"齐套物料行数 / 总物料行数（AI 候选 · 证据 3 条）","source":"AI 候选"}]',
 ARRAY['金额 > 5 万 → 财务复核','紧急订单可走绿色通道（总监特批）','供应商未准入 → 禁止下达采购订单','订单状态机：草稿 → 已下达 → 已发货 → 已收货 → 已关闭'],
 3, '王五', '2026-09-30 16:12'),
('qualify', 'purchase', '供应商准入', '已评审', 'OneData', 'QualAssessment', 'mdm.supplier_qualification', 'PROC-000015 供应商准入评估',
 ARRAY['SQE（评估）','采购主管（审批）','质量经理（会签）'],
 '## 业务模式 · 供应商准入

新供应商引入前的资质与能力评估流程。

- 发起：采购员提交准入申请，附资质文件
- 评估：SQE 现场审核 + 样品验证
- 生效：评分 ≥ 80 准入，进入合格供应商名录',
 '[{"term":"准入评分","en":"qual_score","def":"资质 30% + 产能 30% + 质量 40%（OneData 指标口径）","source":"OneData"},{"term":"合格供应商","en":"approved_supplier","def":"准入评分 ≥80 且在有效期内的供应商","source":"OneData"}]',
 ARRAY['准入评分 < 80 → 禁止下达订单','资质文件有效期 < 30 天 → 预警并冻结下单','年度复审：评分下降 >10 分触发重评'],
 2, '王五', '2026-09-28 11:40'),
('price-rule', 'purchase', '价格审批规则', '待评审', 'CSV 导入', '', 'scm_prod.po_price_line', 'PROC-000070 价格审批',
 ARRAY['采购员（发起）','成本工程师（核价）','采购总监（终审）'],
 '## 业务模式 · 价格审批

采购价格的核价与分层审批。

- 单价偏离基准价 >5% 触发核价
- 金额分层：≤5万主管审批，>5万总监终审',
 '[{"term":"基准价","en":"baseline_price","def":"最近一次中标价或框架协议价","source":"KB 词条"}]',
 ARRAY['偏离基准价 >5% → 成本工程师核价','单笔 > 5 万 → 总监终审'],
 1, '张三', '2026-10-02 09:05'),
('demand-plan', 'plan', '需求计划', '已评审', '定时任务', '', 'aps_prod.demand_plan', 'PROC-000003 需求计划编制',
 ARRAY['计划员（编制）','计划主管（评审）'],
 '## 业务模式 · 需求计划

滚动 13 周需求预测与计划编制。

- 来源：销售预测 + 客户订单 + 安全库存补齐
- 冻结期：未来 2 周需求冻结，变更需审批',
 '[{"term":"滚动周期","en":"rolling_weeks","def":"13 周滚动窗口，每周一刷新","source":"表字段"},{"term":"需求冻结期","en":"freeze_zone","def":"未来 2 周，冻结期内变更需计划主管审批","source":"定时任务"}]',
 ARRAY['冻结期内变更需计划主管审批','预测准确率月度复盘（MAPE < 25%）'],
 1, '李四', '2026-09-20 14:30'),
('batch-trace', 'quality', '批次追溯', '已评审', 'OneData', '', 'mes_prod.batch_trace', 'PROC-000021 批次判定',
 ARRAY['质检员（采样）','质量经理（判定）'],
 '## 业务模式 · 批次追溯

来料-制程-出货三段批次链追溯。

- 来料批次绑定供应商与采购订单
- 制程批次记录工序与设备
- 出货批次正向/反向追溯 ≤ 2 分钟',
 '[{"term":"批次链","en":"batch_chain","def":"来料→制程→出货的批次血缘","source":"OneData"}]',
 ARRAY['质量异常 → 5 分钟内定位受批次影响的客户订单','批次冻结 → 联动采购订单暂停收货'],
 1, '王五', '2026-09-15 10:00');

INSERT INTO synonyms (id, terms, standard, status, by, at) VALUES
('s0', ARRAY['物料','料号','Material'], '物料', '已归并', '张三', '2026-09-28'),
('s1', ARRAY['供应商','供货商','Vendor'], '', '待归并', '', ''),
('s2', ARRAY['客户','顾客','Customer'], '', '待归并', '', ''),
('s3', ARRAY['准时率','及时率','OnTimeRate'], '', '待归并', '', '');

INSERT INTO instances (id, object_id, status, props, risk_score, order_dt, promise_dt) VALUES
('PO20260930001', 'o4', '已发货',
 '{"type":"采购订单","supplier":"S-0012 华兴电子","plant":"RCBJ-YK","material":"M-100233 电容 0402","amount":"58,200.00 CNY"}',
 76, '2026-09-30 10:21', '2026-10-05 00:00'),
('PO20261002091', 'o4', '已下达',
 '{"type":"采购订单","supplier":"S-0031 翔宇科技","plant":"RCBJ-BSE","material":"M-100870 MCU","amount":"128,400.00 CNY"}',
 92, '2026-10-02 14:05', '2026-10-25 00:00'),
('QA-118', 'o7', '已通过',
 '{"type":"准入评估","supplier":"S-0031 翔宇科技","score":"86","conclusion":"准入"}',
 0, '2026-09-12 09:30', '');

INSERT INTO instance_events (instance_id, t, e) VALUES
('PO20260930001', '2026-09-30 10:21', '订单创建（草稿）'),
('PO20260930001', '2026-09-30 14:02', '已下达 → 供应商确认'),
('PO20260930001', '2026-10-01 09:10', '已发货 · 物流单 SF880123'),
('PO20260930001', '2026-10-02 18:44', '传播引擎：交付风险分 71→76（SUPPLY.delay 上升）'),
('PO20261002091', '2026-10-02 14:05', '订单创建（草稿）'),
('PO20261002091', '2026-10-02 15:30', '已下达 → 供应商确认（未回签，风险分升至 92）');

INSERT INTO rule_firings (id, rule_id, instance_id, detail, fired_at) VALUES
('rf1', 'R1', 'PO20260930001', 'SUPPLY.delay 月均值 +23% → 采购订单.交付风险分 重算 71→76', '2026-10-02 18:44'),
('rf2', 'R2', 'PO20261002055', '采购订单.状态→已收货 → 供应商.准时率 更新（S-0012 92.4%）', '2026-10-03 09:30');

INSERT INTO actions (id, func_id, instance_id, user_name, trigger, status, detail, time) VALUES
('ACT-1003-1017', 'f3', 'PO20261002091', '张三', 'manual',   '执行成功', '冻结订单（已二次确认，风险分 92）', '2026-10-03 10:17'),
('ACT-1003-0952', 'f3', 'PO20261002087', '张三', 'manual',   '执行成功', '冻结订单', '2026-10-03 09:52'),
('ACT-1003-0930', 'f3', 'PO20261002055', 'system', 'event',   '执行成功', '规则 R2 联动：收货超时自动冻结', '2026-10-03 09:30'),
('ACT-1003-0911', 'f3', 'PO20261002112', '王五', 'manual',   '权限拒绝', '计划员无 execute 权限（需计划主管）', '2026-10-03 09:11'),
('ACT-1003-0600', 'f3', 'PO20261002031', 'system', 'schedule', '已回滚', '定时批量冻结误触发 → 自动回滚', '2026-10-03 06:00');

INSERT INTO table_profiles (name, comment, rows, fields, pk, fks, siblings, profile_fields) VALUES
('purchase_order', '采购订单', '2,140,331', 18, 'po_id',
 '["supplier_id→supplier","plant_id→plant","material_id→material"]',
 '["supplier（供应商）","material（物料）","po_line（订单行）"]',
 '[{"name":"po_id","type":"varchar(32)","nullRate":"0%","sample":"PO20260930001","comment":"采购订单号"},
   {"name":"supplier_id","type":"varchar(16)","nullRate":"0%","sample":"S-0012","comment":"供应商编码"},
   {"name":"plant_id","type":"varchar(8)","nullRate":"0%","sample":"RCBJ-YK","comment":"工厂代码"},
   {"name":"material_id","type":"varchar(20)","nullRate":"0.1%","sample":"M-100233","comment":"物料编码"},
   {"name":"status","type":"tinyint","nullRate":"0%","sample":"3（已下达→已发货→已收货）","comment":"订单状态"},
   {"name":"amount","type":"decimal(14,2)","nullRate":"0.2%","sample":"58,200.00 CNY","comment":"订单金额(元)"},
   {"name":"order_dt","type":"datetime","nullRate":"0%","sample":"2026-09-30 10:21","comment":"下单时间"},
   {"name":"promise_dt","type":"datetime","nullRate":"1.1%","sample":"2026-10-15 00:00","comment":"承诺交期"},
   {"name":"updated_at","type":"datetime","nullRate":"0%","sample":"2026-10-02 18:44","comment":"更新时间"},
   {"name":"buyer","type":"varchar(16)","nullRate":"3.4%","sample":"B-038","comment":"","aiFilled":true}]');

-- ─── 系统管理（complete-sysadmin） ───

-- 菜单树：与生产前端真实路由一一对应；roles.perms 引用一级模块 id
INSERT INTO menus (id, parent_id, name, route, icon, sort, visible) VALUES
('assets', '', '数据资产', '', 'DatabaseOutlined', 1, true),
('assets/datasources', 'assets', '数据源中心', 'assets/datasources', '', 1, true),
('assets/views',       'assets', '逻辑视图',   'assets/views',       '', 2, true),
('assets/pipelines',   'assets', '数据加工',   'assets/pipelines',   '', 3, true),
('assets/market',       'assets', '数据集市',   'assets/market',       '', 4, true),
('assets/workbench',    'assets', '数据工作台', 'assets/workbench',    '', 5, true),
('knowledge', '', '知识运营', '', 'BookOutlined', 2, true),
('knowledge/entries',  'knowledge', '知识库',     'knowledge/entries',  '', 1, true),
('knowledge/synonyms', 'knowledge', '同义词治理', 'knowledge/synonyms', '', 2, true),
('knowledge/convergence', 'knowledge', '隐式收敛', 'knowledge/convergence', '', 3, true),
('modeling', '', '本体建模', '', 'DeploymentUnitOutlined', 3, true),
('modeling/ontologies', 'modeling', '本体管理', 'modeling/ontologies', '', 1, true),
('modeling/designer',   'modeling', '本体设计器', 'modeling/designer', '', 2, true),
('modeling/ai-modeling', 'modeling', '智能建模', 'modeling/ai-modeling', '', 3, true),
('runtime', '', '本体运行时', '', 'ApiOutlined', 4, true),
('runtime/binding',   'runtime', '数据绑定',    'runtime/binding',   '', 1, true),
('runtime/instances', 'runtime', '实例 360°',   'runtime/instances', '', 2, true),
('runtime/rules',     'runtime', '规则与行动', 'runtime/rules',     '', 2, true),
('reasoning', '', '推理演绎', '', 'BulbOutlined', 5, true),
('reasoning/query',  'reasoning', '语义查询', 'reasoning/query',  '', 1, true),
('reasoning/engine',  'reasoning', '推理引擎', 'reasoning/engine',  '', 2, true),
('sandbox', '', '推演沙盘', '', 'ExperimentOutlined', 6, true),
('sandbox/compare', 'sandbox', '沙盘 · 多分支对比', 'sandbox/compare', '', 1, true),
('apps', '', '智能应用', '', 'RocketOutlined', 7, true),
('apps/capabilities', 'apps', '能力出口', 'apps/capabilities', '', 1, true),
('governance', '', '治理演化', '', 'SafetyCertificateOutlined', 8, true),
('governance/reviews',  'governance', '评审与发布', 'governance/reviews',  '', 1, true),
('governance/evolution', 'governance', '演化与撤回', 'governance/evolution', '', 2, true),
('admin', '', '系统管理', '', 'SettingOutlined', 9, true),
('admin/overview',    'admin', '系统运营',   'admin/overview',    '', 1, true),
('admin/org',         'admin', '组织与权限', 'admin/org',         '', 2, true),
('admin/permissions', 'admin', '权限管理',   'admin/permissions', '', 3, true),
('admin/menus',       'admin', '菜单管理',   'admin/menus',       '', 4, true),
('admin/monitor',     'admin', '服务监控',   'admin/monitor',     '', 5, true),
('admin/logs',        'admin', '日志中心',   'admin/logs',        '', 6, true),
('admin/settings',    'admin', '个性化设置', 'admin/settings',    '', 7, true);

INSERT INTO data_rules (id, target, rule, role, effect, updated_by, updated_at) VALUES
('rls-1', '对象[采购订单]',   'plant_id IN (''RCBJ-YK'', ''RCBJ-BSE'')', '数据开发',   '仅可见 2 个工厂行', '张三', '2026-09-28 14:20'),
('rls-2', '对象[采购订单]',   'amount <= 100000',                        '只读访客',   '大额订单金额脱敏', '张三', '2026-09-28 14:22'),
('rls-3', '视图[lv_order_delivery]', 'domain = ''供应链''',              '评审员',     '跨域行不可见',     '王五', '2026-09-30 10:05'),
('rls-4', '对象[供应商]',     'qual_status = ''已准入''',                '智能体开发', 'Agent 仅消费已准入供应商', '赵六', '2026-10-01 09:11');

-- 依赖服务（target 空的 postgres = 自库连接池；redis/minio 地址可被环境变量覆盖）
INSERT INTO dep_services (id, name, descr, kind, target, status, latency_ms, checked_at) VALUES
('dep-pg',    'PostgreSQL（主库）', 'entKnow 平面元数据与运行时数据', 'postgres', '',                              '正常', 6,  '2026-10-03 09:58'),
('dep-redis', 'Redis',              '缓存与会话',                     'redis',    'localhost:26379',              '正常', 2,  '2026-10-03 09:58'),
('dep-minio', 'MinIO 对象存储',     '非结构化文档 / 制品仓库',        'http',     'http://localhost:29000/minio/health/live', '正常', 18, '2026-10-03 09:58');

-- 近 7 日巡检历史（redis 在 10-01/10-02 有降级，供 7 日可用率展示）
INSERT INTO dep_checks (service_id, ok, latency_ms, at) VALUES
('dep-pg',    true, 5,  '2026-09-27 10:00'), ('dep-pg',    true, 6,  '2026-09-28 10:00'), ('dep-pg',    true, 4,  '2026-09-29 10:00'),
('dep-pg',    true, 7,  '2026-09-30 10:00'), ('dep-pg',    true, 5,  '2026-10-01 10:00'), ('dep-pg',    true, 6,  '2026-10-02 10:00'), ('dep-pg',    true, 6,  '2026-10-03 09:58'),
('dep-redis', true, 2,  '2026-09-27 10:00'), ('dep-redis', true, 3,  '2026-09-28 10:00'), ('dep-redis', true, 2,  '2026-09-29 10:00'),
('dep-redis', true, 3,  '2026-09-30 10:00'), ('dep-redis', false, 0, '2026-10-01 10:00'), ('dep-redis', true, 120, '2026-10-02 10:00'), ('dep-redis', true, 2, '2026-10-03 09:58'),
('dep-minio', true, 15, '2026-09-27 10:00'), ('dep-minio', true, 21, '2026-09-28 10:00'), ('dep-minio', true, 17, '2026-09-29 10:00'),
('dep-minio', true, 19, '2026-09-30 10:00'), ('dep-minio', true, 16, '2026-10-01 10:00'), ('dep-minio', true, 22, '2026-10-02 10:00'), ('dep-minio', true, 18, '2026-10-03 09:58');

-- 审计日志：仅用户写操作留痕（中间件自动续写）
INSERT INTO audit_logs (at, module, level, operator, content, trace_id) VALUES
('2026-10-03 09:45:37', 'assets', 'INFO',  '张三', '视图发布推送：CREATE VIEW lv_order_delivery v3 成功（12 字段）', 'tr-8c1e55'),
('2026-10-03 09:31:04', 'runtime', 'INFO',  '系统', 'Action 冻结订单 执行回执：PO20260930001 → 已冻结，确认令牌 ack-7721，可回滚', 'tr-77aa19'),
('2026-10-02 17:12:48', 'knowledge', 'WARN',  '王五', '术语归并冲突：「供应商 ≈ 供货商」与既有锚点存在 2 处引用，转评审 RV-2026-1002-001', 'tr-41bf08'),
('2026-10-02 15:03:11', 'reasoning', 'INFO',  '王五', '语义查询：「华兴电子近三月准时率」→ DSL 编译成功，命中 lv_supplier_ontime，耗时 842ms', 'tr-33d7e2'),
('2026-10-01 22:40:19', 'admin', 'INFO',  '赵六', '角色权限变更：智能体开发 角色新增 本体运行时 Action 执行网关（编辑），已生效', 'tr-0e5b42'),
('2026-10-01 16:02:03', 'apps', 'INFO',  '系统', '能力出口调用：supplier_risk_agent 经 MCP 调用 run_action（dry-run），返回沙箱结果', 'tr-08d319');

-- 系统日志：运行时事件（可观测性；巡检/绑定同步/规则执行会自动续写）
INSERT INTO system_logs (at, level, component, content, trace_id) VALUES
('2026-10-03 09:58:12', 'INFO',  '数据同步', 'CDC 断连恢复：mes_prod 重连成功，补拉 binlog 位点 882311 → 884207', 'tr-9f2a01'),
('2026-10-03 09:30:02', 'INFO',  '依赖巡检', '定时巡检完成：3 个服务全部正常（PG 5ms · Redis 2ms · MinIO 18ms）', 'tr-9c1102'),
('2026-10-02 18:44:02', 'INFO',  '推理引擎', '传播引擎规则 R1 触发：SUPPLY.delay 月均值 +23% → 采购订单.交付风险分 71→76 重算', 'tr-5d09c3'),
('2026-10-02 11:26:55', 'WARN',  '治理引擎', '发布门禁告警：沙盘验证 warn（交付风险分 v0.2 未回归），评审 RV-2026-1002-003 挂起', 'tr-2a91f6'),
('2026-10-02 08:12:30', 'ERROR', '数据同步', 'scm_prod CRON 抽取超时（>30min）：purchase_order 增量批次 #4812 失败，已自动重试成功', 'tr-10ce77'),
('2026-10-02 06:00:11', 'WARN',  '数据绑定', '绑定 bd-3（物料 ↔ lv_inventory_kit）同步失败：mes_prod CDC 断连，等待重试', 'tr-44a9d0');

INSERT INTO user_settings (account, settings) VALUES
('zhangsan', '{"theme":"light","density":"default","monoFont":true,"landingPage":"","defaultOnto":"scm","notifyCats":["待办处理","治理任务","协同分享"]}');

-- ─── 模块补齐（complete-remaining-modules） ───

INSERT INTO market_items (id, name, comment, type, source, domain, sensitive, owner, freq, status, subscribers) VALUES
('mk-1', 'purchase_order', '采购订单',       '表',      'scm_prod / MySQL',        '供应链', 'L2', '张三', '214万行 · 日更',   '上架', 23),
('mk-2', 'lv_order_delivery', '订单交付视图', 'VIEW',   '联邦层 StarRocks',        '供应链', 'L3', '继承依赖', '逻辑视图 · 已发布', '上架', 41),
('mk-3', 'supplier',        '供应商主数据',   'API',     'SRM 系统',                '供应链', 'L2', '王五', '主数据 · 实时',   '上架', 17),
('mk-4', 'kb_sop',          '质量 SOP 文档',  'KB 文档', 'KB 知识库 · 在线增量',    '供应链', 'L2', '王五', '15min 增量',      '上架', 9),
('mk-5', 'code_biz_logic',  '订单拆分逻辑',   '代码索引', 'CodeNexus · 每日 03:00', '供应链', 'L2', '孙七', '函数级索引',      '审核中', 0);

INSERT INTO market_requests (id, item_id, applicant, reason, status, at) VALUES
('mr-1', 'mk-2', '赵六', 'Agent 消费订单交付风险特征', '待审批', '2026-10-05 14:20'),
('mr-2', 'mk-3', '孙七', '供应商画像看板取数',         '已通过', '2026-10-03 09:11');

INSERT INTO bindings (id, object_id, view_id, pk_field, field_map, sync_mode, status, last_sync, owner) VALUES
('bd-1', 'o4', 'v1', 'po_id', '{"po_id":"订单号","supplier_id":"供应商","amount":"金额","promise_dt":"承诺交期","status":"状态"}', 'CDC',  '正常', '2026-10-03 09:58', '张三'),
('bd-2', 'o1', 'v2', 'supplier_id', '{"supplier_id":"供应商编码","ontime_rate":"准时率","level":"分级"}', 'CRON', '正常', '2026-10-03 03:00', '张三'),
('bd-3', 'o3', 'v3', 'material_id', '{"material_id":"物料编码","category":"分类","uom":"单位"}', 'FULL', '告警', '2026-10-02 18:44', '孙七');

INSERT INTO binding_runs (id, binding_id, status, detail, at) VALUES
('br-1', 'bd-1', '成功', 'CDC 增量 +1,204 行 · 位点 884207', '2026-10-03 09:58'),
('br-2', 'bd-2', '成功', 'CRON 全量 38 表 · 耗时 3m12s',    '2026-10-03 03:00'),
('br-3', 'bd-3', '失败', 'mes_prod CDC 断连 · 等待重试',     '2026-10-02 18:44');

INSERT INTO onto_candidates (id, source, suggestion, kind, evidence, status, by, at) VALUES
('oc-1', '知识条目「来料检验规范」', '来料检验记录', '对象', 'SOP 中高频名词 ×12 · 已有数据表 iln_inspect（未入本体）', '待裁决', '', ''),
('oc-2', '同义词组「物料/料号」',    '物料编码',     '属性', '标准词与两处源表字段名一致',                             '待裁决', '', ''),
('oc-3', '知识条目「供应商准入流程」', 'QUALIFIES',  '关系', '流程图 4 节点均连接 供应商↔准入评估',                    '已丢弃', '张三', '2026-09-30 11:02');

INSERT INTO entity_alignments (id, left_term, right_term, source_a, source_b, strategy, score, status, by, at) VALUES
('ea-1', '启明 X7 加速卡',     '启明 X7 推理加速卡',   'SRM 供应商主数据', 'KB 资产台账', '包含召回', 48, '待裁决', '', ''),
('ea-2', '华南仓',             '华南中心仓',           'WMS 仓库主数据',   'MES 工厂档案', '别名召回', 52, '待裁决', '', ''),
('ea-3', '王氏精密',           '王氏精密制造（东莞）', 'SRM 供应商主数据', '工商信息 API', '包含召回', 44, '待裁决', '', '');

-- ─── 组织架构与岗位字典（add-org-posts） ───

INSERT INTO org_units (id, parent_id, name, sort) VALUES
('org-pt',       '',           '平台部',     1),
('org-pt-data',  'org-pt',     '数据AI部',   1),
('org-pt-infra', 'org-pt',     '基础设施部', 2),
('org-sc',       '',           '供应链',     2),
('org-sc-pur',   'org-sc',     '采购部',     1),
('org-sc-plan',  'org-sc',     '计划部',     2),
('org-it',       '',           '信息技术中心', 3);

INSERT INTO posts (id, name, descr, sort) VALUES
('post-arch', '数据架构师',   '本体与数据资产架构', 1),
('post-biz',  '业务专家',     '业务知识与评审',     2),
('post-dev',  '数据开发工程师', '管道与视图开发',   3),
('post-int',  '系统集成工程师', '外部系统集成',     4),
('post-mgr',  '计划主管',     '供应链计划与行动',   5);

INSERT INTO parse_profiles (id, name, doc_type, chunk, extract, status, owner) VALUES
('pp-attach', '附件解析器',     'pdf / docx',      '按段落 512 token · 重叠 64', '实体候选（供应商/物料/工厂）· 关系候选（供应/生产）', '启用', '张三'),
('pp-route',  '分级模型路由',   'drawio / png 图片', '整图 OCR · 版面分析',        '流程节点 → 状态机候选 · 连线 → 关系候选',          '启用', '王五');

COMMIT;
