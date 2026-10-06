//go:build integration

// 模块补齐集成测试：集市申请审批、绑定引用与同步、收敛采纳建对象、成员管理、
// 门禁评估、导出、规则执行、撤回对账、工作台聚合、一致性检查。
package server

import (
	"net/http"
	"strings"
	"testing"
)

func TestMarketFlow(t *testing.T) {
	h := demoServer(t)

	// 申请 → 审批通过 → subscribers +1
	rec := callJSON(t, h, http.MethodPost, "/api/v1/market-items/mk-1/request",
		map[string]any{"applicant": "wangwu", "reason": "测试申请"})
	if rec.Code != http.StatusCreated {
		t.Fatalf("申请失败: %d %s", rec.Code, rec.Body.String())
	}
	// 重复申请 → 409
	rec = callJSON(t, h, http.MethodPost, "/api/v1/market-items/mk-1/request",
		map[string]any{"applicant": "wangwu"})
	if rec.Code != http.StatusConflict {
		t.Fatalf("重复申请应 409，实际 %d", rec.Code)
	}
	// 非上架资产申请 → 400
	rec = callJSON(t, h, http.MethodPost, "/api/v1/market-items/mk-5/request",
		map[string]any{"applicant": "wangwu"})
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("非上架申请应 400，实际 %d", rec.Code)
	}
	// 审批
	list := []map[string]any{}
	loadList(t, h, "/api/v1/market-requests", &list)
	var reqID string
	for _, r := range list {
		if r["applicant"] == "wangwu" && r["status"] == "待审批" {
			reqID = r["id"].(string)
		}
	}
	if reqID == "" {
		t.Fatal("未找到待审批申请")
	}
	rec = callJSON(t, h, http.MethodPut, "/api/v1/market-requests/"+reqID,
		map[string]any{"action": "approve"})
	if rec.Code != http.StatusOK || decodeMap(t, rec)["status"] != "已通过" {
		t.Fatalf("审批失败: %d %s", rec.Code, rec.Body.String())
	}
	items := []map[string]any{}
	loadList(t, h, "/api/v1/market-items", &items)
	for _, m := range items {
		if m["id"] == "mk-1" && m["subscribers"].(float64) != 24 {
			t.Fatalf("审批通过后 subscribers 应为 24，实际 %v", m["subscribers"])
		}
	}
	// 重放幂等
	rec = callJSON(t, h, http.MethodPut, "/api/v1/market-requests/"+reqID,
		map[string]any{"action": "approve"})
	if rec.Code != http.StatusOK || decodeMap(t, rec)["status"] != "已通过" {
		t.Fatalf("审批重放应幂等: %d", rec.Code)
	}
}

func TestBindingFlow(t *testing.T) {
	h := demoServer(t)

	// 引用不存在的对象 → 400
	rec := callJSON(t, h, http.MethodPost, "/api/v1/bindings", map[string]any{
		"id": "bd-t1", "objectId": "o-nope", "viewId": "v1", "syncMode": "FULL"})
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("引用失效应 400，实际 %d", rec.Code)
	}
	// 正常创建（对象 o2 工厂 ↔ v3）
	rec = callJSON(t, h, http.MethodPost, "/api/v1/bindings", map[string]any{
		"id": "bd-t1", "objectId": "o2", "viewId": "v3", "pkField": "plant_code",
		"fieldMap": map[string]string{"plant_code": "工厂代码", "region": "区域"}, "syncMode": "CDC"})
	if rec.Code != http.StatusCreated {
		t.Fatalf("创建绑定失败: %d %s", rec.Code, rec.Body.String())
	}
	// 同对象+视图重复 → 409
	rec = callJSON(t, h, http.MethodPost, "/api/v1/bindings", map[string]any{
		"id": "bd-t2", "objectId": "o2", "viewId": "v3"})
	if rec.Code != http.StatusConflict {
		t.Fatalf("重复绑定应 409，实际 %d", rec.Code)
	}
	// 手动同步：落历史 + last_sync 更新
	rec = callJSON(t, h, http.MethodPost, "/api/v1/bindings/bd-t1/sync", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("同步失败: %d %s", rec.Code, rec.Body.String())
	}
	runs := []map[string]any{}
	loadList(t, h, "/api/v1/binding-runs?binding=bd-t1", &runs)
	if len(runs) == 0 {
		t.Fatal("同步历史未落库")
	}
	bl := []map[string]any{}
	loadList(t, h, "/api/v1/bindings", &bl)
	for _, b := range bl {
		if b["id"] == "bd-t1" && b["lastSync"] == "" {
			t.Fatal("同步后 last_sync 未更新")
		}
	}
	// 删除
	rec = callJSON(t, h, http.MethodDelete, "/api/v1/bindings/bd-t1", nil)
	if rec.Code != http.StatusNoContent {
		t.Fatalf("删除绑定失败: %d", rec.Code)
	}
}

func TestConvergenceFlow(t *testing.T) {
	h := demoServer(t)

	// 确定性生成：待归并同义词组（标准词空）不会生成，已归并且标准词未建模的会生成
	rec := callJSON(t, h, http.MethodPost, "/api/v1/convergence/generate", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("生成失败: %d %s", rec.Code, rec.Body.String())
	}
	// seed 的待裁决候选采纳 → 创建 DRAFT 对象
	rec = callJSON(t, h, http.MethodPost, "/api/v1/convergence/candidates/oc-1/adopt",
		map[string]any{"by": "王五"})
	if rec.Code != http.StatusOK || decodeMap(t, rec)["status"] != "已采纳" {
		t.Fatalf("采纳失败: %d %s", rec.Code, rec.Body.String())
	}
	objs := []map[string]any{}
	loadList(t, h, "/api/v1/objects", &objs)
	found := false
	for _, o := range objs {
		if o["name"] == "来料检验记录" && o["status"] == "DRAFT" {
			found = true
		}
	}
	if !found {
		t.Fatal("采纳后未创建 DRAFT 对象「来料检验记录」")
	}
	// 重放幂等
	rec = callJSON(t, h, http.MethodPost, "/api/v1/convergence/candidates/oc-1/adopt", map[string]any{"by": "王五"})
	if rec.Code != http.StatusOK || decodeMap(t, rec)["status"] != "已采纳" {
		t.Fatalf("采纳重放应幂等: %d", rec.Code)
	}
	// 已丢弃候选不可采纳 → 409
	rec = callJSON(t, h, http.MethodPost, "/api/v1/convergence/candidates/oc-3/adopt", map[string]any{"by": "王五"})
	if rec.Code != http.StatusConflict {
		t.Fatalf("已丢弃候选采纳应 409，实际 %d", rec.Code)
	}

	// 跨源对齐：生成 + 裁决
	rec = callJSON(t, h, http.MethodPost, "/api/v1/alignments/generate", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("对齐生成失败: %d", rec.Code)
	}
	rec = callJSON(t, h, http.MethodPost, "/api/v1/alignments/ea-1/decide",
		map[string]any{"action": "merge", "by": "王五"})
	if rec.Code != http.StatusOK || decodeMap(t, rec)["status"] != "已合并" {
		t.Fatalf("对齐裁决失败: %d %s", rec.Code, rec.Body.String())
	}
}

func TestOntologyMembersPublishExport(t *testing.T) {
	h := demoServer(t)

	// 成员：设置角色（upsert）+ 移除
	rec := callJSON(t, h, http.MethodPut, "/api/v1/ontologies/scm/members",
		map[string]any{"userId": "wangwu", "role": "建模者"})
	if rec.Code != http.StatusOK {
		t.Fatalf("设置成员失败: %d %s", rec.Code, rec.Body.String())
	}
	rec = callJSON(t, h, http.MethodPut, "/api/v1/ontologies/scm/members",
		map[string]any{"userId": "nope", "role": "查看者"})
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("未知用户应 400，实际 %d", rec.Code)
	}
	// 先设为所有者，唯一所有者不可移除 → 409
	rec = callJSON(t, h, http.MethodPut, "/api/v1/ontologies/scm/members",
		map[string]any{"userId": "zhangsan", "role": "所有者"})
	if rec.Code != http.StatusOK {
		t.Fatalf("设置所有者失败: %d", rec.Code)
	}
	rec = callJSON(t, h, http.MethodDelete, "/api/v1/ontologies/scm/members/zhangsan", nil)
	if rec.Code != http.StatusConflict {
		t.Fatalf("唯一所有者移除应 409，实际 %d", rec.Code)
	}

	// 发布门禁：评估返回四项检查
	gate := []map[string]any{}
	loadList(t, h, "/api/v1/release-gate?onto=scm", &gate)
	if len(gate) != 4 {
		t.Fatalf("门禁检查项应 4 项，实际 %d", len(gate))
	}

	// 发布（demo 有待评审/未绑定 → 门禁不过 → 409 且附检查项）
	rec = callJSON(t, h, http.MethodPost, "/api/v1/ontologies/scm/publish", map[string]any{"by": "张三"})
	if rec.Code == http.StatusConflict {
		if !strings.Contains(rec.Body.String(), "checks") {
			t.Fatalf("门禁失败响应应附 checks: %s", rec.Body.String())
		}
	} else if rec.Code != http.StatusOK {
		t.Fatalf("发布意外失败: %d %s", rec.Code, rec.Body.String())
	}

	// 导出：OWL Turtle 含 owl:Class；rdf 含 rdf:type
	rec = callJSON(t, h, http.MethodGet, "/api/v1/ontologies/scm/export?format=owl", nil)
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), "owl:Class") {
		t.Fatalf("OWL 导出异常: %d %s", rec.Code, rec.Body.String()[:min(200, len(rec.Body.String()))])
	}
	rec = callJSON(t, h, http.MethodGet, "/api/v1/ontologies/scm/export?format=rdf", nil)
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), "rdf:type") {
		t.Fatalf("RDF 导出异常: %d", rec.Code)
	}
}

func TestReasoningAndRetract(t *testing.T) {
	h := demoServer(t)

	// 一致性检查返回 issues 数组（demo 至少含画布对象未绑定的 warn 或其它）
	rec := callJSON(t, h, http.MethodGet, "/api/v1/reasoning/consistency?onto=scm", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("一致性检查失败: %d %s", rec.Code, rec.Body.String())
	}

	// 规则执行 R2（超期未收货）：seed PO20260930001 承诺交期已过 → 至少 1 触发，风险分 +8
	before := []map[string]any{}
	loadList(t, h, "/api/v1/instances?object=o4", &before)
	rec = callJSON(t, h, http.MethodPost, "/api/v1/reasoning/run", map[string]any{"ruleId": "R2"})
	if rec.Code != http.StatusOK {
		t.Fatalf("规则执行失败: %d %s", rec.Code, rec.Body.String())
	}
	res := decodeMap(t, rec)
	if res["fired"].(float64) < 1 {
		t.Fatalf("R2 应至少触发 1 次（seed 含超期单），实际 %v", res["fired"])
	}
	after := []map[string]any{}
	loadList(t, h, "/api/v1/instances?object=o4", &after)
	for _, a := range after {
		if a["id"] == "PO20260930001" && a["riskScore"].(float64) <= 76 {
			t.Fatalf("超期单风险分应 >76，实际 %v", a["riskScore"])
		}
	}

	// 撤回：v0.3（PUBLISHED（生产中））→ RETRACTED + 对账
	rec = callJSON(t, h, http.MethodPost, "/api/v1/versions/3/retract", map[string]any{"by": "张三"})
	if rec.Code != http.StatusOK {
		t.Fatalf("撤回失败: %d %s", rec.Code, rec.Body.String())
	}
	rep := decodeMap(t, rec)
	if rep["version"] != "v0.3" || rep["affectedObjects"].(float64) < 1 {
		t.Fatalf("对账报告异常: %v", rep)
	}
	// 重复撤回 → 409
	rec = callJSON(t, h, http.MethodPost, "/api/v1/versions/3/retract", map[string]any{"by": "张三"})
	if rec.Code != http.StatusConflict {
		t.Fatalf("重复撤回应 409，实际 %d", rec.Code)
	}
}

func TestWorkbench(t *testing.T) {
	h := demoServer(t)
	rec := callJSON(t, h, http.MethodGet, "/api/v1/workbench?user=张三", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("工作台聚合失败: %d %s", rec.Code, rec.Body.String())
	}
	w := decodeMap(t, rec)
	for _, k := range []string{"tasksRunning", "myAssets", "pendingTodos", "recentRuns", "recentPipelines", "recentQueries"} {
		if _, ok := w[k]; !ok {
			t.Fatalf("工作台缺少字段 %s: %v", k, w)
		}
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func TestCreateOntology(t *testing.T) {
	h := demoServer(t)

	// 非法 init → 400
	rec := callJSON(t, h, http.MethodPost, "/api/v1/ontologies",
		map[string]any{"id": "onto-x", "name": "测试", "scene": "s", "init": "nope"})
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("非法 init 应 400，实际 %d", rec.Code)
	}
	// 模板：4 对象 + 3 关系 + 创建者为所有者
	rec = callJSON(t, h, http.MethodPost, "/api/v1/ontologies",
		map[string]any{"id": "onto-tpl", "name": "测试本体", "scene": "模板验证", "owner": "zhangsan", "init": "template"})
	if rec.Code != http.StatusCreated {
		t.Fatalf("创建失败: %d %s", rec.Code, rec.Body.String())
	}
	body := decodeMap(t, rec)
	if body["myRole"] != "所有者" || body["objects"].(float64) != 4 || body["edges"].(float64) != 3 {
		t.Fatalf("模板初始化计数/角色异常: %v", body)
	}
	// 重放幂等
	rec = callJSON(t, h, http.MethodPost, "/api/v1/ontologies",
		map[string]any{"id": "onto-tpl", "name": "测试本体", "scene": "模板验证", "init": "template"})
	if rec.Code != http.StatusCreated || rec.Header().Get("X-Idempotent-Replay") != "true" {
		t.Fatalf("重放应 201+replay，实际 %d", rec.Code)
	}
	// 逆向：从 table_profiles 生成对象草稿（seed 有 1 张 purchase_order）
	rec = callJSON(t, h, http.MethodPost, "/api/v1/ontologies",
		map[string]any{"id": "onto-rev", "name": "逆向本体", "scene": "逆向验证", "owner": "sunqi", "init": "reverse"})
	if rec.Code != http.StatusCreated {
		t.Fatalf("逆向创建失败: %d %s", rec.Code, rec.Body.String())
	}
	objs := []map[string]any{}
	loadList(t, h, "/api/v1/objects?scope=canvas", &objs)
	found := false
	for _, o := range objs {
		if o["ontology"] == "逆向本体" && o["status"] == "DRAFT" {
			found = true
		}
	}
	if !found {
		t.Fatal("逆向初始化未生成画布对象草稿")
	}
	// 空白：仅元数据
	rec = callJSON(t, h, http.MethodPost, "/api/v1/ontologies",
		map[string]any{"id": "onto-blank", "name": "空白本体", "scene": "空白", "init": "blank"})
	body = decodeMap(t, rec)
	if body["objects"].(float64) != 0 {
		t.Fatalf("空白初始化不应有对象: %v", body)
	}
}
