//go:build integration

// 集成测试：对 demo 库（与用户导入的 demo 同一份种子）断言全部读端点。
// DSN 不可达时 skip，保证无库环境 `go test ./...` 全绿（DoD）。
package server

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/dawsongzhao0523/entknow/backend/internal/store"
)

const defaultDSN = "postgres://entknow:entknow@localhost:25432/entknow?sslmode=disable"

func demoServer(t *testing.T) http.Handler {
	t.Helper()
	dsn := os.Getenv("ENTKNOW_PG_DSN")
	if dsn == "" {
		dsn = defaultDSN
	}
	st, err := store.Connect(context.Background(), dsn)
	if err != nil {
		t.Skipf("数据库不可达，跳过集成测试: %v", err)
	}
	t.Cleanup(st.Close)
	ctx := context.Background()
	if err := st.Migrate(ctx); err != nil {
		t.Fatalf("迁移失败: %v", err)
	}
	if err := st.Seed(ctx); err != nil {
		t.Fatalf("demo 装载失败: %v", err)
	}
	mux := New()
	MountAPI(mux, st)
	return mux
}

// getArray 断言端点返回 200 且为长度 want 的 JSON 数组。
func getArray(t *testing.T, h http.Handler, path string, want int) {
	t.Helper()
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, path, nil))
	if rec.Code != http.StatusOK {
		t.Fatalf("%s: status = %d, body = %s", path, rec.Code, rec.Body.String())
	}
	var arr []any
	if err := json.Unmarshal(rec.Body.Bytes(), &arr); err != nil {
		t.Fatalf("%s: 响应不是数组: %v", path, err)
	}
	if len(arr) != want {
		t.Fatalf("%s: 数量 = %d, want %d", path, len(arr), want)
	}
}

func TestAPIListCounts(t *testing.T) {
	h := demoServer(t)
	getArray(t, h, "/api/v1/ontologies?user=zhangsan", 3)
	getArray(t, h, "/api/v1/objects", 11)
	getArray(t, h, "/api/v1/objects?scope=canvas", 7)
	getArray(t, h, "/api/v1/edges", 5)
	getArray(t, h, "/api/v1/functions", 5)
	getArray(t, h, "/api/v1/views", 3)
	getArray(t, h, "/api/v1/datasources", 6)
	getArray(t, h, "/api/v1/rules", 4)
	getArray(t, h, "/api/v1/reviews", 4)
	getArray(t, h, "/api/v1/notifications", 6)
	getArray(t, h, "/api/v1/users", 4)
	getArray(t, h, "/api/v1/capabilities", 4)
	getArray(t, h, "/api/v1/versions?onto=scm", 4)
	getArray(t, h, "/api/v1/role-matrix", 7)
}

func TestOntologyMyRole(t *testing.T) {
	h := demoServer(t)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/v1/ontologies?user=zhangsan", nil))
	var onts []map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &onts); err != nil {
		t.Fatal(err)
	}
	byID := map[string]map[string]any{}
	for _, o := range onts {
		byID[o["id"].(string)] = o
	}
	if byID["scm"]["myRole"] != "建模者" {
		t.Fatalf("scm myRole = %v, want 建模者", byID["scm"]["myRole"])
	}
	if byID["quality"]["myRole"] != "查看者" {
		t.Fatalf("quality myRole = %v, want 查看者", byID["quality"]["myRole"])
	}
	if byID["equipment"]["myRole"] != "查看者" { // zhangsan 无 membership → 默认查看者
		t.Fatalf("equipment myRole = %v, want 查看者", byID["equipment"]["myRole"])
	}
}

func TestTableProfileAnd404(t *testing.T) {
	h := demoServer(t)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/v1/table-profiles/purchase_order", nil))
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var p map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &p); err != nil {
		t.Fatal(err)
	}
	if p["pk"] != "po_id" || p["fields"].(float64) != 18 {
		t.Fatalf("画像字段异常: pk=%v fields=%v", p["pk"], p["fields"])
	}
	if n := len(p["profileFields"].([]any)); n != 10 {
		t.Fatalf("画像字段数 = %d, want 10", n)
	}

	rec = httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/v1/table-profiles/not-exist", nil))
	if rec.Code != http.StatusNotFound {
		t.Fatalf("未知表画像 status = %d, want 404", rec.Code)
	}
}

func TestHealthzOnDemo(t *testing.T) {
	rec := httptest.NewRecorder()
	demoServer(t).ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/healthz", nil))
	var body map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &body)
	if rec.Code != http.StatusOK || body["status"] != "ok" {
		t.Fatalf("healthz 异常: %d %v", rec.Code, body)
	}
}
