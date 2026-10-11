// Package llm 提供统一的 LLM 调用层：OpenAI / Anthropic / Ollama，
// 由环境变量切换（ENTKNOW_LLM_PROVIDER / _API_KEY / _BASE_URL / _MODEL）。
// 未配置 provider 时 Client 为 nil，调用方回退确定性规则引擎。
package llm

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"
)

// ErrDisabled LLM 未配置。
var ErrDisabled = fmt.Errorf("LLM 未配置（ENTKNOW_LLM_PROVIDER 为空）")

// Config LLM 连接配置。
type Config struct {
	Provider string // openai | anthropic | ollama
	APIKey   string
	BaseURL  string
	Model    string
}

// FromEnv 从环境变量读取配置；provider 为空返回 nil 表示禁用。
func FromEnv() *Config {
	provider := strings.ToLower(strings.TrimSpace(os.Getenv("ENTKNOW_LLM_PROVIDER")))
	if provider == "" {
		return nil
	}
	c := &Config{
		Provider: provider,
		APIKey:   os.Getenv("ENTKNOW_LLM_API_KEY"),
		BaseURL: strings.TrimSpace(os.Getenv("ENTKNOW_LLM_BASE_URL")),
		Model:   strings.TrimSpace(os.Getenv("ENTKNOW_LLM_MODEL")),
	}
	if c.Model == "" {
		switch provider {
		case "openai":
			c.Model = "gpt-4o-mini"
		case "anthropic":
			c.Model = "claude-sonnet-4-20250514"
		case "ollama":
			c.Model = "qwen2.5:7b"
		}
	}
	if c.BaseURL == "" {
		switch provider {
		case "openai":
			c.BaseURL = "https://api.openai.com/v1"
		case "anthropic":
			c.BaseURL = "https://api.anthropic.com"
		case "ollama":
			c.BaseURL = "http://localhost:11434"
		}
	}
	return c
}

// Client 统一对话接口。
type Client struct {
	cfg  Config
	http *http.Client
}

// New 按配置创建客户端。
func New(cfg Config) *Client {
	return &Client{cfg: cfg, http: &http.Client{Timeout: 90 * time.Second}}
}

// Enabled 配置存在且 provider 合法。
func (c *Client) Enabled() bool { return c != nil && c.cfg.Provider != "" }

// Chat 发送 system+user 消息，返回模型回复文本。
func (c *Client) Chat(ctx context.Context, system, user string) (string, error) {
	if !c.Enabled() {
		return "", ErrDisabled
	}
	switch c.cfg.Provider {
	case "openai":
		return c.chatOpenAI(ctx, system, user)
	case "anthropic":
		return c.chatAnthropic(ctx, system, user)
	case "ollama":
		return c.chatOllama(ctx, system, user)
	default:
		return "", fmt.Errorf("未知 LLM provider: %s", c.cfg.Provider)
	}
}

// Describe 供前端展示当前 LLM 配置（不泄露 key）。
func (c *Client) Describe() map[string]any {
	if !c.Enabled() {
		return map[string]any{"enabled": false}
	}
	key := c.cfg.APIKey
	if len(key) > 8 {
		key = key[:4] + "****" + key[len(key)-4:]
	} else if key != "" {
		key = "****"
	}
	return map[string]any{"enabled": true, "provider": c.cfg.Provider, "model": c.cfg.Model, "baseURL": c.cfg.BaseURL, "apiKey": key}
}

func (c *Client) post(ctx context.Context, url string, headers map[string]string, body any, out any) error {
	payload, err := json.Marshal(body)
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(payload))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	resp, err := c.http.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		var e struct {
			Error string `json:"error"`
		}
		_ = json.NewDecoder(resp.Body).Decode(&e)
		if e.Error == "" {
			e.Error = resp.Status
		}
		return fmt.Errorf("LLM %s: %s", c.cfg.Provider, e.Error)
	}
	return json.NewDecoder(resp.Body).Decode(out)
}

// chatOpenAI OpenAI Chat Completions（兼容任意 OpenAI 协议网关）。
func (c *Client) chatOpenAI(ctx context.Context, system, user string) (string, error) {
	var out struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	err := c.post(ctx, c.cfg.BaseURL+"/chat/completions",
		map[string]string{"Authorization": "Bearer " + c.cfg.APIKey},
		map[string]any{
			"model": c.cfg.Model,
			"messages": []map[string]string{
				{"role": "system", "content": system},
				{"role": "user", "content": user},
			},
			"temperature": 0.2,
		}, &out)
	if err != nil {
		return "", err
	}
	if len(out.Choices) == 0 {
		return "", fmt.Errorf("LLM 返回空 choices")
	}
	return out.Choices[0].Message.Content, nil
}

// chatAnthropic Anthropic Messages API。
func (c *Client) chatAnthropic(ctx context.Context, system, user string) (string, error) {
	var out struct {
		Content []struct {
			Type string `json:"type"`
			Text string `json:"text"`
		} `json:"content"`
	}
	err := c.post(ctx, c.cfg.BaseURL+"/v1/messages",
		map[string]string{
			"x-api-key":         c.cfg.APIKey,
			"anthropic-version": "2023-06-01",
		},
		map[string]any{
			"model":      c.cfg.Model,
			"max_tokens": 4096,
			"system":     system,
			"messages":   []map[string]string{{"role": "user", "content": user}},
		}, &out)
	if err != nil {
		return "", err
	}
	var b strings.Builder
	for _, seg := range out.Content {
		if seg.Type == "text" {
			b.WriteString(seg.Text)
		}
	}
	if b.Len() == 0 {
		return "", fmt.Errorf("LLM 返回空 content")
	}
	return b.String(), nil
}

// chatOllama 本地 Ollama（无需 key）。
func (c *Client) chatOllama(ctx context.Context, system, user string) (string, error) {
	var out struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	}
	err := c.post(ctx, c.cfg.BaseURL+"/api/chat", nil,
		map[string]any{
			"model": c.cfg.Model,
			"messages": []map[string]string{
				{"role": "system", "content": system},
				{"role": "user", "content": user},
			},
			"stream": false,
		}, &out)
	if err != nil {
		return "", err
	}
	return out.Message.Content, nil
}
