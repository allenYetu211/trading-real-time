#!/usr/bin/env ts-node

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { TelegramBotService } from '../src/modules/telegram-bot/telegram-bot.service';

/**
 * 设置 Telegram Bot 命令菜单
 * 这些命令将显示在 Telegram 输入框的菜单栏中
 */
async function setupBotCommands() {
  console.log('🤖 开始设置 Telegram Bot 命令菜单...');

  try {
    // 创建应用实例
    const app = await NestFactory.createApplicationContext(AppModule);
    const telegramBotService = app.get(TelegramBotService);

    console.log('✅ 应用启动成功');

    // 等待服务初始化
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 定义命令列表
    const commands = [
      {
        command: 'start',
        description: '启动机器人并显示主菜单'
      },
      {
        command: 'help',
        description: '显示帮助信息'
      },
      {
        command: 'technical',
        description: '完整技术分析'
      },
      {
        command: 'list',
        description: '查看关注列表'
      },
      {
        command: 'add',
        description: '添加交易对到关注列表'
      },
      {
        command: 'remove',
        description: '从关注列表移除交易对'
      },
      {
        command: 'status',
        description: '查看机器人状态'
      }
    ];

    // 设置命令菜单
    const result = await telegramBotService.setBotCommands(commands);
    
    if (result) {
      console.log('✅ Bot 命令菜单设置成功！');
      console.log('📋 已设置的命令：');
      commands.forEach(cmd => {
        console.log(`  /${cmd.command} - ${cmd.description}`);
      });
      
      console.log(`
🎉 设置完成！

现在用户可以在 Telegram 输入框中：
1. 点击菜单按钮 (☰) 看到所有可用命令
2. 输入 / 时自动显示命令提示
3. 点击命令直接使用

💡 命令使用说明：
• /start - 启动并显示主菜单
• /help - 查看详细帮助
• /technical BTCUSDT - 快速分析
• /list - 查看关注的交易对
• /add SYMBOL - 添加交易对（支持分步输入）
• /remove SYMBOL - 移除交易对（支持分步输入）
• /status - 查看机器人运行状态
      `);
    } else {
      console.error('❌ 设置 Bot 命令菜单失败');
    }

    // 关闭应用
    await app.close();
    console.log('👋 脚本执行完成');

  } catch (error) {
    console.error('❌ 设置过程中发生错误:', error);
    process.exit(1);
  }
}

// 运行设置
setupBotCommands().catch(console.error);