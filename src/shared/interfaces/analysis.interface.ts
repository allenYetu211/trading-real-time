import { IntervalType, SignalType } from '../enums';

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