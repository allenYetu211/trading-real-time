/**
 * OI和RSI功能测试脚本
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { OpenInterestService } from '../src/modules/ccxt-analysis/services/open-interest.service';
import { RSIAnalysisService } from '../src/modules/ccxt-analysis/services/rsi-analysis.service';

async function testOIAndRSI() {
  console.log('🚀 开始测试 OI 持仓量和 RSI 功能...\n');

  try {
    // 创建应用实例
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: ['error', 'warn', 'log'],
    });

    // 获取服务实例
    const openInterestService = app.get(OpenInterestService);
    const rsiAnalysisService = app.get(RSIAnalysisService);

    console.log('✅ 服务实例创建成功\n');

    // 测试持仓量功能
    console.log('📊 测试持仓量功能...');
    try {
      // 获取支持的交易所
      const supportedExchanges = openInterestService.getSupportedExchanges();
      console.log('支持的交易所:', supportedExchanges);

      if (supportedExchanges.length > 0) {
        const exchange = supportedExchanges[0];
        console.log(`使用交易所: ${exchange}`);

        // 测试获取单个交易对持仓量
        console.log('\n🔸 获取 BTC/USDT:USDT 持仓量...');
        try {
          const btcOI = await openInterestService.getOpenInterest('BTC/USDT:USDT', exchange);
          console.log('BTC持仓量数据:', {
            symbol: btcOI.symbol,
            openInterest: btcOI.openInterest,
            datetime: btcOI.datetime,
            side: btcOI.side,
          });
        } catch (error) {
          console.log('获取BTC持仓量失败:', error.message);
        }

        // 测试热门合约持仓量排行
        console.log('\n🔸 获取热门合约持仓量排行...');
        try {
          const topOI = await openInterestService.getTopOpenInterestSymbols(exchange, 5);
          console.log('热门合约持仓量排行:');
          topOI.forEach((oi, index) => {
            console.log(`${index + 1}. ${oi.symbol}: ${oi.openInterest.toLocaleString()}`);
          });
        } catch (error) {
          console.log('获取持仓量排行失败:', error.message);
        }
      } else {
        console.log('⚠️  没有支持持仓量的交易所');
      }
    } catch (error) {
      console.log('❌ 持仓量功能测试失败:', error.message);
    }

    // 测试RSI功能
    console.log('\n📈 测试RSI功能...');
    try {
      // 测试单个RSI分析
      console.log('\n🔸 分析 BTC/USDT RSI...');
      const btcRSI = await rsiAnalysisService.getRSIAnalysis('BTC/USDT', '1h', 14, 100, 'binance');
      console.log('BTC RSI分析结果:', {
        symbol: btcRSI.symbol,
        currentRSI: btcRSI.currentRSI.rsi.toFixed(2),
        signal: btcRSI.signal,
        trend: btcRSI.trend,
        recommendation: btcRSI.recommendation,
        riskLevel: btcRSI.riskLevel,
      });

      // 测试多时间周期RSI
      console.log('\n🔸 多时间周期RSI分析...');
      const multiRSI = await rsiAnalysisService.getMultiTimeframeRSI(
        'ETH/USDT',
        ['1h', '4h'],
        14,
        'binance'
      );
      
      console.log('ETH多时间周期RSI:');
      Object.entries(multiRSI).forEach(([timeframe, analysis]) => {
        console.log(`${timeframe}: RSI=${analysis.currentRSI.rsi.toFixed(2)}, 信号=${analysis.signal}`);
      });

      // 测试RSI历史数据
      console.log('\n🔸 获取RSI历史数据...');
      const rsiHistory = await rsiAnalysisService.getRSIHistory('BTC/USDT', '1h', 14, 20, 'binance');
      console.log(`RSI历史数据点数: ${rsiHistory.length}`);
      if (rsiHistory.length > 0) {
        const latest = rsiHistory[rsiHistory.length - 1];
        console.log('最新RSI数据:', {
          rsi: latest.rsi.toFixed(2),
          signal: latest.signal,
          strength: latest.strength,
          datetime: latest.datetime,
        });
      }
    } catch (error) {
      console.log('❌ RSI功能测试失败:', error.message);
    }

    console.log('\n✅ 测试完成!');
    
    // 关闭应用
    await app.close();
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
    process.exit(1);
  }
}

// 运行测试
testOIAndRSI().catch(console.error); 