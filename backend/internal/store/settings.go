// 个性化设置：按账号 upsert 与读取（settings 为前端自有形状的 jsonb）。
package store

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/jackc/pgx/v5"
)

// UserSetting 账号设置包装。
type UserSetting struct {
	Account  string          `json:"account"`
	Settings json.RawMessage `json:"settings"`
}

// GetUserSetting 返回账号设置；无记录返回空对象（前端用默认值兜底）。
func (s *Store) GetUserSetting(ctx context.Context, account string) (UserSetting, error) {
	var u UserSetting
	err := s.pool.QueryRow(ctx,
		`SELECT account, settings::text FROM user_settings WHERE account = $1`, account).
		Scan(&u.Account, &u.Settings)
	if errors.Is(err, pgx.ErrNoRows) {
		return UserSetting{Account: account, Settings: json.RawMessage(`{}`)}, nil
	}
	if err != nil {
		return u, err
	}
	if len(u.Settings) == 0 {
		u.Settings = json.RawMessage(`{}`)
	}
	return u, nil
}

// SaveUserSetting 按账号 upsert（幂等语义：重复保存覆盖为最新）。
func (s *Store) SaveUserSetting(ctx context.Context, u UserSetting) (UserSetting, error) {
	if len(u.Settings) == 0 {
		u.Settings = json.RawMessage(`{}`)
	}
	err := s.pool.QueryRow(ctx, `
		INSERT INTO user_settings (account, settings) VALUES ($1, $2)
		ON CONFLICT (account) DO UPDATE SET settings = EXCLUDED.settings
		RETURNING account, settings::text`,
		u.Account, u.Settings).
		Scan(&u.Account, &u.Settings)
	return u, err
}
