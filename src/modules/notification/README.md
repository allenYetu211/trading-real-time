# 通知模块

通知模块负责处理系统中的所有通知记录，包括分析结果通知、系统状态通知等。通知记录存储在数据库中，不再使用JSON或CSV文件。

## 主要功能

### 1. 通知记录管理
- ✅ 创建通知记录到数据库
- ✅ 查询通知记录列表（支持分页和筛选）
- ✅ 获取通知统计信息
- ✅ 向后兼容的通知历史查询

### 2. 通知类型
- `info`: 信息通知（系统状态、一般消息）
- `success`: 成功通知（BUY信号、操作成功）
- `warning`: 警告通知（SELL信号、风险提醒）
- `error`: 错误通知（系统错误、异常情况）

### 3. 分析通知字段
分析通知包含以下特殊字段：
- `symbol`: 交易对（如 BTCUSDT）
- `interval`: 时间周期（如 1h, 15m）
- `signal`: 信号类型（BUY/SELL/NEUTRAL）
- `confidence`: 置信度（0-100）
- `summary`: 分析总结
- `patterns`: 识别的形态
- `supportResistance`: 支撑阻力位信息

## API 接口

### 1. 创建通知记录
```http
POST /api/notifications/create
Content-Type: application/json

{
  "title": "🚀 BTCUSDT(1h) 图像结构分析",
  "message": "BUY 信号 (高置信度)",
  "type": "success",
  "symbol": "BTCUSDT",
  "interval": "1h",
  "signal": "BUY",
  "confidence": 85.5,
  "summary": "技术指标显示强烈上涨信号",
  "patterns": "金叉形态, 上升楔形",
  "supportResistance": "3个关键位",
  "data": "{\"price\": 42500}",
  "timestamp": "2025-01-20T10:30:00.000Z"
}
```

### 2. 查询通知记录列表
```http
POST /api/notifications/list
Content-Type: application/json

{
  "type": "success",
  "symbol": "BTCUSDT",
  "signal": "BUY",
  "startDate": "2025-01-20T00:00:00.000Z",
  "endDate": "2025-01-21T00:00:00.000Z",
  "page": 1,
  "limit": 20
}
```

### 3. 获取通知统计
```http
GET /api/notifications/stats?date=2025-01-20
```

### 4. 获取通知历史（兼容接口）
```http
GET /api/notifications/history?date=2025-01-20
```

## 代码使用示例

### 在服务中发送分析通知
```typescript
import { NotificationService } from './notification.service';
import { ComprehensiveAnalysis } from 'src/shared/interfaces/analysis.interface';

@Injectable()
export class AnalysisService {
  constructor(private readonly notificationService: NotificationService) {}

  async analyzeSymbol(symbol: string, interval: string): Promise<void> {
    const analysis: ComprehensiveAnalysis = {
      // ... 分析结果
    };

    // 发送分析通知
    await this.notificationService.sendAnalysisNotification(symbol, interval, analysis);
  }
}
```

### 发送普通通知
```typescript
await this.notificationService.sendNotification({
  title: '系统启动',
  message: '交易系统已成功启动',
  type: 'info',
  timestamp: new Date().toISOString(),
});
```

### 查询通知记录
```typescript
const result = await this.notificationService.getNotificationList({
  type: 'success',
  symbol: 'BTCUSDT',
  page: 1,
  limit: 10,
});

console.log(`找到 ${result.total} 条记录`);
```

## 数据库表结构

### notification_records 表
```sql
CREATE TABLE notification_records (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(20) NOT NULL, -- 'info', 'success', 'warning', 'error'
  symbol VARCHAR(20),
  interval VARCHAR(10),
  signal VARCHAR(20),
  confidence DECIMAL(5,2),
  summary TEXT,
  patterns TEXT,
  support_resistance TEXT,
  data TEXT, -- JSON格式存储额外数据
  timestamp TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 测试

运行通知功能测试：

```bash
# 启动服务器
pnpm start:dev

# 在另一个终端运行测试
npx ts-node scripts/test-notification.ts
```

测试脚本将验证：
- 创建通知记录
- 查询通知记录列表
- 获取通知统计
- 获取通知历史

## 迁移说明

### 从文件存储迁移到数据库存储

原有的通知系统使用JSON文件和CSV文件存储通知记录，现在已完全迁移到数据库存储：

**变更内容：**
- ❌ 移除了 `saveToFile()` 和 `saveAnalysisToCSV()` 方法
- ❌ 移除了 `notifications/` 目录的文件操作
- ✅ 新增了 `saveToDatabase()` 方法
- ✅ 新增了数据库查询和统计功能
- ✅ 保持了所有现有接口的向后兼容性

**迁移步骤：**
1. 运行数据库迁移：`pnpx prisma migrate dev`
2. 重启应用服务
3. 新的通知将自动保存到数据库
4. 旧的文件可以安全删除（如需要，可以手动导入到数据库）

## 性能优化

- 数据库索引优化：按类型、时间戳、交易对建立索引
- 分页查询：支持大量数据的分页查询
- 异步处理：通知发送采用异步处理，不阻塞主业务流程
- 日志记录：保持控制台日志输出，便于实时监控

## Telegram 通知集成

### 🚀 已实现的 Telegram 功能
- ✅ Telegram Bot 集成
- ✅ 普通通知自动发送到 Telegram
- ✅ 分析通知格式化发送
- ✅ HTML 格式消息支持
- ✅ 自定义消息发送 API
- ✅ 连接测试和状态检查
- ✅ 完善的错误处理和日志记录

### 📱 Telegram API 接口

#### 1. 测试 Telegram 连接
```http
POST /api/notifications/telegram/test
```

#### 2. 发送自定义消息
```http
POST /api/notifications/telegram/send
Content-Type: application/json

{
  "message": "🧪 这是一条测试消息"
}
```

#### 3. 获取 Telegram 状态
```http
GET /api/notifications/telegram/status
```

### ⚙️ 配置方法

在 `.env` 文件中添加：
```bash
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=your_chat_id_here
TELEGRAM_ENABLED=true
```

详细配置步骤请参考：[Telegram 设置指南](./TELEGRAM_SETUP.md)

### 🧪 测试脚本

运行 Telegram 功能测试：
```bash
# 启动服务器
pnpm start:dev

# 在另一个终端运行 Telegram 测试
npx ts-node scripts/test-telegram.ts
```

## 扩展功能

### 已实现的功能
- ✅ Telegram 通知集成
- ✅ 数据库存储
- ✅ 分页查询和筛选
- ✅ 统计分析
- ✅ API 接口完善

### 计划中的功能
- [ ] 邮件通知集成
- [ ] WebSocket 实时通知推送
- [ ] 通知模板系统
- [ ] 批量操作接口
- [ ] 通知订阅管理
- [ ] 通知频率限制 