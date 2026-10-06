// 全局共享 mock 数据：供应链「订单交付风险」场景。
// 所有页面从这里取数据，保证跨屏实体名/数字/状态一致（对齐 PRD 运行案例）。

export const USER = { name: '张三', role: '数据架构师' };

/** 本体（顶栏「当前本体」的数据源）：由本体管理员在「本体管理」中创建/初始化/授权 */
export type OntoRole = '所有者' | '建模者' | '评审者' | '查看者';
export interface Ontology {
  id: string; name: string; scene: string; version: string;
  status: 'DRAFT' | 'PUBLISHED'; owner: string; members: number;
  objects: number; edges: number; created: string; myRole: OntoRole;
}
export const ONTOLOGIES: Ontology[] = [
  { id: 'scm', name: '供应链本体', scene: '订单交付风险场景', version: 'v0.4', status: 'DRAFT', owner: '张三', members: 6, objects: 7, edges: 4, created: '2026-08-12', myRole: '建模者' },
  { id: 'quality', name: '质量追溯本体', scene: '来料-制程-出货追溯', version: 'v1.0', status: 'PUBLISHED', owner: '王五', members: 9, objects: 12, edges: 9, created: '2026-05-20', myRole: '查看者' },
  { id: 'equipment', name: '设备运维本体', scene: '设备故障预测与派单', version: 'v0.1', status: 'DRAFT', owner: '赵六', members: 3, objects: 2, edges: 1, created: '2026-09-28', myRole: '所有者' },
];
/** 角色权限矩阵：查看 / 编辑草稿 / 提交评审 / 发布 / 成员管理 */
export const ROLE_MATRIX: { cap: string; roles: Record<OntoRole, boolean> }[] = [
  { cap: '检索与查看元素（含无引用权限元素）', roles: { 所有者: true, 建模者: true, 评审者: true, 查看者: true } },
  { cap: '引用元素到画布（仅 PUBLISHED 且有引用权限）', roles: { 所有者: true, 建模者: true, 评审者: false, 查看者: false } },
  { cap: '编辑草稿（对象/关系/函数）', roles: { 所有者: true, 建模者: true, 评审者: false, 查看者: false } },
  { cap: '提交评审', roles: { 所有者: true, 建模者: true, 评审者: false, 查看者: false } },
  { cap: '评审通过 / 驳回', roles: { 所有者: true, 建模者: false, 评审者: true, 查看者: false } },
  { cap: '发布版本', roles: { 所有者: true, 建模者: false, 评审者: false, 查看者: false } },
  { cap: '成员与授权管理', roles: { 所有者: true, 建模者: false, 评审者: false, 查看者: false } },
];

/** 角色能力判定：权限矩阵不在界面展示，逻辑统一从这里取（cap 用矩阵中的能力名前缀） */
export const can = (role: OntoRole, cap: string): boolean =>
  ROLE_MATRIX.find(m => m.cap.startsWith(cap))?.roles[role] ?? false;

export interface Datasource {
  id: string; name: string; type: string; kind: '结构化' | '非结构化';
  host?: string; status: '正常' | '异常' | '停用'; mode: 'NONE' | 'CRON' | 'CDC' | 'EVENT';
  tables?: number; sensitive: 'L1' | 'L2' | 'L3' | 'L4'; owner: string; lastSync: string;
}

export const DATASOURCES: Datasource[] = [
  { id: 'ds-001', name: 'scm_prod', type: 'MySQL', kind: '结构化', host: 'mysql://192.0.2.3:3306/scm_prod', status: '正常', mode: 'CRON', tables: 142, sensitive: 'L2', owner: '张三', lastSync: '2026-10-03 02:00' },
  { id: 'ds-002', name: 'srm', type: 'PostgreSQL', kind: '结构化', host: 'pg://192.0.2.4:5432/srm', status: '正常', mode: 'CDC', tables: 38, sensitive: 'L3', owner: '王五', lastSync: '2026-10-03 09:58' },
  { id: 'ds-003', name: 'mes_prod', type: 'SQLServer', kind: '结构化', host: 'mssql://192.0.2.8:1433/mes_prod', status: '异常', mode: 'CDC', tables: 96, sensitive: 'L2', owner: '孙七', lastSync: '2026-10-03 08:12' },
  { id: 'ds-004', name: 'kb_supply_chain', type: '飞书知识库', kind: '非结构化', status: '正常', mode: 'EVENT', sensitive: 'L2', owner: '张三', lastSync: '2026-10-03 09:45' },
  { id: 'ds-005', name: 'erp_oracle', type: 'Oracle', kind: '结构化', host: 'oracle://192.0.2.2:1521/ERP', status: '正常', mode: 'CRON', tables: 210, sensitive: 'L3', owner: '赵六', lastSync: '2026-10-02 23:00' },
  { id: 'ds-006', name: 'wms_clickhouse', type: 'ClickHouse', kind: '结构化', host: 'ck://192.0.2.6:9000/wms', status: '停用', mode: 'NONE', tables: 24, sensitive: 'L1', owner: '张三', lastSync: '2026-09-20 02:00' },
];

export interface FieldProfile {
  name: string; type: string; nullRate: string; sample: string; comment: string; aiFilled?: boolean;
}

export const PO_FIELDS: FieldProfile[] = [
  { name: 'po_id', type: 'varchar(32)', nullRate: '0%', sample: 'PO20260930001', comment: '采购订单号' },
  { name: 'supplier_id', type: 'varchar(16)', nullRate: '0%', sample: 'S-0012', comment: '供应商编码' },
  { name: 'plant_id', type: 'varchar(8)', nullRate: '0%', sample: 'RCBJ-YK', comment: '工厂代码' },
  { name: 'material_id', type: 'varchar(20)', nullRate: '0.1%', sample: 'M-100233', comment: '物料编码' },
  { name: 'status', type: 'tinyint', nullRate: '0%', sample: '3（已下达→已发货→已收货）', comment: '订单状态' },
  { name: 'amount', type: 'decimal(14,2)', nullRate: '0.2%', sample: '58,200.00 CNY', comment: '订单金额(元)' },
  { name: 'order_dt', type: 'datetime', nullRate: '0%', sample: '2026-09-30 10:21', comment: '下单时间' },
  { name: 'promise_dt', type: 'datetime', nullRate: '1.1%', sample: '2026-10-15 00:00', comment: '承诺交期' },
  { name: 'updated_at', type: 'datetime', nullRate: '0%', sample: '2026-10-02 18:44', comment: '更新时间' },
  { name: 'buyer', type: 'varchar(16)', nullRate: '3.4%', sample: 'B-038', comment: '', aiFilled: true },
];

export const PO_TABLE = {
  name: 'purchase_order', comment: '采购订单', rows: '2,140,331', fields: 18,
  pk: 'po_id', fks: ['supplier_id→supplier', 'plant_id→plant', 'material_id→material'],
  siblings: ['supplier（供应商）', 'material（物料）', 'po_line（订单行）'],
};

export interface LogicalView {
  id: string; name: string; kind: 'LOGICAL' | 'MATERIALIZED'; version: string;
  status: 'DRAFT' | 'PUBLISHED' | 'DEPRECATED'; domain: string; sensitive: string;
  upstream: string[]; boundBy: string[]; owner: string; refresh?: string;
}

export const VIEWS: LogicalView[] = [
  { id: 'v1', name: 'lv_order_delivery', kind: 'LOGICAL', version: 'v3', status: 'PUBLISHED', domain: '供应链', sensitive: 'L3', upstream: ['purchase_order(scm_prod)', 'supplier(srm)'], boundBy: ['对象[采购订单].supplier_name 等 3 处', '语义查询 2 处'], owner: '张三' },
  { id: 'v2', name: 'lv_supplier_ontime', kind: 'MATERIALIZED', version: 'v1', status: 'PUBLISHED', domain: '供应链', sensitive: 'L2', upstream: ['supplier(srm)', 'purchase_order(scm_prod)'], boundBy: ['指标[供应商准时率]'], owner: '王五', refresh: 'CRON 0 3 * * *' },
  { id: 'v3', name: 'lv_inventory_kit', kind: 'LOGICAL', version: 'v2', status: 'DRAFT', domain: '供应链', sensitive: 'L2', upstream: ['inventory(mes_prod)', 'bom(mes_prod)'], boundBy: [], owner: '孙七' },
];

export type ObjKind = '静态事实' | '单体动态' | '立方动态';
export interface OntoObject {
  id: string; name: string; en: string; kind: ObjKind; version: string;
  status: 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED' | 'DEPRECATED';
  refCount: number; owner: string; stateMachine?: string[];
}
export interface OntoEdge {
  id: string; name: string; from: string; to: string; props: { name: string; type: string; comment: string; temporal?: string; agg?: string }[];
  version: string; status: 'DRAFT' | 'PUBLISHED'; refCount: number; perm?: 'use' | 'view';
}
export interface OntoFunc {
  id: string; name: string; cat: '指标' | '派生' | '行动' | '权限'; version: string;
  status: 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED'; tests: string; calls7d?: string; signature?: string; impl?: string; perm?: 'use' | 'view';
}

export const OBJECTS: OntoObject[] = [
  { id: 'o1', name: '供应商', en: 'Supplier', kind: '静态事实', version: 'v2.1', status: 'PUBLISHED', refCount: 14, owner: '张三' },
  { id: 'o2', name: '工厂', en: 'Plant', kind: '静态事实', version: 'v1.4', status: 'PUBLISHED', refCount: 11, owner: '张三' },
  { id: 'o3', name: '物料', en: 'Material', kind: '静态事实', version: 'v1.2', status: 'PUBLISHED', refCount: 9, owner: '王五' },
  { id: 'o4', name: '采购订单', en: 'PO', kind: '单体动态', version: 'v0.4', status: 'DRAFT', refCount: 9, owner: '张三', stateMachine: ['草稿', '已下达', '已发货', '已收货', '已关闭'] },
  { id: 'o5', name: '生产工单', en: 'WO', kind: '单体动态', version: 'v1.0', status: 'PUBLISHED', refCount: 6, owner: '孙七', stateMachine: ['待排产', '生产中', '已完工'] },
  { id: 'o6', name: '设备', en: 'Equipment', kind: '立方动态', version: 'v0.2', status: 'IN_REVIEW', refCount: 3, owner: '赵六' },
  { id: 'o7', name: '准入评估', en: 'QualAssessment', kind: '单体动态', version: 'v0.2', status: 'PUBLISHED', refCount: 4, owner: '王五' },
];

export const EDGES: OntoEdge[] = [
  { id: 'e1', name: 'SUPPLY（供应）', from: '供应商', to: '工厂', version: 'v1.0', status: 'PUBLISHED', refCount: 11,
    props: [
      { name: 'qty', type: 'decimal', comment: '供货量', temporal: '月度', agg: 'SUM' },
      { name: 'delay', type: 'int', comment: '时延(天)', temporal: '月度', agg: 'AVG' },
      { name: 'cost', type: 'decimal', comment: '单位成本', temporal: '月度', agg: 'AVG' },
    ] },
  { id: 'e2', name: 'QUALIFIES（准入）', from: '供应商', to: '准入评估', version: 'v0.2', status: 'PUBLISHED', refCount: 4, props: [{ name: 'score', type: 'decimal', comment: '准入评分' }] },
  { id: 'e3', name: 'FULFILLS（履约）', from: '准入评估', to: '采购订单', version: 'v0.1', status: 'DRAFT', refCount: 2, props: [] },
  { id: 'e4', name: 'PRODUCES（生产）', from: '工厂', to: '生产工单', version: 'v1.0', status: 'PUBLISHED', refCount: 5, props: [{ name: 'yield_rate', type: 'decimal', comment: '良率' }] },
  { id: 'e5', name: 'SETTLES（结算）', from: '采购订单', to: '成本中心', version: 'v2.0', status: 'PUBLISHED', refCount: 9, props: [{ name: 'settle_amt', type: 'decimal', comment: '结算金额' }], perm: 'view' as const },
];

export const FUNCS: OntoFunc[] = [
  { id: 'f1', name: '逾期订单数', cat: '指标', version: 'v1.1', status: 'PUBLISHED', tests: '5/5 ✓', calls7d: '12,401', signature: '() → int', impl: "count(po where promise_dt < now() and status != '已收货')" },
  { id: 'f2', name: '交付风险分', cat: '派生', version: 'v0.2', status: 'IN_REVIEW', tests: '8/8 ✓', signature: '(po: 采购订单) → score: decimal(0-100)', impl: '0.5*norm(SUPPLY.delay趋势) + 0.3*(1-齐套率) + 0.2*(1-在途覆盖)' },
  { id: 'f3', name: '冻结订单', cat: '行动', version: 'v1.2', status: 'PUBLISHED', tests: '6/6 ✓', signature: '(po: 采购订单) → receipt', impl: '条件: 风险分>80 │ 权限: 计划主管 │ 二次确认 │ 回滚: 解冻订单' },
  { id: 'f4', name: '金额可见性', cat: '权限', version: 'v1.0', status: 'PUBLISHED', tests: '3/3 ✓', signature: '(user, po) → bool', impl: '范围: 采购域 + 财务' },
  { id: 'f5', name: '成本归集', cat: '指标', version: 'v2.3', status: 'PUBLISHED', tests: '7/7 ✓', signature: '(cc: 成本中心) → decimal', impl: 'sum(settle_amt by 成本中心, 月度)', perm: 'view' as const },
];

export const INSTANCE_PO = {
  id: 'PO20260930001', type: '采购订单', status: '已发货', supplier: 'S-0012 华兴电子',
  plant: 'RCBJ-YK', material: 'M-100233 电容 0402', amount: '58,200.00 CNY',
  orderDt: '2026-09-30 10:21', promiseDt: '2026-10-15 00:00', riskScore: 76,
  timeline: [
    { t: '2026-09-30 10:21', e: '订单创建（草稿）' }, { t: '2026-09-30 14:02', e: '已下达 → 供应商确认' },
    { t: '2026-10-01 09:10', e: '已发货 · 物流单 SF880123' }, { t: '2026-10-02 18:44', e: '传播引擎：交付风险分 71→76（SUPPLY.delay 上升）' },
  ],
};

export const RULES = [
  { id: 'R1', def: 'SUPPLY.delay 月均值变化>20% → 采购订单.交付风险分 重算', kind: 'V→E', status: '运行中', fired: 412 },
  { id: 'R2', def: '采购订单.状态→已收货 → 供应商.准时率 更新', kind: 'V→V', status: '运行中', fired: 986 },
  { id: 'R3', def: '设备.故障状态=是 → 关联工单.优先级 +1', kind: 'E→V', status: '运行中', fired: 21 },
  { id: 'R4', def: '齐套率<80% → SUPPLY 边标记「风险」', kind: 'E→E', status: '运行中', fired: 423 },
];

export const REVIEWS = [
  { id: 'RV-2026-1002-003', title: '供应链本体 v0.4：+交付风险分函数', type: '本体发布', from: '张三', status: '评审中', sla: '剩 1 天' },
  { id: 'RV-2026-1002-001', title: '术语归并：供应商 ≈ 供货商 ≈ Vendor', type: '术语归并', from: '王五', status: '待评审', sla: '剩 2 天' },
  { id: 'RV-2026-1001-007', title: '概念锚「客户」口径冲突裁决', type: '冲突裁决', from: '系统', status: '待评审', sla: '剩 4 小时' },
  { id: 'RV-2026-0930-002', title: '规则补丁：R7 阈值 0.7→0.8', type: '自进化补丁', from: '系统', status: '已通过', sla: '-' },
];

export const CAPABILITIES = [
  { id: 'c1', name: 'get_object', desc: '获取对象实例最小上下文切片', proto: 'MCP/REST/CLI', calls: '8,412', owner: '平台组' },
  { id: 'c2', name: 'semantic_query', desc: '自然语言 → DSL → 执行', proto: 'MCP/REST/CLI', calls: '12,401', owner: '平台组' },
  { id: 'c3', name: 'run_action', desc: '执行 Action（dry-run + 确认令牌）', proto: 'MCP/REST/CLI', calls: '231', owner: '平台组' },
  { id: 'c4', name: 'supplier_risk_agent', desc: '供应商风险智能体（消费方）', proto: 'MCP', calls: '1,204', owner: 'AI 组' },
];

export const TODOS = [
  { id: 't1', text: '字段备注缺失 ×13（scm_prod）', action: 'AI 补全', level: 'warn' },
  { id: 't2', text: '视图 lv_order_delivery 上游 schema 变更', action: '影响确认', level: 'error' },
  { id: 't3', text: '同义词条「供应商 / 供货商」待归并', action: '去处理', level: 'warn' },
  { id: 't4', text: 'mes_prod CDC 断连 1 次（已自动恢复）', action: '查看', level: 'info' },
];

export const GATE_ITEMS = [
  { name: 'Lint 检查', result: 'pass', detail: '0 错误 / 3 警告（命名建议）' },
  { name: '函数测试', result: 'pass', detail: '全部全绿（8/8 · 5/5 · 6/6）' },
  { name: '破坏性变更', result: 'pass', detail: '0（新增对象×1 · 函数×1，无引用方受影响）' },
  { name: '沙盘验证', result: 'warn', detail: '交付风险分 v0.2 未回归 → 一键送沙盘' },
  { name: '权限/敏感级继承', result: 'pass', detail: '新增元素已继承策略' },
];

export const SANDBOX_BRANCHES = [
  { id: 'b1', name: '分支 A · 基准',假设: '不干预', risk: 76, cost: '—', note: '当前生产口径' },
  { id: 'b2', name: '分支 B · 切换备选供应商', 假设: 'S-0012 → S-0031（delay -4 天）', risk: 52, cost: '+2.1%', note: '推荐' },
  { id: 'b3', name: '分支 C · 提前下单 7 天', 假设: 'order_dt -7d', risk: 61, cost: '库存占用 +¥1.2M', note: '' },
] as { id: string; name: string; 假设: string; risk: number; cost: string; note: string }[];

export const VERSIONS = [
  { v: 'v0.1', date: '08-12', desc: '最小可行本体（4对象+3关系+2Action）', status: 'PUBLISHED' },
  { v: 'v0.2', date: '08-29', desc: '+准入评估对象 +QUALIFIES 关系', status: 'PUBLISHED' },
  { v: 'v0.3', date: '09-15', desc: '+传播规则×4', status: 'PUBLISHED（生产中）' },
  { v: 'v0.4', date: '10-01', desc: '+交付风险分函数（评审中）', status: 'DRAFT' },
];

/** 注册中心对象：含所属本体、共享性、属性与数据映射（注册中心 = 本体元素事实源）
 *  perm: 'use' 可引用到画布；'view' 仅可见（可检索防重复创建，不可引用，需申请权限） */
export interface RegistryObject extends OntoObject {
  ontology: string; shared: boolean; mapping: string; perm: 'use' | 'view';
  props: { name: string; type: string; comment: string }[];
}
const P = (name: string, type: string, comment: string) => ({ name, type, comment });
export const REGISTRY_OBJECTS: RegistryObject[] = [
  { ...OBJECTS[0], ontology: '供应链本体', shared: true, perm: 'use' as const, mapping: 'lv_supplier（逻辑视图）', props: [P('supplier_id', 'string', '供应商编码'), P('name', 'string', '供应商名称'), P('ontime_rate', 'decimal', '准时交付率'), P('level', 'string', '分级 A/B/C')] },
  { ...OBJECTS[1], ontology: '供应链本体', shared: true, perm: 'use' as const, mapping: 'lv_plant（逻辑视图）', props: [P('plant_code', 'string', '工厂代码'), P('name', 'string', '工厂名称'), P('region', 'string', '所属区域')] },
  { ...OBJECTS[2], ontology: '供应链本体', shared: true, perm: 'use' as const, mapping: 'ods_material（物理表）', props: [P('material_id', 'string', '物料编码'), P('category', 'string', '物料分类'), P('uom', 'string', '基本单位')] },
  { ...OBJECTS[3], ontology: '供应链本体', shared: true, perm: 'use' as const, mapping: 'lv_order_delivery（逻辑视图）', props: [P('po_no', 'string', '采购订单号'), P('amount', 'decimal', '订单金额'), P('promise_dt', 'datetime', '承诺交期'), P('status', 'enum', '订单状态（状态机）')] },
  { ...OBJECTS[4], ontology: '供应链本体', shared: true, perm: 'use' as const, mapping: 'ods_work_order（物理表）', props: [P('wo_no', 'string', '工单号'), P('qty', 'int', '生产数量'), P('priority', 'int', '优先级')] },
  { ...OBJECTS[5], ontology: '供应链本体', shared: true, perm: 'use' as const, mapping: 'lv_equipment_rt（实时视图）', props: [P('equip_id', 'string', '设备编号'), P('fault', 'bool', '故障状态'), P('oee', 'decimal', '综合效率')] },
  { ...OBJECTS[6], ontology: '供应链本体', shared: true, perm: 'use' as const, mapping: 'ods_qual_assessment（物理表）', props: [P('assess_id', 'string', '评估单号'), P('score', 'decimal', '准入评分'), P('conclusion', 'enum', '结论')] },
  { id: 'o8', name: '客户', en: 'Customer', kind: '静态事实', version: 'v3.0', status: 'PUBLISHED', refCount: 21, owner: '王五', ontology: '供应链本体', shared: true, perm: 'use' as const, mapping: 'lv_customer（逻辑视图）', props: [P('cust_id', 'string', '客户编码'), P('name', 'string', '客户名称'), P('channel', 'string', '销售渠道')] },
  { id: 'o9', name: '仓库', en: 'Warehouse', kind: '静态事实', version: 'v1.1', status: 'PUBLISHED', refCount: 8, owner: '孙七', ontology: '供应链本体', shared: true, perm: 'use' as const, mapping: 'ods_warehouse（物理表）', props: [P('wh_code', 'string', '仓库代码'), P('capacity', 'int', '容量')] },
  { id: 'o10', name: '物流单', en: 'Shipment', kind: '单体动态', version: 'v0.3', status: 'IN_REVIEW', refCount: 5, owner: '赵六', ontology: '供应链本体', shared: true, perm: 'use' as const, mapping: 'ods_shipment（物理表）', props: [P('ship_no', 'string', '物流单号'), P('carrier', 'string', '承运商'), P('eta', 'datetime', '预计到达')] },
  { id: 'o11', name: '成本中心', en: 'CostCenter', kind: '静态事实', version: 'v2.0', status: 'PUBLISHED', refCount: 17, owner: '财务域', ontology: '财务本体', shared: false, perm: 'view' as const, mapping: 'fin_cc（财务库表）', props: [P('cc_code', 'string', '成本中心代码'), P('budget', 'decimal', '年度预算')] },
];
const rcCnt = (onto: string, kind?: ObjKind) => REGISTRY_OBJECTS.filter(o => o.ontology === onto && (!kind || o.kind === kind)).length;
const KINDS_ALL: ObjKind[] = ['静态事实', '单体动态', '立方动态'];
export const REGISTRY_TREE = [
  { title: `供应链本体（当前域）`, key: 'scm', children: KINDS_ALL.map(k => ({ title: `${k} (${rcCnt('供应链本体', k)})`, key: `scm|${k}` })) },
  { title: `财务本体（跨本体）`, key: 'fin', children: KINDS_ALL.map(k => ({ title: `${k} (${rcCnt('财务本体', k)})`, key: `fin|${k}` })) },
];
/** 注册中心统一过滤：树节点 + 关键字 + 类型 + 状态 */
export function filterRegistry(list: RegistryObject[], q: { treeKey?: string; kw?: string; kind?: string; status?: string }) {
  const [onto, tKind] = (q.treeKey && q.treeKey !== 'all' ? q.treeKey : '|').split('|');
  const ontoName = onto === 'scm' ? '供应链本体' : onto === 'fin' ? '财务本体' : '';
  return list.filter(o =>
    (!ontoName || o.ontology === ontoName) &&
    (!tKind || o.kind === tKind) &&
    (!q.kind || q.kind === 'all' || o.kind === q.kind) &&
    (!q.status || q.status === 'all' || o.status === q.status || (q.status === 'PRIVATE' && !o.shared)) &&
    (!q.kw || o.name.includes(q.kw) || o.en.toLowerCase().includes(q.kw.toLowerCase())));
}

/** 站内通知：待办处理 / 治理任务 / 协同分享 */
export const NOTIFICATIONS = [
  { id: 'n1', cat: '待办处理', title: '本体发布评审待处理：供应链本体 v0.4（+交付风险分函数）', time: '10 分钟前', to: '/governance/release?tab=review', unread: true },
  { id: 'n2', cat: '待办处理', title: '术语归并「供应商 ≈ 供货商」待你裁决', time: '1 小时前', to: '/knowledge/governance?tab=synonym', unread: true },
  { id: 'n3', cat: '治理任务', title: 'K3 知识临期：3 条知识将在 7 天内到期', time: '今天 08:30', to: '/knowledge/governance', unread: true },
  { id: 'n4', cat: '治理任务', title: '映射断链：lv_order_delivery 上游 schema 变更，需影响确认', time: '昨天 18:02', to: '/assets/processing?tab=pipeline', unread: false },
  { id: 'n5', cat: '协同分享', title: '王五 分享了画布「订单交付风险 v0.4」给你', time: '昨天 15:40', to: '/modeling/designer', unread: false },
  { id: 'n6', cat: '协同分享', title: '赵六 邀请你加入「设备运维本体」评审组', time: '2 天前', to: '/modeling/ontology/detail?onto=equipment&sec=members', unread: false },
];

export const fmtStatus = (s: string) =>
  ({ 正常: 'green', 异常: 'red', 停用: 'default', PUBLISHED: 'green', DRAFT: 'default', IN_REVIEW: 'orange', DEPRECATED: 'red', 运行中: 'green', 评审中: 'orange', 待评审: 'blue', 已通过: 'green' } as Record<string, string>)[s] ?? 'default';
