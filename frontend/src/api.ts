// 统一 API 客户端：类型与 backend/internal/store 的 JSON 输出一一对应（camelCase）。
// 开发态经 vite proxy 转发到 http://localhost:28080；生产态同源部署。

export interface Ontology {
  id: string; name: string; scene: string; version: string;
  status: string; owner: string; members: number; objects: number;
  edges: number; created: string; myRole: string;
}

export interface Prop { name: string; type: string; comment: string; temporal?: string; agg?: string }

export interface OntoObject {
  id: string; name: string; en: string; kind: string; version: string; status: string;
  refCount: number; owner: string; stateMachine?: string[]; ontology: string;
  shared: boolean; perm?: string; mapping?: string; props?: Prop[];
}

export interface Edge {
  id: string; name: string; from: string; to: string; version: string;
  status: string; refCount: number; props: Prop[]; perm?: string;
}

export interface Func {
  id: string; name: string; cat: string; version: string; status: string;
  tests: string; calls7d?: string; signature?: string; impl?: string; perm?: string;
}

export interface Datasource {
  id: string; name: string; type: string; kind: string; host?: string; status: string;
  mode: string; tables?: number; sensitive: string; owner: string; lastSync: string;
}

export interface LogicalView {
  id: string; name: string; kind: string; version: string; status: string;
  domain: string; sensitive: string; upstream: string[]; boundBy: string[];
  owner: string; refresh?: string;
}

export interface PipelineTask {
  id: string; name: string; type: string; source?: string; target?: string;
  schedule?: string; status: string; lastRun?: string;
}

export interface PipelineRun { id: string; taskId: string; status: string; detail: string; at: string }

export interface SandboxBranch {
  id: string; name: string; hypothesis: string; baseInstance?: string;
  riskBefore: number; riskAfter?: number | null; cost?: string; note?: string;
  status: string; by?: string; at?: string;
}

export interface Review {
  id: string; title: string; type: string; from: string; status: string; sla: string;
  decidedBy?: string; decidedAt?: string; comment?: string;
}

export interface Notification { id: string; cat: string; title: string; time: string; to: string; unread: boolean }

export interface Version { id: number; v: string; date: string; desc: string; status: string }

export interface KbTerm { term: string; en: string; def: string; source: string }

export interface KbEntry {
  id: string; domainId: string; title: string; status: string; source: string;
  onto?: string; dataRef?: string; flow?: string; roles: string[]; mode?: string;
  terms: KbTerm[]; sops: string[]; version?: number; updatedBy?: string; updatedAt?: string;
  expectedVersion?: number;
}

export interface KbDomain { id: string; name: string; parentId: string; entryCount: number }

export interface Synonym { id: string; terms: string[]; standard: string; status: string; by?: string; at?: string }

export interface InstanceEvent { t: string; e: string }

export interface Instance {
  id: string; objectId: string; status: string; props: Record<string, string>;
  riskScore: number; orderDt?: string; promiseDt?: string; timeline?: InstanceEvent[];
}

export interface RuleFiring { id: string; ruleId: string; instanceId?: string; detail: string; firedAt?: string }

export interface Rule { id: string; def: string; kind: string; status: string; fired: number }

export interface Action {
  id: string; funcId: string; instanceId: string; user: string; trigger: string;
  status: string; detail?: string; time: string;
}

export interface Role { id: string; name: string; desc?: string; perms: string[]; builtIn: boolean }

export interface Capability {
  id: string; name: string; desc: string; proto: string; calls: string; owner: string;
  callsTotal: number; realCalls: number;
}

export interface CapabilityCall {
  id: string; capabilityId: string; caller: string; status: string;
  latencyMs: number; calledAt: string;
}

export interface SearchResultItem { label: string; sub?: string }

export interface SearchResults {
  objects: SearchResultItem[] | null; knowledge: SearchResultItem[] | null;
  instances: SearchResultItem[] | null; synonyms: SearchResultItem[] | null;
}

export interface QueryRecord {
  id: string; question: string; dsl: string; hits: number;
  latencyMs: number; by: string; at: string;
}

export interface ExecutedQuery extends QueryRecord { results: SearchResults }

export interface User {
  id: string; account: string; name: string; dept: string; post: string;
  roles: string[]; status: string; lastLogin: string;
}

// ─── 系统管理 ───

export interface MenuNode {
  id: string; parentId: string; name: string; route: string; icon: string;
  sort: number; visible: boolean; children?: MenuNode[];
}

export interface DataRule {
  id: string; target: string; rule: string; role: string;
  effect: string; updatedBy: string; updatedAt: string;
}

export interface SensRow {
  asset: string; upstream: string[]; levels: string[];
  inherited: string; stored: string; note: string; by: string;
}

export interface DepService {
  id: string; name: string; descr: string; kind: string; target: string;
  status: string; latencyMs: number; checkedAt: string;
}

export interface UptimePoint { serviceId: string; day: string; uptime: number }

export interface AuditLog {
  id: number; at: string; module: string; level: string;
  operator: string; content: string; traceId: string;
}

export interface AuditPage { total: number; items: AuditLog[] }

export interface SystemLog {
  id: number; at: string; level: string; component: string;
  content: string; traceId: string;
}

export interface SystemLogPage { total: number; items: SystemLog[] }

export interface StatsSnapshot {
  users: number; roles: number; ontos: number; ontoPublished: number; ontoDraft: number;
  objects: number; edges: number; instances: number;
  dsTotal: number; dsNormal: number; dsError: number;
  kbEntries: number; synonyms: number;
  capabilities: number; capabilityCalls: number; queries: number;
  reviews: number; reviewsPending: number;
  pipelineTasks: number; tasksFailed: number; auditToday: number;
  services: DepService[]; recentAlerts: { id: number; at: string; level: string; component: string; content: string; traceId: string }[];
}

/** 个性化设置（前端自有形状，整体存后端 user_settings.settings） */
export interface PrefSettings {
  theme?: 'light' | 'dark' | 'system';
  density?: 'compact' | 'default' | 'loose';
  monoFont?: boolean;
  landingPage?: string;
  defaultOnto?: string;
  notifyCats?: string[];
}

export interface FieldProfile { name: string; type: string; nullRate: string; sample: string; comment: string; aiFilled?: boolean }
export interface TableProfile {
  name: string; comment: string; rows: string; fields: number; pk: string;
  fks: string[]; siblings: string[]; profileFields: FieldProfile[];
}
export interface UserSetting { account: string; settings: PrefSettings }

// ─── 模块补齐 ───

export interface MarketItem {
  id: string; name: string; comment: string; type: string; source: string;
  domain: string; sensitive: string; owner: string; freq: string;
  status: string; subscribers: number;
}

export interface MarketRequest {
  id: string; itemId: string; itemName: string; applicant: string;
  reason: string; status: string; at: string;
}

export interface Binding {
  id: string; objectId: string; viewId: string; pkField: string;
  fieldMap: Record<string, string>; syncMode: string; status: string;
  lastSync: string; owner: string;
}

export interface BindingRun { id: string; bindingId: string; status: string; detail: string; at: string }

export interface OntoCandidate {
  id: string; source: string; suggestion: string; kind: string;
  evidence: string; status: string; by: string; at: string;
}

export interface EntityAlignment {
  id: string; leftTerm: string; rightTerm: string; sourceA: string; sourceB: string;
  strategy: string; score: number; status: string; by: string; at: string;
}

export interface Member { ontoId: string; userId: string; name: string; role: string }

export interface OrgUnit {
  id: string; parentId: string; name: string; sort: number;
  path?: string; children?: OrgUnit[];
}

export interface Post { id: string; name: string; descr: string; sort: number }

export interface GateCheck { key: string; name: string; passed: boolean; reason: string }

export interface ConsistencyIssue { level: string; key: string; detail: string }

export interface RunResult { ruleId: string; fired: number; instances: number; detail: string }

export interface RetractReport {
  versionId: number; ontoId: string; version: string;
  affectedObjects: number; affectedBindings: number; affectedViews: number;
}

export interface WorkbenchSnapshot {
  tasksRunning: number; tasksFailed: number; myAssets: number; pendingTodos: number;
  recentRuns: BindingRun[]; recentPipelines: PipelineRun[];
  recentQueries: { id: string; question: string; latencyMs: number; by: string; at: string }[];
  alerts: ConsistencyIssue[];
}


async function get<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path} → HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

/** 写请求（4xx 时抛出后端 error 文案，供页面直接展示） */
async function send<T>(path: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
  return data as T;
}

export const api = {
  ontologies: (user = 'zhangsan') => get<Ontology[]>(`/api/v1/ontologies?user=${user}`),
  objects: (scope?: 'canvas' | 'registry') =>
    get<OntoObject[]>(scope ? `/api/v1/objects?scope=${scope}` : '/api/v1/objects'),
  createObject: (o: OntoObject) => send<OntoObject>('/api/v1/objects', 'POST', o),
  edges: () => get<Edge[]>('/api/v1/edges'),
  functions: () => get<Func[]>('/api/v1/functions'),
  datasources: () => get<Datasource[]>('/api/v1/datasources'),
  createDatasource: (d: Datasource) => send<Datasource>('/api/v1/datasources', 'POST', d),
  updateDatasource: (id: string, d: Datasource) => send<Datasource>(`/api/v1/datasources/${id}`, 'PUT', d),
  viewsList: () => get<LogicalView[]>('/api/v1/views'),
  createView: (v: LogicalView) => send<LogicalView>('/api/v1/views', 'POST', v),
  updateView: (id: string, v: LogicalView) => send<LogicalView>(`/api/v1/views/${id}`, 'PUT', v),
  pipelineTasks: () => get<PipelineTask[]>('/api/v1/pipeline-tasks'),
  createPipelineTask: (p: PipelineTask) => send<PipelineTask>('/api/v1/pipeline-tasks', 'POST', p),
  setPipelineTaskStatus: (id: string, status: string) =>
    send<PipelineTask>(`/api/v1/pipeline-tasks/${id}/status`, 'PUT', { status }),
  runPipelineTask: (id: string, runID: string, detail?: string) =>
    send<{ task: PipelineTask; run: PipelineRun }>(`/api/v1/pipeline-tasks/${id}/run`, 'POST', { id: runID, detail }),
  pipelineRuns: (task = '') => get<PipelineRun[]>(`/api/v1/pipeline-runs?task=${task}`),
  sandboxBranches: () => get<SandboxBranch[]>('/api/v1/sandbox-branches'),
  createSandboxBranch: (b: SandboxBranch) => send<SandboxBranch>('/api/v1/sandbox-branches', 'POST', b),
  simulateBranch: (id: string, p: { riskAfter: number; cost?: string; note?: string; by: string }) =>
    send<SandboxBranch>(`/api/v1/sandbox-branches/${id}/simulate`, 'POST', p),
  rollbackBranch: (id: string, by: string) =>
    send<SandboxBranch>(`/api/v1/sandbox-branches/${id}/rollback`, 'POST', { by }),
  views: () => get<unknown[]>('/api/v1/views'),
  capabilities: () => get<Capability[]>('/api/v1/capabilities'),
  createCapability: (c: Capability) => send<Capability>('/api/v1/capabilities', 'POST', c),
  updateCapability: (id: string, c: Capability) => send<Capability>(`/api/v1/capabilities/${id}`, 'PUT', c),
  deleteCapability: (id: string) => send<null>(`/api/v1/capabilities/${id}`, 'DELETE'),
  invokeCapability: (id: string, p: { id: string; caller: string; status?: string; latencyMs?: number }) =>
    send<Capability>(`/api/v1/capabilities/${id}/invoke`, 'POST', p),
  capabilityCalls: (id: string) => get<CapabilityCall[]>(`/api/v1/capabilities/${id}/calls`),
  search: (q: string) => get<SearchResults>(`/api/v1/search?q=${encodeURIComponent(q)}`),
  executeQuery: (p: { id: string; question: string; by: string }) =>
    send<ExecutedQuery>('/api/v1/queries', 'POST', p),
  queries: (by = '') => get<QueryRecord[]>(`/api/v1/queries?by=${by}`),
  reviews: () => get<Review[]>('/api/v1/reviews'),
  createReview: (r: Pick<Review, 'id' | 'title' | 'type' | 'from'> & { sla?: string }) =>
    send<Review>('/api/v1/reviews', 'POST', r),
  decideReview: (id: string, action: 'approve' | 'reject' | 'withdraw', by: string, comment?: string, expectedStatus?: string) =>
    send<Review>(`/api/v1/reviews/${id}/decision`, 'PUT', { action, by, comment, expectedStatus }),
  notifications: () => get<Notification[]>('/api/v1/notifications'),
  versions: (onto = 'scm') => get<Version[]>(`/api/v1/versions?onto=${onto}`),
  kbDomains: () => get<KbDomain[]>('/api/v1/kb/domains'),
  kbEntries: (domain = '', kw = '') =>
    get<KbEntry[]>(`/api/v1/kb/entries?domain=${domain}&kw=${kw}`),
  kbEntry: (id: string) => get<KbEntry>(`/api/v1/kb/entries/${id}`),
  createKbEntry: (e: KbEntry) => send<KbEntry>('/api/v1/kb/entries', 'POST', e),
  updateKbEntry: (id: string, e: KbEntry) => send<KbEntry>(`/api/v1/kb/entries/${id}`, 'PUT', e),
  deleteKbEntry: (id: string) => send<KbEntry>(`/api/v1/kb/entries/${id}`, 'DELETE'),
  synonyms: (status = '') => get<Synonym[]>(`/api/v1/synonyms?status=${status}`),
  mergeSynonym: (id: string, standard: string, by: string) =>
    send<Synonym>(`/api/v1/synonyms/${id}/merge`, 'POST', { standard, by }),
  instances: (object = '', kw = '') =>
    get<Instance[]>(`/api/v1/instances?object=${object}&kw=${kw}`),
  instance: (id: string) => get<Instance>(`/api/v1/instances/${id}`),
  appendEvent: (id: string, t: string, e: string) =>
    send<Instance>(`/api/v1/instances/${id}/events`, 'POST', { t, e }),
  ruleFirings: (rule = '') => get<RuleFiring[]>(`/api/v1/rule-firings?rule=${rule}`),
  createRuleFiring: (f: Pick<RuleFiring, 'id' | 'ruleId' | 'detail'> & { instanceId?: string }) =>
    send<RuleFiring>('/api/v1/rule-firings', 'POST', f),
  rules: () => get<Rule[]>('/api/v1/rules'),
  actions: (instance = '') => get<Action[]>(`/api/v1/actions?instance=${instance}`),
  executeAction: (p: { id: string; funcId: string; instanceId: string; user: string; trigger?: string; confirm?: boolean }) =>
    send<Action>('/api/v1/actions', 'POST', p),
  users: () => get<User[]>('/api/v1/users'),
  createUser: (u: User) => send<User>('/api/v1/users', 'POST', u),
  updateUser: (id: string, u: User) => send<User>(`/api/v1/users/${id}`, 'PUT', u),
  roles: () => get<Role[]>('/api/v1/roles'),
  createRole: (r: Role) => send<Role>('/api/v1/roles', 'POST', r),
  updateRole: (id: string, r: Role) => send<Role>(`/api/v1/roles/${id}`, 'PUT', r),
  deleteRole: (id: string) => send<null>(`/api/v1/roles/${id}`, 'DELETE'),
  adminStats: () => get<StatsSnapshot>('/api/v1/admin/stats'),
  menus: (user = '') =>
    get<MenuNode[]>(`/api/v1/menus${user ? `?user=${encodeURIComponent(user)}` : ''}`),
  createMenu: (m: MenuNode) => send<MenuNode>('/api/v1/menus', 'POST', m),
  updateMenu: (id: string, m: MenuNode) => send<MenuNode>(`/api/v1/menus/${encodeURIComponent(id)}`, 'PUT', m),
  deleteMenu: (id: string) => send<null>(`/api/v1/menus/${encodeURIComponent(id)}`, 'DELETE'),
  dataRules: () => get<DataRule[]>('/api/v1/data-rules'),
  createDataRule: (d: DataRule) => send<DataRule>('/api/v1/data-rules', 'POST', d),
  updateDataRule: (id: string, d: DataRule) => send<DataRule>(`/api/v1/data-rules/${id}`, 'PUT', d),
  deleteDataRule: (id: string) => send<null>(`/api/v1/data-rules/${id}`, 'DELETE'),
  sensitivity: () => get<SensRow[]>('/api/v1/sensitivity'),
  depServices: () => get<DepService[]>('/api/v1/dep-services'),
  depUptime: () => get<UptimePoint[]>('/api/v1/dep-services/uptime'),
  inspectDepServices: () => send<DepService[]>('/api/v1/dep-services/inspect', 'POST'),
  auditLogs: (p: { module?: string; level?: string; kw?: string; since?: string; limit?: number; offset?: number; user?: string } = {}) => {
    const qs = Object.entries(p).filter(([, v]) => v !== undefined && v !== '')
      .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&');
    return get<AuditPage>(`/api/v1/audit-logs${qs ? '?' + qs : ''}`);
  },
  systemLogs: (p: { level?: string; component?: string; kw?: string; since?: string; limit?: number; offset?: number; user?: string } = {}) => {
    const qs = Object.entries(p).filter(([, v]) => v !== undefined && v !== '')
      .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&');
    return get<SystemLogPage>(`/api/v1/system-logs${qs ? '?' + qs : ''}`);
  },
  settings: (user: string) => get<UserSetting>(`/api/v1/settings?user=${encodeURIComponent(user)}`),
  saveSettings: (u: UserSetting) => send<UserSetting>('/api/v1/settings', 'PUT', u),
  // ─── 模块补齐 ───
  marketItems: () => get<MarketItem[]>('/api/v1/market-items'),
  createMarketItem: (m: MarketItem) => send<MarketItem>('/api/v1/market-items', 'POST', m),
  updateMarketItem: (id: string, m: MarketItem) => send<MarketItem>(`/api/v1/market-items/${id}`, 'PUT', m),
  deleteMarketItem: (id: string) => send<null>(`/api/v1/market-items/${id}`, 'DELETE'),
  marketRequests: () => get<MarketRequest[]>('/api/v1/market-requests'),
  requestMarketItem: (itemId: string, p: { applicant: string; reason?: string; id?: string }) =>
    send<MarketRequest>(`/api/v1/market-items/${itemId}/request`, 'POST', p),
  decideMarketRequest: (id: string, action: 'approve' | 'reject') =>
    send<MarketRequest>(`/api/v1/market-requests/${id}`, 'PUT', { action }),
  workbench: (user: string) => get<WorkbenchSnapshot>(`/api/v1/workbench?user=${encodeURIComponent(user)}`),
  bindings: () => get<Binding[]>('/api/v1/bindings'),
  createBinding: (b: Binding) => send<Binding>('/api/v1/bindings', 'POST', b),
  updateBinding: (id: string, b: Binding) => send<Binding>(`/api/v1/bindings/${id}`, 'PUT', b),
  deleteBinding: (id: string) => send<null>(`/api/v1/bindings/${id}`, 'DELETE'),
  bindingRuns: (binding = '') => get<BindingRun[]>(`/api/v1/binding-runs?binding=${binding}`),
  syncBinding: (id: string) => send<BindingRun>(`/api/v1/bindings/${id}/sync`, 'POST'),
  candidates: (status = '') => get<OntoCandidate[]>(`/api/v1/convergence/candidates?status=${status}`),
  generateCandidates: () => send<OntoCandidate[]>('/api/v1/convergence/generate', 'POST'),
  adoptCandidate: (id: string, by: string) =>
    send<OntoCandidate>(`/api/v1/convergence/candidates/${id}/adopt`, 'POST', { by }),
  dropCandidate: (id: string, by: string) =>
    send<OntoCandidate>(`/api/v1/convergence/candidates/${id}/drop`, 'POST', { by }),
  alignments: (status = '') => get<EntityAlignment[]>(`/api/v1/alignments?status=${status}`),
  generateAlignments: () => send<EntityAlignment[]>('/api/v1/alignments/generate', 'POST'),
  decideAlignment: (id: string, action: 'merge' | 'drop', by: string) =>
    send<EntityAlignment>(`/api/v1/alignments/${id}/decide`, 'POST', { action, by }),
  members: (onto: string) => get<Member[]>(`/api/v1/ontologies/${onto}/members`),
  setMember: (onto: string, userId: string, role: string) =>
    send<Member>(`/api/v1/ontologies/${onto}/members`, 'PUT', { userId, role }),
  removeMember: (onto: string, userId: string) =>
    send<null>(`/api/v1/ontologies/${onto}/members/${userId}`, 'DELETE'),
  releaseGate: (onto = 'scm') => get<GateCheck[]>(`/api/v1/release-gate?onto=${onto}`),
  publishOntology: (onto: string, by: string) =>
    send<{ version: Version; checks: GateCheck[] }>(`/api/v1/ontologies/${onto}/publish`, 'POST', { by }),
  exportOntology: (onto: string, format: 'owl' | 'rdf') =>
    fetch(`/api/v1/ontologies/${onto}/export?format=${format}`).then(r => r.text()),
  retractVersion: (id: number, by: string) =>
    send<RetractReport>(`/api/v1/versions/${id}/retract`, 'POST', { by }),
  consistency: (onto = 'scm') => get<ConsistencyIssue[]>(`/api/v1/reasoning/consistency?onto=${onto}`),
  runRule: (ruleId: string) => send<RunResult>('/api/v1/reasoning/run', 'POST', { ruleId }),
  tableProfile: (name: string) => get<TableProfile>(`/api/v1/table-profiles/${encodeURIComponent(name)}`),
  orgUnits: () => get<OrgUnit[]>('/api/v1/org-units'),
  createOrgUnit: (u: OrgUnit) => send<OrgUnit>('/api/v1/org-units', 'POST', u),
  updateOrgUnit: (id: string, u: OrgUnit) => send<OrgUnit>(`/api/v1/org-units/${id}`, 'PUT', u),
  deleteOrgUnit: (id: string) => send<null>(`/api/v1/org-units/${id}`, 'DELETE'),
  syncOrgUnits: () => send<{ added: number; sources: number; tree: OrgUnit[] }>('/api/v1/org-units/sync', 'POST'),
  posts: () => get<Post[]>('/api/v1/posts'),
  createPost: (p: Post) => send<Post>('/api/v1/posts', 'POST', p),
  updatePost: (id: string, p: Post) => send<Post>(`/api/v1/posts/${id}`, 'PUT', p),
  deletePost: (id: string) => send<null>(`/api/v1/posts/${id}`, 'DELETE'),
  syncPosts: () => send<{ added: number; sources: number; posts: Post[] }>('/api/v1/posts/sync', 'POST'),
};
