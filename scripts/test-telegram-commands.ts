import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { TelegramService } from '../src/modules/notification/services/telegram.service';
import { CoinConfigService } from '../src/modules/coin-config/coin-config.service';
import { AnalysisService } from '../src/modules/analysis/analysis.service';
import { IntervalType } from '../src/shared/enums';

async function testTelegramCommands() {
  console.log('🚀 开始测试 Telegram 命令功能...\n');

  try {
    // 创建应用实例
    const app = await NestFactory.createApplicationContext(AppModule);
    
    // 获取服务实例
    const telegramService = app.get(TelegramService);
    const coinConfigService = app.get(CoinConfigService);
    const analysisService = app.get(AnalysisService);

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

    // 3. 发送命令功能介绍消息
    console.log('\n3️⃣ 发送命令功能介绍消息...');
    const introMessage = `
🎉 <b>Telegram 全周期命令功能已上线!</b>

🆕 <b>全新特性:</b>
• /help - 查看帮助信息
• /list - 查看监控的交易对
• /add &lt;交易对&gt; - 添加全周期监控 (5m/15m/1h/4h)
• /remove &lt;交易对&gt; - 删除全周期监控
• /analyze &lt;交易对&gt; - 立即分析全周期

🎯 <b>简化操作:</b>
• 一个命令管理所有4个周期
• 无需指定具体时间周期
• 获得完整的多周期分析视角

🧪 <b>测试说明:</b>
现在您可以直接在 Telegram 中发送命令来管理全周期监控配置！

💡 发送 <code>/help</code> 查看详细使用说明
`.trim();

    const introSent = await telegramService.sendCustomMessage(introMessage);
    console.log(`   ${introSent ? '✅' : '❌'} 功能介绍消息发送${introSent ? '成功' : '失败'}`);

    // 4. 测试添加一些示例监控配置
    console.log('\n4️⃣ 添加示例监控配置...');
    const sampleConfigs = [
      { symbol: 'BTCUSDT', interval: IntervalType.ONE_HOUR },
      { symbol: 'ETHUSDT', interval: IntervalType.FOUR_HOURS },
      { symbol: 'ADAUSDT', interval: IntervalType.FIFTEEN_MINUTES },
    ];

    for (const config of sampleConfigs) {
      try {
        // 检查是否已存在
        const existing = await coinConfigService.findBySymbolAndInterval(config.symbol, config.interval);
        if (existing && existing.isActive) {
          console.log(`   ✅ ${config.symbol} ${config.interval} 已存在且已激活`);
          continue;
        }

        if (existing && !existing.isActive) {
          // 重新激活
          await coinConfigService.update(existing.id, { isActive: true });
          console.log(`   ✅ 重新激活 ${config.symbol} ${config.interval}`);
        } else {
          // 创建新配置
          await coinConfigService.create({
            symbol: config.symbol,
            interval: config.interval,
            isActive: true,
          });
          console.log(`   ✅ 创建 ${config.symbol} ${config.interval} 监控配置`);
        }
      } catch (error) {
        console.log(`   ❌ 配置 ${config.symbol} ${config.interval} 失败: ${error.message}`);
      }
    }

    // 5. 测试获取监控列表
    console.log('\n5️⃣ 测试监控列表功能...');
    const activeConfigs = await coinConfigService.findActiveConfigs();
    console.log(`   ✅ 找到 ${activeConfigs.length} 个活跃监控配置:`);
    
    activeConfigs.forEach(config => {
      console.log(`      - ${config.symbol} (${config.interval})`);
    });

    // 6. 测试立即分析功能
    console.log('\n6️⃣ 测试立即分析功能...');
    if (activeConfigs.length > 0) {
      const testConfig = activeConfigs[0];
      console.log(`   🔄 正在分析 ${testConfig.symbol} ${testConfig.interval}...`);
      
      try {
        const analysis = await analysisService.performComprehensiveAnalysis(
          testConfig.symbol,
          testConfig.interval as IntervalType,
          100
        );
        
        console.log(`   ✅ 分析完成:`);
        console.log(`      - 信号: ${analysis.score.signal}`);
        console.log(`      - 置信度: ${analysis.score.confidence}%`);
        console.log(`      - 总结: ${analysis.summary}`);
        
                 // 发送分析结果到 Telegram
         const testMessage = `
🧪 <b>命令测试 - 单周期分析结果</b>

🪙 <b>${analysis.symbol} (${analysis.interval})</b>
📊 信号: <b>${analysis.score.signal}</b>
🎯 置信度: <b>${analysis.score.confidence}%</b>

📝 ${analysis.summary}

💡 您现在可以使用 <code>/analyze ${testConfig.symbol}</code> 命令来获取全周期(5m/15m/1h/4h)的综合分析结果!

🎯 新的分析命令将同时分析4个周期，提供更全面的技术分析视角。
`.trim();

        const testSent = await telegramService.sendCustomMessage(testMessage);
        console.log(`   ${testSent ? '✅' : '❌'} 测试分析结果发送${testSent ? '成功' : '失败'}`);

      } catch (error) {
        console.log(`   ❌ 分析失败: ${error.message}`);
      }
    } else {
      console.log('   ⚠️ 没有活跃配置，跳过分析测试');
    }

    // 7. 发送使用指南
    console.log('\n7️⃣ 发送使用指南...');
    const guideMessage = `
📖 <b>Telegram 全周期命令使用指南</b>

🎯 <b>现在您可以直接在聊天中使用以下命令:</b>

<code>/list</code> - 查看当前监控的交易对
<code>/add SOLUSDT</code> - 添加 SOL 全周期监控
<code>/remove ADAUSDT</code> - 删除 ADA 全周期监控
<code>/analyze BTCUSDT</code> - 立即分析 BTC 全周期

⚡ <b>自动监控的时间周期:</b>
• 5分钟 • 15分钟 • 1小时 • 4小时

🎯 <b>特色功能:</b>
• 一个命令操作所有4个周期
• 多周期综合分析结果
• 智能信号一致性检测

🔔 <b>自动通知:</b>
系统会继续定期分析监控的交易对并自动发送多周期综合通知

✨ 试试发送 <code>/help</code> 获取完整的命令列表!
`.trim();

    const guideSent = await telegramService.sendCustomMessage(guideMessage);
    console.log(`   ${guideSent ? '✅' : '❌'} 使用指南发送${guideSent ? '成功' : '失败'}`);

    console.log('\n✅ Telegram 命令功能测试完成!');
    console.log('\n💡 现在您可以在 Telegram 中直接使用命令来管理监控和分析功能');
    
    await app.close();

  } catch (error) {
    console.error('❌ 测试失败:', error);
    process.exit(1);
  }
}

// 运行测试
if (require.main === module) {
  testTelegramCommands()
    .then(() => {
      console.log('\n🎉 测试完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 测试出错:', error);
      process.exit(1);
    });
}

export { testTelegramCommands }; 