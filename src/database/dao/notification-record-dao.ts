// 通知记录数据访问对象

import { PrismaClient, NotificationRecord } from '@prisma/client';
import { db } from '../connection';
import { logger } from '../../utils/logger';
import { LOG_CONTEXTS } from '../../utils/constants';

export interface CreateNotificationData {
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  symbol?: string;
  interval?: string;
  signal?: string;
  confidence?: number;
  summary?: string;
  patterns?: string;
  supportResistance?: string;
  data?: string; // JSON格式的额外数据
  timestamp: Date;
}

export interface NotificationFilter {
  type?: string;
  symbol?: string;
  interval?: string;
  signal?: string;
  timestampFrom?: Date;
  timestampTo?: Date;
  minConfidence?: number;
}

export class NotificationRecordDAO {
  private prisma: PrismaClient;
  private logger = logger.setContext(LOG_CONTEXTS.DATA_MANAGER);

  constructor() {
    this.prisma = db.getPrisma();
  }

  /**
   * 创建通知记录
   */
  async create(data: CreateNotificationData): Promise<NotificationRecord> {
    try {
      const result = await this.prisma.notificationRecord.create({
        data: {
          title: data.title,
          message: data.message,
          type: data.type,
          symbol: data.symbol,
          interval: data.interval,
          signal: data.signal,
          confidence: data.confidence,
          summary: data.summary,
          patterns: data.patterns,
          supportResistance: data.supportResistance,
          data: data.data,
          timestamp: data.timestamp
        }
      });

      this.logger.debug('Notification record created', {
        id: result.id,
        type: result.type,
        symbol: result.symbol,
        title: result.title
      });

      return result;
    } catch (error) {
      this.logger.error('Failed to create notification record', error as Error, data);
      throw error;
    }
  }

  /**
   * 批量创建通知记录
   */
  async createMany(dataList: CreateNotificationData[]): Promise<number> {
    try {
      const result = await this.prisma.notificationRecord.createMany({
        data: dataList.map(data => ({
          title: data.title,
          message: data.message,
          type: data.type,
          symbol: data.symbol,
          interval: data.interval,
          signal: data.signal,
          confidence: data.confidence,
          summary: data.summary,
          patterns: data.patterns,
          supportResistance: data.supportResistance,
          data: data.data,
          timestamp: data.timestamp
        })),
        skipDuplicates: true
      });

      this.logger.info('Notification records created in batch', {
        count: result.count,
        total: dataList.length
      });

      return result.count;
    } catch (error) {
      this.logger.error('Failed to create notification records in batch', error as Error, {
        count: dataList.length
      });
      throw error;
    }
  }

  /**
   * 根据ID查找通知记录
   */
  async findById(id: number): Promise<NotificationRecord | null> {
    try {
      return await this.prisma.notificationRecord.findUnique({
        where: { id }
      });
    } catch (error) {
      this.logger.error('Failed to find notification record by ID', error as Error, { id });
      throw error;
    }
  }

  /**
   * 查找最新的通知记录
   */
  async findLatest(filter: NotificationFilter, limit: number = 20): Promise<NotificationRecord[]> {
    try {
      const where: any = {};

      if (filter.type) where.type = filter.type;
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

      const results = await this.prisma.notificationRecord.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: limit
      });

      this.logger.debug('Latest notification records retrieved', {
        count: results.length,
        filter
      });

      return results;
    } catch (error) {
      this.logger.error('Failed to find latest notification records', error as Error, filter);
      throw error;
    }
  }

  /**
   * 根据类型查找通知记录
   */
  async findByType(
    type: string,
    hours: number = 24,
    limit: number = 50
  ): Promise<NotificationRecord[]> {
    try {
      const timestampFrom = new Date(Date.now() - hours * 60 * 60 * 1000);

      return await this.prisma.notificationRecord.findMany({
        where: {
          type,
          timestamp: { gte: timestampFrom }
        },
        orderBy: { timestamp: 'desc' },
        take: limit
      });
    } catch (error) {
      this.logger.error('Failed to find notification records by type', error as Error, {
        type,
        hours
      });
      throw error;
    }
  }

  /**
   * 根据交易对查找通知记录
   */
  async findBySymbol(
    symbol: string,
    hours: number = 24,
    limit: number = 30
  ): Promise<NotificationRecord[]> {
    try {
      const timestampFrom = new Date(Date.now() - hours * 60 * 60 * 1000);

      return await this.prisma.notificationRecord.findMany({
        where: {
          symbol,
          timestamp: { gte: timestampFrom }
        },
        orderBy: { timestamp: 'desc' },
        take: limit
      });
    } catch (error) {
      this.logger.error('Failed to find notification records by symbol', error as Error, {
        symbol,
        hours
      });
      throw error;
    }
  }

  /**
   * 查找错误类型的通知
   */
  async findErrors(hours: number = 24, limit: number = 20): Promise<NotificationRecord[]> {
    try {
      const timestampFrom = new Date(Date.now() - hours * 60 * 60 * 1000);

      return await this.prisma.notificationRecord.findMany({
        where: {
          type: 'error',
          timestamp: { gte: timestampFrom }
        },
        orderBy: { timestamp: 'desc' },
        take: limit
      });
    } catch (error) {
      this.logger.error('Failed to find error notifications', error as Error, { hours });
      throw error;
    }
  }

  /**
   * 查找高置信度信号通知
   */
  async findHighConfidenceSignals(
    minConfidence: number = 0.8,
    hours: number = 24,
    limit: number = 10
  ): Promise<NotificationRecord[]> {
    try {
      const timestampFrom = new Date(Date.now() - hours * 60 * 60 * 1000);

      return await this.prisma.notificationRecord.findMany({
        where: {
          signal: { not: null },
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
      this.logger.error('Failed to find high confidence signal notifications', error as Error, {
        minConfidence,
        hours
      });
      throw error;
    }
  }

  /**
   * 获取通知统计
   */
  async getStatistics(days: number = 7): Promise<{
    total: number;
    byType: Record<string, number>;
    bySymbol: Record<string, number>;
    errorCount: number;
    signalCount: number;
    avgConfidence: number;
  }> {
    try {
      const timestampFrom = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const results = await this.prisma.notificationRecord.findMany({
        where: {
          timestamp: { gte: timestampFrom }
        },
        select: {
          type: true,
          symbol: true,
          signal: true,
          confidence: true
        }
      });

      const total = results.length;
      const byType: Record<string, number> = {};
      const bySymbol: Record<string, number> = {};
      let errorCount = 0;
      let signalCount = 0;
      let totalConfidence = 0;
      let confidenceCount = 0;

      results.forEach(result => {
        byType[result.type] = (byType[result.type] || 0) + 1;
        
        if (result.symbol) {
          bySymbol[result.symbol] = (bySymbol[result.symbol] || 0) + 1;
        }
        
        if (result.type === 'error') {
          errorCount++;
        }
        
        if (result.signal) {
          signalCount++;
        }
        
        if (result.confidence !== null) {
          totalConfidence += Number(result.confidence);
          confidenceCount++;
        }
      });

      return {
        total,
        byType,
        bySymbol,
        errorCount,
        signalCount,
        avgConfidence: confidenceCount > 0 ? totalConfidence / confidenceCount : 0
      };
    } catch (error) {
      this.logger.error('Failed to get notification statistics', error as Error, { days });
      throw error;
    }
  }

  /**
   * 删除旧的通知记录
   */
  async deleteOld(daysToKeep: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await this.prisma.notificationRecord.deleteMany({
        where: {
          timestamp: { lt: cutoffDate }
        }
      });

      this.logger.info('Old notification records deleted', {
        deletedCount: result.count,
        cutoffDate: cutoffDate.toISOString()
      });

      return result.count;
    } catch (error) {
      this.logger.error('Failed to delete old notification records', error as Error, {
        daysToKeep
      });
      throw error;
    }
  }

  /**
   * 更新通知记录
   */
  async update(
    id: number,
    data: Partial<CreateNotificationData>
  ): Promise<NotificationRecord> {
    try {
      const result = await this.prisma.notificationRecord.update({
        where: { id },
        data: {
          ...(data.title !== undefined && { title: data.title }),
          ...(data.message !== undefined && { message: data.message }),
          ...(data.type !== undefined && { type: data.type }),
          ...(data.confidence !== undefined && { confidence: data.confidence }),
          ...(data.summary !== undefined && { summary: data.summary }),
          ...(data.patterns !== undefined && { patterns: data.patterns }),
          ...(data.supportResistance !== undefined && { supportResistance: data.supportResistance }),
          ...(data.data !== undefined && { data: data.data })
        }
      });

      this.logger.debug('Notification record updated', {
        id: result.id,
        type: result.type
      });

      return result;
    } catch (error) {
      this.logger.error('Failed to update notification record', error as Error, { id, data });
      throw error;
    }
  }

  /**
   * 删除通知记录
   */
  async delete(id: number): Promise<void> {
    try {
      await this.prisma.notificationRecord.delete({
        where: { id }
      });

      this.logger.debug('Notification record deleted', { id });
    } catch (error) {
      this.logger.error('Failed to delete notification record', error as Error, { id });
      throw error;
    }
  }

  /**
   * 创建交易信号通知
   */
  async createSignalNotification(
    symbol: string,
    interval: string,
    signal: string,
    confidence: number,
    summary: string,
    patterns?: string,
    supportResistance?: string,
    additionalData?: any
  ): Promise<NotificationRecord> {
    const title = `交易信号: ${symbol} ${signal}`;
    const message = `${symbol} 在 ${interval} 周期检测到 ${signal} 信号，置信度: ${(confidence * 100).toFixed(1)}%`;
    
    return this.create({
      title,
      message,
      type: confidence >= 0.8 ? 'success' : 'info',
      symbol,
      interval,
      signal,
      confidence,
      summary,
      patterns,
      supportResistance,
      data: additionalData ? JSON.stringify(additionalData) : undefined,
      timestamp: new Date()
    });
  }

  /**
   * 创建错误通知
   */
  async createErrorNotification(
    title: string,
    message: string,
    symbol?: string,
    additionalData?: any
  ): Promise<NotificationRecord> {
    return this.create({
      title,
      message,
      type: 'error',
      symbol,
      data: additionalData ? JSON.stringify(additionalData) : undefined,
      timestamp: new Date()
    });
  }

  /**
   * 创建系统通知
   */
  async createSystemNotification(
    title: string,
    message: string,
    type: 'info' | 'success' | 'warning' = 'info',
    additionalData?: any
  ): Promise<NotificationRecord> {
    return this.create({
      title,
      message,
      type,
      data: additionalData ? JSON.stringify(additionalData) : undefined,
      timestamp: new Date()
    });
  }
}