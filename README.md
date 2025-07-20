<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://coveralls.io/github/nestjs/nest?branch=master" target="_blank"><img src="https://coveralls.io/repos/github/nestjs/nest/badge.svg?branch=master#9" alt="Coverage" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ pnpm install
```

## Compile and run the project

```bash
# development
$ pnpm run start

# watch mode
$ pnpm run start:dev

# production mode
$ pnpm run start:prod
```

## Run tests

```bash
# unit tests
$ pnpm run test

# e2e tests
$ pnpm run test:e2e

# test coverage
$ pnpm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ pnpm install -g mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).

# 🚀 多币种图像结构识别与辅助交易策略系统

基于NestJS + Prisma + PostgreSQL的实时交易辅助系统，通过Binance API获取K线数据，识别图形结构并提供策略建议。

## 📋 项目特性

- 🔧 **币种配置管理** - 支持多币种监控配置
- 📊 **实时数据获取** - 集成Binance API和WebSocket
- 🎯 **图形结构识别** - 识别箱体、突破等形态
- 📈 **策略信号生成** - 多种交易策略支持
- 🗄️ **数据存储** - PostgreSQL + Redis缓存
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

### 🚧 进行中
- [ ] Binance API数据获取
- [ ] WebSocket实时数据流
- [ ] Redis缓存集成

### 📋 待开发
- [ ] 技术指标计算
- [ ] 图形结构识别
- [ ] 交易策略实现
- [ ] 通知系统
- [ ] Web管理界面

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
