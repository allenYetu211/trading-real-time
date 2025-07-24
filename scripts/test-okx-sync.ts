console.log('🧪 测试 OKX 同步功能...\n');

// 模拟 OKX API 响应数据
const mockOkxOrders = [
  {
    instType: "SWAP",
    instId: "SOL-USDT-SWAP",
    ordId: "test-order-1",
    clOrdId: "test-client-1",
    tag: "",
    px: "200.5",
    sz: "1",
    pnl: "15.50",
    ordType: "market",
    side: "buy",
    posSide: "long",
    tdMode: "isolated",
    accFillSz: "1",
    fillPx: "200.8",
    tradeId: "test-trade-1",
    fillSz: "1",
    fillTime: "1706097600000", // 2024-01-24 10:00:00
    state: "filled",
    avgPx: "200.8",
    lever: "10",
    tpTriggerPx: "220.0",
    tpOrdPx: "220.0",
    slTriggerPx: "180.0",
    slOrdPx: "180.0",
    feeCcy: "USDT",
    fee: "0.5",
    rebateCcy: "USDT",
    rebate: "0",
    tgtCcy: "",
    category: "normal",
    uTime: "1706097600000",
    cTime: "1706097600000"
  },
  {
    instType: "SWAP",
    instId: "SOL-USDT-SWAP",
    ordId: "test-order-2",
    clOrdId: "test-client-2",
    tag: "",
    px: "220.0",
    sz: "1",
    pnl: "0",
    ordType: "market",
    side: "sell",
    posSide: "long",
    tdMode: "isolated",
    accFillSz: "1",
    fillPx: "216.3",
    tradeId: "test-trade-2",
    fillSz: "1",
    fillTime: "1706184000000", // 2024-01-25 10:00:00
    state: "filled",
    avgPx: "216.3",
    lever: "10",
    feeCcy: "USDT",
    fee: "0.5",
    rebateCcy: "USDT",
    rebate: "0",
    tgtCcy: "",
    category: "normal",
    uTime: "1706184000000",
    cTime: "1706184000000"
  }
];

async function testDataProcessing() {
  try {
    console.log('📊 测试数据处理逻辑...');
    
    // 模拟分组逻辑
    const groups = new Map<string, any[]>();
    
    for (const order of mockOkxOrders) {
      if (order.state !== 'filled') continue;
      
      const date = new Date(parseInt(order.fillTime));
      const timeWindow = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${date.getHours()}`;
      const tradeKey = `${order.instId}_${order.posSide}_${timeWindow}`;
      
      if (!groups.has(tradeKey)) {
        groups.set(tradeKey, []);
      }
      groups.get(tradeKey)!.push(order);
    }
    
    console.log(`✅ 成功分组 ${groups.size} 个交易组`);
    
    // 模拟数据转换
    const processedTrades = [];
    for (const [tradeKey, orders] of groups.entries()) {
      const firstOrder = orders[0];
      
      // 分离开仓和平仓订单
      const openOrders = orders.filter(order => 
        (order.side === 'buy' && order.posSide === 'long') ||
        (order.side === 'sell' && order.posSide === 'short')
      );
      
      const closeOrders = orders.filter(order => 
        (order.side === 'sell' && order.posSide === 'long') ||
        (order.side === 'buy' && order.posSide === 'short')
      );
      
      // 计算基础信息
      const instrument = firstOrder.instId.replace('-SWAP', '');
      const direction = firstOrder.posSide === 'long' ? 'LONG' : 'SHORT';
      const status = closeOrders.length > 0 ? 'CLOSED' : 'OPEN';
      
      // 计算价格
      let totalOpenSize = 0;
      let totalOpenValue = 0;
      for (const order of openOrders) {
        const size = parseFloat(order.accFillSz);
        const price = parseFloat(order.avgPx);
        totalOpenSize += size;
        totalOpenValue += size * price;
      }
      const actualEntryPrice = totalOpenSize > 0 ? totalOpenValue / totalOpenSize : 0;
      
      let actualExitPrice: number | undefined;
      if (closeOrders.length > 0) {
        let totalCloseSize = 0;
        let totalCloseValue = 0;
        for (const order of closeOrders) {
          const size = parseFloat(order.accFillSz);
          const price = parseFloat(order.avgPx);
          totalCloseSize += size;
          totalCloseValue += size * price;
        }
        actualExitPrice = totalCloseSize > 0 ? totalCloseValue / totalCloseSize : undefined;
      }
      
      // 计算 PNL 和手续费
      let totalPnl = 0;
      let totalFees = 0;
      for (const order of orders) {
        if (order.pnl) {
          totalPnl += parseFloat(order.pnl);
        }
        if (order.fee) {
          totalFees += Math.abs(parseFloat(order.fee));
        }
      }
      
      const entryTime = new Date(parseInt(firstOrder.fillTime));
      const tradeId = `${instrument}-${direction}-${entryTime.toISOString().slice(0, 10).replace(/-/g, '')}-${entryTime.toISOString().slice(11, 16).replace(':', '')}`;
      
      const trade = {
        tradeId,
        instrument,
        direction,
        status,
        leverage: parseFloat(firstOrder.lever),
        entryTime,
        exitTime: closeOrders.length > 0 ? new Date(parseInt(orders[orders.length - 1].fillTime)) : undefined,
        actualEntryPrice,
        actualExitPrice,
        positionSize: totalOpenSize,
        pnl: totalPnl,
        fees: totalFees,
        netPnl: totalPnl - totalFees,
        initialTakeProfit: firstOrder.tpTriggerPx ? parseFloat(firstOrder.tpTriggerPx) : undefined,
        initialStopLoss: firstOrder.slTriggerPx ? parseFloat(firstOrder.slTriggerPx) : undefined,
        okxOrderIds: orders.map(o => o.ordId),
        notes: `测试同步的交易记录，包含 ${orders.length} 个订单`
      };
      
      processedTrades.push(trade);
      
      console.log(`✅ 处理交易: ${trade.tradeId}`);
      console.log(`   📈 ${trade.direction} ${trade.instrument} - PNL: $${trade.pnl?.toFixed(2)}`);
      console.log(`   💰 开仓: $${trade.actualEntryPrice?.toFixed(4)} | 平仓: $${trade.actualExitPrice?.toFixed(4) || 'N/A'}`);
      console.log(`   📊 状态: ${trade.status} | 手续费: $${trade.fees?.toFixed(2)}`);
    }
    
    console.log(`\n🎉 数据处理测试完成！成功处理 ${processedTrades.length} 笔交易记录`);
    
    return processedTrades;
    
  } catch (error) {
    console.error('❌ 数据处理测试失败:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 开始测试 OKX 数据处理逻辑...\n');
    
    const trades = await testDataProcessing();
    
    console.log('\n📋 处理结果汇总:');
    console.log(`• 总交易数: ${trades.length}`);
    console.log(`• 盈利交易: ${trades.filter(t => t.pnl && t.pnl > 0).length}`);
    console.log(`• 亏损交易: ${trades.filter(t => t.pnl && t.pnl < 0).length}`);
    console.log(`• 总盈亏: $${trades.reduce((sum, t) => sum + (t.pnl || 0), 0).toFixed(2)}`);
    console.log(`• 总手续费: $${trades.reduce((sum, t) => sum + (t.fees || 0), 0).toFixed(2)}`);
    
    console.log('\n💡 现在可以在 Telegram 中测试以下命令:');
    console.log('   /okx_sync - 同步 OKX 交易数据');
    console.log('   /okx_trades - 查看同步的交易记录');
    console.log('   /okx_stats - 查看交易统计');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
} 