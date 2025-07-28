// 核心数据类型定义

export interface KlineData {
  symbol: string;
  timeframe: string;
  openTime: number;
  closeTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TrendData {
  ema21: number;
  ema55: number;
  price: number;
  isAboveEma21: boolean;
  isEma21AboveEma55: boolean;
}

export interface MarketState {
  symbol: string;
  trend: 'UPTREND' | 'DOWNTREND' | 'RANGING';
  h4Trend: TrendData;
  d1Trend: TrendData;
  lastUpdate: number;
}

export interface KeyLevel {
  price: number;
  timeframe: string;
  type: 'SUPPORT' | 'RESISTANCE';
  strength: number; // 1-10, 强度评分
  touchCount: number; // 触及次数
  lastTouch: number; // 最后触及时间
  volume?: number; // 该位置的成交量
}

export interface KeyLevelSet {
  symbol: string;
  d1Levels: KeyLevel[];
  h4Levels: KeyLevel[];
  m15Levels: KeyLevel[];
  lastUpdate: number;
}

export interface SupportResistanceLevels {
  nearest: KeyLevel | null;      // 最近的支撑/阻力位
  secondary: KeyLevel | null;    // 次重要的支撑/阻力位
  major: KeyLevel | null;        // 主要的支撑/阻力位（大周期）
  all: KeyLevel[];              // 所有相关的支撑/阻力位，按距离排序
}

export interface EntryLevels {
  symbol: string;
  direction: 'LONG' | 'SHORT';
  currentPrice: number;
  supports: SupportResistanceLevels;
  resistances: SupportResistanceLevels;
  optimalEntry: {
    price: number;
    nearestStopLoss: number;    // 最近的止损位
    secondaryStopLoss: number;  // 次级止损位
    nearestTakeProfit: number;  // 最近的止盈位
    majorTakeProfit: number;    // 主要止盈位（大周期）
  };
}

export interface TradingOpportunity {
  id: string;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  
  // 多层级止盈止损
  stopLoss: {
    nearest: number;      // 最近止损位
    secondary: number;    // 次级止损位
    recommended: number;  // 推荐止损位
  };
  
  takeProfit: {
    nearest: number;      // 最近止盈位
    major: number;        // 主要止盈位（大周期）
    recommended: number;  // 推荐止盈位
  };
  
  riskRewardRatio: {
    conservative: number; // 保守盈亏比（最近止盈/最近止损）
    aggressive: number;   // 激进盈亏比（主要止盈/最近止损）
    recommended: number;  // 推荐盈亏比
  };
  
  keyLevels: {
    supports: SupportResistanceLevels;
    resistances: SupportResistanceLevels;
  };
  
  macroTrend: string;
  status: 'WATCHLIST' | 'SIGNAL_TRIGGERED';
  createdAt: number;
  updatedAt: number;
}

export interface TradingSignal extends TradingOpportunity {
  signalType: 'STRUCTURE_BREAKOUT' | 'PULLBACK_CONFIRMATION' | 'PATTERN_BREAKOUT';
  triggerPrice: number;
  triggerTime: number;
  triggerCandle: KlineData;
}

export interface SignalResult {
  detected: boolean;
  signalType?: string;
  triggerPrice?: number;
  triggerCandle?: KlineData;
  confidence?: number;
}

export interface ScheduleStatus {
  isRunning: boolean;
  lastExecution: number;
  nextExecution: number;
  executionCount: number;
  lastError?: string;
}

export interface AnalysisResult {
  success: boolean;
  executionTime: number;
  signalsGenerated: number;
  opportunitiesFound: number;
  errors?: string[];
  results: {
    marketStates: MarketState[];
    tradingSignals: TradingSignal[];
    opportunities: TradingOpportunity[];
  };
}

export interface ApiStatus {
  connected: boolean;
  lastError?: string;
  weightUsed: number;
  weightLimit: number;
}

export interface KlineRequest {
  symbol: string;
  timeframe: string;
  limit?: number;
}

// Telegram相关类型
export enum TelegramCommands {
  START = '/start',
  ANALYZE = '/analyze',
  STATUS = '/status',
  SIGNALS = '/signals',
  CONFIG = '/config',
  HELP = '/help'
}

// 配置相关类型
export interface SystemConfig {
  analysisSchedule: {
    enabled: boolean;
    intervalMinutes: number;
  };
  riskRewardThreshold: {
    minRatio: number;
  };
  emaPeriods: {
    ema21: number;
    ema55: number;
  };
  telegramBot: {
    enabled: boolean;
    notifications: boolean;
  };
  tradingPairs: {
    symbols: string[];
    maxPairs: number;
  };
}

// 错误类型
export class TradingEngineError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'TradingEngineError';
  }
}

export class ApiError extends TradingEngineError {
  constructor(message: string, public statusCode?: number, details?: any) {
    super(message, 'API_ERROR', details);
  }
}

export class DataError extends TradingEngineError {
  constructor(message: string, details?: any) {
    super(message, 'DATA_ERROR', details);
  }
}

export class AnalysisError extends TradingEngineError {
  constructor(message: string, details?: any) {
    super(message, 'ANALYSIS_ERROR', details);
  }
}