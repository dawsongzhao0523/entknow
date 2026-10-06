// 系统运营总览：全平台真实计数聚合（不含任何硬编码展示值）。
package store

import (
	"context"
	"time"
)

// StatsSnapshot 总览快照。
type StatsSnapshot struct {
	Users          int          `json:"users"`
	Roles          int          `json:"roles"`
	Ontos          int          `json:"ontos"`
	OntoPublished  int          `json:"ontoPublished"`
	OntoDraft      int          `json:"ontoDraft"`
	Objects        int          `json:"objects"`
	Edges          int          `json:"edges"`
	Instances      int          `json:"instances"`
	DsTotal        int          `json:"dsTotal"`
	DsNormal       int          `json:"dsNormal"`
	DsError        int          `json:"dsError"`
	KbEntries      int          `json:"kbEntries"`
	Synonyms       int          `json:"synonyms"`
	Capabilities   int          `json:"capabilities"`
	CapCalls       int          `json:"capabilityCalls"`
	Queries        int          `json:"queries"`
	Reviews        int          `json:"reviews"`
	ReviewsPending int          `json:"reviewsPending"`
	Tasks          int          `json:"pipelineTasks"`
	TasksFailed    int          `json:"tasksFailed"`
	AuditToday     int          `json:"auditToday"`
	Services       []DepService `json:"services"`
	RecentAlerts   []SystemLog  `json:"recentAlerts"`
}

// count 单值计数。
func (s *Store) count(ctx context.Context, query string, args ...any) (int, error) {
	var n int
	err := s.pool.QueryRow(ctx, query, args...).Scan(&n)
	return n, err
}

// Stats 聚合总览数据；单类统计失败即整体失败（读路径无降级必要）。
func (s *Store) Stats(ctx context.Context) (StatsSnapshot, error) {
	var st StatsSnapshot
	type cnt struct {
		dst *int
		q   string
	}
	for _, c := range []cnt{
		{&st.Users, `SELECT count(*) FROM users`},
		{&st.Roles, `SELECT count(*) FROM roles`},
		{&st.Ontos, `SELECT count(*) FROM ontologies`},
		{&st.OntoPublished, `SELECT count(*) FROM ontologies WHERE status = 'PUBLISHED'`},
		{&st.OntoDraft, `SELECT count(*) FROM ontologies WHERE status = 'DRAFT'`},
		{&st.Objects, `SELECT count(*) FROM objects`},
		{&st.Edges, `SELECT count(*) FROM edges`},
		{&st.Instances, `SELECT count(*) FROM instances`},
		{&st.DsTotal, `SELECT count(*) FROM datasources`},
		{&st.DsNormal, `SELECT count(*) FROM datasources WHERE status = '正常'`},
		{&st.DsError, `SELECT count(*) FROM datasources WHERE status = '异常'`},
		{&st.KbEntries, `SELECT count(*) FROM kb_entries WHERE status <> '已失效'`},
		{&st.Synonyms, `SELECT count(*) FROM synonyms`},
		{&st.Capabilities, `SELECT count(*) FROM capabilities`},
		{&st.CapCalls, `SELECT count(*) FROM capability_calls`},
		{&st.Queries, `SELECT count(*) FROM query_history`},
		{&st.Reviews, `SELECT count(*) FROM reviews`},
		{&st.ReviewsPending, `SELECT count(*) FROM reviews WHERE status IN ('待评审','评审中')`},
		{&st.Tasks, `SELECT count(*) FROM pipeline_tasks`},
		{&st.TasksFailed, `SELECT count(*) FROM pipeline_tasks WHERE status = '失败'`},
	} {
		n, err := s.count(ctx, c.q)
		*c.dst = n
		if err != nil {
			return st, err
		}
	}

	var err error
	if st.AuditToday, err = s.count(ctx, `SELECT count(*) FROM audit_logs WHERE at LIKE $1`,
		time.Now().Format("2006-01-02")+"%"); err != nil {
		return st, err
	}
	if st.Services, err = s.ListDepServices(ctx); err != nil {
		return st, err
	}

	rows, err := s.pool.Query(ctx, `
		SELECT id, at, level, component, content, trace_id FROM system_logs
		WHERE level IN ('WARN','ERROR') ORDER BY at DESC, id DESC LIMIT 5`)
	if err != nil {
		return st, err
	}
	defer rows.Close()
	for rows.Next() {
		var a SystemLog
		if err := rows.Scan(&a.ID, &a.At, &a.Level, &a.Component, &a.Content, &a.TraceID); err != nil {
			return st, err
		}
		st.RecentAlerts = append(st.RecentAlerts, a)
	}
	return st, rows.Err()
}
