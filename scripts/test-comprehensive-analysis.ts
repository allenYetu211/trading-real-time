import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { TelegramCCXTAnalysisService } from '../src/modules/telegram-ccxt-analysis/services/telegram-ccxt-analysis.service';

async function testComprehensiveAnalysis() {
  console.log('🚀 启动完整技术分析测试...');

  const app = await NestFactory.createApplicationContext(AppModule);
  const telegramService = app.get(TelegramCCXTAnalysisService);

  try {
    console.log('📊 测试 BTCUSDT 完整技术分析...');
    
    // 测试完整技术分析功能
    await telegramService.performTechnicalAnalysis('BTCUSDT', 'comprehensive');
    
    console.log('✅ 完整技术分析测试完成');
    
    // 测试 Bot 状态
    const botStatus = await telegramService.getBotStatus();
    console.log('🤖 Bot 状态:', botStatus);

  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    await app.close();
  }
}

// 运行测试
testComprehensiveAnalysis().catch(console.error); 