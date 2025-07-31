# 价格通知测试脚本使用说明

## 快速开始

### 1. 确保服务正在运行
```bash
# 启动服务
npm run start:dev
# 或
pnpm run start:dev
```

### 2. 检查环境变量
确保以下环境变量已设置：
```bash
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
```

### 3. 运行测试脚本
```bash
# 进入项目目录
cd /Users/oyang/Desktop/coding/dex/trading-service

# 运行完整测试
node scripts/test-price-notifications.js
```

## 测试场景

### 🔍 测试内容包括：

1. **Telegram Bot 连接测试**
   - 发送测试通知到 Telegram
   - 检查 Bot 配置状态

2. **基础价格触发测试**
   - 测试买入区间触发 ($45,000)
   - 测试卖出区间触发 ($55,000)

3. **价格区间穿越测试**
   - 模拟价格从区间外进入区间内
   - 模拟价格在区间内移动
   - 模拟价格从区间内离开到区间外

4. **快速价格跳跃测试**
   - 模拟价格快速跨越整个区间
   - 测试是否能检测到穿越事件

5. **冷却机制测试**
   - 测试触发后的冷却期
   - 验证重复触发的防护机制

6. **系统状态检查**
   - 显示触发统计信息
   - 显示 Telegram Bot 状态

## 预期结果

### ✅ 成功的测试应该显示：

```
🚀 价格通知系统完整测试开始

=== Telegram Bot 连接测试 ===
发送测试通知...
✅ Telegram 测试通知发送成功！
ℹ️  Bot 状态: ✅ 就绪
ℹ️  通知发送: ✅ 成功

=== 基础价格触发测试 ===
测试价格触发: BTC/USDT @ $45000 (假设买入区间)
ℹ️  Telegram 状态: ✅ 就绪
ℹ️  买入触发: ✅ 是
ℹ️  卖出触发: ❌ 否
✅ 发现 1 个价格触发事件！

... (更多测试结果)

=== 测试总结 ===
✅ 所有测试完成！
```

### 📱 Telegram 通知

如果一切正常，您应该在 Telegram 中收到如下类型的消息：

1. **测试通知**：
   ```
   🧪 Telegram Bot 测试
   ✅ 消息发送功能正常
   ⏰ 测试时间: 2024-01-XX XX:XX:XX
   ```

2. **价格触发通知**：
   ```
   🎯 买入信号 💚
   📊 交易对: BTC/USDT
   💰 当前价格: $45,000.000000
   🎯 目标价格: $45,000.000000
   📈 偏差: 0.00%
   ⚡ 容差: 2.00%
   🎯 置信度: 85.0%
   ```

3. **区间穿越通知**：
   ```
   🎯 区间穿越 💚
   📊 交易对: BTC/USDT
   🎯 事件: 进入买入区间
   💰 当前价格: $45,000.000000
   🎯 区间中心: $45,000.000000
   ```

## 故障排除

### ❌ 如果没有收到 Telegram 通知：

1. **检查环境变量**：
   ```bash
   echo $TELEGRAM_BOT_TOKEN
   echo $TELEGRAM_CHAT_ID
   ```

2. **检查 Bot Token 有效性**：
   - 联系 @BotFather 确认 Token 是否正确
   - 确认 Bot 没有被禁用

3. **检查 Chat ID**：
   - 确保 Chat ID 正确
   - 确认机器人已被添加到群组/频道
   - 确认机器人有发送消息权限

4. **检查服务日志**：
   ```bash
   # 查看服务运行日志
   tail -f logs/application.log
   ```

### ❌ 如果测试脚本报错：

1. **连接错误**：
   - 确认服务运行在 http://localhost:3000
   - 检查防火墙设置

2. **依赖错误**：
   ```bash
   # 安装 node-fetch （如果需要）
   npm install node-fetch
   ```

## 手动测试 API

您也可以直接使用 curl 或 Postman 测试：

```bash
# 测试 Telegram 通知
curl -X POST http://localhost:3000/trading-debug/test-notification

# 测试价格触发
curl -X POST http://localhost:3000/trading-debug/test-price-trigger \
  -H "Content-Type: application/json" \
  -d '{"symbol":"BTC/USDT","testPrice":45000}'

# 手动价格检查
curl -X POST http://localhost:3000/trading-debug/manual-price-check \
  -H "Content-Type: application/json" \
  -d '{"symbol":"BTC/USDT","currentPrice":45000}'

# 获取系统状态
curl http://localhost:3000/trading-debug/trigger-stats
```

## 注意事项

- 测试会使用实际的 Telegram Bot 发送消息
- 建议在专门的测试群组中进行测试
- 某些测试会有延迟（模拟真实价格变动）
- 测试完成后会清理测试数据，不影响生产环境