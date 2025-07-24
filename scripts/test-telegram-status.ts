import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { TelegramService } from '../src/modules/notification/services/telegram.service';

async function main() {
  console.log('🔍 检查 Telegram 菜单状态...\n');

  try {
    const app = await NestFactory.createApplicationContext(AppModule);
    const telegramService = app.get(TelegramService);

    // 检查服务是否启用
    const isEnabled = telegramService.isEnabled();
    console.log(`Telegram 服务状态: ${isEnabled ? '✅ 已启用' : '❌ 未启用'}`);
    
    if (!isEnabled) {
      console.log('请检查 .env 文件中的 Telegram 配置');
      await app.close();
      return;
    }

    // 获取命令列表
    console.log('\n获取 Bot 命令列表...');
    const commands = await telegramService.getBotCommands();
    
    if (commands && commands.length > 0) {
      console.log(`✅ 发现 ${commands.length} 个命令:`);
      commands.forEach((cmd: any, index: number) => {
        console.log(`  ${index + 1}. /${cmd.command} - ${cmd.description}`);
      });
    } else {
      console.log('❌ 没有找到命令或无法获取命令列表');
    }

    // 发送测试消息
    console.log('\n发送测试消息...');
    const result = await telegramService.sendNotification({
      title: '🔧 菜单状态检查',
      message: '正在检查 Telegram 菜单功能。如果菜单没有显示，请尝试发送 /start 重新初始化。',
      type: 'info',
      timestamp: new Date().toISOString(),
    });
    
    console.log(`测试消息发送: ${result ? '✅ 成功' : '❌ 失败'}`);

    await app.close();
    console.log('\n✅ 检查完成');
    
  } catch (error) {
    console.error('❌ 检查过程中出错:', error);
  }
}

main().catch(console.error); 