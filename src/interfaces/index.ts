// 核心接口定义

import {
  KlineData,
  MarketState,
  KeyLevelSet,
  SupportResistanceLevels,
  EntryLevels,
  TradingOpportunity,
  SignalResult,
  ScheduleStatus,
  AnalysisResult,
  ApiStatus,
  KlineRequest,
  SystemConfig
} from '../types';

// 数据管理接口
export interface IDataManager {
  // 数据获取
  getKlineData(symbol: string, timeframe: string, limit?: number): Promise<KlineData[]>;
  getLatestPrice(symbol: string): Promise<number>;
  
  // 批量数据获取（优化API调用）
  getBatchKlineData(requests: KlineRequest[]): Promise<Map<string, KlineData[]>>;
  
  // API状态管理
  getApiStatus(): ApiStatus;
  getRemainingWeight(): number;
}

// 趋势分析接口
export interface ITrendAnalyzer {
  analyzeTrend(symbol: string): Promise<MarketState>;
  calculateEMA(data: KlineData[], period: number): number[];
}

// 关键位分析接口
export interface IKeyLevelAnalyzer {
  identifyKeyLevels(symbol: string, timeframes: string[]): Promise<KeyLevelSet>;
  findMultiLevelSupports(price: number, levelSet: KeyLevelSet): SupportResistanceLevels;
  findMultiLevelResistances(price: number, levelSet: KeyLevelSet): SupportResistanceLevels;
  calculateOptimalEntryLevels(symbol: string, direction: 'LONG' | 'SHORT'): Promise<EntryLevels>;
}

// 风险回报计算接口
export interface IRiskRewardCalculator {
  calculateRiskReward(opportunity: Partial<TradingOpportunity>): {
    conservative: number;
    aggressive: number;
    recommended: number;
  };
  filterByRiskReward(opportunities: TradingOpportunity[], minRatio: number): TradingOpportunity[];
}

// 信号生成接口
export interface ISignalGenerator {
  detectStructureBreakout(symbol: string, direction: 'LONG' | 'SHORT'): Promise<SignalResult>;
  detectPullbackConfirmation(symbol: string, direction: 'LONG' | 'SHORT'): Promise<SignalResult>;
  detectPatternBreakout(symbol: string): Promise<SignalResult>;
}

// 调度管理接口
export interface IScheduleManager {
  // 定时任务管理
  startScheduledAnalysis(): void;
  stopScheduledAnalysis(): void;
  getScheduleStatus(): ScheduleStatus;
  
  // 手动触发
  triggerManualAnalysis(source: 'WEB' | 'TELEGRAM', userId?: string): Promise<AnalysisResult>;
  
  // 状态管理
  isAnalysisRunning(): boolean;
  getLastAnalysisTime(): number;
  getNextScheduledTime(): number;
}

// Telegram Bot接口
export interface ITelegramBot {
  // 命令处理
  handleCommand(command: string, chatId: number, userId: number): Promise<void>;
  
  // 消息发送
  sendMessage(chatId: number, message: string): Promise<void>;
  sendSignalAlert(signal: any): Promise<void>;
  sendAnalysisResult(result: AnalysisResult, chatId: number): Promise<void>;
  
  // 用户管理
  isAuthorizedUser(userId: number): boolean;
  addAuthorizedUser(userId: number): void;
  removeAuthorizedUser(userId: number): void;
}

// 配置管理接口
export interface IConfigManager {
  getConfig(): SystemConfig;
  updateConfig(key: string, value: any): Promise<void>;
  resetConfig(): Promise<void>;
  validateConfig(config: Partial<SystemConfig>): boolean;
}

// 交易决策引擎核心接口
export interface ITradingDecisionEngine {
  performFullAnalysis(): Promise<AnalysisResult>;
  analyzeSymbol(symbol: string): Promise<{
    marketState: MarketState;
    opportunities: TradingOpportunity[];
    signals: any[];
  }>;
  getWatchlist(): Promise<TradingOpportunity[]>;
  updateWatchlist(): Promise<void>;
}

// 数据访问层接口 - 基于Prisma Schema
export interface IAnalysisResultDAO {
  create(data: import('../database/dao').CreateAnalysisResultData): Promise<import('@prisma/client').AnalysisResult>;
  createMany(dataList: import('../database/dao').CreateAnalysisResultData[]): Promise<number>;
  findById(id: number): Promise<import('@prisma/client').AnalysisResult | null>;
  findLatest(filter: import('../database/dao').AnalysisResultFilter, limit?: number): Promise<import('@prisma/client').AnalysisResult[]>;
  findBySymbolAndInterval(symbol: string, interval: string, limit?: number): Promise<import('@prisma/client').AnalysisResult[]>;
  getStatistics(symbol?: string, interval?: string, days?: number): Promise<{
    total: number;
    bySignal: Record<string, number>;
    avgConfidence: number;
    avgTrendScore: number;
    avgMomentumScore: number;
    avgVolatilityScore: number;
  }>;
  deleteOld(daysToKeep?: number): Promise<number>;
}

export interface IStrategySignalDAO {
  create(data: import('../database/dao').CreateStrategySignalData): Promise<import('@prisma/client').StrategySignal>;
  createMany(dataList: import('../database/dao').CreateStrategySignalData[]): Promise<number>;
  findById(id: number): Promise<import('@prisma/client').StrategySignal | null>;
  findLatest(filter: import('../database/dao').StrategySignalFilter, limit?: number): Promise<import('@prisma/client').StrategySignal[]>;
  findBySymbol(symbol: string, limit?: number): Promise<import('@prisma/client').StrategySignal[]>;
  findHighConfidenceSignals(minConfidence?: number, hours?: number, limit?: number): Promise<import('@prisma/client').StrategySignal[]>;
  getStatistics(symbol?: string, strategyType?: string, days?: number): Promise<{
    total: number;
    bySignalType: Record<string, number>;
    byStrategyType: Record<string, number>;
    avgConfidence: number;
    highConfidenceCount: number;
  }>;
  deleteOld(daysToKeep?: number): Promise<number>;
}

export interface INotificationRecordDAO {
  create(data: import('../database/dao').CreateNotificationData): Promise<import('@prisma/client').NotificationRecord>;
  createMany(dataList: import('../database/dao').CreateNotificationData[]): Promise<number>;
  findById(id: number): Promise<import('@prisma/client').NotificationRecord | null>;
  findLatest(filter: import('../database/dao').NotificationFilter, limit?: number): Promise<import('@prisma/client').NotificationRecord[]>;
  findByType(type: string, hours?: number, limit?: number): Promise<import('@prisma/client').NotificationRecord[]>;
  findErrors(hours?: number, limit?: number): Promise<import('@prisma/client').NotificationRecord[]>;
  createSignalNotification(
    symbol: string,
    interval: string,
    signal: string,
    confidence: number,
    summary: string,
    patterns?: string,
    supportResistance?: string,
    additionalData?: any
  ): Promise<import('@prisma/client').NotificationRecord>;
  createErrorNotification(
    title: string,
    message: string,
    symbol?: string,
    additionalData?: any
  ): Promise<import('@prisma/client').NotificationRecord>;
}