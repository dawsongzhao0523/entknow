-- entKnow demo 数据（= 原型 mock，已脱敏）。TRUNCATE + INSERT，可重复执行。
BEGIN;

TRUNCATE users, ontologies, memberships, objects, edges, functions, views,
         datasources, rules, reviews, notifications, capabilities, versions, table_profiles,
         kb_domains, kb_entries, synonyms, instances, instance_events, rule_firings, actions;

INSERT INTO users (id, account, name, dept, post, roles, status, last_login) VALUES
('u1', 'zhangsan', '张三', '平台部 / 数据AI部', '数据架构师', ARRAY['本体管理员','数据开发'], '正常', '2026-10-03 09:12'),
('u2', 'wangwu',   '王五', '供应链 / 采购部',   '业务专家',     ARRAY['评审员'],              '正常', '2026-10-03 08:47'),
('u3', 'sunqi',    '孙七', '平台部 / 数据AI部', '数据开发工程师', ARRAY['数据开发'],           '正常', '2026-10-02 19:31'),
('u4', 'zhaoliu',  '赵六', '信息技术中心',     '系统集成工程师', ARRAY['系统集成'],           '正常', '2026-10-02 17:05');

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

INSERT INTO notifications (id, cat, title, time, to_path, unread) VALUES
('n1', '待办处理', '本体发布评审待处理：供应链本体 v0.4（+交付风险分函数）', '10 分钟前', '/m8/release?tab=review', true),
('n2', '待办处理', '术语归并「供应商 ≈ 供货商」待你裁决',                 '1 小时前',  '/m2/governance?tab=synonym', true),
('n3', '治理任务', 'K3 知识临期：3 条知识将在 7 天内到期',               '今天 08:30','/m2/governance', true),
('n4', '治理任务', '映射断链：lv_order_delivery 上游 schema 变更，需影响确认', '昨天 18:02', '/m1/processing?tab=pipeline', false),
('n5', '协同分享', '王五 分享了画布「订单交付风险 v0.4」给你',           '昨天 15:40', '/m3/designer', false),
('n6', '协同分享', '赵六 邀请你加入「设备运维本体」评审组',             '2 天前',     '/m3/ontology/detail?onto=equipment&sec=members', false);

INSERT INTO capabilities (id, name, description, proto, calls, owner) VALUES
('c1', 'get_object',           '获取对象实例最小上下文切片',         'MCP/REST/CLI', '8,412', '平台组'),
('c2', 'semantic_query',       '自然语言 → DSL → 执行',              'MCP/REST/CLI', '12,401', '平台组'),
('c3', 'run_action',           '执行 Action（dry-run + 确认令牌）',  'MCP/REST/CLI', '231',   '平台组'),
('c4', 'supplier_risk_agent',  '供应商风险智能体（消费方）',         'MCP',          '1,204', 'AI 组');

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
('m1', ARRAY['物料','料号','Material'], '物料', '已归并', '张三', '2026-09-28'),
('s1', ARRAY['供应商','供货商','Vendor'], '', '待归并', '', ''),
('s2', ARRAY['客户','顾客','Customer'], '', '待归并', '', ''),
('s3', ARRAY['准时率','及时率','OnTimeRate'], '', '待归并', '', '');

INSERT INTO instances (id, object_id, status, props, risk_score, order_dt, promise_dt) VALUES
('PO20260930001', 'o4', '已发货',
 '{"type":"采购订单","supplier":"S-0012 华兴电子","plant":"RCBJ-YK","material":"M-100233 电容 0402","amount":"58,200.00 CNY"}',
 76, '2026-09-30 10:21', '2026-10-15 00:00'),
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

COMMIT;
