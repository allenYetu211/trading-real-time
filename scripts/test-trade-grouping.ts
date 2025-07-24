console.log('🧪 测试改进的交易分组逻辑...\n');

// 模拟高频交易场景的 OKX 订单数据
const mockHighFrequencyOrders = [
  // 第一笔交易：开多仓 -> 平多仓
  {
    instType: "SWAP",
    instId: "SOL-USDT-SWAP",
    ordId: "order-1",
    side: "buy",      // 买入
    posSide: "long",  // 多仓
    accFillSz: "1.5",
    avgPx: "200.0",
    fillTime: "1706097600000", // 10:00:00
    state: "filled",
    pnl: "0"
  },
  {
    instType: "SWAP", 
    instId: "SOL-USDT-SWAP",
    ordId: "order-2",
    side: "sell",     // 卖出
    posSide: "long",  // 多仓（平仓）
    accFillSz: "1.5",
    avgPx: "205.0",
    fillTime: "1706098200000", // 10:10:00
    state: "filled",
    pnl: "7.5"
  },
  
  // 第二笔交易：开多仓 -> 部分平仓 -> 剩余平仓
  {
    instType: "SWAP",
    instId: "SOL-USDT-SWAP", 
    ordId: "order-3",
    side: "buy",      // 买入
    posSide: "long",  // 多仓
    accFillSz: "2.0",
    avgPx: "203.0",
    fillTime: "1706098800000", // 10:20:00
    state: "filled",
    pnl: "0"
  },
  {
    instType: "SWAP",
    instId: "SOL-USDT-SWAP",
    ordId: "order-4", 
    side: "sell",     // 卖出
    posSide: "long",  // 多仓（部分平仓）
    accFillSz: "1.0",
    avgPx: "208.0",
    fillTime: "1706099400000", // 10:30:00
    state: "filled",
    pnl: "5.0"
  },
  {
    instType: "SWAP",
    instId: "SOL-USDT-SWAP",
    ordId: "order-5",
    side: "sell",     // 卖出
    posSide: "long",  // 多仓（剩余平仓）
    accFillSz: "1.0", 
    avgPx: "210.0",
    fillTime: "1706100000000", // 10:40:00
    state: "filled",
    pnl: "7.0"
  },

  // 第三笔交易：快速开空 -> 平空（同一分钟内）
  {
    instType: "SWAP",
    instId: "SOL-USDT-SWAP",
    ordId: "order-6",
    side: "sell",     // 卖出
    posSide: "short", // 空仓
    accFillSz: "1.0",
    avgPx: "210.0", 
    fillTime: "1706100600000", // 10:50:00
    state: "filled",
    pnl: "0"
  },
  {
    instType: "SWAP",
    instId: "SOL-USDT-SWAP",
    ordId: "order-7",
    side: "buy",      // 买入
    posSide: "short", // 空仓（平仓）
    accFillSz: "1.0",
    avgPx: "208.0",
    fillTime: "1706100630000", // 10:50:30（30秒后）
    state: "filled", 
    pnl: "2.0"
  }
];

// 模拟分组逻辑
function testTradeGrouping() {
  console.log('📊 开始测试交易分组逻辑...\n');
  
  // 按交易对和方向分组
  const instrumentGroups = new Map<string, any[]>();
  
  const sortedOrders = mockHighFrequencyOrders
    .filter(order => order.state === 'filled')
    .sort((a, b) => parseInt(a.fillTime) - parseInt(b.fillTime));
  
  for (const order of sortedOrders) {
    const instrumentKey = `${order.instId}_${order.posSide}`;
    if (!instrumentGroups.has(instrumentKey)) {
      instrumentGroups.set(instrumentKey, []);
    }
    instrumentGroups.get(instrumentKey)!.push(order);
  }
  
  console.log(`🔍 找到 ${instrumentGroups.size} 个交易对+方向组合:`);
  for (const [key, orders] of instrumentGroups.entries()) {
    console.log(`  • ${key}: ${orders.length} 个订单`);
  }
  console.log('');
  
  // 对每组进行智能分组
  const allTradeGroups: any[][] = [];
  
  for (const [instrumentKey, instrumentOrders] of instrumentGroups.entries()) {
    console.log(`📈 处理 ${instrumentKey}:`);
    const tradeGroups = smartGroupByPosition(instrumentOrders);
    
    tradeGroups.forEach((group, index) => {
      const tradeId = `${instrumentKey}_trade_${index + 1}`;
      console.log(`  ✅ 交易 ${index + 1}: ${group.length} 个订单`);
      
      // 显示交易详情
      const openOrders = group.filter(isOpeningOrder);
      const closeOrders = group.filter(order => !isOpeningOrder(order));
      
      const totalOpenSize = openOrders.reduce((sum, order) => sum + parseFloat(order.accFillSz), 0);
      const totalCloseSize = closeOrders.reduce((sum, order) => sum + parseFloat(order.accFillSz), 0);
      const isComplete = Math.abs(totalOpenSize - totalCloseSize) < 0.0001;
      
      console.log(`     📊 开仓: ${totalOpenSize} | 平仓: ${totalCloseSize} | 完整: ${isComplete ? '✅' : '❌'}`);
      
      // 计算时间跨度
      const startTime = new Date(parseInt(group[0].fillTime));
      const endTime = new Date(parseInt(group[group.length - 1].fillTime));
      const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000 / 60); // 分钟
      
      console.log(`     ⏰ 时长: ${duration} 分钟 (${startTime.toLocaleTimeString()} - ${endTime.toLocaleTimeString()})`);
      
      // 计算 PNL
      const totalPnl = group.reduce((sum, order) => sum + parseFloat(order.pnl), 0);
      console.log(`     💰 PNL: $${totalPnl.toFixed(2)}`);
      
      allTradeGroups.push(group);
    });
    console.log('');
  }
  
  return allTradeGroups;
}

// 智能分组函数
function smartGroupByPosition(orders: any[]): any[][] {
  const tradeGroups: any[][] = [];
  let currentGroup: any[] = [];
  let currentPosition = 0;
  
  for (const order of orders) {
    const orderSize = parseFloat(order.accFillSz);
    const isOpening = isOpeningOrder(order);
    
    if (isOpening) {
      // 开仓订单
      if (currentPosition === 0 && currentGroup.length > 0) {
        // 新交易开始，保存之前的交易
        tradeGroups.push([...currentGroup]);
        currentGroup = [];
      }
      currentGroup.push(order);
      currentPosition += orderSize;
    } else {
      // 平仓订单
      if (currentGroup.length > 0) {
        currentGroup.push(order);
        currentPosition -= orderSize;
        
        // 如果仓位接近于0，说明这笔交易完成
        if (Math.abs(currentPosition) < 0.0001) {
          tradeGroups.push([...currentGroup]);
          currentGroup = [];
          currentPosition = 0;
        }
      }
    }
  }
  
  // 处理未完成的交易
  if (currentGroup.length > 0) {
    tradeGroups.push(currentGroup);
  }
  
  return tradeGroups;
}

// 判断是否为开仓订单
function isOpeningOrder(order: any): boolean {
  if (order.posSide === 'long') {
    return order.side === 'buy'; // 买入 = 开多仓
  } else if (order.posSide === 'short') {
    return order.side === 'sell'; // 卖出 = 开空仓
  }
  return true;
}

async function testMain() {
  try {
    const tradeGroups = testTradeGrouping();
    
    console.log('🎯 分组结果汇总:');
    console.log(`• 总订单数: ${mockHighFrequencyOrders.length}`);
    console.log(`• 识别交易数: ${tradeGroups.length}`);
    console.log(`• 预期交易数: 3 (验证分组是否正确)`);
    
    if (tradeGroups.length === 3) {
      console.log('\n✅ 分组逻辑测试通过！');
      console.log('💡 新的分组算法能够正确识别:');
      console.log('  • 完整的开仓-平仓周期');
      console.log('  • 部分平仓的多笔订单');
      console.log('  • 高频交易的快速开平仓');
    } else {
      console.log('\n⚠️ 分组结果与预期不符，需要进一步调整算法');
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

// 运行测试
if (require.main === module) {
  testMain();
} 