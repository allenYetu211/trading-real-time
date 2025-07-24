import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { OkxSyncService } from '../src/modules/okx-integration/services/okx-sync.service';
import { OkxApiService } from '../src/modules/okx-integration/services/okx-api.service';

async function testOkxEnhanced() {
  console.log('🚀 开始测试增强的OKX功能...\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const okxSyncService = app.get(OkxSyncService);
  const okxApiService = app.get(OkxApiService);

  try {
    // 1. 测试API连接状态
    console.log('1️⃣ 测试API连接状态...');
    const status = await okxSyncService.checkStatus();
    console.log('连接状态:', status);
    
    if (!status.connected) {
      console.log('❌ API连接失败，无法继续测试');
      await app.close();
      return;
    }
    console.log('✅ API连接成功\n');

    // 2. 获取当前挂单信息
    console.log('2️⃣ 获取当前挂单信息...');
    const pendingOrders = await okxSyncService.syncPendingOrders({ limit: 50 });
    console.log(`挂单同步结果:`, {
      success: pendingOrders.success,
      ordersCount: pendingOrders.orders.length,
      errors: pendingOrders.errors,
    });
    
    if (pendingOrders.orders.length > 0) {
      console.log('📋 当前挂单详情:');
      pendingOrders.orders.forEach((order, index) => {
        console.log(`  ${index + 1}. ${order.instrument} ${order.direction} ${order.orderType}`);
        console.log(`     价格: $${order.price}, 数量: ${order.size}, 剩余: ${order.remainingSize}`);
        console.log(`     状态: ${order.status}, 创建时间: ${order.createTime.toISOString()}`);
      });
    } else {
      console.log('📝 当前没有挂单');
    }
    console.log();

    // 3. 同步交易记录（使用成交明细）
    console.log('3️⃣ 同步交易记录（使用成交明细）...');
    const syncResult = await okxSyncService.syncHistoryTrades({ limit: 20 });
    console.log(`交易同步结果:`, {
      success: syncResult.success,
      processedCount: syncResult.processedCount,
      createdCount: syncResult.createdCount,
      updatedCount: syncResult.updatedCount,
      errors: syncResult.errors,
    });
    
    if (syncResult.trades.length > 0) {
      console.log('📊 最新交易记录:');
      syncResult.trades.slice(0, 3).forEach((trade, index) => {
        console.log(`  ${index + 1}. ${trade.tradeId}`);
        console.log(`     ${trade.instrument} ${trade.direction} ${trade.status}`);
        console.log(`     开仓: $${trade.actualEntryPrice}, 平仓: $${trade.actualExitPrice || 'N/A'}`);
        console.log(`     PNL: $${trade.pnl?.toFixed(2) || 'N/A'}, 手续费: $${trade.fees?.toFixed(2) || 'N/A'}`);
      });
    }
    console.log();

    // 4. 获取完整状态
    console.log('4️⃣ 获取完整的OKX状态...');
    const completeStatus = await okxSyncService.getCompleteStatus({ limit: 10 });
    console.log(`完整状态:`, {
      success: completeStatus.success,
      tradesCount: completeStatus.trades.length,
      pendingOrdersCount: completeStatus.pendingOrders.length,
      positionsCount: completeStatus.positions.length,
      errors: completeStatus.errors,
    });
    console.log();

    // 5. 获取同步统计信息
    console.log('5️⃣ 获取同步统计信息...');
    const stats = await okxSyncService.getSyncStats();
    console.log('同步统计:', stats);
    console.log();

    // 6. 测试原始数据获取（调试用）
    console.log('6️⃣ 测试原始数据获取...');
    try {
      const rawData = await okxApiService.getCompleteOkxData({ limit: 5 });
      console.log(`原始数据统计:`, {
        ordersCount: rawData.orders.length,
        fillsCount: rawData.fills.length,
        pendingOrdersCount: rawData.pendingOrders.length,
        positionsCount: rawData.positions.length,
      });
      
      if (rawData.fills.length > 0) {
        console.log('📈 最新成交明细:');
        rawData.fills.slice(0, 2).forEach((fill, index) => {
          console.log(`  ${index + 1}. ${fill.instId} ${fill.side} ${fill.fillSz} @ $${fill.fillPx}`);
          console.log(`     订单ID: ${fill.ordId}, 成交时间: ${new Date(parseInt(fill.ts)).toISOString()}`);
        });
      }
    } catch (error) {
      console.log('获取原始数据失败:', error.message);
    }
    console.log();

    console.log('✅ 所有测试完成！');
    console.log('\n📊 测试总结:');
    console.log(`- API连接: ${status.connected ? '✅' : '❌'}`);
    console.log(`- 挂单获取: ${pendingOrders.success ? '✅' : '❌'} (${pendingOrders.orders.length}笔)`);
    console.log(`- 交易同步: ${syncResult.success ? '✅' : '❌'} (${syncResult.processedCount}笔)`);
    console.log(`- 完整状态: ${completeStatus.success ? '✅' : '❌'}`);

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
  } finally {
    await app.close();
  }
}

// 运行测试
testOkxEnhanced().catch(console.error); 