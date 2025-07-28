/**
 * 时间周期枚举
 */
export type TimeframeType = '15m' | '1h' | '4h' | '1d';

/**
 * 趋势类型
 */
export type TrendType = 'STRONG_UPTREND' | 'UPTREND' | 'WEAK_UPTREND' | 'RANGING' | 'WEAK_DOWNTREND' | 'DOWNTREND' | 'STRONG_DOWNTREND';

/**
 * 单个时间周期的趋势分析结果
 */
export interface ITimeframeTrend {
  timeframe: TimeframeType;
  trend: TrendType;
  confidence: number; // 0-100
  currentPrice: number;
  ema20: number;
  ema60: number;
  ema120: number;
  trendStrength: number; // 趋势强度 0-100
  divergence: boolean; // 是否存在背离
  analysis: string; // 分析描述
}

/**
 * 多时间周期趋势分析结果
 */
export interface IMultiTimeframeTrend {
  symbol: string;
  timestamp: number;
  overallTrend: TrendType;
  overallConfidence: number;
  timeframes: {
    '15m': ITimeframeTrend;
    '1h': ITimeframeTrend;
    '4h': ITimeframeTrend;
    '1d': ITimeframeTrend;
  };
  trendAlignment: {
    isAligned: boolean; // 各周期是否一致
    alignmentScore: number; // 一致性得分 0-100
    conflictingTimeframes: TimeframeType[]; // 冲突的时间周期
  };
  tradingSuggestion: {
    action: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL' | 'WAIT';
    reason: string;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  };
}

/**
 * 支撑阻力位类型
 */
export type SupportResistanceType = 'SUPPORT' | 'RESISTANCE';

/**
 * 支撑阻力位强度
 */
export type LevelStrength = 'WEAK' | 'MEDIUM' | 'STRONG' | 'MAJOR';

/**
 * 单个支撑阻力位
 */
export interface ISupportResistanceLevel {
  type: SupportResistanceType;
  priceRange: {
    min: number;
    max: number;
    center: number;
  };
  strength: LevelStrength;
  confidence: number; // 0-100
  touchCount: number; // 触及次数
  lastTouch: number; // 最后触及时间戳
  distance: number; // 与当前价格距离（百分比）
  isActive: boolean; // 是否仍然有效
  timeframe: TimeframeType; // 主要识别的时间周期
  description: string; // 描述
}

/**
 * 支撑阻力位分析结果
 */
export interface ISupportResistanceAnalysis {
  symbol: string;
  currentPrice: number;
  timestamp: number;
  
  // 关键位置
  keyLevels: {
    nearestSupport: ISupportResistanceLevel | null;
    nearestResistance: ISupportResistanceLevel | null;
    strongestSupport: ISupportResistanceLevel | null;
    strongestResistance: ISupportResistanceLevel | null;
  };
  
  // 所有识别的位置
  allLevels: {
    supports: ISupportResistanceLevel[];
    resistances: ISupportResistanceLevel[];
  };
  
  // 当前位置分析
  currentPosition: {
    betweenLevels: boolean;
    inSupportZone: boolean;
    inResistanceZone: boolean;
    priceAction: 'APPROACHING_SUPPORT' | 'APPROACHING_RESISTANCE' | 'BREAKING_OUT' | 'CONSOLIDATING';
  };
  
  // 交易建议
  tradingZones: {
    buyZones: Array<{
      priceRange: { min: number; max: number };
      strength: LevelStrength;
      reason: string;
    }>;
    sellZones: Array<{
      priceRange: { min: number; max: number };
      strength: LevelStrength;
      reason: string;
    }>;
  };
}

/**
 * K线数据接口
 */
export interface IKlineData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * 完整技术分析结果
 */
export interface ITechnicalAnalysisResult {
  symbol: string;
  timestamp: number;
  
  // 趋势分析
  trendAnalysis: IMultiTimeframeTrend;
  
  // 支撑阻力位分析
  supportResistanceAnalysis: ISupportResistanceAnalysis;
  
  // 综合评估
  overallAssessment: {
    marketCondition: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'VOLATILE';
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
    opportunity: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'AVOID';
    timeframe: 'SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM';
    recommendation: string;
  };
} 