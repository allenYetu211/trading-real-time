import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateSignalDto, SignalQueryDto } from '../dto';
import { StrategySignal } from '../interfaces/strategy.interface';

@Injectable()
export class StrategySignalService {
  private readonly logger = new Logger(StrategySignalService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建策略信号
   */
  async createSignal(dto: CreateSignalDto): Promise<StrategySignal> {
    this.logger.debug(`创建策略信号: ${dto.symbol} ${dto.signal} ${dto.side}`);

    const signal = await this.prisma.strategySignalRecord.create({
      data: {
        strategyId: dto.strategyId,
        symbol: dto.symbol,
        interval: dto.interval,
        signal: dto.signal,
        side: dto.side,
        price: dto.price,
        quantity: dto.quantity || null,
        confidence: dto.confidence,
        stopLoss: dto.stopLoss || null,
        takeProfit: dto.takeProfit || null,
        reason: dto.reason,
        timestamp: BigInt(dto.timestamp),
      },
    });

    return this.mapToInterface(signal);
  }

  /**
   * 查询策略信号
   */
  async getSignals(query: SignalQueryDto): Promise<{
    signals: StrategySignal[];
    total: number;
    pagination: {
      limit: number;
      hasNext: boolean;
    };
  }> {
    const where: any = {};
    
    if (query.symbol) where.symbol = query.symbol;
    if (query.interval) where.interval = query.interval;
    if (query.signal) where.signal = query.signal;
    if (query.strategyId) where.strategyId = query.strategyId;
    
    if (query.startTime || query.endTime) {
      where.timestamp = {};
      if (query.startTime) where.timestamp.gte = BigInt(query.startTime);
      if (query.endTime) where.timestamp.lte = BigInt(query.endTime);
    }

    const [signals, total] = await Promise.all([
      this.prisma.strategySignalRecord.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: query.limit,
        include: {
          strategy: {
            select: {
              name: true,
              type: true,
            },
          },
        },
      }),
      this.prisma.strategySignalRecord.count({ where }),
    ]);

    return {
      signals: signals.map(this.mapToInterface),
      total,
      pagination: {
        limit: query.limit || 50,
        hasNext: signals.length === query.limit,
      },
    };
  }

  /**
   * 获取策略信号统计
   */
  async getSignalStats(params?: {
    strategyId?: number;
    symbol?: string;
    interval?: string;
    timeRange?: '1d' | '7d' | '30d';
  }) {
    const where: any = {};
    
    if (params?.strategyId) where.strategyId = params.strategyId;
    if (params?.symbol) where.symbol = params.symbol;
    if (params?.interval) where.interval = params.interval;
    
    // 时间范围过滤
    if (params?.timeRange) {
      const now = new Date();
      const timeRangeMap = {
        '1d': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000,
      };
      
      const startTime = new Date(now.getTime() - timeRangeMap[params.timeRange]);
      where.createdAt = { gte: startTime };
    }

    const [
      totalSignals,
      buySignals,
      sellSignals,
      neutralSignals,
      executedSignals,
      avgConfidence,
    ] = await Promise.all([
      this.prisma.strategySignalRecord.count({ where }),
      this.prisma.strategySignalRecord.count({ where: { ...where, signal: 'BUY' } }),
      this.prisma.strategySignalRecord.count({ where: { ...where, signal: 'SELL' } }),
      this.prisma.strategySignalRecord.count({ where: { ...where, signal: 'NEUTRAL' } }),
      this.prisma.strategySignalRecord.count({ where: { ...where, executed: true } }),
      this.prisma.strategySignalRecord.aggregate({
        where,
        _avg: { confidence: true },
      }),
    ]);

    return {
      totalSignals,
      signalDistribution: {
        buy: buySignals,
        sell: sellSignals,
        neutral: neutralSignals,
      },
      executionRate: totalSignals > 0 ? (executedSignals / totalSignals * 100) : 0,
      averageConfidence: avgConfidence._avg.confidence || 0,
      timestamp: Date.now(),
    };
  }

  /**
   * 标记信号为已执行
   */
  async markSignalExecuted(signalId: number): Promise<StrategySignal> {
    this.logger.log(`标记信号已执行: ${signalId}`);

    const signal = await this.prisma.strategySignalRecord.update({
      where: { id: signalId },
      data: {
        executed: true,
        executedAt: new Date(),
      },
    });

    return this.mapToInterface(signal);
  }

  /**
   * 获取最新信号
   */
  async getLatestSignals(limit: number = 10): Promise<StrategySignal[]> {
    const signals = await this.prisma.strategySignalRecord.findMany({
      orderBy: { timestamp: 'desc' },
      take: limit,
      include: {
        strategy: {
          select: {
            name: true,
            type: true,
          },
        },
      },
    });

    return signals.map(this.mapToInterface);
  }

  /**
   * 获取指定策略的信号
   */
  async getStrategySignals(strategyId: number, limit: number = 50): Promise<StrategySignal[]> {
    const signals = await this.prisma.strategySignalRecord.findMany({
      where: { strategyId },
      orderBy: { timestamp: 'desc' },
      take: limit,
      include: {
        strategy: {
          select: {
            name: true,
            type: true,
          },
        },
      },
    });

    return signals.map(this.mapToInterface);
  }

  /**
   * 删除旧信号
   */
  async cleanupOldSignals(daysToKeep: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.prisma.strategySignalRecord.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    this.logger.log(`清理了 ${result.count} 条旧信号记录`);
    return result.count;
  }

  /**
   * 数据库模型转换为接口
   */
  private mapToInterface(signal: any): StrategySignal {
    return {
      id: signal.id,
      strategyId: signal.strategyId,
      symbol: signal.symbol,
      interval: signal.interval,
      signal: signal.signal,
      side: signal.side,
      price: Number(signal.price),
      quantity: signal.quantity ? Number(signal.quantity) : undefined,
      confidence: Number(signal.confidence),
      stopLoss: signal.stopLoss ? Number(signal.stopLoss) : undefined,
      takeProfit: signal.takeProfit ? Number(signal.takeProfit) : undefined,
      reason: signal.reason,
      timestamp: Number(signal.timestamp),
      executed: signal.executed,
      executedAt: signal.executedAt,
      createdAt: signal.createdAt,
    };
  }
} 