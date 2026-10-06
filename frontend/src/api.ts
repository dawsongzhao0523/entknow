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

export interface Review {
  id: string; title: string; type: string; from: string; status: string; sla: string;
  decidedBy?: string; decidedAt?: string; comment?: string;
}

export interface Notification { id: string; cat: string; title: string; time: string; to: string; unread: boolean }

export interface Version { v: string; date: string; desc: string; status: string }

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
  edges: () => get<Edge[]>('/api/v1/edges'),
  functions: () => get<Func[]>('/api/v1/functions'),
  datasources: () => get<Datasource[]>('/api/v1/datasources'),
  views: () => get<unknown[]>('/api/v1/views'),
  reviews: () => get<Review[]>('/api/v1/reviews'),
  createReview: (r: Pick<Review, 'id' | 'title' | 'type' | 'from'> & { sla?: string }) =>
    send<Review>('/api/v1/reviews', 'POST', r),
  decideReview: (id: string, action: 'approve' | 'reject' | 'withdraw', by: string, comment?: string, expectedStatus?: string) =>
    send<Review>(`/api/v1/reviews/${id}/decision`, 'PUT', { action, by, comment, expectedStatus }),
  notifications: () => get<Notification[]>('/api/v1/notifications'),
  versions: (onto = 'scm') => get<Version[]>(`/api/v1/versions?onto=${onto}`),
};
