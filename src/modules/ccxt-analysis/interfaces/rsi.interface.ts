/**
 * RSI数据接口
 */
export interface IRSIData {
  timestamp: number;
  datetime: string;
  rsi: number;
  signal: 'oversold' | 'overbought' | 'neutral' | 'buy' | 'sell';
  strength: 'weak' | 'moderate' | 'strong';
}

/**
 * RSI分析结果接口
 */
export interface IRSIAnalysis {
  symbol: string;
  period: number;
  currentRSI: IRSIData;
  previousRSI: IRSIData;
  trend: 'bullish' | 'bearish' | 'neutral';
  signal: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';
  divergence?: 'bullish' | 'bearish' | null;
  recommendation: string;
  riskLevel: 'low' | 'medium' | 'high';
}

/**
 * 多时间周期RSI分析接口
 */
export interface IMultiTimeframeRSI {
  [timeframe: string]: IRSIAnalysis;
}

/**
 * RSI历史数据接口
 */
export interface IRSIHistory {
  symbol: string;
  period: number;
  timeframe: string;
  data: IRSIData[];
} 