#!/usr/bin/env ts-node

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { TelegramCCXTAnalysisService } from '../src/modules/telegram-ccxt-analysis/services/telegram-ccxt-analysis.service';

/**
 * 测试新的菜单功能和增强的 /add 命令
 */
async function testNewFeatures() {
  console.log('🚀 启动测试：新菜单功能和增强的 /add 命令');

  try {
    // 创建应用实例
    const app = await NestFactory.createApplicationContext(AppModule);
    const telegramService = app.get(TelegramCCXTAnalysisService);

    console.log('✅ 应用启动成功');

    // 等待服务初始化
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('⏳ 服务初始化完成');

    console.log(`
📋 测试功能列表：

1. ⚙️ 新的交易对管理菜单选项
   - 在分析菜单中添加了"交易对管理"按钮
   - 包含查看列表、添加、移除三个子选项

2. 🔄 增强的 /add 命令
   - 支持直接模式：/add SOLUSDT
   - 支持分步模式：/add -> 等待输入 -> SOLUSDT
   - 用户状态管理，5分钟超时

3. 🔄 增强的 /remove 命令
   - 支持直接模式：/remove SOLUSDT
   - 支持分步模式：/remove -> 等待输入 -> SOLUSDT
   - 智能显示当前关注列表

4. 💬 消息处理器
   - 新增非命令消息处理能力
   - 用户状态追踪和超时管理
   - 错误处理和用户引导

🎯 测试方式：
1. 在 Telegram 中找到您的机器人
2. 发送 /start 查看主菜单
3. 点击 "📊 开始分析" -> "⚙️ 交易对管理"
4. 测试各种添加/移除方式：
   - /add SOLUSDT（直接）
   - /add（分步）
   - /remove SOLUSDT（直接）
   - /remove（分步）

📝 预期结果：
- 菜单中显示交易对管理选项
- /add 命令支持两种输入模式
- /remove 命令支持两种输入模式
- 分步输入有超时保护
- 用户友好的错误提示和引导

⚠️  注意事项：
- 确保 Telegram Bot Token 已正确配置
- 确保 Chat ID 已正确设置
- 测试前请确保数据库连接正常
    `);

    console.log('✅ 测试环境检查完成');
    console.log('🔄 请在 Telegram 中手动测试新功能...');

    // 关闭应用
    await app.close();
    console.log('👋 测试脚本执行完成');

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
    process.exit(1);
  }
}

// 运行测试
testNewFeatures().catch(console.error);