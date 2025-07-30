# Telegram CCXT Analysis Utils

这个目录包含了Telegram CCXT分析机器人的所有工具类和组件，按功能进行了模块化拆分，以提高代码的可维护性和可复用性。

## 📁 目录结构

```
utils/
├── interfaces/           # 接口和类型定义
├── emoji/               # 表情符号工具
├── formatters/          # 消息格式化器
├── templates/           # 菜单模板
├── bot/                # Bot管理工具
├── analysis/           # 分析处理器
├── commands/           # 命令处理器 (待实现)
├── index.ts            # 总导出文件
└── README.md           # 本说明文档
```

## 🔧 功能模块说明

### 1. interfaces/ - 接口和类型定义
- **telegram.interface.ts**: Telegram相关的接口定义
  - `TelegramConfig`: Telegram配置接口
  - `UserState`: 用户状态接口
  - `SymbolOption`: 交易对选项接口
  - `TimeframeOption`: 时间周期选项接口
  - `AnalysisType`: 分析类型枚举
  - `MessageOptions`: 消息发送选项接口

### 2. emoji/ - 表情符号工具
- **emoji.util.ts**: 统一管理所有表情符号映射
  - `getTrendEmoji()`: 获取趋势表情符号
  - `getTimeframeEmoji()`: 获取时间周期表情符号
  - `getActionEmoji()`: 获取交易动作表情符号
  - `getConfidenceEmoji()`: 获取置信度等级表情符号
  - `getStrengthEmoji()`: 获取支撑阻力位强度表情符号
  - `getPriceActionEmoji()`: 获取价格动作表情符号
  - `getRiskEmoji()`: 获取风险等级表情符号

### 3. formatters/ - 消息格式化器
- **format.util.ts**: 通用格式化工具
  - `formatPrice()`: 格式化价格显示
  - `formatPercentage()`: 格式化百分比显示
  - `formatTime()`: 格式化时间显示
  - `getTrendDescription()`: 获取趋势描述
  - `getConfidenceLevel()`: 获取置信度等级描述
  - `calculateRecentPriceRange()`: 计算最近价格范围

- **comprehensive-analysis.formatter.ts**: 完整技术分析消息格式化器
  - `formatMessage()`: 格式化完整技术分析消息
  - `generatePreciseTradingZones()`: 生成精确交易区间

- **trend-analysis.formatter.ts**: 趋势分析消息格式化器
  - `formatMessage()`: 格式化趋势分析消息

- **support-resistance.formatter.ts**: 支撑阻力位分析消息格式化器
  - `formatMessage()`: 格式化支撑阻力位分析消息
  - `generatePreciseTradingZones()`: 生成精确交易区间

### 4. templates/ - 菜单模板
- **menu.template.ts**: 菜单模板管理
  - `POPULAR_SYMBOLS`: 预设交易对列表
  - `TIMEFRAMES`: 时间周期选项
  - `getMainMenu()`: 获取主菜单模板
  - `getHelpMenu()`: 获取帮助菜单模板
  - `getAnalysisTypeMenu()`: 获取分析类型选择菜单
  - `getSymbolSelectionMenu()`: 获取交易对选择菜单
  - `getStatusTemplate()`: 获取状态显示模板
  - `getErrorTemplate()`: 获取错误消息模板

### 5. bot/ - Bot管理工具
- **bot-manager.util.ts**: Telegram Bot管理工具
  - `createBot()`: 创建并初始化Telegram Bot
  - `sendMessage()`: 发送消息
  - `editMessage()`: 编辑消息
  - `deleteMessage()`: 删除消息
  - `answerCallbackQuery()`: 回答回调查询
  - `getBotInfo()`: 获取Bot信息
  - `testConnection()`: 测试Bot连接
  - `cleanupUserStates()`: 清理用户状态
  - `setUserState()`: 设置用户状态
  - `getUserState()`: 获取用户状态
  - `clearUserState()`: 清除用户状态

### 6. analysis/ - 分析处理器
- **analysis-processor.util.ts**: 分析处理器工具
  - `performComprehensiveAnalysis()`: 执行完整技术分析
  - `performTrendAnalysis()`: 执行趋势分析
  - `performSupportResistanceAnalysis()`: 执行支撑阻力位分析
  - `performAnalysisByType()`: 根据分析类型执行相应的分析
  - `getAnalysisTypeDescription()`: 获取分析类型的描述文本
  - `validateSymbol()`: 验证交易对格式
  - `normalizeSymbol()`: 标准化交易对名称

## 🚀 使用方式

### 导入方式
```typescript
// 导入所有工具
import * as TelegramUtils from '../utils';

// 或按需导入
import { 
  BotManagerUtil, 
  AnalysisProcessorUtil, 
  ComprehensiveAnalysisFormatter,
  MenuTemplate,
  EmojiUtil 
} from '../utils';
```

### 使用示例

#### 1. 创建Bot和发送消息
```typescript
const bot = BotManagerUtil.createBot(config);
await BotManagerUtil.sendMessage(bot, chatId, '测试消息');
```

#### 2. 执行技术分析
```typescript
const message = await AnalysisProcessorUtil.performComprehensiveAnalysis(
  coreTechnicalAnalysisService, 
  'BTCUSDT'
);
await BotManagerUtil.sendMessage(bot, chatId, message);
```

#### 3. 显示菜单
```typescript
const mainMenu = MenuTemplate.getMainMenu();
const menuOptions = MenuTemplate.getAnalysisTypeMenu();
await BotManagerUtil.sendMessage(bot, chatId, mainMenu, menuOptions);
```

#### 4. 格式化消息
```typescript
const price = FormatUtil.formatPrice(42156.78);
const trendEmoji = EmojiUtil.getTrendEmoji('UPTREND');
```

## 📦 依赖关系

- **interfaces**: 被所有其他模块引用
- **emoji**: 被formatters和templates引用
- **formatters**: 被analysis处理器引用
- **templates**: 独立模块，可被主服务直接使用
- **bot**: 独立工具模块
- **analysis**: 依赖formatters和核心技术分析服务

## 🔄 扩展指南

### 添加新的分析类型
1. 在`interfaces/telegram.interface.ts`中添加新的分析类型到`AnalysisType`枚举
2. 在`formatters/`目录下创建新的格式化器
3. 在`analysis/analysis-processor.util.ts`中添加新的处理方法
4. 在`templates/menu.template.ts`中更新菜单选项

### 添加新的表情符号
1. 在`emoji/emoji.util.ts`中添加新的映射方法
2. 在相应的formatter中使用新的表情符号

### 添加新的模板
1. 在`templates/`目录下创建新的模板文件
2. 在`templates/index.ts`中导出新模板
3. 更新本README文档

## 🎯 设计原则

1. **单一职责**: 每个工具类只负责一个特定功能
2. **可复用性**: 所有工具都设计为静态方法，便于复用
3. **类型安全**: 充分利用TypeScript的类型系统
4. **错误处理**: 所有方法都包含适当的错误处理
5. **日志记录**: 关键操作都有日志记录
6. **配置分离**: 配置信息通过参数传入，不硬编码

## 🔧 维护指南

- 定期检查依赖关系，避免循环依赖
- 保持接口定义的向后兼容性
- 新增功能时更新相应的测试
- 定期重构，保持代码简洁
- 及时更新文档 