// AI 精准建模：自然语言 → 本体草稿（LLM 优先，未配置时确定性规则引擎回退）。
// 依据《本体驱动的AI数据管理》第 6 章：AI 按「29句话」范式提炼业务要素。
package store

import (
	"context"
	"encoding/json"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/dawsongzhao0523/entknow/backend/internal/llm"
)

// AIDraft AI 生成的本体草稿（预览态，确认后入库）。
type AIDraft struct {
	Source  string          `json:"source"` // llm | rules
	Objects []AIDraftObject `json:"objects"`
	Edges   []AIDraftEdge   `json:"edges"`
	Reply   string          `json:"reply,omitempty"` // LLM 模式下的建模说明
}

// AIDraftObject 草稿对象。
type AIDraftObject struct {
	Name  string `json:"name"`
	En    string `json:"en"`
	Kind  string `json:"kind"`
	Props []Prop `json:"props"`
}

// AIDraftEdge 草稿关系。
type AIDraftEdge struct {
	Name string `json:"name"`
	From string `json:"from"`
	To   string `json:"to"`
}

// AIGenerate 从自然语言场景描述生成本体草稿：LLM 可用走 LLM，否则规则引擎。
func (s *Store) AIGenerate(ctx context.Context, llmc *llm.Client, input string) (*AIDraft, error) {
	input = strings.TrimSpace(input)
	if len(input) < 6 {
		return nil, fmt.Errorf("%w: 场景描述过短（至少 6 字符）", ErrInvalid)
	}
	if llmc.Enabled() {
		if d, err := s.aiGenerateLLM(ctx, llmc, input); err == nil {
			return d, nil
		} else {
			// LLM 失败不阻塞：记录后回退规则引擎
			_ = s.EmitSystemLog(ctx, "WARN", "llm", "LLM 生成失败，回退规则引擎: "+err.Error())
		}
	}
	return aiGenerateRules(input), nil
}

// aiGenerateLLM 调 LLM 输出结构化本体 JSON。
func (s *Store) aiGenerateLLM(ctx context.Context, llmc *llm.Client, input string) (*AIDraft, error) {
	system := `你是本体建模专家（参考《本体驱动的AI数据管理》「7+1」语义规范）。
将用户的业务场景描述转化为本体模型，严格输出 JSON（不要 markdown 代码块）：
{"objects":[{"name":"中文名","en":"EnglishName","kind":"静态事实|单体动态|立方动态","props":[{"name":"属性名","type":"string|int|decimal|date|bool","comment":"说明"}]}],
 "edges":[{"name":"关系中文名","from":"起点对象中文名","to":"终点对象中文名"}],
 "reply":"一句话建模说明"}
要求：对象英文标识用 PascalCase；关系绑定具体业务动作（如「供应」「生产」而非笼统「关联」）；属性类型尽量精确。`
	text, err := llmc.Chat(ctx, system, input)
	if err != nil {
		return nil, err
	}
	var d AIDraft
	if err := json.Unmarshal([]byte(extractJSON(text)), &d); err != nil {
		return nil, fmt.Errorf("LLM 输出无法解析为 JSON: %w", err)
	}
	if len(d.Objects) == 0 {
		return nil, fmt.Errorf("LLM 未生成任何对象")
	}
	d.Source = "llm"
	return &d, nil
}

// extractJSON 剥离可能的 markdown 代码围栏，取出 JSON 主体。
func extractJSON(text string) string {
	text = strings.TrimSpace(text)
	if !strings.HasPrefix(text, "{") {
		if i := strings.Index(text, "{"); i >= 0 {
			if j := strings.LastIndex(text, "}"); j > i {
				text = text[i : j+1]
			}
		}
	}
	return text
}

// ─── 确定性规则引擎（LLM 未配置时的回退） ───

var (
	// 句尾计数词：「四个」「等12个」等
	reCountTail = regexp.MustCompile(`(等|共)?[一二两三四五六七八九十百\d]+个$`)
	// 关系动词表：「X供应Y」
	reRel = regexp.MustCompile(`([\p{Han}]{2,10})(供应|生产|包含|属于|导致|触发|依赖|配送|审批|创建|引用|使用|组成|监测|管理|关联|对应|持有|下达|执行|检验|维修|运输|采购)([\p{Han}]{2,10})`)
)

// aiGenerateRules 确定性规则引擎：
// 模式1（属性声明）「X有A/B/C四个属性」→ 对象 X + 属性 A,B,C；
// 模式2（关系声明）「X动词Y」→ 关系 X→Y。
func aiGenerateRules(input string) *AIDraft {
	d := &AIDraft{Source: "rules", Objects: []AIDraftObject{}, Edges: []AIDraftEdge{}}
	objIdx := map[string]int{}
	addObject := func(name string) {
		name = strings.TrimSpace(name)
		if name == "" {
			return
		}
		if _, ok := objIdx[name]; !ok {
			objIdx[name] = len(d.Objects)
			d.Objects = append(d.Objects, AIDraftObject{Name: name, En: name, Kind: "静态事实", Props: []Prop{}})
		}
	}

	// 模式 1：属性声明（逐句处理，避免跨句误并）
	for _, seg := range splitSentences(input) {
		i := strings.Index(seg, "属性")
		if i <= 0 {
			continue
		}
		head := reCountTail.ReplaceAllString(seg[:i], "")
		j := strings.LastIndex(head, "有")
		if j <= 0 || j >= len(head)-1 {
			continue
		}
		obj, propPart := head[:j], head[j+1:]
		addObject(obj)
		var props []Prop
		for _, p := range strings.FieldsFunc(propPart, func(r rune) bool { return r == '/' || r == '、' || r == '，' || r == ',' || r == ' ' }) {
			p = strings.TrimSpace(p)
			if p == "" {
				continue
			}
			comment := ""
			if k := strings.IndexAny(p, "（）()"); k > 0 {
				comment = strings.Trim(p[k:], "()（）")
				p = p[:k]
			}
			props = append(props, Prop{Name: p, Type: guessPropType(p), Comment: comment})
		}
		d.Objects[objIdx[obj]].Props = append(d.Objects[objIdx[obj]].Props, props...)
	}

	// 模式 2：关系声明（全文扫描）
	for _, m := range reRel.FindAllStringSubmatch(input, -1) {
		from, verb, to := m[1], m[2], m[3]
		addObject(from)
		addObject(to)
		d.Edges = append(d.Edges, AIDraftEdge{Name: verb, From: from, To: to})
	}
	return d
}

// splitSentences 按 。；；\n 切句（保留逗号，属性清单常含逗号）。
func splitSentences(s string) []string {
	return strings.FieldsFunc(s, func(r rune) bool { return r == '。' || r == '；' || r == ';' || r == '\n' })
}

// guessPropType 按属性名关键词推断类型。
func guessPropType(name string) string {
	switch {
	case strings.Contains(name, "数量"), strings.Contains(name, "次数"), strings.Contains(name, "编号"):
		return "int"
	case strings.Contains(name, "金额"), strings.Contains(name, "价格"), strings.Contains(name, "比例"), strings.Contains(name, "率"):
		return "decimal"
	case strings.Contains(name, "日期"), strings.Contains(name, "时间"), strings.Contains(name, "交期"):
		return "date"
	case strings.Contains(name, "是否"), strings.HasPrefix(name, "is"):
		return "bool"
	default:
		return "string"
	}
}

// ApplyAIDraft 确认入库：对象（DRAFT v0.1）+ 关系（DRAFT）。
// 关系端点不在草稿且不在库中时跳过该边（容错，不整批失败）。
func (s *Store) ApplyAIDraft(ctx context.Context, draft *AIDraft, ontoName, by string) (map[string]any, error) {
	if ontoName == "" {
		ontoName = "供应链本体"
	}
	if by == "" {
		by = "AI"
	}
	draftNames := map[string]bool{}
	for _, o := range draft.Objects {
		draftNames[o.Name] = true
	}
	existsInDB := func(name string) bool {
		var status string
		err := s.pool.QueryRow(ctx, `SELECT status FROM objects WHERE name = $1`, name).Scan(&status)
		return err == nil && status != "DEPRECATED"
	}

	createdObjs, createdEdges := []Object{}, []Edge{}
	for i, o := range draft.Objects {
		if o.En == "" {
			o.En = o.Name
		}
		if o.Kind == "" {
			o.Kind = "静态事实"
		}
		if o.Props == nil {
			o.Props = []Prop{}
		}
		in := Object{
			ID: fmt.Sprintf("ai-o-%d-%d", i+1, time.Now().UnixNano()%1e6), Name: o.Name, En: o.En, Kind: o.Kind,
			Version: "v0.1", Status: "DRAFT", Owner: by, Ontology: ontoName, RefCount: 0, Props: o.Props,
		}
		obj, created, err := s.CreateObject(ctx, in)
		if err != nil {
			return nil, err
		}
		if created {
			createdObjs = append(createdObjs, obj)
		}
	}
	skippedEdges := 0
	for i, e := range draft.Edges {
		if !draftNames[e.From] && !existsInDB(e.From) || !draftNames[e.To] && !existsInDB(e.To) {
			skippedEdges++
			continue
		}
		in := Edge{
			ID: fmt.Sprintf("ai-e-%d-%d", i+1, time.Now().UnixNano()%1e6), Name: e.Name, From: e.From, To: e.To,
			Version: "v0.1", Status: "DRAFT", RefCount: 0, Props: []Prop{},
		}
		edge, created, err := s.CreateEdge(ctx, in)
		if err != nil {
			return nil, err
		}
		if created {
			createdEdges = append(createdEdges, edge)
		}
	}
	_ = s.EmitSystemLog(ctx, "INFO", "modeling",
		fmt.Sprintf("AI 建模入库: %d 对象 + %d 关系（来源 %s）", len(createdObjs), len(createdEdges), draft.Source))
	return map[string]any{
		"createdObjects": createdObjs, "createdEdges": createdEdges,
		"skippedObjects": len(draft.Objects) - len(createdObjs), "skippedEdges": skippedEdges,
	}, nil
}
