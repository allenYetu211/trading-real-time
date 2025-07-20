import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { KlineData } from 'src/shared/interfaces';
import { IntervalType } from 'src/shared/enums';

@Injectable()
export class DataStorageService {
  private readonly logger = new Logger(DataStorageService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 批量保存K线数据
   */
  async saveKlineData(klineDataList: KlineData[]): Promise<{ count: number }> {
    try {
      const result = await this.prisma.klineData.createMany({
        data: klineDataList.map(kline => ({
          symbol: kline.symbol,
          interval: kline.interval,
          openTime: BigInt(kline.openTime),
          closeTime: BigInt(kline.closeTime),
          openPrice: kline.openPrice,
          highPrice: kline.highPrice,
          lowPrice: kline.lowPrice,
          closePrice: kline.closePrice,
          volume: kline.volume,
          quoteAssetVolume: kline.quoteAssetVolume,
          numberOfTrades: kline.numberOfTrades,
          takerBuyBaseAssetVolume: kline.takerBuyBaseAssetVolume,
          takerBuyQuoteAssetVolume: kline.takerBuyQuoteAssetVolume,
        })),
        skipDuplicates: true, // 跳过重复数据
      });

      this.logger.log(`成功保存 ${result.count} 条K线数据`);
      return result;
    } catch (error) {
      this.logger.error('保存K线数据失败:', error);
      throw error;
    }
  }

  /**
   * 保存单条K线数据
   */
  async saveKline(klineData: KlineData): Promise<any> {
    try {
      return await this.prisma.klineData.upsert({
        where: {
          symbol_interval_openTime: {
            symbol: klineData.symbol,
            interval: klineData.interval,
            openTime: BigInt(klineData.openTime),
          },
        },
        update: {
          closeTime: BigInt(klineData.closeTime),
          openPrice: klineData.openPrice,
          highPrice: klineData.highPrice,
          lowPrice: klineData.lowPrice,
          closePrice: klineData.closePrice,
          volume: klineData.volume,
          quoteAssetVolume: klineData.quoteAssetVolume,
          numberOfTrades: klineData.numberOfTrades,
          takerBuyBaseAssetVolume: klineData.takerBuyBaseAssetVolume,
          takerBuyQuoteAssetVolume: klineData.takerBuyQuoteAssetVolume,
        },
        create: {
          symbol: klineData.symbol,
          interval: klineData.interval,
          openTime: BigInt(klineData.openTime),
          closeTime: BigInt(klineData.closeTime),
          openPrice: klineData.openPrice,
          highPrice: klineData.highPrice,
          lowPrice: klineData.lowPrice,
          closePrice: klineData.closePrice,
          volume: klineData.volume,
          quoteAssetVolume: klineData.quoteAssetVolume,
          numberOfTrades: klineData.numberOfTrades,
          takerBuyBaseAssetVolume: klineData.takerBuyBaseAssetVolume,
          takerBuyQuoteAssetVolume: klineData.takerBuyQuoteAssetVolume,
        },
      });
    } catch (error) {
      this.logger.error('保存K线数据失败:', error);
      throw error;
    }
  }

  /**
   * 查询K线数据
   */
  async getKlineData(
    symbol: string,
    interval: IntervalType,
    limit: number = 100,
    startTime?: number,
    endTime?: number
  ): Promise<KlineData[]> {
    const where: any = {
      symbol,
      interval,
    };

    if (startTime) {
      where.openTime = { gte: BigInt(startTime) };
    }

    if (endTime) {
      where.openTime = { ...where.openTime, lte: BigInt(endTime) };
    }

    const results = await this.prisma.klineData.findMany({
      where,
      orderBy: { openTime: 'desc' },
      take: parseInt(limit.toString()),
    });

    return results.map(result => ({
      symbol: result.symbol,
      interval: result.interval,
      openTime: Number(result.openTime),
      closeTime: Number(result.closeTime),
      openPrice: Number(result.openPrice),
      highPrice: Number(result.highPrice),
      lowPrice: Number(result.lowPrice),
      closePrice: Number(result.closePrice),
      volume: Number(result.volume),
      quoteAssetVolume: Number(result.quoteAssetVolume),
      numberOfTrades: result.numberOfTrades,
      takerBuyBaseAssetVolume: Number(result.takerBuyBaseAssetVolume),
      takerBuyQuoteAssetVolume: Number(result.takerBuyQuoteAssetVolume),
    }));
  }

  /**
   * 获取最新的K线数据
   */
  async getLatestKline(symbol: string, interval: IntervalType): Promise<KlineData | null> {
    const result = await this.prisma.klineData.findFirst({
      where: { symbol, interval },
      orderBy: { openTime: 'desc' },
    });

    if (!result) return null;

    return {
      symbol: result.symbol,
      interval: result.interval,
      openTime: Number(result.openTime),
      closeTime: Number(result.closeTime),
      openPrice: Number(result.openPrice),
      highPrice: Number(result.highPrice),
      lowPrice: Number(result.lowPrice),
      closePrice: Number(result.closePrice),
      volume: Number(result.volume),
      quoteAssetVolume: Number(result.quoteAssetVolume),
      numberOfTrades: result.numberOfTrades,
      takerBuyBaseAssetVolume: Number(result.takerBuyBaseAssetVolume),
      takerBuyQuoteAssetVolume: Number(result.takerBuyQuoteAssetVolume),
    };
  }

  /**
   * 删除旧的K线数据
   */
  async cleanupOldData(symbol: string, interval: IntervalType, keepDays: number = 30): Promise<number> {
    const cutoffTime = Date.now() - (keepDays * 24 * 60 * 60 * 1000);
    
    const result = await this.prisma.klineData.deleteMany({
      where: {
        symbol,
        interval,
        openTime: {
          lt: BigInt(cutoffTime),
        },
      },
    });

    this.logger.log(`清理了 ${result.count} 条过期K线数据 (${symbol} ${interval})`);
    return result.count;
  }

  /**
   * 获取K线数据统计
   */
  async getKlineStats(symbol?: string, interval?: IntervalType) {
    const where: any = {};
    if (symbol) where.symbol = symbol;
    if (interval) where.interval = interval;

    const [count, firstKline, lastKline] = await Promise.all([
      this.prisma.klineData.count({ where }),
      this.prisma.klineData.findFirst({
        where,
        orderBy: { openTime: 'asc' },
        select: { openTime: true, symbol: true, interval: true },
      }),
      this.prisma.klineData.findFirst({
        where,
        orderBy: { openTime: 'desc' },
        select: { openTime: true, symbol: true, interval: true },
      }),
    ]);

    return {
      totalCount: count,
      firstKlineTime: firstKline ? Number(firstKline.openTime) : null,
      lastKlineTime: lastKline ? Number(lastKline.openTime) : null,
      symbol: symbol || 'all',
      interval: interval || 'all',
    };
  }
} 