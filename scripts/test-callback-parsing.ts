/**
 * 测试回调数据解析修复
 */

function testCallbackParsing() {
  console.log('🧪 测试回调数据解析...\n');

  // 模拟新的解析逻辑
  function parseAnalysisCallback(data: string): { symbol: string; analysisType: string } {
    const parts = data.split(':');
    const analysisType = parts[parts.length - 1]; // 最后一部分是分析类型
    const symbol = parts.slice(1, -1).join(':'); // 中间部分重新拼接成交易对
    
    return { symbol, analysisType };
  }

  // 测试用例
  const testCases = [
    'analyze:BTCUSDT:comprehensive',
    'analyze:ETHUSDT:rsi',
    'analyze:SOLUSDT:open_interest',
    'analyze:SOL/USDT:USDT:open_interest',
    'analyze:BTC/USDT:USDT:rsi',
    'analyze:ETH/USDT:USDT:comprehensive',
  ];

  console.log('📋 测试结果:');
  testCases.forEach(testCase => {
    const result = parseAnalysisCallback(testCase);
    console.log(`输入: "${testCase}"`);
    console.log(`  → 交易对: "${result.symbol}"`);
    console.log(`  → 分析类型: "${result.analysisType}"`);
    console.log('');
  });

  // 验证期货合约格式
  console.log('🔍 期货合约格式验证:');
  const futuresCase = 'analyze:SOL/USDT:USDT:open_interest';
  const futuresResult = parseAnalysisCallback(futuresCase);
  
  console.log(`期货回调: "${futuresCase}"`);
  console.log(`解析结果: 交易对="${futuresResult.symbol}", 分析类型="${futuresResult.analysisType}"`);
  console.log(`✅ 期货格式正确: ${futuresResult.symbol === 'SOL/USDT:USDT' && futuresResult.analysisType === 'open_interest'}`);

  console.log('\n✅ 回调解析测试完成');
}

testCallbackParsing(); 