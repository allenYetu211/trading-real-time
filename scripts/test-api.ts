import axios from 'axios';

const BASE_URL = 'http://localhost:3000';

async function testCoinConfigAPI() {
  console.log('🚀 开始测试币种配置API...\n');

  try {
    // 1. 创建币种配置
    console.log('1. 创建币种配置...');
    const createResponse = await axios.post(`${BASE_URL}/api/coins/config`, {
      symbol: 'BTCUSDT',
      interval: '1h',
      isActive: true,
    });
    console.log('✅ 创建成功:', createResponse.data);

    // 2. 获取配置列表
    console.log('\n2. 获取配置列表...');
    const listResponse = await axios.get(`${BASE_URL}/api/coins/list`);
    console.log('✅ 获取成功:', listResponse.data);

    // 3. 获取统计信息
    console.log('\n3. 获取统计信息...');
    const statsResponse = await axios.get(`${BASE_URL}/api/coins/stats`);
    console.log('✅ 统计信息:', statsResponse.data);

    // 4. 创建更多配置
    console.log('\n4. 创建更多配置...');
    const configs = [
      { symbol: 'ETHUSDT', interval: '1h' },
      { symbol: 'BNBUSDT', interval: '4h' },
      { symbol: 'ADAUSDT', interval: '1d' },
    ];

    for (const config of configs) {
      try {
        const response = await axios.post(`${BASE_URL}/api/coins/config`, config);
        console.log(`✅ 创建 ${config.symbol}:`, response.data);
      } catch (error: any) {
        console.log(`❌ 创建 ${config.symbol} 失败:`, error.response?.data || error.message);
      }
    }

    // 5. 再次获取统计信息
    console.log('\n5. 更新后的统计信息...');
    const finalStatsResponse = await axios.get(`${BASE_URL}/api/coins/stats`);
    console.log('✅ 最终统计:', finalStatsResponse.data);

    console.log('\n🎉 所有测试完成！');

  } catch (error: any) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
  }
}

// 运行测试
testCoinConfigAPI(); 