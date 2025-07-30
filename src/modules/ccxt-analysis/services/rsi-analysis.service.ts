import { Injectable, Logger } from '@nestjs/common';
import { CCXTDataService } from './ccxt-data.service';
import { IOHLCVData, IRSIData, IRSIAnalysis, IMultiTimeframeRSI } from '../interfaces';
import { IMarketDataCollection } from 'src/shared/interfaces/analysis.interface';

/**
 * RSI分析服务
 * 基于CCXT获取的价格数据计算RSI技术指标
 */
@Injectable()
export class RSIAnalysisService {
  private readonly logger = new Logger(RSIAnalysisService.name);

  constructor(private readonly ccxtDataService: CCXTDataService) {}

  /**
   * 计算RSI指标
   * @param prices 收盘价数组
   * @param period RSI周期，默认14
   */
  private calculateRSI(prices: number[], period: number = 14): number[] {
    if (prices.length < period + 1) {
      throw new Error(`价格数据不足，需要至少 ${period + 1} 个数据点`);
    }

    const rsiValues: number[] = [];
    const gains: number[] = [];
    const losses: number[] = [];

    // 计算价格变化
    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }

    // 计算初始平均增益和损失（简单移动平均）
    let avgGain = gains.slice(0, period).reduce((sum, gain) => sum + gain, 0) / period;
    let avgLoss = losses.slice(0, period).reduce((sum, loss) => sum + loss, 0) / period;

    // 计算第一个RSI值
    let rs = avgGain / (avgLoss || 0.0001); // 避免除零
    rsiValues.push(100 - (100 / (1 + rs)));

    // 使用Wilder的平滑方法计算后续RSI值
    for (let i = period; i < gains.length; i++) {
      avgGain = ((avgGain * (period - 1)) + gains[i]) / period;
      avgLoss = ((avgLoss * (period - 1)) + losses[i]) / period;
      
      rs = avgGain / (avgLoss || 0.0001);
      rsiValues.push(100 - (100 / (1 + rs)));
    }

    return rsiValues;
  }

  /**
   * 解析RSI信号
   * @param rsi RSI值
   */
  private parseRSISignal(rsi: number): {
    signal: 'oversold' | 'overbought' | 'neutral' | 'buy' | 'sell';
    strength: 'weak' | 'moderate' | 'strong';
  } {
    let signal: 'oversold' | 'overbought' | 'neutral' | 'buy' | 'sell';
    let strength: 'weak' | 'moderate' | 'strong';

    if (rsi <= 30) {
      signal = 'oversold';
      strength = rsi <= 20 ? 'strong' : 'moderate';
    } else if (rsi >= 70) {
      signal = 'overbought';
      strength = rsi >= 80 ? 'strong' : 'moderate';
    } else if (rsi < 45) {
      signal = 'sell';
      strength = 'weak';
    } else if (rsi > 55) {
      signal = 'buy';
      strength = 'weak';
    } else {
      signal = 'neutral';
      strength = 'weak';
    }

    return { signal, strength };
  }

  /**
   * 获取RSI分析 - 使用预获取数据的重载方法
   * @param symbol 交易对符号
   * @param timeframe 时间周期
   * @param period RSI周期
   * @param marketData 预获取的市场数据
   */
  async getRSIAnalysisWithPrefetchedData(
    symbol: string,
    timeframe: string = '1h',
    period: number = 14,
    marketData: IMarketDataCollection,
  ): Promise<IRSIAnalysis> {
    try {
      this.logger.log(`使用预获取数据进行RSI分析: ${symbol}, 时间周期: ${timeframe}, RSI周期: ${period}`);

      // 从预获取数据中获取对应时间周期的数据
      const ohlcvData = marketData.timeframes[timeframe as keyof typeof marketData.timeframes];

      if (!ohlcvData || ohlcvData.length < period + 1) {
        throw new Error(`预获取数据不足，需要至少 ${period + 1} 个数据点进行RSI计算`);
      }

      // 提取收盘价
      const closePrices = ohlcvData.map(candle => candle.close);
      
      // 计算RSI
      const rsiValues = this.calculateRSI(closePrices, period);
      
      // 获取最新的RSI数据
      const latestIndex = rsiValues.length - 1;
      const previousIndex = Math.max(0, latestIndex - 1);

      const currentRSIValue = rsiValues[latestIndex];
      const previousRSIValue = rsiValues[previousIndex];

      const currentSignal = this.parseRSISignal(currentRSIValue);
      const previousSignal = this.parseRSISignal(previousRSIValue);

      const currentRSI: IRSIData = {
        timestamp: ohlcvData[ohlcvData.length - 1].timestamp,
        datetime: ohlcvData[ohlcvData.length - 1].datetime,
        rsi: currentRSIValue,
        signal: currentSignal.signal,
        strength: currentSignal.strength,
      };

      const previousRSI: IRSIData = {
        timestamp: ohlcvData[ohlcvData.length - 2]?.timestamp || currentRSI.timestamp,
        datetime: ohlcvData[ohlcvData.length - 2]?.datetime || currentRSI.datetime,
        rsi: previousRSIValue,
        signal: previousSignal.signal,
        strength: previousSignal.strength,
      };

      // 确定趋势
      const trend = this.determineTrend(currentRSIValue, previousRSIValue);
      
      // 生成交易信号
      const signal = this.generateTradingSignal(currentRSI, previousRSI);
      
      // 检测背离
      const divergence = this.detectDivergence(
        ohlcvData.slice(-10),
        rsiValues.slice(-10)
      );

      // 生成建议和风险评估
      const { recommendation, riskLevel } = this.generateRecommendation(
        currentRSI,
        trend,
        signal,
        divergence
      );

      const analysis: IRSIAnalysis = {
        symbol,
        period,
        currentRSI,
        previousRSI,
        trend,
        signal,
        divergence,
        recommendation,
        riskLevel,
      };

      this.logger.log(`使用预获取数据的RSI分析完成: ${symbol}, 当前RSI: ${currentRSIValue.toFixed(2)}, 信号: ${signal}`);

      return analysis;
    } catch (error) {
      this.logger.error(`使用预获取数据的RSI分析失败: ${error.message}`);
      throw new Error(`使用预获取数据的RSI分析失败: ${error.message}`);
    }
  }

  /**
   * 获取RSI分析
   * @param symbol 交易对符号
   * @param timeframe 时间周期
   * @param period RSI周期
   * @param limit 数据限制
   * @param exchange 交易所名称
   */
  async getRSIAnalysis(
    symbol: string,
    timeframe: string = '1h',
    period: number = 14,
    limit: number = 100,
    exchange: string = 'binance'
  ): Promise<IRSIAnalysis> {
    try {
      this.logger.log(`开始RSI分析: ${symbol}, 时间周期: ${timeframe}, RSI周期: ${period}`);

      // 获取OHLCV数据
      const ohlcvData = await this.ccxtDataService.getOHLCVData(
        symbol, 
        timeframe, 
        limit, 
        exchange
      );

      if (ohlcvData.length < period + 1) {
        throw new Error(`数据不足，需要至少 ${period + 1} 个数据点进行RSI计算`);
      }

      // 提取收盘价
      const closePrices = ohlcvData.map(candle => candle.close);
      
      // 计算RSI
      const rsiValues = this.calculateRSI(closePrices, period);
      
      // 获取最新的RSI数据
      const latestIndex = rsiValues.length - 1;
      const previousIndex = Math.max(0, latestIndex - 1);

      const currentRSIValue = rsiValues[latestIndex];
      const previousRSIValue = rsiValues[previousIndex];

      const currentSignal = this.parseRSISignal(currentRSIValue);
      const previousSignal = this.parseRSISignal(previousRSIValue);

      const currentRSI: IRSIData = {
        timestamp: ohlcvData[ohlcvData.length - 1].timestamp,
        datetime: ohlcvData[ohlcvData.length - 1].datetime,
        rsi: currentRSIValue,
        signal: currentSignal.signal,
        strength: currentSignal.strength,
      };

      const previousRSI: IRSIData = {
        timestamp: ohlcvData[ohlcvData.length - 2]?.timestamp || currentRSI.timestamp,
        datetime: ohlcvData[ohlcvData.length - 2]?.datetime || currentRSI.datetime,
        rsi: previousRSIValue,
        signal: previousSignal.signal,
        strength: previousSignal.strength,
      };

      // 确定趋势
      const trend = this.determineTrend(currentRSIValue, previousRSIValue);
      
      // 生成交易信号
      const signal = this.generateTradingSignal(currentRSI, previousRSI);
      
      // 检测背离
      const divergence = this.detectDivergence(
        ohlcvData.slice(-10),
        rsiValues.slice(-10)
      );

      // 生成建议和风险评估
      const { recommendation, riskLevel } = this.generateRecommendation(
        currentRSI,
        trend,
        signal,
        divergence
      );

      const analysis: IRSIAnalysis = {
        symbol,
        period,
        currentRSI,
        previousRSI,
        trend,
        signal,
        divergence,
        recommendation,
        riskLevel,
      };

      this.logger.log(`RSI分析完成: ${symbol}, 当前RSI: ${currentRSIValue.toFixed(2)}, 信号: ${signal}`);

      return analysis;
    } catch (error) {
      this.logger.error(`RSI分析失败: ${error.message}`);
      throw new Error(`RSI分析失败: ${error.message}`);
    }
  }

  /**
   * 获取多个时间周期的RSI分析
   * @param symbol 交易对符号
   * @param timeframes 时间周期数组
   * @param period RSI周期
   * @param exchange 交易所名称
   */
  async getMultiTimeframeRSI(
    symbol: string,
    timeframes: string[] = ['1h', '4h', '1d'],
    period: number = 14,
    exchange: string = 'binance'
  ): Promise<IMultiTimeframeRSI> {
    try {
      this.logger.log(`多时间周期RSI分析: ${symbol}, 时间周期: ${timeframes.join(', ')}`);

      const results: IMultiTimeframeRSI = {};

      for (const timeframe of timeframes) {
        try {
          const analysis = await this.getRSIAnalysis(symbol, timeframe, period, 100, exchange);
          results[timeframe] = analysis;
          
          // 避免请求过快
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          this.logger.warn(`${timeframe} 时间周期RSI分析失败: ${error.message}`);
        }
      }

      return results;
    } catch (error) {
      this.logger.error(`多时间周期RSI分析失败: ${error.message}`);
      throw new Error(`多时间周期RSI分析失败: ${error.message}`);
    }
  }

  /**
   * 获取RSI历史数据
   * @param symbol 交易对符号
   * @param timeframe 时间周期
   * @param period RSI周期
   * @param limit 数据限制
   * @param exchange 交易所名称
   */
  async getRSIHistory(
    symbol: string,
    timeframe: string = '1h',
    period: number = 14,
    limit: number = 100,
    exchange: string = 'binance'
  ): Promise<IRSIData[]> {
    try {
      this.logger.log(`获取RSI历史数据: ${symbol}, 数据量: ${limit}`);

      const ohlcvData = await this.ccxtDataService.getOHLCVData(
        symbol, 
        timeframe, 
        limit, 
        exchange
      );

      const closePrices = ohlcvData.map(candle => candle.close);
      const rsiValues = this.calculateRSI(closePrices, period);

      const rsiHistory: IRSIData[] = [];

      // 从有RSI值的数据开始
      for (let i = 0; i < rsiValues.length; i++) {
        const dataIndex = i + period; // RSI值对应的原始数据索引
        const rsiValue = rsiValues[i];
        const signal = this.parseRSISignal(rsiValue);

        rsiHistory.push({
          timestamp: ohlcvData[dataIndex].timestamp,
          datetime: ohlcvData[dataIndex].datetime,
          rsi: rsiValue,
          signal: signal.signal,
          strength: signal.strength,
        });
      }

      this.logger.log(`RSI历史数据获取完成: ${rsiHistory.length} 个数据点`);
      return rsiHistory;
    } catch (error) {
      this.logger.error(`获取RSI历史数据失败: ${error.message}`);
      throw new Error(`获取RSI历史数据失败: ${error.message}`);
    }
  }

  /**
   * 确定RSI趋势
   * @param currentRSI 当前RSI值
   * @param previousRSI 之前RSI值
   */
  private determineTrend(currentRSI: number, previousRSI: number): 'bullish' | 'bearish' | 'neutral' {
    const diff = currentRSI - previousRSI;
    
    if (Math.abs(diff) < 2) {
      return 'neutral';
    }
    
    return diff > 0 ? 'bullish' : 'bearish';
  }

  /**
   * 生成交易信号
   * @param currentRSI 当前RSI数据
   * @param previousRSI 之前RSI数据
   */
  private generateTradingSignal(
    currentRSI: IRSIData,
    previousRSI: IRSIData
  ): 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell' {
    const currentValue = currentRSI.rsi;
    const previousValue = previousRSI.rsi;

    // 强烈超卖反弹信号
    if (previousValue <= 20 && currentValue > 30) {
      return 'strong_buy';
    }
    
    // 超卖买入信号
    if (currentValue <= 30 && currentValue > previousValue) {
      return 'buy';
    }

    // 强烈超买下跌信号
    if (previousValue >= 80 && currentValue < 70) {
      return 'strong_sell';
    }

    // 超买卖出信号
    if (currentValue >= 70 && currentValue < previousValue) {
      return 'sell';
    }

    // 中性区域
    if (currentValue > 30 && currentValue < 70) {
      return 'hold';
    }

    return 'hold';
  }

  /**
   * 检测价格与RSI背离
   * @param priceData 价格数据
   * @param rsiData RSI数据
   */
  private detectDivergence(
    priceData: IOHLCVData[],
    rsiData: number[]
  ): 'bullish' | 'bearish' | null {
    if (priceData.length < 3 || rsiData.length < 3) {
      return null;
    }

    const recentPrices = priceData.slice(-3).map(d => d.close);
    const recentRSI = rsiData.slice(-3);

    // 检测看涨背离：价格新低，RSI未创新低
    const priceNewLow = recentPrices[2] < Math.min(...recentPrices.slice(0, 2));
    const rsiNotNewLow = recentRSI[2] > Math.min(...recentRSI.slice(0, 2));

    if (priceNewLow && rsiNotNewLow) {
      return 'bullish';
    }

    // 检测看跌背离：价格新高，RSI未创新高
    const priceNewHigh = recentPrices[2] > Math.max(...recentPrices.slice(0, 2));
    const rsiNotNewHigh = recentRSI[2] < Math.max(...recentRSI.slice(0, 2));

    if (priceNewHigh && rsiNotNewHigh) {
      return 'bearish';
    }

    return null;
  }

  /**
   * 生成交易建议和风险评估
   * @param currentRSI 当前RSI数据
   * @param trend 趋势
   * @param signal 交易信号
   * @param divergence 背离情况
   */
  private generateRecommendation(
    currentRSI: IRSIData,
    trend: 'bullish' | 'bearish' | 'neutral',
    signal: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell',
    divergence: 'bullish' | 'bearish' | null
  ): { recommendation: string; riskLevel: 'low' | 'medium' | 'high' } {
    let recommendation = '';
    let riskLevel: 'low' | 'medium' | 'high' = 'medium';

    switch (signal) {
      case 'strong_buy':
        recommendation = `强烈买入信号！RSI从超卖区反弹至${currentRSI.rsi.toFixed(2)}，建议逢低买入。`;
        riskLevel = 'low';
        break;
      case 'buy':
        recommendation = `买入信号。RSI为${currentRSI.rsi.toFixed(2)}，处于超卖区域，可考虑分批买入。`;
        riskLevel = 'medium';
        break;
      case 'sell':
        recommendation = `卖出信号。RSI为${currentRSI.rsi.toFixed(2)}，处于超买区域，建议获利了结。`;
        riskLevel = 'medium';
        break;
      case 'strong_sell':
        recommendation = `强烈卖出信号！RSI从超买区回落至${currentRSI.rsi.toFixed(2)}，建议及时止盈。`;
        riskLevel = 'low';
        break;
      default:
        recommendation = `持有观望。RSI为${currentRSI.rsi.toFixed(2)}，处于中性区域，建议等待明确信号。`;
        riskLevel = 'high';
    }

    // 考虑背离情况
    if (divergence === 'bullish') {
      recommendation += ' 发现看涨背离，增强买入信号。';
      riskLevel = riskLevel === 'high' ? 'medium' : 'low';
    } else if (divergence === 'bearish') {
      recommendation += ' 发现看跌背离，增强卖出信号。';
      riskLevel = riskLevel === 'high' ? 'medium' : 'low';
    }

    // 考虑趋势
    if (trend === 'bullish') {
      recommendation += ' RSI呈上升趋势。';
    } else if (trend === 'bearish') {
      recommendation += ' RSI呈下降趋势。';
    }

    return { recommendation, riskLevel };
  }
} 