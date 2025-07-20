import axios from 'axios';

const BASE_URL = 'http://localhost:3000';

async function testPriceFix() {
  console.log('🔍 测试价格获取修复...\n');

  try {
    // 1. 测试获取SUIUSDT价格
    console.log('1. 测试获取 SUIUSDT 价格...');
    const priceResponse = await axios.get(`${BASE_URL}/api/data/price/SUIUSDT`);
    console.log('✅ SUIUSDT 价格:', priceResponse.data);

    // 2. 测试获取BTCUSDT价格作为对比
    console.log('\n2. 测试获取 BTCUSDT 价格作为对比...');
    const btcPriceResponse = await axios.get(`${BASE_URL}/api/data/price/BTCUSDT`);
    console.log('✅ BTCUSDT 价格:', btcPriceResponse.data);

    // 3. 测试分析接口是否正常工作
    console.log('\n3. 测试 SUIUSDT 分析...');
    const analysisResponse = await axios.post(`${BASE_URL}/api/analysis/comprehensive/SUIUSDT/1h?limit=100`);
    console.log('✅ 分析结果:', {
      symbol: analysisResponse.data.symbol,
      timestamp: analysisResponse.data.timestamp,
      score: analysisResponse.data.score,
      summary: analysisResponse.data.summary
    });

    console.log('\n🎉 价格获取修复测试完成！');

  } catch (error: any) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
  }
}

// 运行测试
testPriceFix(); 