-- entKnow demo 数据（= 原型 mock，已脱敏）。TRUNCATE + INSERT，可重复执行。
BEGIN;

TRUNCATE users, ontologies, memberships, objects, edges, functions, views,
         datasources, rules, reviews, notifications, capabilities, versions, table_profiles;

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

INSERT INTO reviews (id, title, type, from_user, status, sla) VALUES
('RV-2026-1002-003', '供应链本体 v0.4：+交付风险分函数',            '本体发布',   '张三', '评审中', '剩 1 天'),
('RV-2026-1002-001', '术语归并：供应商 ≈ 供货商 ≈ Vendor',         '术语归并',   '王五', '待评审', '剩 2 天'),
('RV-2026-1001-007', '概念锚「客户」口径冲突裁决',                 '冲突裁决',   '系统', '待评审', '剩 4 小时'),
('RV-2026-0930-002', '规则补丁：R7 阈值 0.7→0.8',                 '自进化补丁', '系统', '已通过', '-');

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
