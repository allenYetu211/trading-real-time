export enum StrategyType {
  // 技术指标策略
  MA_CROSSOVER = 'MA_CROSSOVER',           // 移动均线交叉
  RSI_OVERSOLD = 'RSI_OVERSOLD',           // RSI超卖策略
  RSI_OVERBOUGHT = 'RSI_OVERBOUGHT',       // RSI超买策略
  MACD_SIGNAL = 'MACD_SIGNAL',             // MACD信号策略
  BOLLINGER_BANDS = 'BOLLINGER_BANDS',     // 布林带策略
  
  // 形态识别策略
  BREAKOUT = 'BREAKOUT',                   // 突破策略
  SUPPORT_RESISTANCE = 'SUPPORT_RESISTANCE', // 支撑阻力策略
  TREND_FOLLOWING = 'TREND_FOLLOWING',     // 趋势跟随策略
  REVERSAL = 'REVERSAL',                   // 反转策略
  
  // 组合策略
  MULTI_INDICATOR = 'MULTI_INDICATOR',     // 多指标组合
  SCALPING = 'SCALPING',                   // 剥头皮策略
  SWING = 'SWING',                         // 波段策略
  
  // 自定义策略
  CUSTOM = 'CUSTOM',                       // 自定义策略
} 