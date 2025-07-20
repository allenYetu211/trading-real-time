import { PatternType, SignalType } from '../enums';

export interface AnalysisResult {
  id?: number;
  symbol: string;
  interval: string;
  timestamp: number;
  trendScore: number;
  momentumScore: number;
  volatilityScore: number;
  signal: SignalType;
  confidence: number;
  patterns: any[];
  supportResistance: any[];
  summary: string;
  createdAt?: Date;
}

// 保留向后兼容性的接口
export interface LegacyAnalysisResult {
  symbol: string;
  interval: string;
  detectedPattern: PatternType;
  keyLevels: {
    upper?: number;
    lower?: number;
    support?: number;
    resistance?: number;
  };
  confidence: number;
  timestamp: number;
  note?: string;
}

export interface TechnicalIndicator {
  ema12?: number;
  ema26?: number;
  sma20?: number;
  macd?: {
    macd: number;
    signal: number;
    histogram: number;
  };
  rsi?: number;
  bollingerBands?: {
    upper: number;
    middle: number;
    lower: number;
  };
}

export interface BoxPattern {
  upperLevel: number;
  lowerLevel: number;
  touchPoints: number;
  duration: number;
  confidence: number;
  isValid: boolean;
}

export interface BreakoutPattern {
  direction: 'UP' | 'DOWN';
  breakoutPrice: number;
  volumeConfirmation: boolean;
  strength: number;
  priceTarget?: number;
} 