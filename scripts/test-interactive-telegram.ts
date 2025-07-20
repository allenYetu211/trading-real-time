import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { TelegramService } from '../src/modules/notification/services/telegram.service';
import { CoinConfigService } from '../src/modules/coin-config/coin-config.service';
import { IntervalType } from '../src/shared/enums';

async function testInteractiveTelegram() {
  console.log('🚀 开始测试 Telegram 交互式功能...\n');

  try {
    // 创建应用实例
    const app = await NestFactory.createApplicationContext(AppModule);
    
    // 获取服务实例
    const telegramService = app.get(TelegramService);
    const coinConfigService = app.get(CoinConfigService);

    // 1. 测试 Telegram 服务状态
    console.log('1️⃣ 测试 Telegram 服务状态...');
    const isEnabled = telegramService.isEnabled();
    console.log(`   Telegram 服务状态: ${isEnabled ? '✅ 已启用' : '❌ 未启用'}`);

    if (!isEnabled) {
      console.log('   ⚠️ Telegram 服务未启用，请检查配置');
      console.log('   💡 确保以下环境变量已设置:');
      console.log('   - TELEGRAM_BOT_TOKEN');
      console.log('   - TELEGRAM_CHAT_ID');
      console.log('   - TELEGRAM_ENABLED=true');
      await app.close();
      return;
    }

    // 2. 测试 Bot 信息
    console.log('\n2️⃣ 获取 Bot 信息...');
    const botInfo = await telegramService.getBotInfo();
    if (botInfo) {
      console.log(`   ✅ Bot 用户名: @${botInfo.username}`);
      console.log(`   ✅ Bot 名称: ${botInfo.first_name}`);
      console.log(`   ✅ Bot ID: ${botInfo.id}`);
    } else {
      console.log('   ❌ 无法获取 Bot 信息');
    }

    // 3. 发送交互式功能介绍消息
    console.log('\n3️⃣ 发送交互式功能介绍消息...');
    const introMessage = `
🎉 <b>Telegram 交互式功能已上线!</b>

✨ <b>全新交互体验:</b>

1️⃣ <b>智能添加监控</b>
• 发送 <code>/add</code> 
• 然后输入交易对名称（如 BTCUSDT）
• 无需记忆完整命令格式！

2️⃣ <b>可视化删除监控</b>
• 发送 <code>/remove</code>
• 显示当前监控列表
• 点击按钮即可删除

3️⃣ <b>快速分析选择</b>
• 发送 <code>/analyze</code>
• 显示当前监控列表
• 点击按钮即可分析

🎯 <b>使用示例:</b>

传统方式：<code>/add BTCUSDT</code>
交互方式：<code>/add</code> ➜ <code>BTCUSDT</code>

传统方式：<code>/remove ETHUSDT</code>
交互方式：<code>/remove</code> ➜ 点击 ❌ ETHUSDT

🚀 <b>开始体验:</b>
发送 <code>/help</code> 查看更新的帮助信息
发送 <code>/add</code> 开始交互式添加体验！
`.trim();

    const introSent = await telegramService.sendCustomMessage(introMessage);
    console.log(`   ${introSent ? '✅' : '❌'} 功能介绍消息发送${introSent ? '成功' : '失败'}`);

    // 4. 添加一些示例监控配置（为测试准备数据）
    console.log('\n4️⃣ 添加示例监控配置...');
    const sampleConfigs = [
      { symbol: 'BTCUSDT', interval: IntervalType.ONE_HOUR },
      { symbol: 'ETHUSDT', interval: IntervalType.FOUR_HOURS },
      { symbol: 'ADAUSDT', interval: IntervalType.FIFTEEN_MINUTES },
      { symbol: 'SOLUSDT', interval: IntervalType.FIVE_MINUTES },
    ];

    for (const config of sampleConfigs) {
      try {
        // 检查是否已存在
        const existing = await coinConfigService.findBySymbolAndInterval(config.symbol, config.interval);
        if (!existing) {
          await coinConfigService.create({
            symbol: config.symbol,
            interval: config.interval,
            isActive: true,
          });
          console.log(`   ✅ 添加 ${config.symbol} (${config.interval}) 配置`);
        } else {
          // 确保配置是激活的
          if (!existing.isActive) {
            await coinConfigService.update(existing.id, { isActive: true });
            console.log(`   🔄 重新激活 ${config.symbol} (${config.interval}) 配置`);
          } else {
            console.log(`   ℹ️ ${config.symbol} (${config.interval}) 配置已存在`);
          }
        }
      } catch (error) {
        console.log(`   ❌ 添加 ${config.symbol} 配置失败: ${error.message}`);
      }
    }

    // 5. 获取当前监控状态
    console.log('\n5️⃣ 检查当前监控状态...');
    const activeConfigs = await coinConfigService.findActiveConfigs();
    const symbolCount = [...new Set(activeConfigs.map(c => c.symbol))].length;
    console.log(`   📊 当前监控: ${symbolCount} 个交易对，${activeConfigs.length} 个配置`);

    // 6. 发送交互式功能测试指南
    console.log('\n6️⃣ 发送测试指南...');
    const testGuideMessage = `
🧪 <b>交互式功能测试指南</b>

📊 <b>当前状态:</b>
• 监控的交易对: ${symbolCount} 个
• 总配置数量: ${activeConfigs.length} 个

🎯 <b>测试步骤:</b>

1️⃣ <b>测试交互式添加:</b>
   • 发送 <code>/add</code>
   • 等待提示消息
   • 输入 <code>LINKUSDT</code>
   • 查看添加结果

2️⃣ <b>测试交互式删除:</b>
   • 发送 <code>/remove</code>
   • 查看监控列表按钮
   • 点击任意删除按钮
   • 确认删除结果

3️⃣ <b>测试交互式分析:</b>
   • 发送 <code>/analyze</code>
   • 查看监控列表按钮
   • 点击任意分析按钮
   • 等待分析结果

4️⃣ <b>测试状态管理:</b>
   • 发送 <code>/add</code>
   • 然后发送任意命令（如 <code>/help</code>）
   • 确认状态被正确清除

5️⃣ <b>测试输入验证:</b>
   • 发送 <code>/add</code>
   • 输入无效交易对（如 <code>123</code>）
   • 确认错误提示

💡 <b>预期体验:</b>
• 操作简单直观
• 错误提示清晰
• 状态管理正确
• 按钮响应及时

🚀 现在开始测试吧！
`.trim();

    const guideSent = await telegramService.sendCustomMessage(testGuideMessage);
    console.log(`   ${guideSent ? '✅' : '❌'} 测试指南发送${guideSent ? '成功' : '失败'}`);

    // 7. 发送功能亮点介绍
    console.log('\n7️⃣ 发送功能亮点介绍...');
    const highlightsMessage = `
✨ <b>交互式功能亮点总结</b>

🎯 <b>用户体验提升:</b>

1️⃣ <b>降低记忆负担</b>
   • 无需记住复杂命令格式
   • 逐步引导式操作

2️⃣ <b>可视化选择</b>
   • 按钮点击代替手动输入
   • 减少输入错误

3️⃣ <b>智能状态管理</b>
   • 5分钟状态超时保护
   • 自动清理避免混乱

4️⃣ <b>双模式支持</b>
   • 传统命令: <code>/add BTCUSDT</code>
   • 交互模式: <code>/add</code> ➜ <code>BTCUSDT</code>

5️⃣ <b>错误处理友好</b>
   • 输入验证提示
   • 操作状态反馈

🔧 <b>技术特性:</b>
• 内存状态管理，重启安全
• 并发用户支持
• 实时按钮更新
• 全面错误捕获

👥 <b>适用场景:</b>
• 新手用户：使用交互模式
• 熟练用户：使用传统命令
• 移动设备：点击按钮更便捷
• 批量操作：混合使用两种方式

🎉 享受更流畅的交易监控体验！
`.trim();

    const highlightsSent = await telegramService.sendCustomMessage(highlightsMessage);
    console.log(`   ${highlightsSent ? '✅' : '❌'} 功能亮点介绍发送${highlightsSent ? '成功' : '失败'}`);

    console.log('\n✅ Telegram 交互式功能测试完成!');
    console.log('\n💡 现在您可以在 Telegram 中体验全新的交互式操作');
    console.log('💡 发送 /add 开始体验智能添加功能');
    console.log('💡 发送 /remove 或 /analyze 体验可视化选择功能');
    
    await app.close();

  } catch (error) {
    console.error('❌ 测试失败:', error);
    process.exit(1);
  }
}

// 运行测试
testInteractiveTelegram(); 