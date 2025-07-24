import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { TelegramService } from '../src/modules/notification/services/telegram.service';

async function testTelegramMenu() {
  console.log('🤖 开始测试 Telegram 菜单状态...\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const telegramService = app.get(TelegramService);

  try {
    // 1. 检查服务状态
    console.log('1️⃣ 检查 Telegram 服务状态...');
    const isEnabled = telegramService.isEnabled();
    console.log(`服务状态: ${isEnabled ? '✅ 已启用' : '❌ 未启用'}`);
    
    if (!isEnabled) {
      console.log('\n❌ Telegram 服务未启用，请检查环境配置');
      await app.close();
      return;
    }

    // 2. 获取当前 Bot 命令列表
    console.log('\n2️⃣ 获取当前 Bot 命令列表...');
    const commands = await telegramService.getBotCommands();
    
    if (commands) {
      console.log(`✅ 当前已设置 ${commands.length} 个命令:`);
      commands.forEach((cmd, index) => {
        console.log(`   ${index + 1}. /${cmd.command} - ${cmd.description}`);
      });
    } else {
      console.log('❌ 无法获取命令列表，可能是网络或权限问题');
    }

    // 3. 重新初始化菜单（如果需要）
    console.log('\n3️⃣ 尝试重新初始化菜单...');
    try {
      // 通过反射访问私有方法来重新初始化菜单
      const initializeMenus = (telegramService as any).initializeMenus;
      if (typeof initializeMenus === 'function') {
        await initializeMenus.call(telegramService);
        console.log('✅ 菜单重新初始化完成');
      } else {
        console.log('⚠️ 无法访问菜单初始化方法');
      }
    } catch (error) {
      console.log('❌ 菜单初始化失败:', error.message);
    }

    // 4. 再次检查命令列表
    console.log('\n4️⃣ 再次检查命令列表...');
    const updatedCommands = await telegramService.getBotCommands();
    
    if (updatedCommands) {
      console.log(`✅ 更新后的命令列表 (${updatedCommands.length} 个命令):`);
      updatedCommands.forEach((cmd, index) => {
        console.log(`   ${index + 1}. /${cmd.command} - ${cmd.description}`);
      });
    }

    // 5. 发送测试消息验证菜单功能
    console.log('\n5️⃣ 发送测试消息验证菜单功能...');
    const testResult = await telegramService.sendNotification({
      title: '🔧 菜单测试',
      message: `菜单状态检查完成\n\n当前可用命令: ${updatedCommands?.length || 0} 个\n\n请在 Telegram 中输入 /menu 或 /help 测试菜单功能`,
      type: 'info',
      timestamp: new Date().toISOString(),
    });
    
    if (testResult) {
      console.log('✅ 测试消息发送成功');
    } else {
      console.log('❌ 测试消息发送失败');
    }

    console.log('\n📝 故障排除建议:');
    console.log('1. 确认 TELEGRAM_BOT_TOKEN 和 TELEGRAM_CHAT_ID 配置正确');
    console.log('2. 检查 Bot 是否被 BotFather 停用');
    console.log('3. 在 Telegram 中尝试发送 /start 命令重新启动对话');
    console.log('4. 确认网络连接正常，可以访问 Telegram API');
    console.log('5. 重启应用服务，让菜单重新初始化');

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
  } finally {
    await app.close();
  }
}

// 直接运行测试
testTelegramMenu().catch(console.error); 