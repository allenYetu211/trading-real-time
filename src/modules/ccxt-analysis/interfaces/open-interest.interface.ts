/**
 * 持仓量数据接口
 */
export interface IOpenInterestData {
  symbol: string;
  openInterest: number;
  timestamp: number;
  datetime: string;
  side?: 'long' | 'short' | 'total';
  percentage?: number;
  change24h?: number;
}

/**
 * 持仓量变化分析接口
 */
export interface IOpenInterestChange {
  current: IOpenInterestData;
  previous: IOpenInterestData;
  change: number;
  changePercent: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

/**
 * 持仓量排行接口
 */
export interface IOpenInterestRanking {
  symbol: string;
  openInterest: number;
  rank: number;
  marketShare: number;
} 