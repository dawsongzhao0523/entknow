// OWL/RDF 本体文件导入：解析 RDF/XML (.owl/.rdf) 与 Turtle (.ttl)，
// 提取类→对象、对象属性→关系、数据属性→属性，支持预览+确认两步导入。
package store

import (
	"context"
	"encoding/xml"
	"fmt"
	"regexp"
	"strings"
)

// ImportedObject 解析出的对象。
type ImportedObject struct {
	En    string `json:"en"`
	Label string `json:"label"`
	Kind  string `json:"kind"` // 默认"静态事实"
	Props []Prop `json:"props"`
}

// ImportedEdge 解析出的关系。
type ImportedEdge struct {
	Name  string `json:"name"`
	Label string `json:"label"`
	From  string `json:"from"` // 对象英文名
	To    string `json:"to"`
}

// ImportPreview 导入预览。
type ImportPreview struct {
	Objects []ImportedObject `json:"objects"`
	Edges   []ImportedEdge   `json:"edges"`
	Stats   map[string]int   `json:"stats"`
}

// ─── RDF/XML 解析 ───

type rdfRDF struct {
	Classes       []rdfClass        `xml:"Class"`
	ObjectProps   []rdfObjectProp   `xml:"ObjectProperty"`
	DatatypeProps []rdfDatatypeProp `xml:"DatatypeProperty"`
	RDFProps      []rdfGenProp      `xml:"Property"` // FOAF 风格的 rdf:Property
}

// rdfGenProp 通用属性（FOAF 等用 rdf:Property + 嵌套 rdf:type 声明类型）
type rdfGenProp struct {
	About  string    `xml:"about,attr"`
	Label  string    `xml:"label"`
	Types  []rdfType `xml:"type"`
	Domain rdfRef    `xml:"domain"`
	Range  rdfRef    `xml:"range"`
}

type rdfType struct {
	Resource string `xml:"resource,attr"`
}

type rdfClass struct {
	ID    string `xml:"ID,attr"`
	About string `xml:"about,attr"`
	Label string `xml:"label"`
}

type rdfObjectProp struct {
	ID     string `xml:"ID,attr"`
	About  string `xml:"about,attr"`
	Label  string `xml:"label"`
	Domain rdfRef `xml:"domain"`
	Range  rdfRef `xml:"range"`
}

type rdfDatatypeProp struct {
	ID     string `xml:"ID,attr"`
	About  string `xml:"about,attr"`
	Label  string `xml:"label"`
	Domain rdfRef `xml:"domain"`
	Range  struct {
		Resource string `xml:"resource,attr"`
	} `xml:"range"`
}

type rdfRef struct {
	Resource string `xml:"resource,attr"`
}

func refToLocal(ref string) string {
	// #Supplier → Supplier；去掉命名空间前缀
	if i := strings.LastIndex(ref, "#"); i >= 0 {
		return ref[i+1:]
	}
	if i := strings.LastIndex(ref, "/"); i >= 0 {
		return ref[i+1:]
	}
	return ref
}

// ParseRDFXML 解析 RDF/XML 格式的 OWL 文件。
func ParseRDFXML(data []byte) (*ImportPreview, error) {
	var doc rdfRDF
	if err := xml.Unmarshal(data, &doc); err != nil {
		return nil, fmt.Errorf("RDF/XML 解析失败: %w", err)
	}

	preview := &ImportPreview{Stats: map[string]int{}}

	// 解析类 → 对象
	for _, c := range doc.Classes {
		en := c.ID
		if en == "" {
			en = refToLocal(c.About)
		}
		if en == "" {
			continue
		}
		label := c.Label
		if label == "" {
			label = en
		}
		preview.Objects = append(preview.Objects, ImportedObject{En: en, Label: label, Kind: "静态事实"})
	}

	// 解析数据属性 → 挂到对应对象
	for _, dp := range doc.DatatypeProps {
		en := dp.ID
		if en == "" {
			en = refToLocal(dp.About)
		}
		domain := refToLocal(dp.Domain.Resource)
		type_ := "string"
		if strings.Contains(dp.Range.Resource, "integer") || strings.Contains(dp.Range.Resource, "int") {
			type_ = "int"
		} else if strings.Contains(dp.Range.Resource, "decimal") || strings.Contains(dp.Range.Resource, "double") {
			type_ = "decimal"
		} else if strings.Contains(dp.Range.Resource, "boolean") {
			type_ = "boolean"
		} else if strings.Contains(dp.Range.Resource, "dateTime") || strings.Contains(dp.Range.Resource, "date") {
			type_ = "datetime"
		}
		for i := range preview.Objects {
			if preview.Objects[i].En == domain {
				preview.Objects[i].Props = append(preview.Objects[i].Props, Prop{Name: en, Type: type_, Comment: dp.Label})
			}
		}
	}

	// 解析对象属性 → 关系
	for _, op := range doc.ObjectProps {
		en := op.ID
		if en == "" {
			en = refToLocal(op.About)
		}
		if en == "" {
			continue
		}
		preview.Edges = append(preview.Edges, ImportedEdge{
			Name: en, Label: op.Label,
			From: refToLocal(op.Domain.Resource), To: refToLocal(op.Range.Resource),
		})
	}

	// 解析通用属性（FOAF 风格：rdf:Property + 嵌套 rdf:type 判别）
	for _, rp := range doc.RDFProps {
		en := refToLocal(rp.About)
		if en == "" {
			continue
		}
		isObjProp, isDataProp := false, false
		for _, t := range rp.Types {
			if strings.HasSuffix(t.Resource, "ObjectProperty") {
				isObjProp = true
			}
			if strings.HasSuffix(t.Resource, "DatatypeProperty") {
				isDataProp = true
			}
		}
		if isObjProp {
			from := refToLocal(rp.Domain.Resource)
			to := refToLocal(rp.Range.Resource)
			if from != "" && to != "" && to != "Thing" {
				preview.Edges = append(preview.Edges, ImportedEdge{Name: en, Label: rp.Label, From: from, To: to})
			}
		} else if isDataProp {
			domain := refToLocal(rp.Domain.Resource)
			type_ := "string"
			if strings.Contains(rp.Range.Resource, "integer") || strings.Contains(rp.Range.Resource, "int") {
				type_ = "int"
			} else if strings.Contains(rp.Range.Resource, "decimal") || strings.Contains(rp.Range.Resource, "double") {
				type_ = "decimal"
			} else if strings.Contains(rp.Range.Resource, "boolean") {
				type_ = "boolean"
			}
			for i := range preview.Objects {
				if preview.Objects[i].En == domain {
					preview.Objects[i].Props = append(preview.Objects[i].Props, Prop{Name: en, Type: type_, Comment: rp.Label})
				}
			}
		}
	}

	preview.Stats["objects"] = len(preview.Objects)
	preview.Stats["edges"] = len(preview.Edges)
	preview.Stats["props"] = 0
	for _, o := range preview.Objects {
		preview.Stats["props"] += len(o.Props)
	}
	return preview, nil
}

// ─── Turtle 解析 ───

var turtleClassRe = regexp.MustCompile(`(?m)^\s*<([^>]+)>\s+a\s+owl:Class`)
var turtleLabelRe = regexp.MustCompile(`rdfs:label\s+"([^"]*)"`)
var turtleObjPropRe = regexp.MustCompile(`(?m)^\s*<([^>]+)>\s+a\s+owl:ObjectProperty`)
var turtleDomainRe = regexp.MustCompile(`rdfs:domain\s+<([^>]+)>`)
var turtleRangeRe = regexp.MustCompile(`rdfs:range\s+<([^>]+)>`)
var turtleDataPropRe = regexp.MustCompile(`(?m)^\s*<([^>]+)>\s+a\s+owl:DatatypeProperty`)

// ParseTurtle 解析 Turtle 格式的 OWL 文件（基础支持）。
func ParseTurtle(data []byte) (*ImportPreview, error) {
	text := string(data)
	preview := &ImportPreview{Stats: map[string]int{}}

	// 解析类
	classMatches := turtleClassRe.FindAllStringSubmatch(text, -1)
	for _, m := range classMatches {
		en := refToLocal(m[1])
		if en == "" {
			continue
		}
		// 尝试从同一块中提取 label
		label := en
		start := strings.Index(text, m[0])
		if start >= 0 {
			block := text[start:]
			if end := strings.Index(block, "\n\n"); end > 0 {
				block = block[:end]
			}
			if lm := turtleLabelRe.FindStringSubmatch(block); lm != nil {
				label = lm[1]
			}
		}
		preview.Objects = append(preview.Objects, ImportedObject{En: en, Label: label, Kind: "静态事实"})
	}

	// 解析对象属性
	propMatches := turtleObjPropRe.FindAllStringSubmatch(text, -1)
	for _, m := range propMatches {
		en := refToLocal(m[1])
		// 找到该属性所在的块（到下一个空行）
		start := strings.Index(text, m[0])
		block := text[start:]
		if end := strings.Index(block, "\n\n"); end > 0 {
			block = block[:end]
		}
		from, to := "", ""
		if dm := turtleDomainRe.FindStringSubmatch(block); dm != nil {
			from = refToLocal(dm[1])
		}
		if rm := turtleRangeRe.FindStringSubmatch(block); rm != nil {
			to = refToLocal(rm[1])
		}
		if en != "" && from != "" && to != "" {
			preview.Edges = append(preview.Edges, ImportedEdge{Name: en, Label: en, From: from, To: to})
		}
	}

	preview.Stats["objects"] = len(preview.Objects)
	preview.Stats["edges"] = len(preview.Edges)
	return preview, nil
}

// ParseOntologyFile 根据文件名/内容自动选择解析器。
func ParseOntologyFile(filename string, data []byte) (*ImportPreview, error) {
	lower := strings.ToLower(filename)
	if strings.HasSuffix(lower, ".ttl") {
		return ParseTurtle(data)
	}
	// .owl 和 .rdf 默认 RDF/XML；如果不是 XML 开头则尝试 Turtle
	trimmed := strings.TrimSpace(string(data))
	if strings.HasPrefix(trimmed, "<") {
		return ParseRDFXML(data)
	}
	return ParseTurtle(data)
}

// ConfirmImport 确认导入：创建对象与关系（幂等）。
func (s *Store) ConfirmImport(ctx context.Context, ontoID string, preview *ImportPreview, owner string) (map[string]int, error) {
	onto, err := s.getOntology(ctx, ontoID)
	if err != nil {
		return nil, ErrNotFound
	}

	created := map[string]int{"objects": 0, "edges": 0}

	// 创建对象
	for _, io := range preview.Objects {
		obj := Object{
			ID:   fmt.Sprintf("imp-%s-%s", ontoID, strings.ToLower(io.En)),
			Name: io.Label, En: io.En, Kind: io.Kind,
			Version: "v0.1", Status: "DRAFT", Owner: owner, Ontology: onto.Name,
			Props: io.Props,
		}
		if len(obj.Props) == 0 {
			obj.Props = []Prop{{Name: io.En + "_id", Type: "string", Comment: "导入，待补全"}}
		}
		if _, wasCreated, err := s.CreateObject(ctx, obj); err == nil && wasCreated {
			created["objects"]++
		}
		// 设 canvas=true
		_, _ = s.pool.Exec(ctx, `UPDATE objects SET canvas=true WHERE id=$1`, obj.ID)
	}

	// 创建关系
	for _, ie := range preview.Edges {
		edge := Edge{
			ID:   fmt.Sprintf("imp-%s-%s", ontoID, strings.ToLower(ie.Name)),
			Name: ie.Name, From: ie.From, To: ie.To,
			Version: "v0.1", Status: "DRAFT", RefCount: 0,
		}
		if _, wasCreated, err := s.CreateEdge(ctx, edge); err == nil && wasCreated {
			created["edges"]++
		}
	}

	return created, nil
}
