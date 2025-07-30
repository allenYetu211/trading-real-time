/**
 * 调试菜单路由和分析功能
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { RSIAnalysisService } from '../src/modules/ccxt-analysis/services/rsi-analysis.service';
import { OpenInterestService } from '../src/modules/ccxt-analysis/services/open-interest.service';
import { AnalysisProcessorUtil } from '../src/modules/telegram-ccxt-analysis/utils/analysis/analysis-processor.util';
import { AnalysisType } from '../src/modules/telegram-ccxt-analysis/utils/interfaces/telegram.interface';
import { CoreTechnicalAnalysisService } from '../src/modules/technical-analysis/services/core-technical-analysis.service';

async function debugMenuRouting() {
  console.log('🔍 开始调试菜单路由和分析功能...\n');

  try {
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: ['error', 'warn', 'log'],
    });

    const rsiService = app.get(RSIAnalysisService);
    const oiService = app.get(OpenInterestService);
    const coreService = app.get(CoreTechnicalAnalysisService);

    console.log('✅ 服务实例创建成功\n');

    const testSymbol = 'BTCUSDT';

    // 1. 测试AnalysisType枚举值
    console.log('📋 分析类型枚举值:');
    console.log(`  COMPREHENSIVE: "${AnalysisType.COMPREHENSIVE}"`);
    console.log(`  RSI: "${AnalysisType.RSI}"`);
    console.log(`  OPEN_INTEREST: "${AnalysisType.OPEN_INTEREST}"`);

    // 2. 测试RSI多时间周期分析
    console.log('\n📉 测试RSI多时间周期分析...');
    try {
      const timeframes = ['15m', '1h', '4h', '1d'];
      const multiRSI = await rsiService.getMultiTimeframeRSI(testSymbol, timeframes);
      
      console.log('✅ RSI多时间周期分析成功:');
      Object.entries(multiRSI).forEach(([tf, data]: [string, any]) => {
        if (data && data.currentRSI) {
          console.log(`  ${tf}: RSI=${data.currentRSI.rsi.toFixed(2)}, 信号=${data.signal}`);
        }
      });
    } catch (error) {
      console.log(`❌ RSI多时间周期分析失败: ${error.message}`);
    }

    // 3. 测试持仓量分析
    console.log('\n💰 测试持仓量分析...');
    try {
      const futuresSymbol = 'BTC/USDT:USDT';
      const oiData = await oiService.getOpenInterest(futuresSymbol, 'binanceusdm');
      console.log(`✅ 持仓量分析成功: ${(oiData.openInterest / 1e6).toFixed(2)}M`);
    } catch (error) {
      console.log(`❌ 持仓量分析失败: ${error.message}`);
    }

    // 4. 测试分析路由
    console.log('\n🔄 测试分析路由...');
    
    // RSI分析路由
    try {
      console.log('  测试RSI分析路由...');
      const rsiResult = await AnalysisProcessorUtil.performAnalysisByType(
        coreService,
        testSymbol,
        AnalysisType.RSI,
        rsiService,
        oiService
      );
      console.log(`  ✅ RSI路由成功: ${rsiResult.includes('多时间周期 RSI 分析报告') ? '包含多时间周期' : '单时间周期'}`);
    } catch (error) {
      console.log(`  ❌ RSI路由失败: ${error.message}`);
    }

    // 持仓量分析路由
    try {
      console.log('  测试持仓量分析路由...');
      const oiResult = await AnalysisProcessorUtil.performAnalysisByType(
        coreService,
        testSymbol,
        AnalysisType.OPEN_INTEREST,
        rsiService,
        oiService
      );
      console.log(`  ✅ 持仓量路由成功: ${oiResult.includes('持仓量分析报告') ? '正确' : '可能有问题'}`);
    } catch (error) {
      console.log(`  ❌ 持仓量路由失败: ${error.message}`);
    }

    // 综合分析路由
    try {
      console.log('  测试综合分析路由...');
      const compResult = await AnalysisProcessorUtil.performAnalysisByType(
        coreService,
        testSymbol,
        AnalysisType.COMPREHENSIVE,
        rsiService,
        oiService
      );
      console.log(`  ✅ 综合分析路由成功: ${compResult.includes('完整技术分析报告') ? '正确' : '可能有问题'}`);
    } catch (error) {
      console.log(`  ❌ 综合分析路由失败: ${error.message}`);
    }

    // 5. 测试描述文本
    console.log('\n📝 测试分析类型描述:');
    console.log(`  RSI: ${AnalysisProcessorUtil.getAnalysisTypeDescription(AnalysisType.RSI)}`);
    console.log(`  持仓量: ${AnalysisProcessorUtil.getAnalysisTypeDescription(AnalysisType.OPEN_INTEREST)}`);
    console.log(`  综合: ${AnalysisProcessorUtil.getAnalysisTypeDescription(AnalysisType.COMPREHENSIVE)}`);

    console.log('\n🎉 调试完成！');

    await app.close();

  } catch (error) {
    console.error('❌ 调试过程中发生错误:', error);
    process.exit(1);
  }
}

debugMenuRouting().catch(console.error); 