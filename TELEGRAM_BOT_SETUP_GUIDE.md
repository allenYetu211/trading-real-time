# Telegram Bot 设置完整指南

## 🎯 功能概览

您的 Telegram Bot 现在支持以下功能：

### 📱 输入框命令菜单
以下命令会自动添加到 Telegram 输入框的菜单栏中：
- `/start` - 启动机器人并显示主菜单
- `/help` - 显示帮助信息  
- `/technical` - 完整技术分析
- `/list` - 查看关注列表
- `/add` - 添加交易对到关注列表
- `/remove` - 从关注列表移除交易对
- `/status` - 查看机器人状态

### 🖱️ 主菜单按钮界面
```
┌─────────────────────────────────┐
│  📊 开始分析  │  ⚙️ 交易对管理  │
├─────────────────────────────────┤
│ 📋 查看关注列表 │   ❓ 帮助     │
├─────────────────────────────────┤
│        🔍 机器人状态            │
└─────────────────────────────────┘
```

## 🚀 启动和设置

### 1. 启动应用
```bash
# 开发环境
npm run start:dev

# 生产环境
npm run start:prod
```

### 2. 自动设置命令菜单
应用启动时会自动设置 Telegram Bot 的命令菜单。

### 3. 手动设置命令菜单（可选）
如果需要手动设置，可以运行：
```bash
npx ts-node scripts/setup-bot-commands.ts
```

## 💬 使用方式

### 方式一：输入框命令菜单
1. 在 Telegram 中打开与机器人的对话
2. 点击输入框旁边的菜单按钮 (☰)
3. 选择需要的命令

### 方式二：主菜单按钮
1. 发送 `/start` 查看主菜单
2. 点击相应的按钮操作

### 方式三：直接输入命令
直接在输入框中输入命令，支持自动补全

## 🔧 添加/移除交易对的多种方式

### /add 命令 - 两种模式

#### 模式一：直接添加
```
/add SOLUSDT
```

#### 模式二：分步添加
```
用户: /add
Bot: 请输入您要添加的交易对符号...
用户: SOLUSDT
Bot: ✅ 添加成功
```

### /remove 命令 - 两种模式

#### 模式一：直接移除
```
/remove SOLUSDT
```

#### 模式二：分步移除
```
用户: /remove
Bot: 请输入您要移除的交易对符号...
     当前关注的交易对：BTCUSDT, ETHUSDT, SOLUSDT
用户: SOLUSDT
Bot: ✅ 移除成功
```

### 菜单操作方式
1. `/start` → "⚙️ 交易对管理"
2. 选择 "➕ 添加交易对" 或 "➖ 移除交易对"
3. 按提示输入交易对符号

## ⚙️ 配置要求

确保以下配置正确：

### 环境变量
```env
# Telegram Bot 配置
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=your_chat_id_here
TELEGRAM_ENABLED=true
```

### config/telegram.config.ts
```typescript
export default {
  enabled: process.env.TELEGRAM_ENABLED === 'true',
  botToken: process.env.TELEGRAM_BOT_TOKEN,
  chatId: process.env.TELEGRAM_CHAT_ID,
  parseMode: 'HTML',
  disableWebPagePreview: true,
  disableNotification: false,
};
```

## 🧪 测试功能

### 手动测试步骤
1. 启动应用
2. 在 Telegram 中发送 `/start`
3. 测试各个菜单按钮
4. 测试命令的两种输入模式
5. 验证超时和错误处理

### 使用测试脚本
```bash
# 测试新功能
npx ts-node scripts/test-menu-and-add-command.ts

# 设置命令菜单
npx ts-node scripts/setup-bot-commands.ts
```

## ✨ 用户体验特性

### 1. 智能提示
- 详细的使用说明和示例
- 清晰的错误信息和解决建议
- 操作超时提醒（5分钟）

### 2. 灵活的交互方式
- 支持直接命令和分步输入
- 菜单按钮和命令输入并存
- 适应不同用户的使用习惯

### 3. 状态管理
- 用户状态追踪
- 自动超时清理
- 防止状态冲突

### 4. 错误处理
- 友好的错误提示
- 自动恢复机制
- 详细的日志记录

## 🔄 向后兼容性

- ✅ 保持所有原有命令完全兼容
- ✅ 原有功能不受影响
- ✅ 只增加新功能，不修改现有行为

## 📋 技术实现总结

### 新增文件
- `scripts/setup-bot-commands.ts` - 命令菜单设置脚本
- `scripts/test-menu-and-add-command.ts` - 功能测试脚本

### 修改文件
- `telegram-bot.service.ts` - 添加消息处理器和命令设置
- `telegram-ccxt-analysis.service.ts` - 增强命令功能和用户状态管理
- `menu.template.ts` - 新增主菜单键盘和管理菜单

### 关键功能
- 消息处理器架构
- 用户状态管理
- 自动命令菜单设置
- 双模式命令支持