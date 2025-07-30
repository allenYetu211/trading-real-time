/**
 * 测试消息格式HTML解析
 */

// 模拟多时间周期RSI数据
const mockMultiTimeframeData = {
  '15m': {
    currentRSI: { rsi: 65.43 },
    signal: 'buy',
    trend: 'bullish',
    riskLevel: 'medium'
  },
  '1h': {
    currentRSI: { rsi: 58.21 },
    signal: 'hold',
    trend: 'neutral',
    riskLevel: 'low'
  },
  '4h': {
    currentRSI: { rsi: 72.15 },
    signal: 'sell',
    trend: 'bearish',
    riskLevel: 'high'
  },
  '1d': {
    currentRSI: { rsi: 45.67 },
    signal: 'buy',
    trend: 'bullish',
    riskLevel: 'low'
  }
};

function formatMultiTimeframeRSIMessage(multiTimeframeData: any, symbol: string): string {
  const signalEmoji = {
    'strong_buy': '🟢',
    'buy': '🟡', 
    'hold': '🔵',
    'sell': '🟠',
    'strong_sell': '🔴'
  };

  const timeframeLabels = {
    '15m': '15分钟',
    '1h': '1小时',
    '4h': '4小时', 
    '1d': '日线'
  };

  let message = `
📉 <b>多时间周期 RSI 分析报告</b>

📊 <b>交易对:</b> ${symbol}

🕐 <b>各时间周期 RSI:</b>
`;

  // 遍历各时间周期数据
  Object.entries(multiTimeframeData).forEach(([timeframe, analysis]: [string, any]) => {
    const { currentRSI, signal, trend, riskLevel } = analysis;
    const tfLabel = timeframeLabels[timeframe] || timeframe;
    const emoji = signalEmoji[signal] || '⚪';
    
    message += `
• <b>${tfLabel}:</b> RSI ${currentRSI.rsi.toFixed(2)} | ${emoji} ${signal.toUpperCase()} | ${trend}`;
  });

  // 综合分析
  const signals = Object.values(multiTimeframeData).map((data: any) => data.signal);
  const bullishCount = signals.filter(s => s === 'strong_buy' || s === 'buy').length;
  const bearishCount = signals.filter(s => s === 'strong_sell' || s === 'sell').length;
  
  let overallSignal = 'hold';
  if (bullishCount > bearishCount) overallSignal = 'buy';
  if (bearishCount > bullishCount) overallSignal = 'sell';

  const overallEmoji = signalEmoji[overallSignal] || '⚪';
  
  message += `

📊 <b>综合判断:</b>
• ${overallEmoji} 总体信号: ${overallSignal.toUpperCase()}
• 看涨信号: ${bullishCount}/4 | 看跌信号: ${bearishCount}/4

💡 <b>操作建议:</b>
• 多个时间周期信号一致时，信号更可靠
• 短期RSI用于入场时机，长期RSI确定趋势  
• RSI 大于 70 为超买区域，RSI 小于 30 为超卖区域

⏰ <b>分析时间:</b> ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}
`;

  return message.trim();
}

// 测试消息格式
console.log('🧪 测试RSI多时间周期消息格式...\n');

const testMessage = formatMultiTimeframeRSIMessage(mockMultiTimeframeData, 'BTCUSDT');

console.log('📝 生成的消息:');
console.log('='.repeat(50));
console.log(testMessage);
console.log('='.repeat(50));

// 检查是否有可能导致HTML解析错误的字符
console.log('\n🔍 消息检查:');
console.log(`消息长度: ${testMessage.length} 字符`);
console.log(`包含 '<' 字符: ${testMessage.includes('<')}`);
console.log(`包含 '>' 字符: ${testMessage.includes('>')}`); 
console.log(`包含未闭合标签: ${testMessage.includes('<b>') && !testMessage.includes('</b>')}`);

// 简单的HTML标签检查
const tags = testMessage.match(/<[^>]*>/g) || [];
console.log(`HTML标签数量: ${tags.length}`);
console.log(`标签列表: ${tags.join(', ')}`);

console.log('\n✅ 消息格式测试完成'); 