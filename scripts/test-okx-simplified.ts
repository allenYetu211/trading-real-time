import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { OkxSyncService } from '../src/modules/okx-integration/services/okx-sync.service';
import { OkxApiService } from '../src/modules/okx-integration/services/okx-api.service';

async function testOkxSimplified() {
  console.log('🚀 测试简化的 OKX 交易记录同步...\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const okxSyncService = app.get(OkxSyncService);
  const okxApiService = app.get(OkxApiService);

  try {
    // 1. 检查 OKX 连接状态
    console.log('1️⃣ 检查 OKX 连接状态...');
    const status = await okxSyncService.checkStatus();
    console.log('连接状态:', JSON.stringify(status, null, 2));
    
    if (!status.connected) {
      console.log('❌ OKX 连接失败，无法继续测试');
      await app.close();
      return;
    }
    console.log('✅ OKX 连接正常\n');

    // 2. 测试获取已完成的交易记录
    console.log('2️⃣ 测试获取已完成的交易记录...');
    const completedTrades = await okxApiService.getCompletedTrades({ limit: 5 });
    console.log(`获取结果: ${completedTrades.success ? '成功' : '失败'}`);
    console.log(`消息: ${completedTrades.message}`);
    console.log(`记录数量: ${completedTrades.data.length}`);
    
    if (completedTrades.data.length > 0) {
      console.log('示例记录:');
      const sample = completedTrades.data[0];
      console.log(`  - 订单ID: ${sample.ordId}`);
      console.log(`  - 交易对: ${sample.instId}`);
      console.log(`  - 方向: ${sample.side} ${sample.posSide}`);
      console.log(`  - 状态: ${sample.state}`);
      console.log(`  - 成交价: ${sample.avgPx || sample.fillPx}`);
      console.log(`  - 成交量: ${sample.accFillSz}`);
    }
    console.log();

    // 3. 测试简化同步功能
    console.log('3️⃣ 测试简化同步功能...');
    const syncResult = await okxSyncService.syncCompletedTrades({ limit: 10 });
    
    console.log('同步结果:');
    console.log(`  - 成功: ${syncResult.success}`);
    console.log(`  - 处理数量: ${syncResult.processedCount}`);
    console.log(`  - 新增数量: ${syncResult.createdCount}`);
    console.log(`  - 更新数量: ${syncResult.updatedCount}`);
    console.log(`  - 错误数量: ${syncResult.errors.length}`);
    
    if (syncResult.errors.length > 0) {
      console.log('错误信息:');
      syncResult.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }
    
    if (syncResult.trades.length > 0) {
      console.log(`同步的交易记录示例:`);
      const sampleTrade = syncResult.trades[0];
      console.log(`  - 交易ID: ${sampleTrade.tradeId}`);
      console.log(`  - 交易对: ${sampleTrade.instrument}`);
      console.log(`  - 方向: ${sampleTrade.direction}`);
      console.log(`  - 状态: ${sampleTrade.status}`);
      console.log(`  - 进入价格: ${sampleTrade.actualEntryPrice}`);
      console.log(`  - 仓位大小: ${sampleTrade.positionSize}`);
      console.log(`  - 盈亏: ${sampleTrade.pnl}`);
    }

    console.log('\n✅ 简化同步测试完成!');
    console.log('\n💡 现在可以使用以下 API 端点:');
    console.log('  POST /okx/sync/completed-trades');
    console.log('  获取当前挂单: GET /okx/pending-orders');
    console.log('  获取综合数据: POST /okx/sync/comprehensive');

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
  } finally {
    await app.close();
  }
}

// 直接运行测试
testOkxSimplified().catch(console.error); 