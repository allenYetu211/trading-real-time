export class MathUtil {
  /**
   * 计算简单移动平均线 (SMA)
   */
  static calculateSMA(values: number[], period: number): number[] {
    const sma: number[] = [];
    
    for (let i = period - 1; i < values.length; i++) {
      const sum = values.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      sma.push(sum / period);
    }
    
    return sma;
  }

  /**
   * 计算指数移动平均线 (EMA)
   */
  static calculateEMA(values: number[], period: number): number[] {
    const ema: number[] = [];
    const multiplier = 2 / (period + 1);
    
    // 第一个EMA值使用SMA
    const firstSMA = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
    ema.push(firstSMA);
    
    for (let i = period; i < values.length; i++) {
      const emaValue = (values[i] * multiplier) + (ema[ema.length - 1] * (1 - multiplier));
      ema.push(emaValue);
    }
    
    return ema;
  }

  /**
   * 计算MACD指标
   */
  static calculateMACD(prices: number[], fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    const emaFast = this.calculateEMA(prices, fastPeriod);
    const emaSlow = this.calculateEMA(prices, slowPeriod);
    
    // MACD线 = EMA12 - EMA26
    const macdLine: number[] = [];
    const startIndex = slowPeriod - fastPeriod;
    
    for (let i = 0; i < emaFast.length - startIndex; i++) {
      macdLine.push(emaFast[i + startIndex] - emaSlow[i]);
    }
    
    // Signal线 = MACD的EMA9
    const signalLine = this.calculateEMA(macdLine, signalPeriod);
    
    // Histogram = MACD - Signal
    const histogram: number[] = [];
    const histogramStartIndex = signalPeriod - 1;
    
    for (let i = 0; i < signalLine.length; i++) {
      histogram.push(macdLine[i + histogramStartIndex] - signalLine[i]);
    }
    
    return {
      macd: macdLine,
      signal: signalLine,
      histogram: histogram
    };
  }

  /**
   * 计算RSI指标
   */
  static calculateRSI(prices: number[], period = 14): number[] {
    const rsi: number[] = [];
    const gains: number[] = [];
    const losses: number[] = [];
    
    // 计算价格变化
    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }
    
    // 计算初始平均收益和平均损失
    let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
    let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
    
    for (let i = period; i < gains.length; i++) {
      avgGain = (avgGain * (period - 1) + gains[i]) / period;
      avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
      
      const rs = avgGain / avgLoss;
      const rsiValue = 100 - (100 / (1 + rs));
      rsi.push(rsiValue);
    }
    
    return rsi;
  }

  /**
   * 计算布林带
   */
  static calculateBollingerBands(prices: number[], period = 20, standardDeviations = 2) {
    const sma = this.calculateSMA(prices, period);
    const upperBand: number[] = [];
    const lowerBand: number[] = [];
    
    for (let i = 0; i < sma.length; i++) {
      const priceSlice = prices.slice(i, i + period);
      const mean = sma[i];
      const variance = priceSlice.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / period;
      const stdDev = Math.sqrt(variance);
      
      upperBand.push(mean + (standardDeviations * stdDev));
      lowerBand.push(mean - (standardDeviations * stdDev));
    }
    
    return {
      upper: upperBand,
      middle: sma,
      lower: lowerBand
    };
  }

  /**
   * 计算标准差
   */
  static calculateStandardDeviation(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  /**
   * 查找数组中的极值点
   */
  static findPeaksAndValleys(values: number[], windowSize = 5): { peaks: number[], valleys: number[] } {
    const peaks: number[] = [];
    const valleys: number[] = [];
    
    for (let i = windowSize; i < values.length - windowSize; i++) {
      const current = values[i];
      const leftWindow = values.slice(i - windowSize, i);
      const rightWindow = values.slice(i + 1, i + windowSize + 1);
      
      const isLocalMax = leftWindow.every(val => current >= val) && rightWindow.every(val => current >= val);
      const isLocalMin = leftWindow.every(val => current <= val) && rightWindow.every(val => current <= val);
      
      if (isLocalMax) peaks.push(i);
      if (isLocalMin) valleys.push(i);
    }
    
    return { peaks, valleys };
  }

  /**
   * 计算两点间的线性回归
   */
  static calculateLinearRegression(xValues: number[], yValues: number[]): { slope: number, intercept: number, r2: number } {
    const n = xValues.length;
    const sumX = xValues.reduce((a, b) => a + b, 0);
    const sumY = yValues.reduce((a, b) => a + b, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
    const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);
    const sumYY = yValues.reduce((sum, y) => sum + y * y, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // 计算R²
    const meanY = sumY / n;
    const ssRes = yValues.reduce((sum, y, i) => {
      const predicted = slope * xValues[i] + intercept;
      return sum + Math.pow(y - predicted, 2);
    }, 0);
    const ssTot = yValues.reduce((sum, y) => sum + Math.pow(y - meanY, 2), 0);
    const r2 = 1 - (ssRes / ssTot);
    
    return { slope, intercept, r2 };
  }
} 