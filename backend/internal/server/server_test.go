package server

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

// 每个 endpoint 一张表：方法 + 路径 + 期望状态码 + 期望响应体（用户可见行为）。
func TestEndpoints(t *testing.T) {
	tests := []struct {
		method string
		path   string
		want   int
		body   string
	}{
		{http.MethodGet, "/healthz", http.StatusOK, `{"status":"ok"}`},
		{http.MethodGet, "/api/v1/version", http.StatusOK, `{"name":"entknow","api":"v1"}`},
		{http.MethodGet, "/not-exist", http.StatusNotFound, "404 page not found\n"},
		{http.MethodPost, "/healthz", http.StatusMethodNotAllowed, ""},
	}
	for _, tt := range tests {
		t.Run(tt.method+" "+tt.path, func(t *testing.T) {
			rec := httptest.NewRecorder()
			New().ServeHTTP(rec, httptest.NewRequest(tt.method, tt.path, nil))
			if rec.Code != tt.want {
				t.Fatalf("status = %d, want %d", rec.Code, tt.want)
			}
			if tt.body != "" && rec.Body.String() != tt.body {
				t.Fatalf("body = %q, want %q", rec.Body.String(), tt.body)
			}
		})
	}
}
