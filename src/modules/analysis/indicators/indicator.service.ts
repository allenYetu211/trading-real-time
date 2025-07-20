import { Injectable, Logger } from '@nestjs/common';
import { KlineData } from 'src/shared/interfaces';
import { MathUtil } from 'src/shared/utils';

export interface IndicatorResult {
  timestamp: number;
  value: number | { [key: string]: number };
}

export interface MacdResult extends IndicatorResult {
  value: {
    macd: number;
    signal: number;
    histogram: number;
  };
}

export interface BollingerBandsResult extends IndicatorResult {
  value: {
    upper: number;
    middle: number;
    lower: number;
  };
}

@Injectable()
export class IndicatorService {
  private readonly logger = new Logger(IndicatorService.name);

  /**
   * 计算简单移动平均线 (SMA)
   */
  calculateSMA(data: KlineData[], period: number): IndicatorResult[] {
    if (data.length < period) {
      return [];
    }

    const results: IndicatorResult[] = [];
    
    for (let i = period - 1; i < data.length; i++) {
      const slice = data.slice(i - period + 1, i + 1);
      const sum = slice.reduce((acc, item) => acc + item.closePrice, 0);
      const sma = sum / period;
      
      results.push({
        timestamp: data[i].openTime,
        value: sma,
      });
    }
    
    return results;
  }

  /**
   * 计算指数移动平均线 (EMA)
   */
  calculateEMA(data: KlineData[], period: number): IndicatorResult[] {
    if (data.length < period) {
      return [];
    }

    const results: IndicatorResult[] = [];
    const multiplier = 2 / (period + 1);
    
    // 第一个EMA值使用SMA
    const firstSlice = data.slice(0, period);
    const firstSMA = firstSlice.reduce((acc, item) => acc + item.closePrice, 0) / period;
    
    results.push({
      timestamp: data[period - 1].openTime,
      value: firstSMA,
    });

    // 计算后续EMA值
    for (let i = period; i < data.length; i++) {
      const previousEMA = results[results.length - 1].value as number;
      const currentPrice = data[i].closePrice;
      const ema = (currentPrice * multiplier) + (previousEMA * (1 - multiplier));
      
      results.push({
        timestamp: data[i].openTime,
        value: ema,
      });
    }
    
    return results;
  }

  /**
   * 计算MACD指标
   */
  calculateMACD(data: KlineData[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9): MacdResult[] {
    if (data.length < slowPeriod + signalPeriod) {
      return [];
    }

    // 计算快线和慢线EMA
    const fastEMA = this.calculateEMA(data, fastPeriod);
    const slowEMA = this.calculateEMA(data, slowPeriod);
    
    // 确保两个EMA数组长度一致
    const minLength = Math.min(fastEMA.length, slowEMA.length);
    const macdLine: IndicatorResult[] = [];
    
    for (let i = 0; i < minLength; i++) {
      const fastValue = fastEMA[fastEMA.length - minLength + i].value as number;
      const slowValue = slowEMA[slowEMA.length - minLength + i].value as number;
      const macdValue = fastValue - slowValue;
      
      macdLine.push({
        timestamp: slowEMA[slowEMA.length - minLength + i].timestamp,
        value: macdValue,
      });
    }
    
    // 计算信号线（MACD的EMA）
    const signalEMA = this.calculateEMAFromValues(
      macdLine.map(item => ({ timestamp: item.timestamp, value: item.value as number })),
      signalPeriod
    );
    
    // 生成最终MACD结果
    const results: MacdResult[] = [];
    const resultLength = Math.min(macdLine.length, signalEMA.length);
    
    for (let i = 0; i < resultLength; i++) {
      const macdValue = macdLine[macdLine.length - resultLength + i].value as number;
      const signalValue = signalEMA[signalEMA.length - resultLength + i].value as number;
      const histogram = macdValue - signalValue;
      
      results.push({
        timestamp: macdLine[macdLine.length - resultLength + i].timestamp,
        value: {
          macd: macdValue,
          signal: signalValue,
          histogram: histogram,
        },
      });
    }
    
    return results;
  }

  /**
   * 计算RSI指标
   */
  calculateRSI(data: KlineData[], period: number = 14): IndicatorResult[] {
    if (data.length < period + 1) {
      return [];
    }

    const results: IndicatorResult[] = [];
    const gains: number[] = [];
    const losses: number[] = [];
    
    // 计算价格变化
    for (let i = 1; i < data.length; i++) {
      const change = data[i].closePrice - data[i - 1].closePrice;
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }
    
    // 计算初始平均收益和损失
    let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
    let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
    
    // 计算第一个RSI
    let rs = avgGain / (avgLoss || 0.0001); // 避免除零
    let rsi = 100 - (100 / (1 + rs));
    
    results.push({
      timestamp: data[period].openTime,
      value: rsi,
    });
    
    // 计算后续RSI值
    for (let i = period; i < gains.length; i++) {
      avgGain = (avgGain * (period - 1) + gains[i]) / period;
      avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
      
      rs = avgGain / (avgLoss || 0.0001);
      rsi = 100 - (100 / (1 + rs));
      
      results.push({
        timestamp: data[i + 1].openTime,
        value: rsi,
      });
    }
    
    return results;
  }

  /**
   * 计算布林带指标
   */
  calculateBollingerBands(data: KlineData[], period: number = 20, stdDev: number = 2): BollingerBandsResult[] {
    if (data.length < period) {
      return [];
    }

    const results: BollingerBandsResult[] = [];
    
    for (let i = period - 1; i < data.length; i++) {
      const slice = data.slice(i - period + 1, i + 1);
      const prices = slice.map(item => item.closePrice);
      
      // 计算中轨（SMA）
      const middle = prices.reduce((a, b) => a + b, 0) / period;
      
      // 计算标准差
      const variance = prices.reduce((acc, price) => acc + Math.pow(price - middle, 2), 0) / period;
      const standardDeviation = Math.sqrt(variance);
      
      // 计算上轨和下轨
      const upper = middle + (standardDeviation * stdDev);
      const lower = middle - (standardDeviation * stdDev);
      
      results.push({
        timestamp: data[i].openTime,
        value: {
          upper,
          middle,
          lower,
        },
      });
    }
    
    return results;
  }

  /**
   * 计算随机指标 (KD)
   */
  calculateStochastic(data: KlineData[], kPeriod: number = 14, dPeriod: number = 3): IndicatorResult[] {
    if (data.length < kPeriod) {
      return [];
    }

    const kValues: IndicatorResult[] = [];
    
    // 计算%K值
    for (let i = kPeriod - 1; i < data.length; i++) {
      const slice = data.slice(i - kPeriod + 1, i + 1);
      const highestHigh = Math.max(...slice.map(item => item.highPrice));
      const lowestLow = Math.min(...slice.map(item => item.lowPrice));
      const currentClose = data[i].closePrice;
      
      const k = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
      
      kValues.push({
        timestamp: data[i].openTime,
        value: k,
      });
    }
    
    // 计算%D值（%K的移动平均）
    const results: IndicatorResult[] = [];
    
    for (let i = dPeriod - 1; i < kValues.length; i++) {
      const slice = kValues.slice(i - dPeriod + 1, i + 1);
      const d = slice.reduce((acc, item) => acc + (item.value as number), 0) / dPeriod;
      
      results.push({
        timestamp: kValues[i].timestamp,
        value: {
          k: kValues[i].value as number,
          d: d,
        },
      });
    }
    
    return results;
  }

  /**
   * 计算威廉姆斯%R指标
   */
  calculateWilliamsR(data: KlineData[], period: number = 14): IndicatorResult[] {
    if (data.length < period) {
      return [];
    }

    const results: IndicatorResult[] = [];
    
    for (let i = period - 1; i < data.length; i++) {
      const slice = data.slice(i - period + 1, i + 1);
      const highestHigh = Math.max(...slice.map(item => item.highPrice));
      const lowestLow = Math.min(...slice.map(item => item.lowPrice));
      const currentClose = data[i].closePrice;
      
      const williamsR = ((highestHigh - currentClose) / (highestHigh - lowestLow)) * -100;
      
      results.push({
        timestamp: data[i].openTime,
        value: williamsR,
      });
    }
    
    return results;
  }

  /**
   * 计算动量指标 (Momentum)
   */
  calculateMomentum(data: KlineData[], period: number = 10): IndicatorResult[] {
    if (data.length < period + 1) {
      return [];
    }

    const results: IndicatorResult[] = [];
    
    for (let i = period; i < data.length; i++) {
      const currentPrice = data[i].closePrice;
      const previousPrice = data[i - period].closePrice;
      const momentum = ((currentPrice - previousPrice) / previousPrice) * 100;
      
      results.push({
        timestamp: data[i].openTime,
        value: momentum,
      });
    }
    
    return results;
  }

  /**
   * 从数值数组计算EMA（内部辅助方法）
   */
  private calculateEMAFromValues(values: { timestamp: number; value: number }[], period: number): IndicatorResult[] {
    if (values.length < period) {
      return [];
    }

    const results: IndicatorResult[] = [];
    const multiplier = 2 / (period + 1);
    
    // 第一个EMA值使用SMA
    const firstSlice = values.slice(0, period);
    const firstSMA = firstSlice.reduce((acc, item) => acc + item.value, 0) / period;
    
    results.push({
      timestamp: values[period - 1].timestamp,
      value: firstSMA,
    });

    // 计算后续EMA值
    for (let i = period; i < values.length; i++) {
      const previousEMA = results[results.length - 1].value as number;
      const currentValue = values[i].value;
      const ema = (currentValue * multiplier) + (previousEMA * (1 - multiplier));
      
      results.push({
        timestamp: values[i].timestamp,
        value: ema,
      });
    }
    
    return results;
  }

  /**
   * 批量计算多个指标
   */
  calculateMultipleIndicators(data: KlineData[], indicators: string[]): { [key: string]: IndicatorResult[] } {
    const results: { [key: string]: IndicatorResult[] } = {};
    
    for (const indicator of indicators) {
      try {
        switch (indicator.toLowerCase()) {
          case 'sma20':
            results.sma20 = this.calculateSMA(data, 20);
            break;
          case 'sma50':
            results.sma50 = this.calculateSMA(data, 50);
            break;
          case 'ema12':
            results.ema12 = this.calculateEMA(data, 12);
            break;
          case 'ema26':
            results.ema26 = this.calculateEMA(data, 26);
            break;
          case 'macd':
            results.macd = this.calculateMACD(data);
            break;
          case 'rsi':
            results.rsi = this.calculateRSI(data);
            break;
          case 'bollinger':
            results.bollinger = this.calculateBollingerBands(data);
            break;
          case 'stochastic':
            results.stochastic = this.calculateStochastic(data);
            break;
          case 'williams':
            results.williams = this.calculateWilliamsR(data);
            break;
          case 'momentum':
            results.momentum = this.calculateMomentum(data);
            break;
          default:
            this.logger.warn(`未知指标: ${indicator}`);
        }
      } catch (error) {
        this.logger.error(`计算指标 ${indicator} 失败:`, error);
      }
    }
    
    return results;
  }
} 