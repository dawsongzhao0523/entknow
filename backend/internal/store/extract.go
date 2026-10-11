// 知识萃取增强：从知识条目（kb_entries）自动提取本体候选，进入隐式收敛裁决流。
package store

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/dawsongzhao0523/entknow/backend/internal/llm"
)

// ExtractKbEntry 从知识条目提取候选对象/关系：
// LLM 可用时按「29句话」范式抽取；否则用确定性规则引擎（复用 AI 建模解析器）。
// 提取结果写入 onto_candidates（幂等：同 source 同 suggestion 不重复）。
func (s *Store) ExtractKbEntry(ctx context.Context, entryID string, llmc *llm.Client) ([]OntoCandidate, error) {
	entry, err := s.GetKbEntry(ctx, entryID)
	if err != nil {
		return nil, err
	}
	// 语料：条目标题 + 术语 + SOP 要点
	var corpus strings.Builder
	corpus.WriteString(entry.Title + "。")
	for _, t := range entry.Terms {
		corpus.WriteString(t.Term + "、")
	}
	for _, sop := range entry.Sops {
		corpus.WriteString(sop + "。")
	}

	var draft *AIDraft
	if llmc.Enabled() {
		if d, err := s.aiGenerateLLM(ctx, llmc, corpus.String()); err == nil {
			draft = d
		} else {
			_ = s.EmitSystemLog(ctx, "WARN", "llm", "知识萃取 LLM 失败，回退规则引擎: "+err.Error())
		}
	}
	if draft == nil {
		draft = aiGenerateRules(corpus.String())
	}

	source := "知识条目「" + entry.Title + "」"
	now := time.Now().Format("2006-01-02 15:04")
	created := 0
	objNames := map[string]bool{}
	if objects, err := s.ListObjects(ctx, ""); err == nil {
		for _, o := range objects {
			objNames[o.Name] = true
		}
	}
	for _, o := range draft.Objects {
		if objNames[o.Name] {
			continue // 已显式建模
		}
		var exists int
		if err := s.pool.QueryRow(ctx,
			`SELECT count(*) FROM onto_candidates WHERE source=$1 AND suggestion=$2`,
			source, o.Name).Scan(&exists); err != nil {
			return nil, err
		}
		if exists > 0 {
			continue
		}
		propDesc := ""
		if len(o.Props) > 0 {
			names := make([]string, 0, len(o.Props))
			for _, p := range o.Props {
				names = append(names, p.Name)
			}
			propDesc = "，含属性：" + strings.Join(names, "/")
		}
		if _, err := s.pool.Exec(ctx, `
			INSERT INTO onto_candidates (id, source, suggestion, kind, evidence, status, by, at)
			VALUES ($1,$2,$3,'对象',$4,'待裁决','',$5)`,
			fmt.Sprintf("ext-%d-%s", time.Now().UnixNano()%1e6, o.Name), source, o.Name,
			"从知识条目萃取"+propDesc, now); err != nil {
			return nil, err
		}
		created++
	}
	_ = s.EmitSystemLog(ctx, "INFO", "knowledge",
		fmt.Sprintf("知识萃取「%s」: 新增 %d 个对象候选", entry.Title, created))
	return s.ListCandidates(ctx, "待裁决")
}
