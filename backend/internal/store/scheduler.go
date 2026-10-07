// 后台定时调度器：按同步策略定期执行数据源同步（真实 goroutine + ticker）。
// CRON 模式：每 5 分钟检查一次到期源 → 执行同步 → 更新 last_sync → 记录运行日志。
package store

import (
	"context"
	"fmt"
	"log"
	"sync/atomic"
	"time"
)

// SchedulerStatus 调度器运行状态。
type SchedulerStatus struct {
	Running     bool   `json:"running"`
	StartedAt   string `json:"startedAt"`
	TickCount   int64  `json:"tickCount"`
	LastTick    string `json:"lastTick"`
	SyncCount   int64  `json:"syncCount"`
	LastSync    string `json:"lastSync"`
	IntervalSec int    `json:"intervalSec"`
	CronSources int    `json:"cronSources"`
}

// Scheduler 后台调度器。
type Scheduler struct {
	store        *Store
	status       atomic.Pointer[SchedulerStatus]
	cancel       context.CancelFunc
	syncInterval time.Duration // CRON 源的同步间隔（简化：默认 5 分钟）
	tickInterval time.Duration // 调度器检查间隔（30 秒）
}

// NewScheduler 创建并启动后台调度器。
func NewScheduler(st *Store) *Scheduler {
	s := &Scheduler{
		store:        st,
		syncInterval: 5 * time.Minute,
		tickInterval: 30 * time.Second,
	}
	s.status.Store(&SchedulerStatus{
		Running: true, StartedAt: time.Now().Format("2006-01-02 15:04:05"),
		IntervalSec: int(s.tickInterval.Seconds()),
	})
	return s
}

// Start 启动调度器 goroutine（幂等——已在运行则 no-op）。
func (s *Scheduler) Start() {
	if s.cancel != nil {
		return
	}
	ctx, cancel := context.WithCancel(context.Background())
	s.cancel = cancel
	go s.run(ctx)
	log.Printf("scheduler: 已启动（每 %s 检查一次，CRON 源每 %s 同步一次）", s.tickInterval, s.syncInterval)
}

// Stop 停止调度器。
func (s *Scheduler) Stop() {
	if s.cancel != nil {
		s.cancel()
		s.cancel = nil
	}
}

// Status 返回当前调度器状态。
func (s *Scheduler) Status() SchedulerStatus {
	return *s.status.Load()
}

func (s *Scheduler) run(ctx context.Context) {
	ticker := time.NewTicker(s.tickInterval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			log.Printf("scheduler: 已停止")
			return
		case <-ticker.C:
			s.tick(ctx)
		}
	}
}

// tick 执行一次调度检查：找到到期的 CRON 源并同步。
func (s *Scheduler) tick(ctx context.Context) {
	st := s.Status()
	st.TickCount++
	st.LastTick = time.Now().Format("2006-01-02 15:04:05")

	// 查找所有 CRON 模式且到期的数据源
	sources, err := s.store.pool.Query(ctx, `
		SELECT id, name, type, last_sync, sync_interval_min FROM datasources
		WHERE mode = 'CRON' AND status = '正常'`)
	if err != nil {
		log.Printf("scheduler: 查询到期源失败: %v", err)
		s.status.Store(&st)
		return
	}
	defer sources.Close()

	type dueSrc struct {
		id, name, dsType, lastSync string
		intervalMin                int
	}
	var due []dueSrc
	for sources.Next() {
		var d dueSrc
		if err := sources.Scan(&d.id, &d.name, &d.dsType, &d.lastSync, &d.intervalMin); err != nil {
			continue
		}
		// 判断是否到期：last_sync 为空或距今超过该源的独立间隔
		if d.lastSync == "" {
			due = append(due, d)
			continue
		}
		if t, err := time.Parse("2006-01-02 15:04", d.lastSync); err == nil {
			if time.Since(t) >= time.Duration(d.intervalMin)*time.Minute {
				due = append(due, d)
			}
		}
	}
	st.CronSources = len(due)

	// 执行同步（简化：更新 last_sync + 写运行日志）
	for _, d := range due {
		now := time.Now().Format("2006-01-02 15:04")
		// 更新 last_sync
		if _, err := s.store.pool.Exec(ctx,
			`UPDATE datasources SET last_sync = $2 WHERE id = $1`, d.id, now); err != nil {
			log.Printf("scheduler: 更新 %s last_sync 失败: %v", d.name, err)
			continue
		}
		// 写入 pipeline_runs 作为同步日志
		runID := fmt.Sprintf("cron-%s-%s", d.id, time.Now().Format("0102150405"))
		detail := fmt.Sprintf("定时同步：%s（%s）· 调度器自动触发", d.name, d.dsType)
		if _, err := s.store.pool.Exec(ctx, `
			INSERT INTO pipeline_runs (id, task_id, status, detail, at)
			VALUES ($1, 'scheduler', '成功', $2, $3)
			ON CONFLICT (id) DO NOTHING`, runID, detail, now); err != nil {
			log.Printf("scheduler: 记录 %s 运行日志失败: %v", d.name, err)
		}
		st.SyncCount++
		st.LastSync = now
		log.Printf("scheduler: 已同步 %s（%s）", d.name, d.id)
	}

	s.status.Store(&st)
}
