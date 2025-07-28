// 分析结果数据访问对象

import { PrismaClient, AnalysisResult } from '@prisma/client';
import { db } from '../connection';
import { logger } from '../../utils/logger';
import { LOG_CONTEXTS } from '../../utils/constants';

export interface CreateAnalysisResultData {
  symbol: string;
  interval: string;
  timestamp: bigint;
  trendScore: number;
  momentumScore: number;
  volatilityScore: number;
  signal: string;
  confidence: number;
  patterns?: string;
  supportResistance?: string;
  summary?: string;
}

export interface AnalysisResultFilter {
  symbol?: string;
  interval?: string;
  signal?: string;
  timestampFrom?: bigint;
  timestampTo?: bigint;
  minConfidence?: number;
}

export class AnalysisResultDAO {
  private prisma: PrismaClient;
  private logger = logger.setContext(LOG_CONTEXTS.DATA_MANAGER);

  constructor() {
    this.prisma = db.getPrisma();
  }

  /**
   * 创建分析结果
   */
  async create(data: CreateAnalysisResultData): Promise<AnalysisResult> {
    try {
      const result = await this.prisma.analysisResult.create({
        data: {
          symbol: data.symbol,
          interval: data.interval,
          timestamp: data.timestamp,
          trendScore: data.trendScore,
          momentumScore: data.momentumScore,
          volatilityScore: data.volatilityScore,
          signal: data.signal,
          confidence: data.confidence,
          patterns: data.patterns,
          supportResistance: data.supportResistance,
          summary: data.summary
        }
      });

      this.logger.debug('Analysis result created', {
        id: result.id,
        symbol: result.symbol,
        signal: result.signal
      });

      return result;
    } catch (error) {
      this.logger.error('Failed to create analysis result', error as Error, data);
      throw error;
    }
  }

  /**
   * 批量创建分析结果
   */
  async createMany(dataList: CreateAnalysisResultData[]): Promise<number> {
    try {
      const result = await this.prisma.analysisResult.createMany({
        data: dataList.map(data => ({
          symbol: data.symbol,
          interval: data.interval,
          timestamp: data.timestamp,
          trendScore: data.trendScore,
          momentumScore: data.momentumScore,
          volatilityScore: data.volatilityScore,
          signal: data.signal,
          confidence: data.confidence,
          patterns: data.patterns,
          supportResistance: data.supportResistance,
          summary: data.summary
        })),
        skipDuplicates: true
      });

      this.logger.info('Analysis results created in batch', {
        count: result.count,
        total: dataList.length
      });

      return result.count;
    } catch (error) {
      this.logger.error('Failed to create analysis results in batch', error as Error, {
        count: dataList.length
      });
      throw error;
    }
  }

  /**
   * 根据ID查找分析结果
   */
  async findById(id: number): Promise<AnalysisResult | null> {
    try {
      return await this.prisma.analysisResult.findUnique({
        where: { id }
      });
    } catch (error) {
      this.logger.error('Failed to find analysis result by ID', error as Error, { id });
      throw error;
    }
  }

  /**
   * 查找最新的分析结果
   */
  async findLatest(filter: AnalysisResultFilter, limit: number = 10): Promise<AnalysisResult[]> {
    try {
      const where: any = {};

      if (filter.symbol) where.symbol = filter.symbol;
      if (filter.interval) where.interval = filter.interval;
      if (filter.signal) where.signal = filter.signal;
      if (filter.minConfidence) {
        where.confidence = { gte: filter.minConfidence };
      }
      if (filter.timestampFrom || filter.timestampTo) {
        where.timestamp = {};
        if (filter.timestampFrom) where.timestamp.gte = filter.timestampFrom;
        if (filter.timestampTo) where.timestamp.lte = filter.timestampTo;
      }

      const results = await this.prisma.analysisResult.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: limit
      });

      this.logger.debug('Latest analysis results retrieved', {
        count: results.length,
        filter
      });

      return results;
    } catch (error) {
      this.logger.error('Failed to find latest analysis results', error as Error, filter);
      throw error;
    }
  }

  /**
   * 根据交易对和时间周期查找分析结果
   */
  async findBySymbolAndInterval(
    symbol: string,
    interval: string,
    limit: number = 50
  ): Promise<AnalysisResult[]> {
    try {
      return await this.prisma.analysisResult.findMany({
        where: {
          symbol,
          interval
        },
        orderBy: { timestamp: 'desc' },
        take: limit
      });
    } catch (error) {
      this.logger.error('Failed to find analysis results by symbol and interval', error as Error, {
        symbol,
        interval
      });
      throw error;
    }
  }

  /**
   * 查找特定信号类型的分析结果
   */
  async findBySignal(
    signal: string,
    minConfidence: number = 0.7,
    limit: number = 20
  ): Promise<AnalysisResult[]> {
    try {
      return await this.prisma.analysisResult.findMany({
        where: {
          signal,
          confidence: { gte: minConfidence }
        },
        orderBy: { timestamp: 'desc' },
        take: limit
      });
    } catch (error) {
      this.logger.error('Failed to find analysis results by signal', error as Error, {
        signal,
        minConfidence
      });
      throw error;
    }
  }

  /**
   * 获取分析结果统计
   */
  async getStatistics(
    symbol?: string,
    interval?: string,
    days: number = 7
  ): Promise<{
    total: number;
    bySignal: Record<string, number>;
    avgConfidence: number;
    avgTrendScore: number;
    avgMomentumScore: number;
    avgVolatilityScore: number;
  }> {
    try {
      const timestampFrom = BigInt(Date.now() - days * 24 * 60 * 60 * 1000);
      
      const where: any = {
        timestamp: { gte: timestampFrom }
      };
      
      if (symbol) where.symbol = symbol;
      if (interval) where.interval = interval;

      const results = await this.prisma.analysisResult.findMany({
        where,
        select: {
          signal: true,
          confidence: true,
          trendScore: true,
          momentumScore: true,
          volatilityScore: true
        }
      });

      const total = results.length;
      const bySignal: Record<string, number> = {};
      let totalConfidence = 0;
      let totalTrendScore = 0;
      let totalMomentumScore = 0;
      let totalVolatilityScore = 0;

      results.forEach(result => {
        bySignal[result.signal] = (bySignal[result.signal] || 0) + 1;
        totalConfidence += Number(result.confidence);
        totalTrendScore += Number(result.trendScore);
        totalMomentumScore += Number(result.momentumScore);
        totalVolatilityScore += Number(result.volatilityScore);
      });

      return {
        total,
        bySignal,
        avgConfidence: total > 0 ? totalConfidence / total : 0,
        avgTrendScore: total > 0 ? totalTrendScore / total : 0,
        avgMomentumScore: total > 0 ? totalMomentumScore / total : 0,
        avgVolatilityScore: total > 0 ? totalVolatilityScore / total : 0
      };
    } catch (error) {
      this.logger.error('Failed to get analysis result statistics', error as Error, {
        symbol,
        interval,
        days
      });
      throw error;
    }
  }

  /**
   * 删除旧的分析结果
   */
  async deleteOld(daysToKeep: number = 30): Promise<number> {
    try {
      const cutoffTimestamp = BigInt(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
      
      const result = await this.prisma.analysisResult.deleteMany({
        where: {
          timestamp: { lt: cutoffTimestamp }
        }
      });

      this.logger.info('Old analysis results deleted', {
        deletedCount: result.count,
        cutoffTimestamp: cutoffTimestamp.toString()
      });

      return result.count;
    } catch (error) {
      this.logger.error('Failed to delete old analysis results', error as Error, {
        daysToKeep
      });
      throw error;
    }
  }

  /**
   * 更新分析结果
   */
  async update(
    id: number,
    data: Partial<CreateAnalysisResultData>
  ): Promise<AnalysisResult> {
    try {
      const result = await this.prisma.analysisResult.update({
        where: { id },
        data: {
          ...(data.trendScore !== undefined && { trendScore: data.trendScore }),
          ...(data.momentumScore !== undefined && { momentumScore: data.momentumScore }),
          ...(data.volatilityScore !== undefined && { volatilityScore: data.volatilityScore }),
          ...(data.signal !== undefined && { signal: data.signal }),
          ...(data.confidence !== undefined && { confidence: data.confidence }),
          ...(data.patterns !== undefined && { patterns: data.patterns }),
          ...(data.supportResistance !== undefined && { supportResistance: data.supportResistance }),
          ...(data.summary !== undefined && { summary: data.summary })
        }
      });

      this.logger.debug('Analysis result updated', {
        id: result.id,
        symbol: result.symbol
      });

      return result;
    } catch (error) {
      this.logger.error('Failed to update analysis result', error as Error, { id, data });
      throw error;
    }
  }

  /**
   * 删除分析结果
   */
  async delete(id: number): Promise<void> {
    try {
      await this.prisma.analysisResult.delete({
        where: { id }
      });

      this.logger.debug('Analysis result deleted', { id });
    } catch (error) {
      this.logger.error('Failed to delete analysis result', error as Error, { id });
      throw error;
    }
  }

  /**
   * 检查是否存在重复的分析结果
   */
  async exists(symbol: string, interval: string, timestamp: bigint): Promise<boolean> {
    try {
      const result = await this.prisma.analysisResult.findFirst({
        where: {
          symbol,
          interval,
          timestamp
        }
      });

      return result !== null;
    } catch (error) {
      this.logger.error('Failed to check analysis result existence', error as Error, {
        symbol,
        interval,
        timestamp: timestamp.toString()
      });
      throw error;
    }
  }
}