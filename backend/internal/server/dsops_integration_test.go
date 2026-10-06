//go:build integration

// M1 数据资产运营集成测试：数据源幂等/重名 409/非法 mode；视图下线流转；
// 流水线注册幂等/启停/停用 409/运行幂等 + last_run/404。
package server

import (
	"net/http"
	"testing"
)

func dsBody(id, name string) map[string]any {
	return map[string]any{"id": id, "name": name, "type": "MySQL", "kind": "结构化",
		"host": "mysql://192.0.2.9:3306/test", "status": "正常", "mode": "CRON",
		"tables": 12, "sensitive": "L2", "owner": "张三"}
}

func TestDatasourceRegister(t *testing.T) {
	h := demoServer(t)

	rec := callJSON(t, h, http.MethodPost, "/api/v1/datasources", dsBody("ds-t1", "test_prod"))
	if rec.Code != http.StatusCreated {
		t.Fatalf("注册 status = %d, body = %s", rec.Code, rec.Body.String())
	}
	rec = callJSON(t, h, http.MethodPost, "/api/v1/datasources", dsBody("ds-t1", "test_prod"))
	if rec.Code != http.StatusCreated || rec.Header().Get("X-Idempotent-Replay") != "true" {
		t.Fatalf("重放应 201+replay，实际 %d", rec.Code)
	}

	// 同名异 ID → 409
	rec = callJSON(t, h, http.MethodPost, "/api/v1/datasources", dsBody("ds-t2", "test_prod"))
	if rec.Code != http.StatusConflict {
		t.Fatalf("重名应 409，实际 %d", rec.Code)
	}

	// 非法 mode → 400
	bad := dsBody("ds-t3", "bad_mode")
	bad["mode"] = "REALTIME"
	rec = callJSON(t, h, http.MethodPost, "/api/v1/datasources", bad)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("非法 mode 应 400，实际 %d", rec.Code)
	}

	// 停用流转 + 404
	body := dsBody("ds-t1", "test_prod")
	body["status"] = "停用"
	rec = callJSON(t, h, http.MethodPut, "/api/v1/datasources/ds-t1", body)
	if rec.Code != http.StatusOK || decodeMap(t, rec)["status"] != "停用" {
		t.Fatalf("停用失败: %d %s", rec.Code, rec.Body.String())
	}
	rec = callJSON(t, h, http.MethodPut, "/api/v1/datasources/ds-nope", body)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("未知数据源应 404，实际 %d", rec.Code)
	}
}

func TestViewLifecycle(t *testing.T) {
	h := demoServer(t)

	rec := callJSON(t, h, http.MethodPost, "/api/v1/views", map[string]any{
		"id": "v-t1", "name": "lv_test_kit", "kind": "LOGICAL", "owner": "张三",
		"domain": "供应链", "sensitive": "L2", "upstream": []string{"a(x)", "b(y)"}, "status": "DRAFT"})
	if rec.Code != http.StatusCreated {
		t.Fatalf("创建视图 status = %d, body = %s", rec.Code, rec.Body.String())
	}

	// 下线流转 DEPRECATED
	rec = callJSON(t, h, http.MethodPut, "/api/v1/views/v-t1", map[string]any{
		"name": "lv_test_kit", "kind": "LOGICAL", "version": "v1", "owner": "张三",
		"domain": "供应链", "sensitive": "L2", "status": "DEPRECATED"})
	if rec.Code != http.StatusOK || decodeMap(t, rec)["status"] != "DEPRECATED" {
		t.Fatalf("下线失败: %d %s", rec.Code, rec.Body.String())
	}

	// 非法 kind → 400
	rec = callJSON(t, h, http.MethodPost, "/api/v1/views", map[string]any{
		"id": "v-t2", "name": "x", "kind": "MATERIALIZED_V2", "owner": "张三", "status": "DRAFT"})
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("非法 kind 应 400，实际 %d", rec.Code)
	}
}

func TestPipelineRun(t *testing.T) {
	h := demoServer(t)

	// 注册幂等
	rec := callJSON(t, h, http.MethodPost, "/api/v1/pipeline-tasks", map[string]any{
		"id": "p-t1", "name": "客户域探查", "type": "探查", "source": "crm(MySQL)", "schedule": "CRON 0 5 * * *"})
	if rec.Code != http.StatusCreated {
		t.Fatalf("注册任务 status = %d, body = %s", rec.Code, rec.Body.String())
	}
	rec = callJSON(t, h, http.MethodPost, "/api/v1/pipeline-tasks", map[string]any{
		"id": "p-t1", "name": "客户域探查", "type": "探查"})
	if rec.Code != http.StatusCreated || rec.Header().Get("X-Idempotent-Replay") != "true" {
		t.Fatalf("重放应 201+replay，实际 %d", rec.Code)
	}

	// 运行：记录 + last_run
	rec = callJSON(t, h, http.MethodPost, "/api/v1/pipeline-tasks/p-t1/run",
		map[string]any{"id": "run-t1", "detail": "探查 38 表"})
	if rec.Code != http.StatusOK {
		t.Fatalf("运行 status = %d, body = %s", rec.Code, rec.Body.String())
	}
	m := decodeMap(t, rec)
	if m["run"].(map[string]any)["status"] != "成功" {
		t.Fatalf("运行结果异常: %v", m)
	}
	// 幂等：执行记录仅 1 条
	var runs []map[string]any
	loadList(t, h, "/api/v1/pipeline-runs?task=p-t1", &runs)
	if len(runs) != 1 {
		t.Fatalf("执行记录 = %d 条，want 1", len(runs))
	}

	// 停用 → 运行 409
	rec = callJSON(t, h, http.MethodPut, "/api/v1/pipeline-tasks/p-t1/status", map[string]any{"status": "已停用"})
	if rec.Code != http.StatusOK {
		t.Fatalf("停用失败: %d", rec.Code)
	}
	rec = callJSON(t, h, http.MethodPost, "/api/v1/pipeline-tasks/p-t1/run", map[string]any{"id": "run-t2"})
	if rec.Code != http.StatusConflict {
		t.Fatalf("停用任务运行应 409，实际 %d", rec.Code)
	}
	var runs2 []map[string]any
	loadList(t, h, "/api/v1/pipeline-runs?task=p-t1", &runs2)
	if len(runs2) != 1 {
		t.Fatalf("被拒运行不应产生记录，实际 %d 条", len(runs2))
	}

	// seed 停用任务 p4 → 409；未知任务 → 404
	rec = callJSON(t, h, http.MethodPost, "/api/v1/pipeline-tasks/p4/run", map[string]any{"id": "run-t3"})
	if rec.Code != http.StatusConflict {
		t.Fatalf("seed 停用任务应 409，实际 %d", rec.Code)
	}
	rec = callJSON(t, h, http.MethodPost, "/api/v1/pipeline-tasks/p-nope/run", map[string]any{"id": "run-t4"})
	if rec.Code != http.StatusNotFound {
		t.Fatalf("未知任务应 404，实际 %d", rec.Code)
	}
}
