import { Injectable, Logger } from '@nestjs/common';
import { CCXTDataService } from './ccxt-data.service';
import { MathUtil } from 'src/shared/utils/math.util';
import { IOHLCVData, IEMAAnalysis } from '../interfaces';

/**
 * EMA分析服务
 * 使用CCXT数据计算准确的EMA指标
 */
@Injectable()
export class EMAAnalysisService {
  private readonly logger = new Logger(EMAAnalysisService.name);

  constructor(private readonly ccxtDataService: CCXTDataService) {}

  /**
   * 分析EMA指标
   * @param symbol 交易对符号
   * @param timeframe 时间周期
   * @param periods EMA周期数组
   * @param limit 数据条数
   * @param exchange 交易所名称
   */
  async analyzeEMA(
    symbol: string,
    timeframe: string = '1d',
    periods: number[] = [20, 60, 120],
    limit: number = 1000,
    exchange: string = 'binance',
  ): Promise<IEMAAnalysis> {
    try {
      this.logger.log(`开始分析${symbol}的EMA指标，周期：${periods.join(',')}`);

      // 获取OHLCV数据
      const ohlcvData = await this.ccxtDataService.getOHLCVData(
        symbol,
        timeframe,
        limit,
        exchange,
      );

      if (ohlcvData.length < Math.max(...periods)) {
        throw new Error(`数据不足，需要至少${Math.max(...periods)}根K线`);
      }

      // 提取收盘价数组
      const closePrices = ohlcvData.map(candle => candle.close);
      const currentPrice = closePrices[closePrices.length - 1];

      // 计算各周期EMA
      const emaResults: Record<string, number> = {};
      for (const period of periods) {
        const emaValues = MathUtil.calculateEMA(closePrices, period);
        emaResults[`ema${period}`] = emaValues[emaValues.length - 1];
      }

      // 分析趋势
      const trend = this.analyzeTrend(
        currentPrice,
        emaResults.ema20 || 0,
        emaResults.ema60 || 0,
        emaResults.ema120 || 0,
      );

      // 计算趋势置信度
      const trendConfidence = this.calculateTrendConfidence(
        currentPrice,
        emaResults.ema20 || 0,
        emaResults.ema60 || 0,
        emaResults.ema120 || 0,
        closePrices,
      );

      const result: IEMAAnalysis = {
        ema20: emaResults.ema20 || 0,
        ema60: emaResults.ema60 || 0,
        ema120: emaResults.ema120 || 0,
        currentPrice,
        trend,
        trendConfidence,
      };

      this.logger.log(`EMA分析完成：${JSON.stringify(result)}`);
      return result;

    } catch (error) {
      this.logger.error(`EMA分析失败: ${error.message}`);
      throw new Error(`EMA分析失败: ${error.message}`);
    }
  }

  /**
   * 获取详细的EMA数据用于调试
   * @param symbol 交易对符号
   * @param timeframe 时间周期
   * @param periods EMA周期数组
   * @param limit 数据条数
   * @param exchange 交易所名称
   */
  async getDetailedEMAData(
    symbol: string,
    timeframe: string = '1d',
    periods: number[] = [20, 60, 120],
    limit: number = 1000,
    exchange: string = 'binance',
  ) {
    try {
      // 获取OHLCV数据
      const ohlcvData = await this.ccxtDataService.getOHLCVData(
        symbol,
        timeframe,
        limit,
        exchange,
      );

      const closePrices = ohlcvData.map(candle => candle.close);

      // 计算所有EMA
      const emaResults: Record<string, number[]> = {};
      const latestEMA: Record<string, number> = {};

      for (const period of periods) {
        const emaValues = MathUtil.calculateEMA(closePrices, period);
        emaResults[`ema${period}`] = emaValues;
        latestEMA[`ema${period}`] = emaValues[emaValues.length - 1];
      }

      return {
        symbol,
        timeframe,
        exchange,
        dataSource: 'ccxt',
        totalCount: ohlcvData.length,
        latestPrice: closePrices[closePrices.length - 1],
        recent10Prices: closePrices.slice(-10),
        priceRange: {
          min: Math.min(...closePrices),
          max: Math.max(...closePrices),
        },
        emaResults: latestEMA,
        fullEMAHistory: emaResults,
        firstDataPoint: {
          timestamp: ohlcvData[0].timestamp,
          datetime: ohlcvData[0].datetime,
          price: ohlcvData[0].close,
        },
        lastDataPoint: {
          timestamp: ohlcvData[ohlcvData.length - 1].timestamp,
          datetime: ohlcvData[ohlcvData.length - 1].datetime,
          price: ohlcvData[ohlcvData.length - 1].close,
        },
      };

    } catch (error) {
      this.logger.error(`获取详细EMA数据失败: ${error.message}`);
      throw new Error(`获取详细EMA数据失败: ${error.message}`);
    }
  }

  /**
   * 分析市场趋势
   * @param currentPrice 当前价格
   * @param ema20 EMA20值
   * @param ema60 EMA60值  
   * @param ema120 EMA120值
   */
  private analyzeTrend(
    currentPrice: number,
    ema20: number,
    ema60: number,
    ema120: number,
  ): 'UPTREND' | 'DOWNTREND' | 'RANGING' {
    // 多头排列：价格 > EMA20 > EMA60 > EMA120
    if (currentPrice > ema20 && ema20 > ema60 && ema60 > ema120) {
      return 'UPTREND';
    }
    
    // 空头排列：价格 < EMA20 < EMA60 < EMA120
    if (currentPrice < ema20 && ema20 < ema60 && ema60 < ema120) {
      return 'DOWNTREND';
    }

    // 其他情况视为震荡
    return 'RANGING';
  }

  /**
   * 计算趋势置信度
   * @param currentPrice 当前价格
   * @param ema20 EMA20值
   * @param ema60 EMA60值
   * @param ema120 EMA120值
   * @param priceHistory 价格历史数据
   */
  private calculateTrendConfidence(
    currentPrice: number,
    ema20: number,
    ema60: number,
    ema120: number,
    priceHistory: number[],
  ): number {
    let confidence = 0;

    // 基础得分：EMA排列的清晰度
    const emaSpread20_60 = Math.abs(ema20 - ema60) / Math.max(ema20, ema60);
    const emaSpread60_120 = Math.abs(ema60 - ema120) / Math.max(ema60, ema120);
    const emaSpread = (emaSpread20_60 + emaSpread60_120) / 2;
    
    confidence += Math.min(emaSpread * 1000, 40); // 最高40分

    // 价格与EMA的距离
    const priceEmaDistance = Math.abs(currentPrice - ema20) / ema20;
    if (priceEmaDistance > 0.02) { // 价格与EMA20距离超过2%
      confidence += 20;
    }

    // 趋势持续性：检查最近几根K线的趋势一致性
    const recentPrices = priceHistory.slice(-10);
    const trend = this.analyzeTrend(currentPrice, ema20, ema60, ema120);
    
    let consistentBars = 0;
    for (let i = 1; i < recentPrices.length; i++) {
      const prevPrice = recentPrices[i - 1];
      const currPrice = recentPrices[i];
      
      if (trend === 'UPTREND' && currPrice > prevPrice) {
        consistentBars++;
      } else if (trend === 'DOWNTREND' && currPrice < prevPrice) {
        consistentBars++;
      }
    }
    
    confidence += (consistentBars / recentPrices.length) * 40; // 最高40分

    return Math.min(Math.round(confidence), 100);
  }

  /**
   * 批量计算多个交易对的EMA
   * @param symbols 交易对数组
   * @param timeframe 时间周期
   * @param periods EMA周期
   * @param exchange 交易所名称
   */
  async batchAnalyzeEMA(
    symbols: string[],
    timeframe: string = '1d',
    periods: number[] = [20, 60, 120],
    exchange: string = 'binance',
  ): Promise<Record<string, IEMAAnalysis>> {
    const results: Record<string, IEMAAnalysis> = {};

    // 并行处理多个交易对
    const promises = symbols.map(async (symbol) => {
      try {
        const analysis = await this.analyzeEMA(symbol, timeframe, periods, 1000, exchange);
        results[symbol] = analysis;
      } catch (error) {
        this.logger.error(`分析${symbol}失败: ${error.message}`);
        // 继续处理其他交易对，不中断整个批处理
      }
    });

    await Promise.allSettled(promises);
    return results;
  }
} 