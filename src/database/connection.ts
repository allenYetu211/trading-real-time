// 数据库连接管理 - 使用Prisma

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { LOG_CONTEXTS } from '../utils/constants';

export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private prisma: PrismaClient;
  private logger = logger.setContext(LOG_CONTEXTS.DATA_MANAGER);
  private isConnected: boolean = false;

  private constructor() {
    this.prisma = new PrismaClient({
      log: [
        { level: 'query', emit: 'event' },
        { level: 'error', emit: 'event' },
        { level: 'info', emit: 'event' },
        { level: 'warn', emit: 'event' },
      ],
    });

    this.setupEventHandlers();
  }

  static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    this.prisma.$on('query', (e) => {
      this.logger.debug('Database query executed', {
        query: e.query.substring(0, 100) + (e.query.length > 100 ? '...' : ''),
        duration: e.duration,
        params: e.params
      });
    });

    this.prisma.$on('error', (e) => {
      this.logger.error('Database error', new Error(e.message), {
        target: e.target
      });
      this.isConnected = false;
    });

    this.prisma.$on('info', (e) => {
      this.logger.info('Database info', { message: e.message });
    });

    this.prisma.$on('warn', (e) => {
      this.logger.warn('Database warning', { message: e.message });
    });
  }

  /**
   * 获取Prisma客户端
   */
  getPrisma(): PrismaClient {
    return this.prisma;
  }

  /**
   * 连接数据库
   */
  async connect(): Promise<void> {
    try {
      await this.prisma.$connect();
      this.isConnected = true;
      this.logger.info('Database connected successfully');
    } catch (error) {
      this.isConnected = false;
      this.logger.error('Failed to connect to database', error as Error);
      throw error;
    }
  }

  /**
   * 断开数据库连接
   */
  async disconnect(): Promise<void> {
    try {
      await this.prisma.$disconnect();
      this.isConnected = false;
      this.logger.info('Database disconnected');
    } catch (error) {
      this.logger.error('Error disconnecting from database', error as Error);
      throw error;
    }
  }

  /**
   * 执行事务
   */
  async transaction<T>(callback: (prisma: PrismaClient) => Promise<T>): Promise<T> {
    this.logger.debug('Transaction started');
    
    try {
      const result = await this.prisma.$transaction(async (prisma) => {
        return await callback(prisma);
      });
      
      this.logger.debug('Transaction committed');
      return result;
    } catch (error) {
      this.logger.error('Transaction failed', error as Error);
      throw error;
    }
  }

  /**
   * 测试数据库连接
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT NOW() as current_time`;
      this.logger.info('Database connection test successful');
      this.isConnected = true;
      return true;
    } catch (error) {
      this.logger.error('Database connection test failed', error as Error);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * 获取连接状态
   */
  isConnectionHealthy(): boolean {
    return this.isConnected;
  }

  /**
   * 执行健康检查
   */
  async healthCheck(): Promise<{
    connected: boolean;
    latency: number;
  }> {
    const startTime = Date.now();
    
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      const latency = Date.now() - startTime;
      
      return {
        connected: true,
        latency
      };
    } catch (error) {
      return {
        connected: false,
        latency: Date.now() - startTime
      };
    }
  }

  /**
   * 获取数据库统计信息
   */
  async getDatabaseStats(): Promise<{
    coinConfigs: number;
    klineData: number;
    analysisResults: number;
    strategySignals: number;
    tradingRecords: number;
  }> {
    try {
      const [
        coinConfigs,
        klineData,
        analysisResults,
        strategySignals,
        tradingRecords
      ] = await Promise.all([
        this.prisma.coinConfig.count(),
        this.prisma.klineData.count(),
        this.prisma.analysisResult.count(),
        this.prisma.strategySignal.count(),
        this.prisma.tradingRecord.count()
      ]);

      return {
        coinConfigs,
        klineData,
        analysisResults,
        strategySignals,
        tradingRecords
      };
    } catch (error) {
      this.logger.error('Failed to get database stats', error as Error);
      return {
        coinConfigs: 0,
        klineData: 0,
        analysisResults: 0,
        strategySignals: 0,
        tradingRecords: 0
      };
    }
  }

  /**
   * 清理旧数据
   */
  async cleanupOldData(daysToKeep: number = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    try {
      await this.transaction(async (prisma) => {
        // 清理旧的K线数据
        const deletedKlines = await prisma.klineData.deleteMany({
          where: {
            createdAt: {
              lt: cutoffDate
            }
          }
        });

        // 清理旧的分析结果
        const deletedAnalysis = await prisma.analysisResult.deleteMany({
          where: {
            createdAt: {
              lt: cutoffDate
            }
          }
        });

        // 清理旧的通知记录
        const deletedNotifications = await prisma.notificationRecord.deleteMany({
          where: {
            createdAt: {
              lt: cutoffDate
            }
          }
        });

        this.logger.info('Old data cleanup completed', {
          deletedKlines: deletedKlines.count,
          deletedAnalysis: deletedAnalysis.count,
          deletedNotifications: deletedNotifications.count,
          cutoffDate: cutoffDate.toISOString()
        });
      });
    } catch (error) {
      this.logger.error('Failed to cleanup old data', error as Error);
      throw error;
    }
  }
}

// 导出单例实例
export const db = DatabaseConnection.getInstance();