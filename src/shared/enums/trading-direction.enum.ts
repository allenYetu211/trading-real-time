/**
 * 交易方向枚举
 * 定义交易的买卖方向
 */
export enum TradingDirection {
  /** 做多 - 买入开仓，看涨 */
  LONG = 'LONG',
  
  /** 做空 - 卖出开仓，看跌 */
  SHORT = 'SHORT',
} 