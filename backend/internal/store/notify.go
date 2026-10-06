// 通知中心：按人投递（to_user 空=广播）、每用户已读状态与定向发射。
package store

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5"
)

// Notification 通知（unread 由该用户已读记录派生）。
type Notification struct {
	ID     string `json:"id"`
	Cat    string `json:"cat"`
	Title  string `json:"title"`
	Time   string `json:"time"`
	To     string `json:"to"`
	ToUser string `json:"toUser"`
	Unread bool   `json:"unread"`
}

// ListNotificationsFor 返回对用户可见的通知（定向 + 广播），未读 = 无已读记录。
func (s *Store) ListNotificationsFor(ctx context.Context, user string) ([]Notification, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT n.id, n.cat, n.title, n.time, n.to_path, n.to_user,
		       NOT EXISTS (SELECT 1 FROM notification_reads r
		                   WHERE r.notification_id = n.id AND r.user_id = $1)
		FROM notifications n
		WHERE n.to_user IN ('', $1)
		ORDER BY n.id DESC`, user)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Notification
	for rows.Next() {
		var n Notification
		if err := rows.Scan(&n.ID, &n.Cat, &n.Title, &n.Time, &n.To, &n.ToUser, &n.Unread); err != nil {
			return nil, err
		}
		out = append(out, n)
	}
	return out, rows.Err()
}

// MarkNotificationRead 标记已读（幂等：重复标记 no-op）；通知不可见（非定向本人）→ 404 语义。
func (s *Store) MarkNotificationRead(ctx context.Context, id, user string) error {
	var n int
	if err := s.pool.QueryRow(ctx,
		`SELECT count(*) FROM notifications WHERE id=$1 AND to_user IN ('', $2)`, id, user).Scan(&n); err != nil {
		return err
	}
	if n == 0 {
		return ErrNotFound
	}
	_, err := s.pool.Exec(ctx, `
		INSERT INTO notification_reads (user_id, notification_id, read_at)
		VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
		user, id, time.Now().Format("2006-01-02 15:04"))
	return err
}

// MarkAllNotificationsRead 对用户可见的未读通知全部标记已读（幂等）。
func (s *Store) MarkAllNotificationsRead(ctx context.Context, user string) (int, error) {
	tag, err := s.pool.Exec(ctx, `
		INSERT INTO notification_reads (user_id, notification_id, read_at)
		SELECT $1, n.id, $2 FROM notifications n
		WHERE n.to_user IN ('', $1)
		  AND NOT EXISTS (SELECT 1 FROM notification_reads r
		                  WHERE r.notification_id = n.id AND r.user_id = $1)
		ON CONFLICT DO NOTHING`,
		user, time.Now().Format("2006-01-02 15:04"))
	if err != nil {
		return 0, err
	}
	return int(tag.RowsAffected()), nil
}

// EmitNotification 发射通知（toUser 空 = 广播）；确定性 id 由调用方保证幂等。
func (s *Store) EmitNotification(ctx context.Context, id, cat, title, toPath, toUser string) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO notifications (id, cat, title, time, to_path, unread, to_user)
		VALUES ($1, $2, $3, '刚刚', $4, true, $5)
		ON CONFLICT (id) DO NOTHING`,
		id, cat, title, toPath, toUser)
	return err
}

// accountByName 按姓名映射账号（找不到返回空 = 广播）。
func (s *Store) accountByName(ctx context.Context, name string) string {
	if name == "" {
		return ""
	}
	var account string
	err := s.pool.QueryRow(ctx, `SELECT account FROM users WHERE name = $1`, name).Scan(&account)
	if err == pgx.ErrNoRows {
		return ""
	}
	if err != nil {
		return ""
	}
	return account
}
