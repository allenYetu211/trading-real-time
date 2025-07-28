// 策略信号数据访问对象

import { PrismaClient, StrategySignal } from '@prisma/client';
import { db } from '../connection';
import { logger } from '../../utils/logger';
import { LOG_CONTEXTS } from '../../utils/constants';

export interface CreateStrategySignalData {
  symbol: string;
  interval: string;
  strategyType: string;
  signalType: string;
  price: number;
  confidence: number;
  recommendation: string;
  upperLevel?: number;
  lowerLevel?: number;
  stopLoss?: number;
  takeProfit?: number;
  note?: string;
  timestamp: bigint;
}

export interface StrategySignalFilter {
  symbol?: string;
  interval?: string;
  strategyType?: string;
  signalType?: string;
  timestampFrom?: bigint;
  timestampTo?: bigint;
  minConfidence?: number;
}

export class StrategySignalDAO {
  private prisma: PrismaClient;
  private logger = logger.setContext(LOG_CONTEXTS.DATA_MANAGER);

  constructor() {
    this.prisma = db.getPrisma();
  }

  /**
   * 创建策略信号
   */
  async create(data: CreateStrategySignalData): Promise<StrategySignal> {
    try {
      const result = await this.prisma.strategySignal.create({
        data: {
          symbol: data.symbol,
          interval: data.interval,
          strategyType: data.strategyType,
          signalType: data.signalType,
          price: data.price,
          confidence: data.confidence,
          recommendation: data.recommendation,
          upperLevel: data.upperLevel,
          lowerLevel: data.lowerLevel,
          stopLoss: data.stopLoss,
          takeProfit: data.takeProfit,
          note: data.note,
          timestamp: data.timestamp
        }
      });

      this.logger.debug('Strategy signal created', {
        id: result.id,
        symbol: result.symbol,
        signalType: result.signalType,
        strategyType: result.strategyType
      });

      return result;
    } catch (error) {
      this.logger.error('Failed to create strategy signal', error as Error, data);
      throw error;
    }
  }

  /**
   * 批量创建策略信号
   */
  async createMany(dataList: CreateStrategySignalData[]): Promise<number> {
    try {
      const result = await this.prisma.strategySignal.createMany({
        data: dataList.map(data => ({
          symbol: data.symbol,
          interval: data.interval,
          strategyType: data.strategyType,
          signalType: data.signalType,
          price: data.price,
          confidence: data.confidence,
          recommendation: data.recommendation,
          upperLevel: data.upperLevel,
          lowerLevel: data.lowerLevel,
          stopLoss: data.stopLoss,
          takeProfit: data.takeProfit,
          note: data.note,
          timestamp: data.timestamp
        })),
        skipDuplicates: true
      });

      this.logger.info('Strategy signals created in batch', {
        count: result.count,
        total: dataList.length
      });

      return result.count;
    } catch (error) {
      this.logger.error('Failed to create strategy signals in batch', error as Error, {
        count: dataList.length
      });
      throw error;
    }
  }

  /**
   * 根据ID查找策略信号
   */
  async findById(id: number): Promise<StrategySignal | null> {
    try {
      return await this.prisma.strategySignal.findUnique({
        where: { id }
      });
    } catch (error) {
      this.logger.error('Failed to find strategy signal by ID', error as Error, { id });
      throw error;
    }
  }

  /**
   * 查找最新的策略信号
   */
  async findLatest(filter: StrategySignalFilter, limit: number = 10): Promise<StrategySignal[]> {
    try {
      const where: any = {};

      if (filter.symbol) where.symbol = filter.symbol;
      if (filter.interval) where.interval = filter.interval;
      if (filter.strategyType) where.strategyType = filter.strategyType;
      if (filter.signalType) where.signalType = filter.signalType;
      if (filter.minConfidence) {
        where.confidence = { gte: filter.minConfidence };
      }
      if (filter.timestampFrom || filter.timestampTo) {
        where.timestamp = {};
        if (filter.timestampFrom) where.timestamp.gte = filter.timestampFrom;
        if (filter.timestampTo) where.timestamp.lte = filter.timestampTo;
      }

      const results = await this.prisma.strategySignal.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: limit
      });

      this.logger.debug('Latest strategy signals retrieved', {
        count: results.length,
        filter
      });

      return results;
    } catch (error) {
      this.logger.error('Failed to find latest strategy signals', error as Error, filter);
      throw error;
    }
  }

  /**
   * 根据交易对查找策略信号
   */
  async findBySymbol(symbol: string, limit: number = 50): Promise<StrategySignal[]> {
    try {
      return await this.prisma.strategySignal.findMany({
        where: { symbol },
        orderBy: { timestamp: 'desc' },
        take: limit
      });
    } catch (error) {
      this.logger.error('Failed to find strategy signals by symbol', error as Error, { symbol });
      throw error;
    }
  }

  /**
   * 根据策略类型查找信号
   */
  async findByStrategyType(
    strategyType: string,
    minConfidence: number = 0.7,
    limit: number = 20
  ): Promise<StrategySignal[]> {
    try {
      return await this.prisma.strategySignal.findMany({
        where: {
          strategyType,
          confidence: { gte: minConfidence }
        },
        orderBy: { timestamp: 'desc' },
        take: limit
      });
    } catch (error) {
      this.logger.error('Failed to find strategy signals by strategy type', error as Error, {
        strategyType,
        minConfidence
      });
      throw error;
    }
  }

  /**
   * 查找高置信度信号
   */
  async findHighConfidenceSignals(
    minConfidence: number = 0.8,
    hours: number = 24,
    limit: number = 10
  ): Promise<StrategySignal[]> {
    try {
      const timestampFrom = BigInt(Date.now() - hours * 60 * 60 * 1000);

      return await this.prisma.strategySignal.findMany({
        where: {
          confidence: { gte: minConfidence },
          timestamp: { gte: timestampFrom }
        },
        orderBy: [
          { confidence: 'desc' },
          { timestamp: 'desc' }
        ],
        take: limit
      });
    } catch (error) {
      this.logger.error('Failed to find high confidence signals', error as Error, {
        minConfidence,
        hours
      });
      throw error;
    }
  }

  /**
   * 获取策略信号统计
   */
  async getStatistics(
    symbol?: string,
    strategyType?: string,
    days: number = 7
  ): Promise<{
    total: number;
    bySignalType: Record<string, number>;
    byStrategyType: Record<string, number>;
    avgConfidence: number;
    highConfidenceCount: number;
  }> {
    try {
      const timestampFrom = BigInt(Date.now() - days * 24 * 60 * 60 * 1000);
      
      const where: any = {
        timestamp: { gte: timestampFrom }
      };
      
      if (symbol) where.symbol = symbol;
      if (strategyType) where.strategyType = strategyType;

      const results = await this.prisma.strategySignal.findMany({
        where,
        select: {
          signalType: true,
          strategyType: true,
          confidence: true
        }
      });

      const total = results.length;
      const bySignalType: Record<string, number> = {};
      const byStrategyType: Record<string, number> = {};
      let totalConfidence = 0;
      let highConfidenceCount = 0;

      results.forEach(result => {
        bySignalType[result.signalType] = (bySignalType[result.signalType] || 0) + 1;
        byStrategyType[result.strategyType] = (byStrategyType[result.strategyType] || 0) + 1;
        totalConfidence += Number(result.confidence);
        if (Number(result.confidence) >= 0.8) {
          highConfidenceCount++;
        }
      });

      return {
        total,
        bySignalType,
        byStrategyType,
        avgConfidence: total > 0 ? totalConfidence / total : 0,
        highConfidenceCount
      };
    } catch (error) {
      this.logger.error('Failed to get strategy signal statistics', error as Error, {
        symbol,
        strategyType,
        days
      });
      throw error;
    }
  }

  /**
   * 删除旧的策略信号
   */
  async deleteOld(daysToKeep: number = 30): Promise<number> {
    try {
      const cutoffTimestamp = BigInt(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
      
      const result = await this.prisma.strategySignal.deleteMany({
        where: {
          timestamp: { lt: cutoffTimestamp }
        }
      });

      this.logger.info('Old strategy signals deleted', {
        deletedCount: result.count,
        cutoffTimestamp: cutoffTimestamp.toString()
      });

      return result.count;
    } catch (error) {
      this.logger.error('Failed to delete old strategy signals', error as Error, {
        daysToKeep
      });
      throw error;
    }
  }

  /**
   * 更新策略信号
   */
  async update(
    id: number,
    data: Partial<CreateStrategySignalData>
  ): Promise<StrategySignal> {
    try {
      const result = await this.prisma.strategySignal.update({
        where: { id },
        data: {
          ...(data.price !== undefined && { price: data.price }),
          ...(data.confidence !== undefined && { confidence: data.confidence }),
          ...(data.recommendation !== undefined && { recommendation: data.recommendation }),
          ...(data.upperLevel !== undefined && { upperLevel: data.upperLevel }),
          ...(data.lowerLevel !== undefined && { lowerLevel: data.lowerLevel }),
          ...(data.stopLoss !== undefined && { stopLoss: data.stopLoss }),
          ...(data.takeProfit !== undefined && { takeProfit: data.takeProfit }),
          ...(data.note !== undefined && { note: data.note })
        }
      });

      this.logger.debug('Strategy signal updated', {
        id: result.id,
        symbol: result.symbol
      });

      return result;
    } catch (error) {
      this.logger.error('Failed to update strategy signal', error as Error, { id, data });
      throw error;
    }
  }

  /**
   * 删除策略信号
   */
  async delete(id: number): Promise<void> {
    try {
      await this.prisma.strategySignal.delete({
        where: { id }
      });

      this.logger.debug('Strategy signal deleted', { id });
    } catch (error) {
      this.logger.error('Failed to delete strategy signal', error as Error, { id });
      throw error;
    }
  }

  /**
   * 检查是否存在重复的策略信号
   */
  async exists(
    symbol: string,
    strategyType: string,
    signalType: string,
    timestamp: bigint
  ): Promise<boolean> {
    try {
      const result = await this.prisma.strategySignal.findFirst({
        where: {
          symbol,
          strategyType,
          signalType,
          timestamp
        }
      });

      return result !== null;
    } catch (error) {
      this.logger.error('Failed to check strategy signal existence', error as Error, {
        symbol,
        strategyType,
        signalType,
        timestamp: timestamp.toString()
      });
      throw error;
    }
  }

  /**
   * 获取最近的交易信号摘要
   */
  async getRecentSignalsSummary(hours: number = 24): Promise<{
    totalSignals: number;
    strongSignals: number;
    symbolsWithSignals: string[];
    topStrategies: Array<{ strategyType: string; count: number }>;
  }> {
    try {
      const timestampFrom = BigInt(Date.now() - hours * 60 * 60 * 1000);

      const signals = await this.prisma.strategySignal.findMany({
        where: {
          timestamp: { gte: timestampFrom }
        },
        select: {
          symbol: true,
          strategyType: true,
          confidence: true
        }
      });

      const totalSignals = signals.length;
      const strongSignals = signals.filter(s => Number(s.confidence) >= 0.8).length;
      const symbolsWithSignals = [...new Set(signals.map(s => s.symbol))];
      
      const strategyCount: Record<string, number> = {};
      signals.forEach(s => {
        strategyCount[s.strategyType] = (strategyCount[s.strategyType] || 0) + 1;
      });

      const topStrategies = Object.entries(strategyCount)
        .map(([strategyType, count]) => ({ strategyType, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        totalSignals,
        strongSignals,
        symbolsWithSignals,
        topStrategies
      };
    } catch (error) {
      this.logger.error('Failed to get recent signals summary', error as Error, { hours });
      throw error;
    }
  }
}