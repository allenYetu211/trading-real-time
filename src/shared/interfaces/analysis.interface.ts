import { IntervalType, SignalType } from '../enums';
import { IOHLCVData } from '../../modules/ccxt-analysis/interfaces';

export interface IndicatorResult {
  timestamp: number;
  value: number | object;
}

export interface PatternResult {
  type: string;
  signal: SignalType;
  confidence: number;
  startTime: number;
  endTime: number;
  description: string;
  keyLevels?: {
    support?: number;
    resistance?: number;
    breakoutLevel?: number;
  };
}

export interface SupportResistanceLevel {
  level: number;
  strength: number;
  type: 'support' | 'resistance';
  touchCount: number;
  firstTouch: number;
  lastTouch: number;
}

export interface ComprehensiveAnalysis {
  symbol: string;
  interval: IntervalType;
  timestamp: number;
  klineCount: number;
  
  // 技术指标
  indicators: {
    [key: string]: IndicatorResult[];
  };
  
  // 图形形态
  patterns: PatternResult[];
  
  // 支撑阻力位
  supportResistance: SupportResistanceLevel[];
  
  // 综合评分
  score: {
    trend: number; // 趋势强度 -100 到 100
    momentum: number; // 动量 -100 到 100
    volatility: number; // 波动率 0 到 100
    signal: SignalType; // 综合信号
    confidence: number; // 置信度 0 到 100
  };
  
  // 分析总结
  summary: string;
}

/**
 * 核心技术分析结果接口
 * 包含所有子分析的完整结果
 */
export interface CoreTechnicalAnalysisResult {
  symbol: string;
  timestamp: number;
  emaAnalysis: any; // EMA分析结果
  emaDetailedData: any; // 详细EMA数据，包含100根K线数据
  trendAnalysis: any; // 多时间周期趋势分析结果
  srAnalysis: any; // 支撑阻力位分析结果
  rsiAnalysis?: any; // RSI分析结果（可选）
  openInterestData?: any; // 持仓量数据（可选，仅适用于期货）
} 

/**
 * 市场数据集合接口
 * 用于预获取和统一管理多时间周期的OHLCV数据
 */
export interface IMarketDataCollection {
  symbol: string;
  exchange: string;
  timestamp: number;
  timeframes: {
    '1d': IOHLCVData[];
    '4h': IOHLCVData[];
    '1h': IOHLCVData[];
    '15m': IOHLCVData[];
  };
}

/**
 * 数据获取配置接口
 */
export interface IDataFetchConfig {
  timeframe: string;
  limit: number;
  required: boolean; // 是否为必需数据
} 