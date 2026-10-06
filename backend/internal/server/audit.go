// /api/v1 写操作审计中间件：POST/PUT/DELETE 自动落 audit_logs（模块/级别/操作人/TraceID）。
// 审计失败仅记日志，不阻塞业务请求（失败不阻塞批次）。
package server

import (
	"bytes"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"strconv"

	"github.com/dawsongzhao0523/entknow/backend/internal/store"
)

// modulePathPrefix 路径首段 → 模块（/api/v1/<资源> 的资源名匹配前缀）。
// 模块键 = 前端路由前缀 = 角色权限键（assets/knowledge/modeling/runtime/reasoning/sandbox/apps/governance/admin）。
var moduleRoutes = []struct{ prefix, module string }{
	{"datasources", "assets"}, {"views", "assets"}, {"pipeline-tasks", "assets"}, {"pipeline-runs", "assets"}, {"table-profiles", "assets"},
	{"kb", "knowledge"}, {"synonyms", "knowledge"},
	{"objects", "modeling"}, {"edges", "modeling"}, {"functions", "modeling"}, {"elements", "modeling"},
	{"instances", "runtime"}, {"rule-firings", "runtime"}, {"actions", "runtime"},
	{"queries", "reasoning"}, {"search", "reasoning"},
	{"sandbox-branches", "sandbox"},
	{"capabilities", "apps"},
	{"reviews", "governance"},
}

// moduleOf 由 /api/v1 路径推导模块（语义化模块键），未登记资源归 admin（系统管理域）。
func moduleOf(path string) string {
	rest := path
	if len(rest) > 8 && rest[:8] == "/api/v1/" {
		rest = rest[8:]
	}
	for _, r := range moduleRoutes {
		if rest == r.prefix || (len(rest) > len(r.prefix) && rest[:len(r.prefix)] == r.prefix && rest[len(r.prefix)] == '/') {
			return r.module
		}
	}
	return "admin"
}

// pickOperator 从请求体提取操作人（user/by/from 首个非空），失败返回「系统」。
func pickOperator(body []byte) string {
	var m map[string]any
	if json.Unmarshal(body, &m) != nil {
		return "系统"
	}
	for _, key := range []string{"user", "by", "from"} {
		if v, ok := m[key].(string); ok && v != "" {
			return v
		}
	}
	return "系统"
}

// levelOf 状态码 → 审计级别：2xx=INFO、4xx=WARN、5xx=ERROR。
func levelOf(status int) string {
	switch {
	case status >= 500:
		return "ERROR"
	case status >= 400:
		return "WARN"
	default:
		return "INFO"
	}
}

func newTraceID() string {
	var b [4]byte
	_, _ = rand.Read(b[:])
	return "tr-" + hex.EncodeToString(b[:])
}

// statusRecorder 捕获 handler 写入的状态码。
type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (r *statusRecorder) WriteHeader(code int) {
	r.status = code
	r.ResponseWriter.WriteHeader(code)
}

// withAudit 包装子路由：写方法先缓冲 body（回填供 handler 消费），响应后落审计。
func withAudit(st *store.Store, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost && r.Method != http.MethodPut && r.Method != http.MethodDelete {
			next.ServeHTTP(w, r)
			return
		}

		var body []byte
		if r.Body != nil {
			buf := &bytes.Buffer{}
			if _, err := buf.ReadFrom(r.Body); err != nil {
				log.Printf("audit: 读取请求体失败: %v", err)
			}
			_ = r.Body.Close()
			body = buf.Bytes()
			r.Body = io.NopCloser(bytes.NewReader(body))
		}

		trace := newTraceID()
		w.Header().Set("X-Trace-Id", trace)
		rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(rec, r)

		entry := store.AuditLog{
			At:       store.NowString(),
			Module:   moduleOf(r.URL.Path),
			Level:    levelOf(rec.status),
			Operator: pickOperator(body),
			Content:  r.Method + " " + r.URL.Path + " → " + strconv.Itoa(rec.status),
			TraceID:  trace,
		}
		if err := st.InsertAudit(r.Context(), entry); err != nil {
			log.Printf("audit: 落库失败（不阻塞业务）: %v", err)
		}
	})
}
