/**
 * OHLCV市场数据接口
 */
export interface IOHLCVData {
  timestamp: number;
  datetime: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * EMA分析结果接口
 */
export interface IEMAAnalysis {
  ema20: number;
  ema60: number;
  ema120: number;
  currentPrice: number;
  trend: 'UPTREND' | 'DOWNTREND' | 'RANGING';
  trendConfidence: number;
}

/**
 * 市场状态分析接口
 */
export interface IMarketAnalysis {
  symbol: string;
  timeframe: string;
  dataPoints: number;
  emaAnalysis: IEMAAnalysis;
  priceHistory: {
    latest: number;
    high24h: number;
    low24h: number;
    change24h: number;
    changePercent24h: number;
  };
  technicalSignals: {
    macdSignal?: 'BUY' | 'SELL' | 'NEUTRAL';
    rsiSignal?: 'OVERSOLD' | 'OVERBOUGHT' | 'NEUTRAL';
    volumeSignal?: 'HIGH' | 'LOW' | 'NORMAL';
  };
}

/**
 * CCXT交易所配置接口
 */
export interface ICCXTConfig {
  exchange: string;
  apiKey?: string;
  secret?: string;
  sandbox?: boolean;
  enableRateLimit?: boolean;
} 