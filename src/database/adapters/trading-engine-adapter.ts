// 交易引擎数据适配器 - 连接业务逻辑与Prisma Schema

import { AnalysisResult, StrategySignal, NotificationRecord } from '@prisma/client';
import { 
  MarketState, 
  TradingOpportunity, 
  TradingSignal, 
  AnalysisResult as BusinessAnalysisResult 
} from '../../types';
import { 
  AnalysisResultDAO, 
  StrategySignalDAO, 
  NotificationRecordDAO,
  CreateAnalysisResultData,
  CreateStrategySignalData,
  CreateNotificationData
} from '../dao';
import { logger } from '../../utils/logger';
import { LOG_CONTEXTS } from '../../utils/constants';

export class TradingEngineAdapter {
  private analysisResultDAO: AnalysisResultDAO;
  private strategySignalDAO: StrategySignalDAO;
  private notificationDAO: NotificationRecordDAO;
  private logger = logger.setContext(LOG_CONTEXTS.DATA_MANAGER);

  constructor() {
    this.analysisResultDAO = new AnalysisResultDAO();
    this.strategySignalDAO = new StrategySignalDAO();
    this.notificationDAO = new NotificationRecordDAO();
  }

  /**
   * 保存市场状态分析结果
   */
  async saveMarketState(marketState: MarketState): Promise<void> {
    try {
      const analysisData: CreateAnalysisResultData = {
        symbol: marketState.symbol,
        interval: '1h', // 默认使用1小时周期
        timestamp: BigInt(marketState.lastUpdate),
        trendScore: this.calculateTrendScore(marketState),
        momentumScore: this.calculateMomentumScore(marketState),
        volatilityScore: 0.5, // 默认值，后续可以计算
        signal: marketState.trend,
        confidence: this.calculateTrendConfidence(marketState),
        summary: this.generateMarketStateSummary(marketState)
      };

      await this.analysisResultDAO.create(analysisData);
      
      this.logger.debug('Market state saved', {
        symbol: marketState.symbol,
        trend: marketState.trend
      });
    } catch (error) {
      this.logger.error('Failed to save market state', error as Error, marketState);
      throw error;
    }
  }

  /**
   * 保存交易机会
   */
  async saveTradingOpportunity(opportunity: TradingOpportunity): Promise<void> {
    try {
      const signalData: CreateStrategySignalData = {
        symbol: opportunity.symbol,
        interval: '15m', // 交易机会通常基于15分钟周期
        strategyType: 'FOUR_STEP_FUNNEL',
        signalType: opportunity.direction,
        price: opportunity.entryPrice,
        confidence: opportunity.riskRewardRatio.recommended / 10, // 转换为0-1范围
        recommendation: this.generateOpportunityRecommendation(opportunity),
        upperLevel: opportunity.takeProfit.recommended,
        lowerLevel: opportunity.stopLoss.recommended,
        stopLoss: opportunity.stopLoss.recommended,
        takeProfit: opportunity.takeProfit.recommended,
        note: JSON.stringify({
          riskRewardRatio: opportunity.riskRewardRatio,
          keyLevels: opportunity.keyLevels,
          macroTrend: opportunity.macroTrend
        }),
        timestamp: BigInt(opportunity.createdAt)
      };

      await this.strategySignalDAO.create(signalData);
      
      this.logger.debug('Trading opportunity saved', {
        symbol: opportunity.symbol,
        direction: opportunity.direction,
        riskReward: opportunity.riskRewardRatio.recommended
      });
    } catch (error) {
      this.logger.error('Failed to save trading opportunity', error as Error, opportunity);
      throw error;
    }
  }

  /**
   * 保存交易信号
   */
  async saveTradingSignal(signal: TradingSignal): Promise<void> {
    try {
      // 保存策略信号
      const signalData: CreateStrategySignalData = {
        symbol: signal.symbol,
        interval: '15m',
        strategyType: 'FOUR_STEP_FUNNEL',
        signalType: signal.signalType,
        price: signal.triggerPrice,
        confidence: signal.riskRewardRatio.recommended / 10,
        recommendation: this.generateSignalRecommendation(signal),
        upperLevel: signal.takeProfit.recommended,
        lowerLevel: signal.stopLoss.recommended,
        stopLoss: signal.stopLoss.recommended,
        takeProfit: signal.takeProfit.recommended,
        note: JSON.stringify({
          triggerCandle: signal.triggerCandle,
          riskRewardRatio: signal.riskRewardRatio,
          keyLevels: signal.keyLevels
        }),
        timestamp: BigInt(signal.triggerTime)
      };

      await this.strategySignalDAO.create(signalData);

      // 创建通知
      await this.notificationDAO.createSignalNotification(
        signal.symbol,
        '15m',
        signal.signalType,
        signal.riskRewardRatio.recommended / 10,
        this.generateSignalSummary(signal),
        undefined, // patterns
        JSON.stringify(signal.keyLevels), // supportResistance
        {
          triggerPrice: signal.triggerPrice,
          direction: signal.direction,
          riskRewardRatio: signal.riskRewardRatio
        }
      );

      this.logger.info('Trading signal saved', {
        symbol: signal.symbol,
        signalType: signal.signalType,
        direction: signal.direction,
        triggerPrice: signal.triggerPrice
      });
    } catch (error) {
      this.logger.error('Failed to save trading signal', error as Error, signal);
      throw error;
    }
  }

  /**
   * 获取最新的分析结果
   */
  async getLatestAnalysisResults(
    symbol?: string,
    limit: number = 10
  ): Promise<BusinessAnalysisResult[]> {
    try {
      const filter = symbol ? { symbol } : {};
      const results = await this.analysisResultDAO.findLatest(filter, limit);
      
      return results.map(result => this.convertToBusinessAnalysisResult(result));
    } catch (error) {
      this.logger.error('Failed to get latest analysis results', error as Error, { symbol, limit });
      throw error;
    }
  }

  /**
   * 获取最新的交易信号
   */
  async getLatestTradingSignals(
    symbol?: string,
    limit: number = 10
  ): Promise<TradingSignal[]> {
    try {
      const filter = symbol ? { symbol } : {};
      const signals = await this.strategySignalDAO.findLatest(filter, limit);
      
      return signals.map(signal => this.convertToTradingSignal(signal));
    } catch (error) {
      this.logger.error('Failed to get latest trading signals', error as Error, { symbol, limit });
      throw error;
    }
  }

  /**
   * 获取高置信度信号
   */
  async getHighConfidenceSignals(
    minConfidence: number = 0.8,
    hours: number = 24,
    limit: number = 10
  ): Promise<TradingSignal[]> {
    try {
      const signals = await this.strategySignalDAO.findHighConfidenceSignals(
        minConfidence,
        hours,
        limit
      );
      
      return signals.map(signal => this.convertToTradingSignal(signal));
    } catch (error) {
      this.logger.error('Failed to get high confidence signals', error as Error, {
        minConfidence,
        hours,
        limit
      });
      throw error;
    }
  }

  /**
   * 记录分析执行
   */
  async recordAnalysisExecution(
    triggerSource: string,
    triggerUserId?: string,
    executionDetails?: any
  ): Promise<void> {
    try {
      await this.notificationDAO.createSystemNotification(
        '分析执行开始',
        `${triggerSource} 触发的分析开始执行`,
        'info',
        {
          triggerSource,
          triggerUserId,
          executionDetails,
          startTime: new Date().toISOString()
        }
      );
    } catch (error) {
      this.logger.error('Failed to record analysis execution', error as Error, {
        triggerSource,
        triggerUserId
      });
    }
  }

  /**
   * 记录分析完成
   */
  async recordAnalysisCompletion(
    success: boolean,
    signalsGenerated: number,
    opportunitiesFound: number,
    duration: number,
    errorMessage?: string
  ): Promise<void> {
    try {
      const title = success ? '分析执行完成' : '分析执行失败';
      const message = success 
        ? `分析完成，生成 ${signalsGenerated} 个信号，发现 ${opportunitiesFound} 个机会，耗时 ${duration}ms`
        : `分析执行失败: ${errorMessage}`;
      
      await this.notificationDAO.createSystemNotification(
        title,
        message,
        success ? 'success' : 'error',
        {
          success,
          signalsGenerated,
          opportunitiesFound,
          duration,
          errorMessage
        }
      );
    } catch (error) {
      this.logger.error('Failed to record analysis completion', error as Error, {
        success,
        signalsGenerated,
        opportunitiesFound,
        duration
      });
    }
  }

  /**
   * 获取系统统计信息
   */
  async getSystemStatistics(days: number = 7): Promise<{
    analysisResults: any;
    strategySignals: any;
    notifications: any;
  }> {
    try {
      const [analysisStats, signalStats, notificationStats] = await Promise.all([
        this.analysisResultDAO.getStatistics(undefined, undefined, days),
        this.strategySignalDAO.getStatistics(undefined, undefined, days),
        this.notificationDAO.getStatistics(days)
      ]);

      return {
        analysisResults: analysisStats,
        strategySignals: signalStats,
        notifications: notificationStats
      };
    } catch (error) {
      this.logger.error('Failed to get system statistics', error as Error, { days });
      throw error;
    }
  }

  // 私有辅助方法

  private calculateTrendScore(marketState: MarketState): number {
    // 基于EMA位置计算趋势分数
    const h4Score = this.getEmaScore(marketState.h4Trend);
    const d1Score = this.getEmaScore(marketState.d1Trend);
    return (h4Score + d1Score) / 2;
  }

  private calculateMomentumScore(marketState: MarketState): number {
    // 基于价格相对于EMA的位置计算动量分数
    const h4Momentum = this.getMomentumScore(marketState.h4Trend);
    const d1Momentum = this.getMomentumScore(marketState.d1Trend);
    return (h4Momentum + d1Momentum) / 2;
  }

  private calculateTrendConfidence(marketState: MarketState): number {
    // 基于两个周期的一致性计算置信度
    const h4Bullish = marketState.h4Trend.isAboveEma21 && marketState.h4Trend.isEma21AboveEma55;
    const d1Bullish = marketState.d1Trend.isAboveEma21 && marketState.d1Trend.isEma21AboveEma55;
    const h4Bearish = !marketState.h4Trend.isAboveEma21 && !marketState.h4Trend.isEma21AboveEma55;
    const d1Bearish = !marketState.d1Trend.isAboveEma21 && !marketState.d1Trend.isEma21AboveEma55;

    if ((h4Bullish && d1Bullish) || (h4Bearish && d1Bearish)) {
      return 0.9; // 高置信度
    } else if (marketState.trend !== 'RANGING') {
      return 0.6; // 中等置信度
    } else {
      return 0.3; // 低置信度
    }
  }

  private getEmaScore(trendData: any): number {
    if (trendData.isAboveEma21 && trendData.isEma21AboveEma55) {
      return 1.0; // 强烈看涨
    } else if (!trendData.isAboveEma21 && !trendData.isEma21AboveEma55) {
      return -1.0; // 强烈看跌
    } else {
      return 0.0; // 中性
    }
  }

  private getMomentumScore(trendData: any): number {
    const priceToEma21 = (trendData.price - trendData.ema21) / trendData.ema21;
    return Math.max(-1, Math.min(1, priceToEma21 * 10)); // 限制在-1到1之间
  }

  private generateMarketStateSummary(marketState: MarketState): string {
    return `${marketState.symbol} 当前趋势: ${marketState.trend}，H4和D1周期分析显示市场处于${marketState.trend === 'UPTREND' ? '上升' : marketState.trend === 'DOWNTREND' ? '下降' : '横盘'}状态`;
  }

  private generateOpportunityRecommendation(opportunity: TradingOpportunity): string {
    return `建议${opportunity.direction === 'LONG' ? '做多' : '做空'} ${opportunity.symbol}，入场价: ${opportunity.entryPrice}，止盈: ${opportunity.takeProfit.recommended}，止损: ${opportunity.stopLoss.recommended}，风险回报比: ${opportunity.riskRewardRatio.recommended.toFixed(2)}`;
  }

  private generateSignalRecommendation(signal: TradingSignal): string {
    return `${signal.signalType} 信号触发，建议${signal.direction === 'LONG' ? '做多' : '做空'} ${signal.symbol}，触发价: ${signal.triggerPrice}，目标价: ${signal.takeProfit.recommended}，止损价: ${signal.stopLoss.recommended}`;
  }

  private generateSignalSummary(signal: TradingSignal): string {
    return `${signal.symbol} 在15分钟周期检测到 ${signal.signalType} 信号，${signal.direction === 'LONG' ? '看涨' : '看跌'}，风险回报比 ${signal.riskRewardRatio.recommended.toFixed(2)}`;
  }

  private convertToBusinessAnalysisResult(result: AnalysisResult): BusinessAnalysisResult {
    return {
      success: true,
      executionTime: 0, // 从数据库记录中无法获取
      signalsGenerated: 1,
      opportunitiesFound: 1,
      results: {
        marketStates: [], // 需要从其他地方获取
        tradingSignals: [],
        opportunities: []
      }
    };
  }

  private convertToTradingSignal(signal: StrategySignal): TradingSignal {
    const noteData = signal.note ? JSON.parse(signal.note) : {};
    
    return {
      id: signal.id.toString(),
      symbol: signal.symbol,
      direction: signal.signalType as 'LONG' | 'SHORT',
      entryPrice: Number(signal.price),
      stopLoss: {
        nearest: Number(signal.stopLoss || signal.price),
        secondary: Number(signal.lowerLevel || signal.price),
        recommended: Number(signal.stopLoss || signal.price)
      },
      takeProfit: {
        nearest: Number(signal.takeProfit || signal.price),
        major: Number(signal.upperLevel || signal.price),
        recommended: Number(signal.takeProfit || signal.price)
      },
      riskRewardRatio: {
        conservative: Number(signal.confidence) * 10,
        aggressive: Number(signal.confidence) * 12,
        recommended: Number(signal.confidence) * 10
      },
      keyLevels: noteData.keyLevels || {
        supports: { nearest: null, secondary: null, major: null, all: [] },
        resistances: { nearest: null, secondary: null, major: null, all: [] }
      },
      macroTrend: noteData.macroTrend || 'UNKNOWN',
      status: 'SIGNAL_TRIGGERED' as const,
      createdAt: Number(signal.timestamp),
      updatedAt: Number(signal.timestamp),
      signalType: signal.strategyType as any,
      triggerPrice: Number(signal.price),
      triggerTime: Number(signal.timestamp),
      triggerCandle: noteData.triggerCandle || {
        symbol: signal.symbol,
        timeframe: '15m',
        openTime: Number(signal.timestamp),
        closeTime: Number(signal.timestamp),
        open: Number(signal.price),
        high: Number(signal.price),
        low: Number(signal.price),
        close: Number(signal.price),
        volume: 0
      }
    };
  }
}