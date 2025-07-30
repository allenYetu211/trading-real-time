# Cursor Rules 总结文档

这个目录包含了基于Telegram Bot重构经验总结的开发规范和最佳实践规则。

## 📋 规则列表

### 1. [modular-architecture-general.mdc](./modular-architecture-general.mdc)
**通用模块化架构和重构规范** (自动应用)
- 🎯 **作用域**: 整个项目
- 📝 **内容**: 核心重构原则、文件大小限制、目录结构模式
- 🔧 **核心规则**:
  - 单个文件不超过 500 行
  - 严格遵循单一职责原则
  - 使用静态工具类模式
  - 标准化的错误处理和日志记录

### 2. [telegram-bot-refactor-patterns.mdc](./telegram-bot-refactor-patterns.mdc)
**Telegram Bot重构模式和架构规范**
- 🎯 **作用域**: `src/modules/telegram-ccxt-analysis/**`
- 📝 **内容**: Telegram Bot特定的架构模式、工具类设计
- 🔧 **核心规则**:
  - 强制使用 utils/ 目录结构
  - 模块化设计原则
  - 统一的导入导出规范
  - 新功能扩展标准流程

### 3. [technical-analysis-patterns.mdc](./technical-analysis-patterns.mdc)
**技术分析模块开发模式和数据一致性规范**
- 🎯 **作用域**: `src/modules/technical-analysis/**`, `src/modules/ccxt-analysis/**`
- 📝 **内容**: 技术分析数据一致性、格式化标准
- 🔧 **核心规则**:
  - 必须使用 `CoreTechnicalAnalysisService` 作为唯一数据源
  - 统一的精确交易区间格式
  - 标准EMA参数配置 (20, 60, 120)
  - 100根K线数据量标准

## 🎯 重构总结

### 重构成果
- **代码行数减少**: 主服务从 1568 行减少到 370 行 (减少 76%)
- **文件职责明确**: 每个文件都有单一职责
- **复用性提升**: 工具类可在多个场景下复用
- **可维护性增强**: 修改某个功能影响范围大大缩小

### 核心设计模式
1. **工厂模式** - Bot管理工具的创建
2. **模板模式** - 统一的消息模板管理
3. **策略模式** - 不同分析类型的处理策略
4. **单一职责原则** - 每个工具类只负责一个功能

### 技术架构改进
- **分层清晰**: 业务逻辑、格式化、模板完全分离
- **依赖合理**: 避免循环依赖，依赖关系清晰
- **类型安全**: 完整的TypeScript类型定义
- **错误处理**: 统一的错误处理和日志记录

## 🚀 使用指南

### 1. 开发新功能时
- 查看 `modular-architecture-general.mdc` 了解通用规范
- 根据功能类型查看对应的专项规则
- 遵循标准的目录结构和命名规范

### 2. 重构现有代码时
- 识别超大文件 (>500行)
- 按照单一职责原则拆分功能
- 使用工具类模式抽离通用逻辑
- 确保向后兼容性

### 3. 技术分析相关开发
- 必须使用 `CoreTechnicalAnalysisService`
- 遵循数据一致性规范
- 使用统一的格式化器
- 保持精确交易区间格式一致

## 🔍 质量检查

### 重构检查清单
在任何代码修改时，请检查：

- [ ] 是否遵循单一职责原则？
- [ ] 文件大小是否在限制范围内？
- [ ] 是否使用了正确的目录结构？
- [ ] 是否有适当的类型定义？
- [ ] 是否包含错误处理和日志记录？
- [ ] 是否更新了相关文档？
- [ ] 是否保持了API的向后兼容性？

### 技术分析专项检查
- [ ] 是否使用核心技术分析服务？
- [ ] 数据格式是否与完整分析一致？
- [ ] EMA参数是否使用标准配置？
- [ ] 精确交易区间格式是否统一？

## 📚 最佳实践参考

### 成功重构案例
- **Telegram Bot**: 从 1568 行巨型文件拆分为 17 个模块化文件
- **技术分析**: 统一数据源，确保所有分析类型数据一致
- **工具类设计**: 静态方法、无依赖注入、参数传递依赖

### 代码示例
```typescript
// ✅ 正确：使用工具类模式
import { AnalysisProcessorUtil, BotManagerUtil } from '../utils';

const message = await AnalysisProcessorUtil.performComprehensiveAnalysis(
  coreTechnicalAnalysisService, 'BTCUSDT'
);
await BotManagerUtil.sendMessage(bot, chatId, message);

// ❌ 错误：混合职责，硬编码依赖
class MixedService {
  async doEverything() {
    // 格式化、分析、发送消息混在一起
  }
}
```

## 🔄 持续改进

这些规则是基于实际重构经验总结的，会根据项目发展持续优化：

1. **定期审查** - 每季度审查规则的有效性
2. **经验总结** - 新的重构案例会更新到规则中
3. **团队反馈** - 根据团队使用反馈调整规则
4. **技术演进** - 随着技术栈变化更新最佳实践

---

*这些规则确保了代码质量、可维护性和团队协作效率，是项目成功的重要保障。* 