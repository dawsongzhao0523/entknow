-- entKnow 核心 schema（幂等：全部 IF NOT EXISTS，启动时整文件执行）
-- 字段语义与 prototype/src/mock/data.ts 一一对应；JSON 输出用 camelCase。

CREATE TABLE IF NOT EXISTS users (
  id         text PRIMARY KEY,
  account    text NOT NULL,
  name       text NOT NULL,
  dept       text NOT NULL,
  post       text NOT NULL,
  roles      text[] NOT NULL DEFAULT '{}',
  status     text NOT NULL,
  last_login text NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS ontologies (
  id           text PRIMARY KEY,
  name         text NOT NULL,
  scene        text NOT NULL,
  version      text NOT NULL,
  status       text NOT NULL,             -- DRAFT | PUBLISHED
  owner        text NOT NULL,
  members      integer NOT NULL DEFAULT 0,
  object_count integer NOT NULL DEFAULT 0,
  edge_count   integer NOT NULL DEFAULT 0,
  created      text NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS memberships (
  onto_id text NOT NULL,
  user_id text NOT NULL,
  role    text NOT NULL,                  -- 所有者 | 建模者 | 评审者 | 查看者
  PRIMARY KEY (onto_id, user_id)
);

-- 画布对象（canvas=true）与注册中心对象同表：注册中心 = 全部行
CREATE TABLE IF NOT EXISTS objects (
  id            text PRIMARY KEY,
  name          text NOT NULL,
  en            text NOT NULL,
  kind          text NOT NULL,            -- 静态事实 | 单体动态 | 立方动态
  version       text NOT NULL,
  status        text NOT NULL,            -- DRAFT | IN_REVIEW | PUBLISHED | DEPRECATED
  ref_count     integer NOT NULL DEFAULT 0,
  owner         text NOT NULL,
  state_machine text[],
  ontology      text NOT NULL DEFAULT '',
  canvas        boolean NOT NULL DEFAULT false,
  shared        boolean NOT NULL DEFAULT false,
  perm          text NOT NULL DEFAULT '', -- use | view
  mapping       text NOT NULL DEFAULT '',
  props         jsonb NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS edges (
  id        text PRIMARY KEY,
  name      text NOT NULL,
  from_obj  text NOT NULL,
  to_obj    text NOT NULL,
  version   text NOT NULL,
  status    text NOT NULL,
  ref_count integer NOT NULL DEFAULT 0,
  props     jsonb NOT NULL DEFAULT '[]',
  perm      text NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS functions (
  id        text PRIMARY KEY,
  name      text NOT NULL,
  cat       text NOT NULL,                -- 指标 | 派生 | 行动 | 权限
  version   text NOT NULL,
  status    text NOT NULL,
  tests     text NOT NULL DEFAULT '',
  calls_7d  text NOT NULL DEFAULT '',
  signature text NOT NULL DEFAULT '',
  impl      text NOT NULL DEFAULT '',
  perm      text NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS views (
  id        text PRIMARY KEY,
  name      text NOT NULL,
  kind      text NOT NULL,                -- LOGICAL | MATERIALIZED
  version   text NOT NULL,
  status    text NOT NULL,
  domain    text NOT NULL,
  sensitive text NOT NULL,
  upstream  text[] NOT NULL DEFAULT '{}',
  bound_by  text[] NOT NULL DEFAULT '{}',
  owner     text NOT NULL,
  refresh   text NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS datasources (
  id        text PRIMARY KEY,
  name      text NOT NULL,
  type      text NOT NULL,
  kind      text NOT NULL,                -- 结构化 | 非结构化
  host      text NOT NULL DEFAULT '',
  status    text NOT NULL,                -- 正常 | 异常 | 停用
  mode      text NOT NULL,                -- NONE | CRON | CDC | EVENT
  tables    integer,
  sensitive text NOT NULL,
  owner     text NOT NULL,
  last_sync text NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS rules (
  id     text PRIMARY KEY,
  def    text NOT NULL,
  kind   text NOT NULL,                   -- V→V | V→E | E→V | E→E
  status text NOT NULL,
  fired  integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS reviews (
  id         text PRIMARY KEY,
  title      text NOT NULL,
  type       text NOT NULL,
  from_user  text NOT NULL,
  status     text NOT NULL,                -- 待评审 | 评审中 | 已通过 | 已驳回 | 已撤回
  sla        text NOT NULL DEFAULT '-',
  decided_by text NOT NULL DEFAULT '',
  decided_at text NOT NULL DEFAULT '',
  comment    text NOT NULL DEFAULT ''      -- 裁决说明（驳回必填原因）
);

CREATE TABLE IF NOT EXISTS notifications (
  id      text PRIMARY KEY,
  cat     text NOT NULL,                   -- 待办处理 | 治理任务 | 协同分享
  title   text NOT NULL,
  time    text NOT NULL,
  to_path text NOT NULL DEFAULT '',        -- to 为 PG 保留字，列名用 to_path（API 字段仍为 to）
  unread  boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS capabilities (
  id          text PRIMARY KEY,
  name        text NOT NULL,
  description text NOT NULL,
  proto       text NOT NULL,              -- MCP/REST/CLI 组合
  calls       text NOT NULL DEFAULT '',
  owner       text NOT NULL
);

CREATE TABLE IF NOT EXISTS versions (
  id          serial PRIMARY KEY,
  onto_id     text NOT NULL DEFAULT 'scm',
  v           text NOT NULL,
  date        text NOT NULL,
  description text NOT NULL,
  status      text NOT NULL
);

CREATE TABLE IF NOT EXISTS table_profiles (
  name           text PRIMARY KEY,
  comment        text NOT NULL,
  rows           text NOT NULL,
  fields         integer NOT NULL,
  pk             text NOT NULL,
  fks            jsonb NOT NULL DEFAULT '[]',
  siblings       jsonb NOT NULL DEFAULT '[]',
  profile_fields jsonb NOT NULL DEFAULT '[]'
);

-- ─── M2 知识运营 ───

CREATE TABLE IF NOT EXISTS kb_domains (
  id        text PRIMARY KEY,
  name      text NOT NULL,
  parent_id text NOT NULL DEFAULT ''          -- 顶级为空，两级树
);

CREATE TABLE IF NOT EXISTS kb_entries (
  id         text PRIMARY KEY,
  domain_id  text NOT NULL,
  title      text NOT NULL,
  status     text NOT NULL DEFAULT '待评审',   -- 待评审 | 已评审 | 已失效（软删除）
  source     text NOT NULL DEFAULT '手工',     -- 定时任务 | OneData | CSV 导入 | 手工
  onto       text NOT NULL DEFAULT '',         -- 关联本体对象 en
  data_ref   text NOT NULL DEFAULT '',         -- 数据来源表
  flow       text NOT NULL DEFAULT '',         -- PROC 流程号
  roles      text[] NOT NULL DEFAULT '{}',
  mode       text NOT NULL DEFAULT '',         -- 业务模式（markdown）
  terms      jsonb NOT NULL DEFAULT '[]',      -- [{term,en,def,source}]
  sops       text[] NOT NULL DEFAULT '{}',
  version    integer NOT NULL DEFAULT 1,       -- 乐观并发
  updated_by text NOT NULL DEFAULT '',
  updated_at text NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS synonyms (
  id       text PRIMARY KEY,
  terms    text[] NOT NULL,
  standard text NOT NULL DEFAULT '',
  status   text NOT NULL DEFAULT '待归并',      -- 待归并 | 已归并
  by       text NOT NULL DEFAULT '',
  at       text NOT NULL DEFAULT ''
);

-- 幂等演进（已有库补列；新库因 CREATE 已含而 no-op）
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS decided_by text NOT NULL DEFAULT '';
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS decided_at text NOT NULL DEFAULT '';
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS comment    text NOT NULL DEFAULT '';
