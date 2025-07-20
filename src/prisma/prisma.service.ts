import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: ['info', 'warn', 'error'],
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('成功连接到数据库');
    } catch (error) {
      this.logger.error('数据库连接失败:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
      this.logger.log('数据库连接已断开');
    } catch (error) {
      this.logger.error('断开数据库连接时出错:', error);
    }
  }

  /**
   * 清理所有数据（仅用于测试环境）
   */
  async cleanDatabase() {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('此方法仅允许在测试环境中使用');
    }

    await this.strategySignal.deleteMany();
    await this.analysisResult.deleteMany();
    await this.klineData.deleteMany();
    await this.coinConfig.deleteMany();
    
    this.logger.log('数据库已清理');
  }

  /**
   * 检查数据库连接
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.error('数据库健康检查失败:', error);
      return false;
    }
  }

  /**
   * 获取数据库统计信息
   */
  async getDatabaseStats() {
    const [
      coinConfigCount,
      klineDataCount,
      analysisResultCount,
      strategySignalCount,
    ] = await Promise.all([
      this.coinConfig.count(),
      this.klineData.count(),
      this.analysisResult.count(),
      this.strategySignal.count(),
    ]);

    return {
      coinConfigs: coinConfigCount,
      klineData: klineDataCount,
      analysisResults: analysisResultCount,
      strategySignals: strategySignalCount,
    };
  }
} 