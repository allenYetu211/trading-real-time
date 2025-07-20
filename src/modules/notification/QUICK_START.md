# Telegram 通知快速启动指南

## 🚀 5分钟快速配置

### 步骤 1：创建 Telegram Bot
1. 在 Telegram 中搜索 `@BotFather`
2. 发送 `/newbot`
3. 设置 Bot 名称（例如：`MyTradingBot`）
4. 设置 Bot 用户名（例如：`my_trading_bot`）
5. 保存返回的 Token

### 步骤 2：获取 Chat ID
1. 向你的 Bot 发送任意消息
2. 访问：`https://api.telegram.org/bot<8180533418:AAEgwymHRz2VkkZRUeVqg7S5eS9EobdD8QQ>/getUpdates`
3. 在返回的 JSON 中找到 `chat.id`

### 步骤 3：配置环境变量
在项目根目录的 `.env` 文件中添加：
```bash
TELEGRAM_BOT_TOKEN=123456789:ABCDefGhIJKLmnoPQRStuvWXYZ
TELEGRAM_CHAT_ID=123456789
TELEGRAM_ENABLED=true
```

### 步骤 4：启动服务并测试
```bash
# 启动开发服务器
pnpm start:dev

# 测试 Telegram 功能
npx ts-node scripts/test-telegram.ts
```

## ✅ 验证清单

- [ ] Bot Token 已配置
- [ ] Chat ID 已配置  
- [ ] TELEGRAM_ENABLED=true
- [ ] 服务启动无错误
- [ ] 测试脚本运行成功
- [ ] Telegram 中收到测试消息

## 🎯 使用示例

### 在代码中发送通知
```typescript
// 自动 Telegram 通知
await notificationService.sendNotification({
  title: '系统警告',
  message: '检测到异常活动',
  type: 'warning',
  timestamp: new Date().toISOString(),
});

// 分析通知会自动发送到 Telegram
await notificationService.sendAnalysisNotification(
  'BTCUSDT', 
  '1h', 
  analysisResult
);
```

### 通过 API 发送通知
```bash
# 创建通知（自动发送到 Telegram）
curl -X POST http://localhost:3000/api/notifications/create \
  -H "Content-Type: application/json" \
  -d '{
    "title": "🚀 交易信号",
    "message": "BUY 信号检测",
    "type": "success",
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'"
  }'

# 直接发送自定义消息到 Telegram
curl -X POST http://localhost:3000/api/notifications/telegram/send \
  -H "Content-Type: application/json" \
  -d '{"message": "🧪 这是一条测试消息"}'
```

## 🛠️ 故障排除

### 常见问题
1. **Bot Token 无效**：检查格式，确保从 BotFather 正确复制
2. **Chat ID 错误**：确保是数字格式，群组 ID 通常为负数
3. **权限问题**：确保向 Bot 发送过消息，或 Bot 有群组发送权限
4. **网络问题**：检查服务器网络连接到 Telegram API

### 调试步骤
1. 检查环境变量：`GET /api/notifications/telegram/status`
2. 测试连接：`POST /api/notifications/telegram/test`
3. 查看服务器日志中的错误信息
4. 确认 Bot 在 Telegram 中可见且未被屏蔽

## 📚 更多帮助

- [详细配置指南](./TELEGRAM_SETUP.md)
- [完整 API 文档](./README.md)
- [测试脚本说明](../../scripts/test-telegram.ts) 