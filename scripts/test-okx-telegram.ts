import axios from 'axios';

const BASE_URL = 'http://localhost:3000';

async function testOkxTelegramCommands() {
  console.log('🚀 开始测试 OKX Telegram 命令功能...\n');

  try {
    // 1. 首先创建一些测试交易记录
    console.log('📝 创建测试交易记录...');
    
    const testTrades = [
      {
        tradeId: 'SOL-LONG-20250724-001',
        instrument: 'SOL-USDT',
        direction: 'LONG',
        status: 'CLOSED',
        leverage: 10,
        entryTime: '2025-01-24T10:00:00Z',
        exitTime: '2025-01-24T12:00:00Z',
        duration: 120,
        plannedPrice: 100,
        actualEntryPrice: 100.5,
        actualExitPrice: 110,
        positionSize: 10,
        margin: 100,
        pnl: 95,
        rorPercentage: 95,
        fees: 2,
        netPnl: 93,
        notes: '测试多头交易 - 盈利',
      },
      {
        tradeId: 'BTC-SHORT-20250724-002',
        instrument: 'BTC-USDT',
        direction: 'SHORT',
        status: 'CLOSED',
        leverage: 5,
        entryTime: '2025-01-24T14:00:00Z',
        exitTime: '2025-01-24T15:30:00Z',
        duration: 90,
        plannedPrice: 45000,
        actualEntryPrice: 44800,
        actualExitPrice: 44000,
        positionSize: 0.1,
        margin: 896,
        pnl: 80,
        rorPercentage: 8.9,
        fees: 3,
        netPnl: 77,
        notes: '测试空头交易 - 盈利',
      },
      {
        tradeId: 'ETH-LONG-20250724-003',
        instrument: 'ETH-USDT',
        direction: 'LONG',
        status: 'CLOSED',
        leverage: 3,
        entryTime: '2025-01-24T16:00:00Z',
        exitTime: '2025-01-24T16:45:00Z',
        duration: 45,
        plannedPrice: 2500,
        actualEntryPrice: 2505,
        actualExitPrice: 2480,
        positionSize: 2,
        margin: 1670,
        pnl: -50,
        rorPercentage: -3,
        fees: 4,
        netPnl: -54,
        notes: '测试多头交易 - 亏损',
      }
    ];

    // 创建测试交易记录
    for (const trade of testTrades) {
      try {
        const response = await axios.post(`${BASE_URL}/trading-history`, trade);
        console.log(`✅ 创建交易记录: ${response.data.tradeId}`);
      } catch (error: any) {
        if (error.response?.status === 409) {
          console.log(`⚠️ 交易记录已存在: ${trade.tradeId}`);
        } else {
          console.error(`❌ 创建失败: ${trade.tradeId}`, error.response?.data);
        }
      }
    }

    console.log('\n📊 测试交易统计 API...');
    
    // 2. 测试交易记录查询
    const tradesResponse = await axios.post(`${BASE_URL}/trading-history/list`, {
      page: 1,
      limit: 10
    });
    console.log(`✅ 查询到 ${tradesResponse.data.data.length} 笔交易记录`);

    // 3. 测试交易统计
    const statsResponse = await axios.post(`${BASE_URL}/trading-history/statistics`, {});
    console.log('✅ 交易统计数据:');
    console.log(`   - 总交易数: ${statsResponse.data.totalTrades}`);
    console.log(`   - 胜率: ${statsResponse.data.winRate}%`);
    console.log(`   - 净盈亏: $${statsResponse.data.netPnl}`);

    // 4. 测试未同步记录查询
    const unsyncedResponse = await axios.get(`${BASE_URL}/trading-history/sync/unsynced`);
    console.log(`✅ 未同步记录: ${unsyncedResponse.data.length} 笔`);

    console.log('\n🎉 测试数据准备完成！');
    console.log('\n📱 现在可以在 Telegram 中测试以下命令:');
    console.log('   /okx_trades - 查看交易记录');
    console.log('   /okx_stats - 查看统计信息');
    console.log('   /okx_performance - 查看表现分析');
    console.log('   /okx_unsynced - 查看未同步记录');
    console.log('   /okx_sync - 同步数据（开发中）');
    console.log('   /okx_report - 生成报告（开发中）');

    console.log('\n💡 提示：');
    console.log('   1. 确保 Telegram Bot 已启动');
    console.log('   2. 在 Telegram 中向你的 Bot 发送上述命令');
    console.log('   3. 观察命令响应和数据显示');

  } catch (error: any) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
    process.exit(1);
  }
}

// 启动测试
testOkxTelegramCommands(); 