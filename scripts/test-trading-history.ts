import axios from 'axios';
import { TradeStatus, TradeDirection } from '../src/modules/trading-history/enums';

const BASE_URL = 'http://localhost:3000';

async function testTradingHistory() {
  console.log('🚀 开始测试交易历史记录 API...\n');

  try {
    // 测试创建交易记录
    console.log('📝 测试创建交易记录...');
    const createData = {
      tradeId: 'SOL-LONG-20250724-001',
      instrument: 'SOL-USDT',
      direction: TradeDirection.LONG,
      status: TradeStatus.CLOSED,
      leverage: 10,
      entryTime: '2025-01-24T10:00:00Z',
      exitTime: '2025-01-24T12:00:00Z',
      duration: 120, // 120分钟
      plannedPrice: 100,
      actualEntryPrice: 100.5,
      actualExitPrice: 110,
      positionSize: 10,
      margin: 100,
      pnl: 95, // (110 - 100.5) * 10 = 95
      rorPercentage: 95, // 95 / 100 * 100 = 95%
      fees: 2,
      netPnl: 93, // 95 - 2 = 93
      slippage: 0.5, // 100.5 - 100 = 0.5
      initialTakeProfit: 115,
      initialStopLoss: 95,
      hitTakeProfit: false,
      hitStopLoss: false,
      notes: '测试交易记录',
    };

    const createResponse = await axios.post(`${BASE_URL}/trading-history`, createData);
    console.log('✅ 创建成功:', createResponse.data.tradeId);

    const recordId = createResponse.data.id;

    // 测试查询单个记录
    console.log('\n🔍 测试查询单个记录...');
    const getResponse = await axios.get(`${BASE_URL}/trading-history/${recordId}`);
    console.log('✅ 查询成功:', getResponse.data.tradeId);

    // 测试查询记录列表
    console.log('\n📋 测试查询记录列表...');
    const listData = {
      page: 1,
      limit: 10,
      status: TradeStatus.CLOSED,
    };
    const listResponse = await axios.post(`${BASE_URL}/trading-history/list`, listData);
    console.log('✅ 查询列表成功, 总数:', listResponse.data.pagination.total);

    // 测试更新记录
    console.log('\n✏️ 测试更新记录...');
    const updateData = {
      notes: '更新后的测试交易记录',
      pnl: 100, // 更新PNL
    };
    const updateResponse = await axios.put(`${BASE_URL}/trading-history/${recordId}`, updateData);
    console.log('✅ 更新成功:', updateResponse.data.notes);

    // 测试获取统计信息
    console.log('\n📊 测试获取统计信息...');
    const statsResponse = await axios.post(`${BASE_URL}/trading-history/statistics`, {});
    console.log('✅ 统计信息获取成功:');
    console.log(`   - 总交易数: ${statsResponse.data.totalTrades}`);
    console.log(`   - 已完成交易: ${statsResponse.data.completedTrades}`);
    console.log(`   - 胜率: ${statsResponse.data.winRate}%`);
    console.log(`   - 总盈亏: $${statsResponse.data.totalPnl}`);
    console.log(`   - 净盈亏: $${statsResponse.data.netPnl}`);

    // 测试获取未同步记录
    console.log('\n🔄 测试获取未同步记录...');
    const unsyncedResponse = await axios.get(`${BASE_URL}/trading-history/sync/unsynced`);
    console.log('✅ 未同步记录数量:', unsyncedResponse.data.length);

    // 测试标记为已同步
    console.log('\n✔️ 测试标记为已同步...');
    const syncData = { notionPageId: 'notion-page-123' };
    const syncResponse = await axios.put(`${BASE_URL}/trading-history/${recordId}/sync`, syncData);
    console.log('✅ 标记同步成功:', syncResponse.data.notionSynced);

    // 测试删除记录
    console.log('\n🗑️ 测试删除记录...');
    const deleteResponse = await axios.delete(`${BASE_URL}/trading-history/${recordId}`);
    console.log('✅ 删除成功:', deleteResponse.data.message);

    console.log('\n🎉 所有测试通过！');

  } catch (error: any) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
    process.exit(1);
  }
}

// 启动测试
testTradingHistory(); 