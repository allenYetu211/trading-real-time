/**
 * 市场状态枚举
 * 用于描述市场的整体趋势状态
 */
export enum MarketState {
  /** 上升趋势 - 价格和EMA均线均向上 */
  UPTREND = 'UPTREND',
  
  /** 下降趋势 - 价格和EMA均线均向下 */
  DOWNTREND = 'DOWNTREND',
  
  /** 横盘整理 - 趋势不明确，价格在区间震荡 */
  RANGING = 'RANGING',
} 