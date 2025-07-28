# Telegram CCXT 分析模块

基于 CCXT 数据源的 Telegram 市场分析机器人，提供专业的技术分析功能和友好的交互界面。

## 🚀 功能特性

### 📊 分析功能
- **EMA 技术分析**：支持 EMA20/60/120 多周期分析
- **多时间周期趋势分析**：15分钟、1小时、4小时、1日的综合趋势分析
- **支撑阻力位识别**：基于价格行为和成交量的关键位置识别
- **完整技术分析**：结合趋势和支撑阻力位的综合分析报告
- **实时市场数据**：基于 CCXT 的准确市场数据
- **智能趋势识别**：自动识别上升/下降/横盘趋势
- **置信度评估**：为每个分析结果提供置信度评分

### 🤖 交互界面
- **智能菜单系统**：直观的内联键盘操作
- **命令行支持**：丰富的命令行快捷操作
- **自然语言输入**：直接输入交易对符号即可分析
- **多种分析模式**：快速分析和详细分析两种模式
- **热门交易对**：预设主流加密货币快速访问

## 📋 支持的命令

### 基础命令
```
/start - 显示欢迎信息和功能介绍
/help - 显示详细帮助信息
/menu - 显示主操作菜单
```

### 分析命令
```
/analyze <symbol> [timeframe] - 详细 EMA 分析
例：/analyze BTCUSDT 1d

/quick <symbol> [timeframe] - 快速 EMA 分析
例：/quick ETHUSDT 4h

/trend <symbol> - 多时间周期趋势分析
例：/trend BTCUSDT

/sr <symbol> - 支撑阻力位分析
例：/sr ETHUSDT

/technical <symbol> [type] - 完整技术分析
例：/technical SOLUSDT comprehensive

/symbols - 显示热门交易对列表
```

### 快捷输入
```
# 直接输入交易对符号进行快速分析
BTCUSDT
ETHUSDT 4h
SOLUSDT
```

## 🎯 支持的交易对

### 热门预设交易对
- BTCUSDT (比特币)
- ETHUSDT (以太坊)
- SOLUSDT (Solana)
- ADAUSDT (Cardano)
- DOTUSDT (Polkadot)
- LINKUSDT (Chainlink)
- UNIUSDT (Uniswap)
- AVAXUSDT (Avalanche)
- MATICUSDT (Polygon)
- ATOMUSDT (Cosmos)

### 自定义交易对
支持任何 Binance 交易所支持的交易对，直接输入符号即可分析。

## ⏰ 支持的时间周期

| 周期 | 说明 | 适用场景 |
|------|------|----------|
| 1m   | 1分钟 | 短线交易 |
| 5m   | 5分钟 | 短线交易 |
| 15m  | 15分钟 | 短线交易 |
| 1h   | 1小时 | 中短线交易 |
| 4h   | 4小时 | 中线交易 |
| 1d   | 1天 | 中长线交易 |
| 1w   | 1周 | 长线交易 |

## 📊 分析内容

### 快速 EMA 分析包含
- 当前价格
- EMA20/60/120 指标值
- 趋势方向和置信度
- 快速交易建议

### 详细 EMA 分析包含
- 价格区间信息（最高/最低价）
- 完整的 EMA 技术指标
- 趋势强度分析
- 数据统计信息
- 详细交易建议
- 风险控制建议

### 多时间周期趋势分析包含
- 15分钟、1小时、4小时、1日的趋势分析
- 各时间周期的 EMA 指标和趋势强度
- 趋势一致性评估和冲突检测
- 综合交易建议和风险评级

### 支撑阻力位分析包含
- 基于价格行为的关键支撑阻力位
- 各位置的强度和置信度评估
- 当前价格相对位置分析
- 交易区间和操作建议

### 完整技术分析包含
- 综合趋势分析和支撑阻力位分析
- 市场状况和风险评估
- 机会等级和时间框架建议
- 详细的交易策略指导

## 🔧 配置要求

### 环境变量
```bash
# Telegram Bot 配置
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=your_chat_id_here
TELEGRAM_ENABLED=true
TELEGRAM_PARSE_MODE=HTML
TELEGRAM_DISABLE_WEB_PAGE_PREVIEW=true
TELEGRAM_DISABLE_NOTIFICATION=false
```

### 依赖服务
- CCXT 分析模块
- 技术分析模块
- Notification 模块
- 有效的 Telegram Bot Token
- 配置正确的 Chat ID

## 🚀 快速开始

### 1. 配置环境
```bash
# 复制环境变量模板
cp .env.example .env

# 编辑配置文件，添加 Telegram 配置
vim .env
```

### 2. 启动服务
```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm start:dev
```

### 3. 测试功能
```bash
# 运行基础测试脚本
npx ts-node scripts/test-telegram-ccxt-analysis.ts

# 运行技术分析测试脚本
npx ts-node scripts/test-telegram-technical-analysis.ts
```

### 4. 使用机器人
1. 在 Telegram 中找到你的机器人
2. 发送 `/start` 开始使用
3. 使用 `/menu` 显示操作面板
4. 直接输入交易对符号进行快速分析

## 🎯 使用示例

### 基础使用
```
# 发送给机器人
/start

# 机器人回复欢迎信息和功能介绍

# 快速分析比特币
BTCUSDT

# 分析以太坊4小时图
ETHUSDT 4h

# 使用菜单进行操作
/menu
```

### 高级使用
```
# 详细 EMA 分析比特币日线图
/analyze BTCUSDT 1d

# 快速 EMA 分析多个交易对
/quick SOLUSDT
/quick ADAUSDT 4h

# 多时间周期趋势分析
/trend ETHUSDT

# 支撑阻力位分析
/sr SOLUSDT

# 完整技术分析
/technical BTCUSDT comprehensive

# 查看热门交易对
/symbols
```

## 📱 REST API 接口

### 1. 获取 Bot 状态
```http
GET /api/telegram-ccxt-analysis/status
```

### 2. 测试连接
```http
POST /api/telegram-ccxt-analysis/test
```

### 3. 手动触发快速分析
```http
POST /api/telegram-ccxt-analysis/analyze/quick
Content-Type: application/json

{
  "symbol": "BTCUSDT",
  "timeframe": "1d"
}
```

### 4. 重新初始化菜单
```http
POST /api/telegram-ccxt-analysis/menu/reinitialize
```

## 🔧 故障排除

### 常见问题

#### 1. Bot 无响应
- 检查 TELEGRAM_BOT_TOKEN 是否正确
- 确认 Bot 已启用（TELEGRAM_ENABLED=true）
- 验证网络连接

#### 2. 分析失败
- 确认交易对符号正确（如 BTCUSDT）
- 检查 CCXT 服务是否正常运行
- 验证 Binance API 连接

#### 3. 菜单显示异常
- 尝试重新初始化菜单：/menu/reinitialize API
- 重启服务
- 检查 Bot 权限设置

### 日志检查
```bash
# 查看服务日志
docker-compose logs -f trading-service

# 查看特定模块日志
grep "TelegramCCXTAnalysisService" logs/app.log
```

## 🎨 自定义配置

### 修改预设交易对
编辑 `services/telegram-ccxt-analysis.service.ts`：
```typescript
private readonly POPULAR_SYMBOLS = [
  'BTCUSDT', 'ETHUSDT', 'SOLUSDT',
  // 添加更多交易对
  'DOGEUSDT', 'XRPUSDT'
];
```

### 调整分析参数
```typescript
// 修改 EMA 周期
const analysis = await this.emaAnalysisService.analyzeEMA(
  symbol, 
  timeframe, 
  [10, 20, 50] // 自定义 EMA 周期
);
```

## 📝 开发说明

### 模块结构
```
telegram-ccxt-analysis/
├── telegram-ccxt-analysis.module.ts      # 模块定义
├── telegram-ccxt-analysis.controller.ts  # REST API 控制器
├── services/
│   └── telegram-ccxt-analysis.service.ts # 核心服务逻辑
├── dto/
│   ├── telegram-analysis.dto.ts          # 数据传输对象
│   └── index.ts                          # 导出文件
└── README.md                             # 本文档
```

### 依赖关系
- CCXTAnalysisModule：提供市场数据分析
- NotificationModule：提供基础 Telegram 配置
- ConfigModule：提供配置管理

## 📞 技术支持

如有问题或建议，请通过以下方式联系：

1. 创建 GitHub Issue
2. 查看项目文档
3. 检查日志文件

---

**注意**：使用前请确保已正确配置 Telegram Bot Token 和 Chat ID。 