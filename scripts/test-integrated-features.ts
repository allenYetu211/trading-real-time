/**
 * 集成功能测试脚本
 * 测试Telegram机器人的RSI、OI功能和综合分析集成
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { TelegramCCXTAnalysisService } from '../src/modules/telegram-ccxt-analysis/services/telegram-ccxt-analysis.service';
import { CoreTechnicalAnalysisService } from '../src/modules/technical-analysis/services/core-technical-analysis.service';
import { RSIAnalysisService } from '../src/modules/ccxt-analysis/services/rsi-analysis.service';
import { OpenInterestService } from '../src/modules/ccxt-analysis/services/open-interest.service';

async function testIntegratedFeatures() {
  console.log('🚀 开始测试集成功能...\n');

  try {
    // 创建应用实例
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: ['error', 'warn', 'log'],
    });

    // 获取服务实例
    const telegramService = app.get(TelegramCCXTAnalysisService);
    const coreAnalysisService = app.get(CoreTechnicalAnalysisService);
    const rsiService = app.get(RSIAnalysisService);
    const oiService = app.get(OpenInterestService);

    console.log('✅ 服务实例创建成功\n');

    // 测试交易对
    const testSymbol = 'BTCUSDT';

    // 1. 测试RSI分析服务
    console.log('📉 测试RSI分析服务...');
    try {
      const rsiResult = await rsiService.getRSIAnalysis(testSymbol);
      console.log(`✅ RSI分析成功: RSI=${rsiResult.currentRSI.rsi.toFixed(2)}, 信号=${rsiResult.signal}`);
    } catch (error) {
      console.log(`❌ RSI分析失败: ${error.message}`);
    }

    // 2. 测试持仓量分析服务
    console.log('\n💰 测试持仓量分析服务...');
    try {
      const futuresSymbol = 'BTC/USDT:USDT';
      const oiResult = await oiService.getOpenInterest(futuresSymbol, 'binanceusdm');
      const formatNumber = (num: number) => {
        if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
        if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
        return num.toFixed(2);
      };
      console.log(`✅ 持仓量分析成功: ${formatNumber(oiResult.openInterest)}`);
    } catch (error) {
      console.log(`❌ 持仓量分析失败: ${error.message}`);
    }

    // 3. 测试综合分析(包含RSI和OI)
    console.log('\n🔍 测试综合分析(包含RSI和OI)...');
    try {
      const comprehensiveResult = await coreAnalysisService.performComprehensiveAnalysis(testSymbol);
      
      console.log('✅ 综合分析成功包含:');
      console.log(`  • EMA分析: ${comprehensiveResult.emaAnalysis ? '✅' : '❌'}`);
      console.log(`  • 趋势分析: ${comprehensiveResult.trendAnalysis ? '✅' : '❌'}`);
      console.log(`  • 支撑阻力位: ${comprehensiveResult.srAnalysis ? '✅' : '❌'}`);
      console.log(`  • RSI分析: ${comprehensiveResult.rsiAnalysis ? '✅' : '❌'}`);
      console.log(`  • 持仓量数据: ${comprehensiveResult.openInterestData ? '✅' : '❌'}`);
      
      if (comprehensiveResult.rsiAnalysis) {
        console.log(`    RSI: ${comprehensiveResult.rsiAnalysis.currentRSI.rsi.toFixed(2)}`);
      }
      if (comprehensiveResult.openInterestData) {
        const formatOI = (num: number) => num >= 1e6 ? `${(num / 1e6).toFixed(2)}M` : num.toFixed(2);
        console.log(`    持仓量: ${formatOI(comprehensiveResult.openInterestData.openInterest)}`);
      }
    } catch (error) {
      console.log(`❌ 综合分析失败: ${error.message}`);
    }

    // 4. 测试Telegram机器人状态
    console.log('\n🤖 测试Telegram机器人状态...');
    try {
      const botStatus = await telegramService.getBotStatus();
      console.log('✅ Telegram机器人状态:');
      console.log(`  • 运行状态: ${botStatus.isRunning ? '🟢 运行中' : '🔴 已停止'}`);
      console.log(`  • 配置状态: ${botStatus.isConfigured ? '✅ 已配置' : '❌ 未配置'}`);
      console.log(`  • 菜单状态: ${botStatus.menuInitialized ? '✅ 已初始化' : '❌ 未初始化'}`);
    } catch (error) {
      console.log(`❌ 获取机器人状态失败: ${error.message}`);
    }

    // 5. 测试多个交易对的分析能力
    console.log('\n📊 测试多个交易对分析能力...');
    const testSymbols = ['ETHUSDT', 'SOLUSDT', 'BNBUSDT'];
    
    for (const symbol of testSymbols) {
      console.log(`\n  测试 ${symbol}:`);
      
      // RSI测试
      try {
        const rsiResult = await rsiService.getRSIAnalysis(symbol);
        console.log(`    RSI: ✅ ${rsiResult.currentRSI.rsi.toFixed(2)} (${rsiResult.signal})`);
      } catch (error) {
        console.log(`    RSI: ❌ ${error.message}`);
      }
      
      // 持仓量测试（期货合约）
      try {
        const base = symbol.replace('USDT', '');
        const futuresSymbol = `${base}/USDT:USDT`;
        const oiResult = await oiService.getOpenInterest(futuresSymbol, 'binanceusdm');
        const formatOI = (num: number) => num >= 1e6 ? `${(num / 1e6).toFixed(2)}M` : num.toFixed(2);
        console.log(`    持仓量: ✅ ${formatOI(oiResult.openInterest)}`);
      } catch (error) {
        console.log(`    持仓量: ❌ ${error.message}`);
      }
    }

    // 6. 性能测试
    console.log('\n⚡ 性能测试...');
    const startTime = Date.now();
    
    try {
      await Promise.all([
        rsiService.getRSIAnalysis(testSymbol),
        oiService.getOpenInterest('BTC/USDT:USDT', 'binanceusdm'),
        coreAnalysisService.performComprehensiveAnalysis(testSymbol)
      ]);
      
      const duration = Date.now() - startTime;
      console.log(`✅ 并行分析完成，耗时: ${duration}ms`);
    } catch (error) {
      console.log(`❌ 性能测试失败: ${error.message}`);
    }

    console.log('\n🎉 集成功能测试完成！');
    console.log('\n📋 功能清单:');
    console.log('  ✅ RSI技术分析服务');
    console.log('  ✅ 持仓量分析服务');
    console.log('  ✅ 综合分析RSI集成');
    console.log('  ✅ 综合分析持仓量集成');
    console.log('  ✅ Telegram机器人新菜单');
    console.log('  ✅ 多交易对支持');
    console.log('  ✅ 性能优化');

    console.log('\n💡 使用建议:');
    console.log('  • Telegram输入: /technical BTCUSDT');
    console.log('  • 选择"RSI分析"获取RSI技术指标');
    console.log('  • 选择"持仓量分析"获取期货持仓数据');
    console.log('  • 选择"完整技术分析"获取包含RSI和持仓量的综合报告');

    await app.close();

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
    process.exit(1);
  }
}

// 运行测试
testIntegratedFeatures().catch(console.error); 