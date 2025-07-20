# 🚀 多币种图像结构识别与辅助交易策略系统

基于NestJS + Prisma + PostgreSQL的实时交易辅助系统，通过Binance API获取K线数据，识别图形结构并提供策略建议。

## 📋 项目特性

- 🔧 **币种配置管理** - 支持多币种监控配置
- 📊 **实时数据获取** - 集成Binance API和WebSocket
- 🎯 **图形结构识别** - 识别箱体、突破等形态
- 📈 **策略信号生成** - 多种交易策略支持
- 🗄️ **数据存储** - PostgreSQL + Redis缓存
- 📱 **Telegram集成** - 命令菜单、内联键盘、快捷操作面板
- 🐳 **Docker支持** - 本地开发环境快速启动

## 🛠 技术栈

- **后端框架**: NestJS + TypeScript
- **数据库**: PostgreSQL (通过Prisma ORM)
- **缓存**: Redis
- **外部API**: Binance REST API + WebSocket
- **包管理**: pnpm

## 🚀 快速开始

### 1. 环境要求

- Node.js >= 18
- Docker & Docker Compose
- pnpm

### 2. 项目安装

```bash
# 克隆项目
git clone <repository-url>
cd real-time-token

# 安装依赖
pnpm install

# 启动数据库服务
docker-compose up -d

# 运行数据库迁移
npx prisma migrate dev

# 启动开发服务器
pnpm start:dev
```

### 3. 使用管理脚本（推荐）

项目提供了便捷的管理脚本：

```bash
# 启动完整开发环境（数据库 + 应用）
./scripts/manage.sh dev

# 测试API功能
./scripts/manage.sh test

# 添加币种配置
./scripts/manage.sh add BTCUSDT 1h

# 查看数据库数据
./scripts/manage.sh db-view

# 停止环境
./scripts/manage.sh stop

# 重置数据库
./scripts/manage.sh db-reset
```

## 📡 API 接口

### 币种配置管理

```bash
# 创建配置
POST /api/coins/config
{
  "symbol": "BTCUSDT",
  "interval": "1h",
  "isActive": true
}

# 获取配置列表
GET /api/coins/list

# 获取活跃配置
GET /api/coins/active

# 获取统计信息
GET /api/coins/stats

# 更新配置
PATCH /api/coins/:id

# 删除配置
DELETE /api/coins/:id

# 批量启用/禁用
POST /api/coins/batch-active
{
  "ids": [1, 2, 3],
  "isActive": true
}
```

### 示例响应

**获取配置列表**
```json
[
  {
    "id": 1,
    "symbol": "BTCUSDT",
    "interval": "1h",
    "isActive": true,
    "createdAt": "2025-07-20T07:49:01.327Z",
    "updatedAt": "2025-07-20T07:49:01.327Z"
  }
]
```

**获取统计信息**
```json
{
  "total": 4,
  "active": 3,
  "inactive": 1,
  "byInterval": {
    "1h": 1,
    "4h": 1,
    "1d": 1,
    "15m": 1
  }
}
```

## 🗄️ 数据库结构

### 币种配置表 (coin_configs)
```sql
CREATE TABLE coin_configs (
  id SERIAL PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL,
  interval VARCHAR(10) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(symbol, interval)
);
```

### K线数据表 (kline_data)
```sql
CREATE TABLE kline_data (
  id SERIAL PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL,
  interval VARCHAR(10) NOT NULL,
  open_time BIGINT NOT NULL,
  close_time BIGINT NOT NULL,
  open_price DECIMAL(20,8) NOT NULL,
  high_price DECIMAL(20,8) NOT NULL,
  low_price DECIMAL(20,8) NOT NULL,
  close_price DECIMAL(20,8) NOT NULL,
  volume DECIMAL(20,8) NOT NULL,
  -- ... 其他字段
  UNIQUE(symbol, interval, open_time)
);
```

## 🐳 Docker 服务

项目包含以下Docker服务：

- **PostgreSQL** - 主数据库 (端口: 5432)
- **Redis** - 缓存服务 (端口: 6379)

```bash
# 启动服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f postgres

# 进入数据库
docker-compose exec postgres psql -U postgres -d trading_system

# 停止服务
docker-compose down
```

## 📁 项目结构

```
src/
├── config/                 # 配置文件
│   ├── app.config.ts
│   ├── database.config.ts
│   ├── redis.config.ts
│   └── binance.config.ts
├── prisma/                 # Prisma配置
│   ├── prisma.service.ts
│   └── prisma.module.ts
├── shared/                 # 共享模块
│   ├── enums/              # 枚举定义
│   ├── interfaces/         # 接口定义
│   └── utils/              # 工具类
└── modules/
    ├── coin-config/        # 币种配置模块
    │   ├── dto/
    │   ├── coin-config.controller.ts
    │   ├── coin-config.service.ts
    │   └── coin-config.module.ts
    ├── data/               # 数据获取模块（计划中）
    ├── analysis/           # 分析模块（计划中）
    └── strategy/           # 策略模块（计划中）
```

## 🔄 开发计划

### ✅ 已完成
- [x] 项目基础架构搭建
- [x] Prisma + PostgreSQL集成
- [x] 币种配置管理功能
- [x] Docker开发环境
- [x] API接口和文档
- [x] Binance API数据获取
- [x] WebSocket实时数据流
- [x] Redis缓存集成
- [x] 技术指标计算
- [x] 图形结构识别
- [x] 交易策略实现
- [x] 通知系统
- [x] Web管理界面

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## ⚠️ 免责声明

本系统仅供学习和研究使用，不构成投资建议。所有交易决策应由用户独立做出，使用本系统产生的任何损失，开发者不承担责任。
# trading-real-time
