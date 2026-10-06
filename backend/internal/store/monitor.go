// M9 依赖服务监控：服务登记查询、真实健康巡检（postgres 自库 / redis PING / http GET）
// 与巡检历史（7 日可用率）聚合。
package store

import (
	"bufio"
	"context"
	"net"
	"net/http"
	"os"
	"time"
)

// DepService 依赖服务（含最近一次巡检结果）。
type DepService struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Descr     string `json:"descr"`
	Kind      string `json:"kind"` // postgres | redis | http
	Target    string `json:"target"`
	Status    string `json:"status"` // 正常 | 延迟 | 异常 | 未巡检
	LatencyMs int    `json:"latencyMs"`
	CheckedAt string `json:"checkedAt"`
}

// UptimePoint 某服务某日的可用率（百分比）。
type UptimePoint struct {
	ServiceID string  `json:"serviceId"`
	Day       string  `json:"day"`
	Uptime    float64 `json:"uptime"`
}

func (s *Store) ListDepServices(ctx context.Context) ([]DepService, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, name, descr, kind, target, status, latency_ms, checked_at FROM dep_services ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []DepService
	for rows.Next() {
		var d DepService
		if err := rows.Scan(&d.ID, &d.Name, &d.Descr, &d.Kind, &d.Target, &d.Status, &d.LatencyMs, &d.CheckedAt); err != nil {
			return nil, err
		}
		out = append(out, d)
	}
	return out, rows.Err()
}

// InspectAll 手动巡检：逐服务真实探活，更新状态与延迟并追加 dep_checks 历史（单服务失败继续）。
func (s *Store) InspectAll(ctx context.Context) ([]DepService, error) {
	services, err := s.ListDepServices(ctx)
	if err != nil {
		return nil, err
	}
	at := time.Now().Format("2006-01-02 15:04")
	for _, svc := range services {
		ok, latency := s.checkService(ctx, svc)
		status := "正常"
		if !ok {
			status = "异常"
		} else if latency > 800*time.Millisecond {
			status = "延迟"
		}
		if _, err := s.pool.Exec(ctx, `
			UPDATE dep_services SET status = $2, latency_ms = $3, checked_at = $4 WHERE id = $1`,
			svc.ID, status, latency.Milliseconds(), at); err != nil {
			return nil, err
		}
		if _, err := s.pool.Exec(ctx, `
			INSERT INTO dep_checks (service_id, ok, latency_ms, at) VALUES ($1, $2, $3, $4)`,
			svc.ID, ok, latency.Milliseconds(), at); err != nil {
			return nil, err
		}
	}
	return s.ListDepServices(ctx)
}

// checkService 按类型探活：postgres 探自库连接池（target 空）、redis 发 PING、http GET。
func (s *Store) checkService(ctx context.Context, svc DepService) (bool, time.Duration) {
	start := time.Now()
	cctx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	switch svc.Kind {
	case "postgres":
		return s.pool.Ping(cctx) == nil, time.Since(start)
	case "redis":
		return redisPing(envOr("ENTKNOW_REDIS_ADDR", svc.Target), cctx), time.Since(start)
	case "http":
		return httpPing(cctx, envOr("ENTKNOW_MINIO_ADDR", svc.Target)), time.Since(start)
	default:
		return false, time.Since(start)
	}
}

// envOr 环境变量覆盖巡检地址（容器网络与本地默认不同）。
func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func redisPing(addr string, ctx context.Context) bool {
	d := net.Dialer{Timeout: 2 * time.Second}
	conn, err := d.DialContext(ctx, "tcp", addr)
	if err != nil {
		return false
	}
	defer conn.Close()
	_ = conn.SetDeadline(time.Now().Add(2 * time.Second))
	if _, err := conn.Write([]byte("PING\r\n")); err != nil {
		return false
	}
	reply, err := bufio.NewReader(conn).ReadString('\n')
	return err == nil && len(reply) > 0 && reply[0] == '+'
}

func httpPing(ctx context.Context, url string) bool {
	if url == "" {
		return false
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return false
	}
	resp, err := (&http.Client{}).Do(req)
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	return resp.StatusCode < 500
}

// Uptime7d 近 7 日（含今日）按服务按日可用率。
func (s *Store) Uptime7d(ctx context.Context) ([]UptimePoint, error) {
	since := time.Now().AddDate(0, 0, -6).Format("2006-01-02")
	rows, err := s.pool.Query(ctx, `
		SELECT service_id, substring(at, 1, 10) AS day,
		       round(avg(CASE WHEN ok THEN 100.0 ELSE 0 END), 1) AS uptime
		FROM dep_checks WHERE at >= $1
		GROUP BY service_id, day
		ORDER BY day DESC, service_id`, since)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []UptimePoint
	for rows.Next() {
		var p UptimePoint
		if err := rows.Scan(&p.ServiceID, &p.Day, &p.Uptime); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}
