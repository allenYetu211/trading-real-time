import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { TelegramService } from '../src/modules/notification/services/telegram.service';
import { CoinConfigService } from '../src/modules/coin-config/coin-config.service';
import { IntervalType } from '../src/shared/enums';

async function testTelegramMenu() {
  console.log('🚀 开始测试 Telegram 菜单功能...\n');

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

    // 3. 测试命令菜单设置
    console.log('\n3️⃣ 测试命令菜单设置...');
    try {
      const commands = await telegramService.getBotCommands();
      if (commands && commands.length > 0) {
        console.log(`   ✅ 找到 ${commands.length} 个命令:`);
        commands.forEach((cmd: any) => {
          console.log(`      /${cmd.command} - ${cmd.description}`);
        });
      } else {
        console.log('   ⚠️ 未找到命令列表');
      }
    } catch (error) {
      console.log(`   ❌ 获取命令列表失败: ${error.message}`);
    }

    // 4. 发送菜单功能介绍消息
    console.log('\n4️⃣ 发送菜单功能介绍消息...');
    const introMessage = `
🎉 <b>Telegram 菜单功能已上线!</b>

🆕 <b>新增功能:</b>

📋 <b>命令菜单</b>
• 在输入框旁边点击 "菜单" 按钮
• 或输入 "/" 查看所有可用命令

📱 <b>内联菜单</b>
• 使用 /menu 命令打开快捷操作面板
• 点击按钮直接执行操作
• 无需记忆复杂命令

⚡ <b>快捷操作</b>
• 📊 查看监控：快速查看监控列表
• ➕ 添加监控：引导添加新的交易对监控
• ❌ 删除监控：选择要删除的交易对
• 🔍 快速分析：直接分析特定交易对

🎯 <b>智能交互</b>
• 动态显示交易对按钮
• 一键操作，无需输入命令
• 错误处理和操作反馈

💡 试试以下命令体验新功能：
• /menu - 打开快捷操作面板
• /help - 查看增强的帮助信息
`.trim();

    const introSent = await telegramService.sendCustomMessage(introMessage);
    console.log(`   ${introSent ? '✅' : '❌'} 功能介绍消息发送${introSent ? '成功' : '失败'}`);

    // 5. 测试添加一些示例监控配置（为菜单测试准备数据）
    console.log('\n5️⃣ 添加示例监控配置...');
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

    // 6. 测试菜单面板
    console.log('\n6️⃣ 测试菜单面板...');
    const activeConfigs = await coinConfigService.findActiveConfigs();
    const symbolCount = [...new Set(activeConfigs.map(c => c.symbol))].length;

    const menuTestMessage = `
🧪 <b>菜单功能测试</b>

📊 当前监控状态：
• 交易对数量: ${symbolCount} 个
• 总配置数量: ${activeConfigs.length} 个

🎯 <b>测试指南：</b>

1️⃣ 发送 <code>/menu</code> 命令
   查看快捷操作面板

2️⃣ 点击 "📊 查看监控" 按钮
   测试内联键盘功能

3️⃣ 点击 "➕ 添加监控" 按钮
   测试添加引导功能

4️⃣ 点击 "❌ 删除监控" 按钮
   测试删除菜单功能

5️⃣ 点击任意交易对分析按钮
   测试快速分析功能

🔄 所有按钮都支持实时交互，无需刷新页面！

💡 菜单按钮位于输入框旁边，点击即可查看所有命令。
`.trim();

    const menuTestSent = await telegramService.sendCustomMessage(menuTestMessage);
    console.log(`   ${menuTestSent ? '✅' : '❌'} 菜单测试指南发送${menuTestSent ? '成功' : '失败'}`);

    // 7. 发送最终使用说明
    console.log('\n7️⃣ 发送使用说明...');
    const guideMessage = `
📖 <b>Telegram 菜单使用指南</b>

🎯 <b>三种菜单使用方式：</b>

1️⃣ <b>命令菜单</b>
   • 点击输入框旁边的 "菜单" 按钮
   • 或直接输入 "/" 查看命令列表
   • 适合熟悉命令的用户

2️⃣ <b>快捷面板</b>
   • 发送 /menu 命令
   • 使用内联按钮快速操作
   • 适合频繁操作的用户

3️⃣ <b>文字命令</b>
   • 直接输入命令（如 /add BTCUSDT）
   • 适合精确控制的用户

🌟 <b>推荐工作流程：</b>

🚀 新用户：/start → /help → /menu
📊 查看数据：/menu → 点击 "查看监控"
➕ 添加监控：/menu → 点击 "添加监控"
🔍 快速分析：/menu → 点击交易对按钮

✨ 现在开始体验全新的菜单功能吧！
`.trim();

    const guideSent = await telegramService.sendCustomMessage(guideMessage);
    console.log(`   ${guideSent ? '✅' : '❌'} 使用指南发送${guideSent ? '成功' : '失败'}`);

    console.log('\n✅ Telegram 菜单功能测试完成!');
    console.log('\n💡 现在您可以在 Telegram 中体验以下功能:');
    console.log('   • 命令菜单（点击输入框旁边的菜单按钮）');
    console.log('   • 快捷面板（发送 /menu 命令）');
    console.log('   • 增强的帮助信息（发送 /help 命令）');
    console.log('   • 内联键盘操作（点击任意按钮测试）');
    
    await app.close();

  } catch (error) {
    console.error('❌ 测试失败:', error);
    process.exit(1);
  }
}

// 运行测试
if (require.main === module) {
  testTelegramMenu()
    .then(() => {
      console.log('\n🎉 菜单功能测试完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 测试出错:', error);
      process.exit(1);
    });
}

export { testTelegramMenu }; 