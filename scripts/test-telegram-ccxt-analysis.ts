import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { TelegramCCXTAnalysisService } from '../src/modules/telegram-ccxt-analysis/services/telegram-ccxt-analysis.service';

/**
 * 测试 Telegram CCXT 分析功能
 */
async function testTelegramCCXTAnalysis() {
  console.log('🚀 开始测试 Telegram CCXT 分析功能...\n');

  try {
    // 创建 NestJS 应用实例
    const app = await NestFactory.create(AppModule);
    const telegramCCXTAnalysisService = app.get(TelegramCCXTAnalysisService);

    // 等待一下让服务初始化
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('1. 测试 Bot 状态...');
    const status = await telegramCCXTAnalysisService.getBotStatus();
    console.log('Bot 状态:', JSON.stringify(status, null, 2));

    if (status.status === 'active') {
      console.log('\n2. 测试连接...');
      const connectionTest = await telegramCCXTAnalysisService.testConnection();
      console.log('连接测试结果:', connectionTest ? '✅ 成功' : '❌ 失败');

      console.log('\n3. 测试重新初始化菜单...');
      const menuResult = await telegramCCXTAnalysisService.reinitializeMenus();
      console.log('菜单初始化结果:', menuResult.success ? '✅ 成功' : '❌ 失败');

      console.log('\n4. 测试快速分析...');
      try {
        await telegramCCXTAnalysisService.performQuickAnalysis('BTCUSDT', '1d');
        console.log('✅ 快速分析测试成功');
      } catch (error) {
        console.log('❌ 快速分析测试失败:', error.message);
      }

      console.log('\n5. 测试其他交易对分析...');
      const testSymbols = ['ETHUSDT', 'SOLUSDT'];
      for (const symbol of testSymbols) {
        try {
          console.log(`  - 分析 ${symbol}...`);
          await telegramCCXTAnalysisService.performQuickAnalysis(symbol, '4h');
          console.log(`  ✅ ${symbol} 分析成功`);
        } catch (error) {
          console.log(`  ❌ ${symbol} 分析失败:`, error.message);
        }
      }

    } else {
      console.log('❌ Bot 未激活，跳过后续测试');
      console.log('请检查 Telegram 配置：');
      console.log('- TELEGRAM_BOT_TOKEN');
      console.log('- TELEGRAM_CHAT_ID');
      console.log('- TELEGRAM_ENABLED=true');
    }

    console.log('\n✅ Telegram CCXT 分析功能测试完成');
    
    // 关闭应用
    await app.close();

  } catch (error) {
    console.error('❌ 测试过程中出错:', error);
    process.exit(1);
  }
}

// 执行测试
if (require.main === module) {
  testTelegramCCXTAnalysis().catch(console.error);
} 