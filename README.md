# 量化交易决策辅助平台

一个高度自动化的量化交易决策引擎，实现"大周期定方向、小周期找入场"的交易策略，为加密货币交易者提供清晰、量化、可执行的交易决策建议。

## 核心特性

- **四步漏斗模型**: 宏观趋势分析 → 盈亏比筛选 → 入场信号确认 → 结果展示
- **多层级支撑阻力位**: 识别大周期和小周期的关键位，提供精细化的止盈止损策略
- **实时信号生成**: 自动检测结构突破、回调确认、形态突破等入场信号
- **定时和手动分析**: 支持定时任务和Telegram Bot手动触发
- **Web界面**: 直观的仪表盘展示市场状态和交易信号
- **无存储架构**: 实时从币安API获取数据，仅存储分析结果

## 技术架构

### 系统组件

- **数据管理器**: 币安API集成，实时数据获取
- **趋势分析器**: EMA指标计算，趋势状态判断
- **关键位分析器**: 多层级支撑阻力位识别
- **风险回报计算器**: 多种盈亏比计算和筛选
- **信号生成器**: 入场信号检测和触发
- **调度管理器**: 定时任务和手动触发管理
- **Telegram Bot**: 远程控制和通知

### 技术栈

- **后端**: Node.js + TypeScript
- **数据库**: PostgreSQL
- **API集成**: 币安现货API
- **通知**: Telegram Bot API
- **前端**: Web界面 + WebSocket实时推送
- **部署**: Docker + Kubernetes

## 快速开始

### 环境要求

- Node.js >= 18.0.0
- PostgreSQL >= 13
- 币安API密钥
- Telegram Bot Token

### 安装步骤

1. **克隆项目**
```bash
git clone <repository-url>
cd trading-decision-engine
```

2. **安装依赖**
```bash
npm install
```

3. **配置环境变量**
```bash
cp .env.example .env
# 编辑 .env 文件，填入必要的配置信息
```

4. **数据库初始化**
```bash
npm run db:migrate
```

5. **启动开发服务器**
```bash
npm run dev
```

### 环境变量配置

```env
# 数据库配置
DATABASE_URL=postgresql://username:password@localhost:5432/trading_engine

# 币安API配置
BINANCE_API_KEY=your_binance_api_key
BINANCE_SECRET_KEY=your_binance_secret_key

# Telegram Bot配置
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_AUTHORIZED_USERS=123456789,987654321

# 分析配置
ANALYSIS_INTERVAL_MINUTES=15
MAX_TRADING_PAIRS=20
RISK_REWARD_THRESHOLD=2.0
DEFAULT_SYMBOLS=BTCUSDT,ETHUSDT,BNBUSDT
```

## 使用指南

### Web界面

访问 `http://localhost:3000` 查看主仪表盘：

- **市场状态概览**: 显示所有交易对的趋势状态
- **交易信号列表**: 展示符合条件的交易信号
- **交互式图表**: 点击信号查看详细的K线图和关键位标注
- **手动分析**: 触发立即分析功能

### Telegram Bot命令

- `/start` - 开始使用Bot
- `/analyze` - 手动触发分析
- `/status` - 查看系统状态
- `/signals` - 查看最新信号
- `/watchlist` - 查看观察列表
- `/config` - 配置参数
- `/help` - 帮助信息

### API接口

#### 获取市场状态
```http
GET /api/market-states
```

#### 获取交易信号
```http
GET /api/signals?limit=10
```

#### 手动触发分析
```http
POST /api/analyze
```

#### 获取观察列表
```http
GET /api/watchlist
```

## 交易策略说明

### 四步漏斗模型

1. **宏观环境分析 (大周期定调)**
   - 使用日线和4小时周期的EMA(21)和EMA(55)
   - 判断市场趋势：上升趋势/下降趋势/横盘整理
   - 只在明确趋势中寻找交易机会

2. **潜在交易机会筛选 (盈亏比过滤)**
   - 识别大周期的关键支撑阻力位
   - 计算多层级的风险回报比
   - 只保留推荐盈亏比 >= 2.0 的机会

3. **入场信号确认 (右侧交易触发)**
   - 结构突破：价格突破关键摆动点
   - 回调确认：价格回调至关键位并形成反转形态
   - 形态突破：整理形态的有效突破

4. **整合与展示**
   - 生成完整的交易计划
   - 包含入场价、多层级止盈止损、风险回报比
   - 实时推送到Web界面和Telegram

### 多层级止盈止损策略

- **最近位**: 距离当前价格最近的支撑阻力位（紧急止损止盈）
- **次级位**: 第二近的支撑阻力位（备选方案）
- **主要位**: 大周期的重要支撑阻力位（目标位置）

### 风险回报比类型

- **保守**: 最近止盈 vs 最近止损
- **激进**: 主要止盈 vs 最近止损
- **推荐**: 综合考虑的最优配置

## 开发指南

### 项目结构

```
src/
├── types/           # 类型定义
├── interfaces/      # 接口定义
├── utils/          # 工具函数
├── config/         # 配置管理
├── data/           # 数据管理层
├── analysis/       # 分析引擎
├── engine/         # 交易决策引擎
├── api/            # Web API
├── telegram/       # Telegram Bot
├── database/       # 数据库操作
└── index.ts        # 应用入口
```

### 开发命令

```bash
# 开发模式
npm run dev

# 构建项目
npm run build

# 运行测试
npm run test

# 测试覆盖率
npm run test:coverage

# 代码检查
npm run lint

# 数据库迁移
npm run db:migrate
```

### 添加新的交易对

1. 在环境变量中添加交易对符号
2. 确保符号格式为 `{BASE}USDT`
3. 重启服务以应用更改

### 自定义分析参数

通过环境变量或系统配置表修改：

- EMA周期
- 风险回报比阈值
- 分析间隔时间
- 关键位强度阈值

## 监控和运维

### 性能指标

- API调用响应时间
- 分析执行时间
- 信号生成数量
- 系统可用性

### 日志记录

系统提供结构化日志，包含：

- API调用记录
- 分析执行记录
- 错误和异常记录
- 性能监控数据

### 告警机制

- API调用失败告警
- 分析执行异常告警
- 数据库连接异常告警
- Telegram Bot通知

## 部署指南

### Docker部署

```bash
# 构建镜像
docker build -t trading-engine .

# 运行容器
docker run -d \
  --name trading-engine \
  -p 3000:3000 \
  -p 3001:3001 \
  --env-file .env \
  trading-engine
```

### Kubernetes部署

```bash
# 应用配置
kubectl apply -f k8s/

# 查看状态
kubectl get pods -l app=trading-engine
```

## 常见问题

### Q: 为什么不存储K线数据？
A: 系统采用实时获取策略，确保数据的实时性和准确性，同时简化架构和降低存储成本。

### Q: 如何调整分析频率？
A: 修改环境变量 `ANALYSIS_INTERVAL_MINUTES` 或通过配置界面调整。

### Q: 支持哪些交易对？
A: 目前支持币安现货的所有USDT交易对，可通过配置添加。

### Q: 如何添加新的信号类型？
A: 在信号生成器中实现新的检测算法，并更新相关接口和类型定义。

## 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 联系方式

- 项目维护者: Trading Engine Team
- 邮箱: support@trading-engine.com
- 文档: [项目文档](https://docs.trading-engine.com)

## 更新日志

### v1.0.0 (2025-01-XX)
- 初始版本发布
- 实现四步漏斗交易模型
- 支持多层级支撑阻力位分析
- 集成Telegram Bot
- Web界面和API