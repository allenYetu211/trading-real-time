/**
 * 测试统一交易对列表逻辑
 */

function testUnifiedSymbols() {
  console.log('🧪 测试统一交易对列表逻辑...\n');

  // 模拟统一后的菜单生成逻辑
  function getSymbolSelectionMenu(analysisType: string) {
    const POPULAR_SYMBOLS = [
      'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'TRXUSDT', 'SUIUSDT', 'HYPEUSDT'
    ];
    
    // 统一使用现货格式的交易对列表
    const symbols = POPULAR_SYMBOLS;
    
    // 对于持仓量分析，需要转换为期货格式
    const symbolButtons = symbols.map(symbol => {
      const displayText = symbol.replace('USDT', ''); // BTCUSDT -> BTC
      
      // 对于持仓量分析，回调数据中使用期货格式
      let callbackSymbol = symbol;
      if (analysisType === 'open_interest') {
        const base = symbol.replace('USDT', '');
        callbackSymbol = `${base}/USDT:USDT`;
      }
      
      return {
        text: displayText,
        callback_data: `analyze:${callbackSymbol}:${analysisType}`
      };
    });

    return symbolButtons;
  }

  // 测试不同分析类型
  const analysisTypes = ['comprehensive', 'rsi', 'open_interest'];

  analysisTypes.forEach(analysisType => {
    console.log(`📋 分析类型: ${analysisType}`);
    const buttons = getSymbolSelectionMenu(analysisType);
    
    console.log('生成的按钮:');
    buttons.slice(0, 3).forEach(button => { // 只显示前3个
      console.log(`  显示: "${button.text}" → 回调: "${button.callback_data}"`);
    });
    console.log('');
  });

  // 验证回调数据解析
  console.log('🔍 验证回调数据解析:');
  
  function parseAnalysisCallback(data: string): { symbol: string; analysisType: string } {
    const parts = data.split(':');
    const analysisType = parts[parts.length - 1]; // 最后一部分是分析类型
    const symbol = parts.slice(1, -1).join(':'); // 中间部分重新拼接成交易对
    
    return { symbol, analysisType };
  }

  const testCallbacks = [
    'analyze:BTCUSDT:comprehensive',
    'analyze:ETHUSDT:rsi',
    'analyze:BTC/USDT:USDT:open_interest',
  ];

  testCallbacks.forEach(callback => {
    const parsed = parseAnalysisCallback(callback);
    console.log(`回调: "${callback}"`);
    console.log(`  → 交易对: "${parsed.symbol}", 分析类型: "${parsed.analysisType}"`);
  });

  console.log('\n✅ 统一交易对列表测试完成');
}

testUnifiedSymbols(); 