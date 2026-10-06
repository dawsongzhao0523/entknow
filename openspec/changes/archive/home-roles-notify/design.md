# Design: home-roles-notify

## 通知模型
```sql
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS to_user text NOT NULL DEFAULT '';  -- 空=广播
CREATE TABLE IF NOT EXISTS notification_reads (
  user_id text NOT NULL, notification_id text NOT NULL, read_at text NOT NULL DEFAULT '',
  PRIMARY KEY (user_id, notification_id)
);
```
未读 = 不存在对应 read 记录。可见 = to_user IN ('', $user)。

## 端点
- GET /api/v1/notifications?user= → [{id,cat,title,time,to,toUser,unread}]（时间序）
- PUT /api/v1/notifications/{id}/read {user}（幂等：已读重放 no-op）
- PUT /api/v1/notifications/read-all {user}（对该用户可见集合批量插 read）

## 发射
DecideReview：通知 to_user = 提出人账号（users.name → account 映射，失败广播）；RetractVersion 保持广播。

## 前端
- AppShell：Badge 铃铛 + Popover（最多 8 条，点击 → markRead + nav(to)；全部已读按钮；打开时刷新）。
- Home 视角：roles 含「本体管理员」→ architect；含「评审员」→ reviewer；否则 operator。
  共享：问候行（姓名/角色）+ 4 统计卡（按视角取数）+ 底部消息通知（可点击已读）。
  architect：本体概览 / 待评审 / 一致性问题数；reviewer：待裁决 / 待归并 / 收敛候选；operator：高风险实例 / 最近触发 / 管道状态 / 待审批。

## 测试
定向可见性（王五见个人定向、张三见广播）、已读翻转与幂等、read-all、评审裁决后提出人收到定向通知。
