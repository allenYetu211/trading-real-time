import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { TelegramCCXTAnalysisService } from '../src/modules/telegram-ccxt-analysis/services/telegram-ccxt-analysis.service';

/**
 * 测试 Telegram 技术分析功能
 */
async function testTelegramTechnicalAnalysis() {
  console.log('🚀 开始测试 Telegram 技术分析功能...\n');

  try {
    // 创建 NestJS 应用实例
    const app = await NestFactory.create(AppModule);
    const telegramCCXTAnalysisService = app.get(TelegramCCXTAnalysisService);

    // 等待一下让服务初始化
    await new Promise(resolve => setTimeout(resolve, 3000));

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

      console.log('\n4. 测试快速 EMA 分析...');
      try {
        await telegramCCXTAnalysisService.performQuickAnalysis('BTCUSDT', '1d');
        console.log('✅ 快速 EMA 分析测试成功');
      } catch (error) {
        console.log('❌ 快速 EMA 分析测试失败:', error.message);
      }

      console.log('\n5. 测试多时间周期趋势分析...');
      try {
        await telegramCCXTAnalysisService.performTrendAnalysis('ETHUSDT');
        console.log('✅ 趋势分析测试成功');
      } catch (error) {
        console.log('❌ 趋势分析测试失败:', error.message);
      }

      console.log('\n6. 测试支撑阻力位分析...');
      try {
        await telegramCCXTAnalysisService.performSupportResistanceAnalysis('SOLUSDT');
        console.log('✅ 支撑阻力位分析测试成功');
      } catch (error) {
        console.log('❌ 支撑阻力位分析测试失败:', error.message);
      }

      console.log('\n7. 测试完整技术分析...');
      try {
        await telegramCCXTAnalysisService.performTechnicalAnalysis('ADAUSDT', 'comprehensive');
        console.log('✅ 完整技术分析测试成功');
      } catch (error) {
        console.log('❌ 完整技术分析测试失败:', error.message);
      }

      console.log('\n8. 测试不同分析类型...');
      const testCases = [
        { symbol: 'DOTUSDT', type: 'trend', description: '趋势分析' },
        { symbol: 'LINKUSDT', type: 'support_resistance', description: '支撑阻力位分析' },
        { symbol: 'UNIUSDT', type: 'comprehensive', description: '完整技术分析' },
      ];

      for (const testCase of testCases) {
        try {
          console.log(`  - 测试 ${testCase.symbol} ${testCase.description}...`);
          await telegramCCXTAnalysisService.performTechnicalAnalysis(testCase.symbol, testCase.type);
          console.log(`  ✅ ${testCase.symbol} ${testCase.description}成功`);
        } catch (error) {
          console.log(`  ❌ ${testCase.symbol} ${testCase.description}失败:`, error.message);
        }
      }

      console.log('\n9. 测试分析性能...');
      const startTime = Date.now();
      try {
        await Promise.all([
          telegramCCXTAnalysisService.performQuickAnalysis('BTCUSDT', '4h'),
          telegramCCXTAnalysisService.performTrendAnalysis('ETHUSDT'),
          telegramCCXTAnalysisService.performSupportResistanceAnalysis('SOLUSDT'),
        ]);
        const endTime = Date.now();
        console.log(`✅ 并行分析测试成功，耗时: ${endTime - startTime}ms`);
      } catch (error) {
        console.log('❌ 并行分析测试失败:', error.message);
      }

    } else {
      console.log('❌ Bot 未激活，跳过后续测试');
      console.log('请检查 Telegram 配置：');
      console.log('- TELEGRAM_BOT_TOKEN');
      console.log('- TELEGRAM_CHAT_ID');
      console.log('- TELEGRAM_ENABLED=true');
    }

    console.log('\n✅ Telegram 技术分析功能测试完成');
    console.log('\n📋 可用的 Telegram 命令：');
    console.log('- /quick BTCUSDT    - 快速 EMA 分析');
    console.log('- /trend ETHUSDT    - 多时间周期趋势分析'); 
    console.log('- /sr SOLUSDT       - 支撑阻力位分析');
    console.log('- /technical ADAUSDT - 完整技术分析');
    console.log('- /menu             - 显示交互菜单');
    console.log('- /help             - 显示帮助信息');
    
    // 关闭应用
    await app.close();

  } catch (error) {
    console.error('❌ 测试过程中出错:', error);
    process.exit(1);
  }
}

// 执行测试
if (require.main === module) {
  testTelegramTechnicalAnalysis().catch(console.error);
} 