# Telegram 通知设置指南

## 1. 创建 Telegram Bot

### 步骤 1：联系 BotFather
1. 打开 Telegram 应用
2. 搜索 `@BotFather` 并开始对话
3. 发送 `/newbot` 命令
4. 按照提示设置 Bot 名称和用户名
5. 获取 Bot Token（格式：`123456789:ABCDefGhIJKLmnoPQRStuvWXYZ`）

### 步骤 2：获取 Chat ID
有几种方法获取 Chat ID：

#### 方法 1：使用 Bot 直接获取
1. 向你的 Bot 发送任意消息
2. 访问：`https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
3. 在返回的 JSON 中找到 `chat.id` 字段

#### 方法 2：使用第三方 Bot
1. 搜索 `@userinfobot` 或 `@get_id_bot`
2. 向这些 Bot 发送任意消息获取你的 Chat ID

#### 方法 3：群组 Chat ID
1. 将 Bot 添加到群组
2. 向群组发送消息
3. 使用上述 API 方法获取群组的 Chat ID（通常以 `-` 开头）

## 2. 环境变量配置

在你的 `.env` 文件中添加以下配置：

```bash
# Telegram 通知配置
TELEGRAM_BOT_TOKEN=123456789:ABCDefGhIJKLmnoPQRStuvWXYZ
TELEGRAM_CHAT_ID=123456789
TELEGRAM_ENABLED=true
```

### 配置说明：
- `TELEGRAM_BOT_TOKEN`: 从 BotFather 获取的 Bot Token
- `TELEGRAM_CHAT_ID`: 接收消息的用户或群组 ID
- `TELEGRAM_ENABLED`: 是否启用 Telegram 通知（true/false）

## 3. 测试配置

启动应用后，可以通过以下 API 测试 Telegram 配置：

### 测试连接
```bash
curl -X POST http://localhost:3000/api/notifications/telegram/test
```

### 发送测试消息
```bash
curl -X POST http://localhost:3000/api/notifications/telegram/send \
  -H "Content-Type: application/json" \
  -d '{"message": "🧪 这是一条测试消息"}'
```

### 检查服务状态
```bash
curl http://localhost:3000/api/notifications/telegram/status
```

## 4. 消息格式

### 普通通知消息格式：
```
ℹ️ 系统启动通知

📝 交易系统已成功启动

🕐 时间: 2025-01-20 14:30:00
```

### 分析通知消息格式：
```
✅ 交易信号提醒

🚀 BTCUSDT(1h)
📊 信号: BUY
🎯 置信度: 85.5% (高)

📝 总结: 技术指标显示强烈上涨信号，多项指标共振
🔍 形态: 金叉形态, 上升楔形
📈 关键位: 3个关键位

🕐 时间: 2025-01-20 14:30:00
```

## 5. 高级配置

### Bot 权限设置
为了确保 Bot 正常工作，建议设置以下权限：
- 发送消息权限
- 读取消息权限（如果需要交互功能）

### 群组设置
如果在群组中使用：
1. 将 Bot 添加为管理员（或至少给予发送消息权限）
2. 使用群组的 Chat ID（通常是负数）
3. 确保 Bot 没有被群组成员屏蔽

### 安全建议
- 保持 Bot Token 私密，不要在代码中硬编码
- 定期检查 Bot 的活动日志
- 考虑使用环境变量加密存储敏感信息

## 6. 故障排除

### 常见问题：

#### Bot Token 无效
- 检查 Token 格式是否正确
- 确认 Bot 没有被删除或停用

#### Chat ID 错误
- 确认 Chat ID 是数字格式
- 群组 Chat ID 通常是负数
- 检查是否有权限向该 Chat 发送消息

#### 消息发送失败
- 检查网络连接
- 确认 Bot 没有被用户屏蔽
- 检查消息长度是否超出限制（4096 字符）

#### 无法接收消息
- 确认 TELEGRAM_ENABLED=true
- 检查应用日志中的错误信息
- 验证环境变量是否正确加载

## 7. API 参考

### 可用的 Telegram API 接口：

#### POST /api/notifications/telegram/test
测试 Telegram 连接和配置

#### POST /api/notifications/telegram/send
发送自定义消息到 Telegram

#### GET /api/notifications/telegram/status
获取 Telegram 服务状态和 Bot 信息

## 8. 开发示例

### 在代码中发送 Telegram 通知：

```typescript
// 注入 TelegramService
constructor(private readonly telegramService: TelegramService) {}

// 发送普通通知
await this.telegramService.sendNotification({
  title: '系统警告',
  message: '检测到异常交易活动',
  type: 'warning',
  timestamp: new Date().toISOString(),
});

// 发送分析通知
await this.telegramService.sendAnalysisNotification({
  title: '交易信号',
  message: 'BUY 信号检测',
  type: 'success',
  symbol: 'BTCUSDT',
  interval: '1h',
  signal: 'BUY',
  confidence: 85.5,
  summary: '技术指标显示上涨信号',
  timestamp: new Date().toISOString(),
});
``` 