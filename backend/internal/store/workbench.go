// 数据工作台：个人聚合视图（采集任务/我的资产/治理待办/最近运行/最近查询），全部由真实库表派生。
package store

import "context"

// WorkbenchSnapshot 工作台聚合。
type WorkbenchSnapshot struct {
	TasksRunning int                `json:"tasksRunning"`
	TasksFailed  int                `json:"tasksFailed"`
	MyAssets     int                `json:"myAssets"`
	PendingTodos int                `json:"pendingTodos"`
	RecentRuns   []BindingRun       `json:"recentRuns"`
	RecentPipes  []PipelineRun      `json:"recentPipelines"`
	RecentQuery  []QueryRecord      `json:"recentQueries"`
	Alerts       []ConsistencyIssue `json:"alerts"`
}

// GetWorkbench 聚合：管道任务状态、我的资产（集市上架数）、待办（待评审+待审批申请+待归并同义词）、
// 最近绑定同步、最近管道运行、最近语义查询、数据源告警。
func (s *Store) GetWorkbench(ctx context.Context, user string) (WorkbenchSnapshot, error) {
	var w WorkbenchSnapshot
	one := func(dst *int, q string, args ...any) error {
		n, err := s.count(ctx, q, args...)
		*dst = n
		return err
	}
	if err := one(&w.TasksRunning, `SELECT count(*) FROM pipeline_tasks WHERE status='运行中'`); err != nil {
		return w, err
	}
	if err := one(&w.TasksFailed, `SELECT count(*) FROM pipeline_tasks WHERE status='失败'`); err != nil {
		return w, err
	}
	if err := one(&w.MyAssets, `SELECT count(*) FROM market_items WHERE status='上架' AND owner=$1`, user); err != nil {
		return w, err
	}
	pending := 0
	if n, err := s.count(ctx, `SELECT count(*) FROM reviews WHERE status IN ('待评审','评审中')`); err == nil {
		pending += n
	} else {
		return w, err
	}
	if n, err := s.count(ctx, `SELECT count(*) FROM market_requests WHERE status='待审批'`); err == nil {
		pending += n
	} else {
		return w, err
	}
	if n, err := s.count(ctx, `SELECT count(*) FROM synonyms WHERE status='待归并'`); err == nil {
		pending += n
	} else {
		return w, err
	}
	w.PendingTodos = pending

	if runs, err := s.ListBindingRuns(ctx, ""); err == nil && len(runs) > 5 {
		w.RecentRuns = runs[:5]
	} else if err != nil {
		return w, err
	} else {
		w.RecentRuns = runs
	}

	rows, err := s.pool.Query(ctx, `
		SELECT id, task_id, status, detail, at FROM pipeline_runs ORDER BY at DESC LIMIT 5`)
	if err != nil {
		return w, err
	}
	defer rows.Close()
	for rows.Next() {
		var r PipelineRun
		if err := rows.Scan(&r.ID, &r.TaskID, &r.Status, &r.Detail, &r.At); err != nil {
			return w, err
		}
		w.RecentPipes = append(w.RecentPipes, r)
	}
	if err := rows.Err(); err != nil {
		return w, err
	}

	qrows, err := s.pool.Query(ctx, `
		SELECT id, question, latency_ms, by_user, at FROM query_history ORDER BY at DESC LIMIT 5`)
	if err != nil {
		return w, err
	}
	defer qrows.Close()
	for qrows.Next() {
		var q QueryRecord
		if err := qrows.Scan(&q.ID, &q.Question, &q.LatencyMs, &q.By, &q.At); err != nil {
			return w, err
		}
		w.RecentQuery = append(w.RecentQuery, q)
	}
	if err := qrows.Err(); err != nil {
		return w, err
	}

	// 数据源告警 → alerts
	dsRows, err := s.pool.Query(ctx, `SELECT name, status FROM datasources WHERE status='异常'`)
	if err != nil {
		return w, err
	}
	defer dsRows.Close()
	for dsRows.Next() {
		var name string
		var status string
		if err := dsRows.Scan(&name, &status); err != nil {
			return w, err
		}
		w.Alerts = append(w.Alerts, ConsistencyIssue{
			Level: "error", Key: "datasource",
			Detail: "数据源 " + name + " 状态异常，增量同步可能滞后",
		})
	}
	return w, dsRows.Err()
}
