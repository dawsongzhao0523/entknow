// Package server 提供 entKnow 后端的根路由。业务能力随 openspec 提案逐步挂载。
package server

import "net/http"

// New 返回根路由：/healthz 健康检查，/api/v1/version 版本信息。
func New() *http.ServeMux {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	})
	mux.HandleFunc("GET /api/v1/version", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"name":"entknow","api":"v1"}`))
	})
	return mux
}
