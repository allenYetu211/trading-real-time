import { Injectable, Logger } from '@nestjs/common';
import { CCXTDataService } from 'src/modules/ccxt-analysis/services/ccxt-data.service';
import { MathUtil } from 'src/shared/utils/math.util';
import { 
  IMultiTimeframeTrend, 
  ITimeframeTrend, 
  TimeframeType, 
  TrendType,
  IKlineData 
} from '../interfaces';

/**
 * 多时间周期趋势分析服务
 * 分析15分钟、1小时、4小时、1日的趋势
 */
@Injectable()
export class MultiTimeframeTrendService {
  private readonly logger = new Logger(MultiTimeframeTrendService.name);

  constructor(private readonly ccxtDataService: CCXTDataService) {}

  /**
   * 分析多时间周期趋势
   * @param symbol 交易对符号
   * @param exchange 交易所名称
   */
  async analyzeMultiTimeframeTrend(
    symbol: string,
    exchange: string = 'binance',
  ): Promise<IMultiTimeframeTrend> {
    this.logger.log(`开始分析${symbol}的多时间周期趋势`);

    try {
      // 并行获取所有时间周期的数据
      const timeframes: TimeframeType[] = ['15m', '1h', '4h', '1d'];
      const trendPromises = timeframes.map(timeframe => 
        this.analyzeSingleTimeframeTrend(symbol, timeframe, exchange)
      );

      const trendResults = await Promise.all(trendPromises);

      // 构建时间周期趋势映射
      const timeframeTrends = {
        '15m': trendResults[0],
        '1h': trendResults[1],
        '4h': trendResults[2],
        '1d': trendResults[3],
      };

      // 分析趋势一致性
      const trendAlignment = this.analyzeTrendAlignment(timeframeTrends);

      // 计算整体趋势
      const overallTrend = this.calculateOverallTrend(timeframeTrends);

      // 计算整体置信度
      const overallConfidence = this.calculateOverallConfidence(timeframeTrends, trendAlignment);

      // 生成交易建议
      const tradingSuggestion = this.generateTradingSuggestion(
        timeframeTrends,
        trendAlignment,
        overallTrend,
      );

      const result: IMultiTimeframeTrend = {
        symbol,
        timestamp: Date.now(),
        overallTrend,
        overallConfidence,
        timeframes: timeframeTrends,
        trendAlignment,
        tradingSuggestion,
      };

      this.logger.log(`多时间周期趋势分析完成: ${symbol} - ${overallTrend}`);
      return result;

    } catch (error) {
      this.logger.error(`多时间周期趋势分析失败: ${error.message}`);
      throw new Error(`多时间周期趋势分析失败: ${error.message}`);
    }
  }

  /**
   * 分析单个时间周期的趋势
   * @param symbol 交易对符号
   * @param timeframe 时间周期
   * @param exchange 交易所名称
   */
  private async analyzeSingleTimeframeTrend(
    symbol: string,
    timeframe: TimeframeType,
    exchange: string = 'binance',
  ): Promise<ITimeframeTrend> {
    try {
      // 获取K线数据
      const klineData = await this.ccxtDataService.getOHLCVData(
        symbol,
        timeframe,
        200, // 获取200根K线确保EMA计算准确
        exchange,
      );

      const closePrices = klineData.map(k => k.close);
      const currentPrice = closePrices[closePrices.length - 1];

      // 计算EMA
      const ema20Values = MathUtil.calculateEMA(closePrices, 20);
      const ema60Values = MathUtil.calculateEMA(closePrices, 60);
      const ema120Values = MathUtil.calculateEMA(closePrices, 120);

      const ema20 = ema20Values[ema20Values.length - 1];
      const ema60 = ema60Values[ema60Values.length - 1];
      const ema120 = ema120Values[ema120Values.length - 1];

      // 分析趋势
      const trend = this.determineTrend(currentPrice, ema20, ema60, ema120, closePrices);
      const trendStrength = this.calculateTrendStrength(currentPrice, ema20, ema60, ema120, closePrices);
      const confidence = this.calculateTrendConfidence(trend, trendStrength, closePrices);
      const divergence = this.detectDivergence(closePrices, ema20Values);
      const analysis = this.generateTrendAnalysis(trend, trendStrength, confidence, divergence, timeframe);

      return {
        timeframe,
        trend,
        confidence: Math.round(confidence),
        currentPrice,
        ema20,
        ema60,
        ema120,
        trendStrength: Math.round(trendStrength),
        divergence,
        analysis,
      };

    } catch (error) {
      this.logger.error(`${timeframe}趋势分析失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 确定趋势类型
   * @param currentPrice 当前价格
   * @param ema20 EMA20
   * @param ema60 EMA60
   * @param ema120 EMA120
   * @param priceHistory 价格历史
   */
  private determineTrend(
    currentPrice: number,
    ema20: number,
    ema60: number,
    ema120: number,
    priceHistory: number[],
  ): TrendType {
    // 计算EMA斜率 (最近10根K线的变化)
    const recent10 = priceHistory.slice(-10);
    const ema20Recent = MathUtil.calculateEMA(recent10, 20);
    const ema20Slope = this.calculateSlope(ema20Recent);

    // 强多头排列：价格 > EMA20 > EMA60 > EMA120 且EMA20上升
    if (currentPrice > ema20 && ema20 > ema60 && ema60 > ema120) {
      const priceAboveEma = (currentPrice - ema20) / ema20;
      if (ema20Slope > 0.002 && priceAboveEma > 0.05) {
        return 'STRONG_UPTREND';
      }
      if (ema20Slope > 0.001) {
        return 'UPTREND';
      }
      return 'WEAK_UPTREND';
    }

    // 强空头排列：价格 < EMA20 < EMA60 < EMA120 且EMA20下降
    if (currentPrice < ema20 && ema20 < ema60 && ema60 < ema120) {
      const priceBelowEma = (ema20 - currentPrice) / ema20;
      if (ema20Slope < -0.002 && priceBelowEma > 0.05) {
        return 'STRONG_DOWNTREND';
      }
      if (ema20Slope < -0.001) {
        return 'DOWNTREND';
      }
      return 'WEAK_DOWNTREND';
    }

    // 其他情况为震荡
    return 'RANGING';
  }

  /**
   * 计算趋势强度
   */
  private calculateTrendStrength(
    currentPrice: number,
    ema20: number,
    ema60: number,
    ema120: number,
    priceHistory: number[],
  ): number {
    let strength = 0;

    // EMA排列得分 (0-40分)
    if (currentPrice > ema20 && ema20 > ema60 && ema60 > ema120) {
      strength += 40; // 完美多头排列
    } else if (currentPrice < ema20 && ema20 < ema60 && ema60 < ema120) {
      strength += 40; // 完美空头排列
    } else if (currentPrice > ema20 && ema20 > ema60) {
      strength += 25; // 部分多头排列
    } else if (currentPrice < ema20 && ema20 < ema60) {
      strength += 25; // 部分空头排列
    }

    // EMA间距得分 (0-20分)
    const emaSpread20_60 = Math.abs(ema20 - ema60) / Math.max(ema20, ema60);
    const emaSpread60_120 = Math.abs(ema60 - ema120) / Math.max(ema60, ema120);
    const avgSpread = (emaSpread20_60 + emaSpread60_120) / 2;
    strength += Math.min(avgSpread * 400, 20);

    // 价格动量得分 (0-20分)
    const recent5 = priceHistory.slice(-5);
    const momentum = (recent5[recent5.length - 1] - recent5[0]) / recent5[0];
    strength += Math.min(Math.abs(momentum) * 500, 20);

    // 一致性得分 (0-20分)
    const recent10 = priceHistory.slice(-10);
    let consistentBars = 0;
    const isUptrend = currentPrice > ema20 && ema20 > ema60;
    
    for (let i = 1; i < recent10.length; i++) {
      if (isUptrend && recent10[i] > recent10[i - 1]) {
        consistentBars++;
      } else if (!isUptrend && recent10[i] < recent10[i - 1]) {
        consistentBars++;
      }
    }
    strength += (consistentBars / (recent10.length - 1)) * 20;

    return Math.min(strength, 100);
  }

  /**
   * 计算趋势置信度
   */
  private calculateTrendConfidence(
    trend: TrendType,
    trendStrength: number,
    priceHistory: number[],
  ): number {
    let confidence = trendStrength * 0.7; // 基础得分

    // 趋势明确性加分
    if (trend.includes('STRONG')) {
      confidence += 15;
    } else if (trend !== 'RANGING') {
      confidence += 10;
    }

    // 波动性调整
    const recent20 = priceHistory.slice(-20);
    const volatility = this.calculateVolatility(recent20);
    if (volatility < 0.02) {
      confidence += 10; // 低波动性增加置信度
    } else if (volatility > 0.05) {
      confidence -= 10; // 高波动性降低置信度
    }

    return Math.min(Math.max(confidence, 0), 100);
  }

  /**
   * 检测背离
   */
  private detectDivergence(priceHistory: number[], emaValues: number[]): boolean {
    if (priceHistory.length < 20 || emaValues.length < 20) return false;

    const recent20Prices = priceHistory.slice(-20);
    const recent20EMA = emaValues.slice(-20);

    // 简单背离检测：价格新高但EMA未创新高（或相反）
    const priceHigh = Math.max(...recent20Prices);
    const priceLow = Math.min(...recent20Prices);
    const emaHigh = Math.max(...recent20EMA);
    const emaLow = Math.min(...recent20EMA);

    const lastPrice = recent20Prices[recent20Prices.length - 1];
    const lastEMA = recent20EMA[recent20EMA.length - 1];

    // 顶背离：价格接近高点，但EMA没有
    if (lastPrice > priceHigh * 0.98 && lastEMA < emaHigh * 0.95) {
      return true;
    }

    // 底背离：价格接近低点，但EMA没有
    if (lastPrice < priceLow * 1.02 && lastEMA > emaLow * 1.05) {
      return true;
    }

    return false;
  }

  /**
   * 分析趋势一致性
   */
  private analyzeTrendAlignment(timeframes: Record<TimeframeType, ITimeframeTrend>) {
    const trends = Object.values(timeframes).map(t => t.trend);
    const isAligned = this.checkTrendAlignment(trends);
    const alignmentScore = this.calculateAlignmentScore(timeframes);
    const conflictingTimeframes = this.findConflictingTimeframes(timeframes);

    return {
      isAligned,
      alignmentScore,
      conflictingTimeframes,
    };
  }

  /**
   * 计算整体趋势
   */
  private calculateOverallTrend(timeframes: Record<TimeframeType, ITimeframeTrend>): TrendType {
    // 权重：日线>4小时>1小时>15分钟
    const weights = { '1d': 4, '4h': 3, '1h': 2, '15m': 1 };
    const trendScores = {
      'STRONG_UPTREND': 3,
      'UPTREND': 2,
      'WEAK_UPTREND': 1,
      'RANGING': 0,
      'WEAK_DOWNTREND': -1,
      'DOWNTREND': -2,
      'STRONG_DOWNTREND': -3,
    };

    let weightedScore = 0;
    let totalWeight = 0;

    Object.entries(timeframes).forEach(([tf, data]) => {
      const weight = weights[tf as TimeframeType];
      const score = trendScores[data.trend];
      weightedScore += score * weight;
      totalWeight += weight;
    });

    const avgScore = weightedScore / totalWeight;

    if (avgScore >= 2.5) return 'STRONG_UPTREND';
    if (avgScore >= 1.5) return 'UPTREND';
    if (avgScore >= 0.5) return 'WEAK_UPTREND';
    if (avgScore <= -2.5) return 'STRONG_DOWNTREND';
    if (avgScore <= -1.5) return 'DOWNTREND';
    if (avgScore <= -0.5) return 'WEAK_DOWNTREND';
    return 'RANGING';
  }

  /**
   * 计算整体置信度
   */
  private calculateOverallConfidence(
    timeframes: Record<TimeframeType, ITimeframeTrend>,
    trendAlignment: any,
  ): number {
    const confidences = Object.values(timeframes).map(t => t.confidence);
    const avgConfidence = confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
    
    // 一致性加成
    const alignmentBonus = trendAlignment.alignmentScore * 0.2;
    
    return Math.min(avgConfidence + alignmentBonus, 100);
  }

  /**
   * 生成交易建议
   */
  private generateTradingSuggestion(
    timeframes: Record<TimeframeType, ITimeframeTrend>,
    trendAlignment: any,
    overallTrend: TrendType,
  ) {
    const { isAligned, alignmentScore } = trendAlignment;
    
    let action: any = 'WAIT';
    let reason = '';
    let riskLevel: any = 'MEDIUM';

    if (isAligned && alignmentScore > 80) {
      if (overallTrend.includes('STRONG_UPTREND')) {
        action = 'STRONG_BUY';
        reason = '所有时间周期强势上涨，趋势一致性极高';
        riskLevel = 'LOW';
      } else if (overallTrend.includes('UPTREND')) {
        action = 'BUY';
        reason = '多时间周期上涨趋势，建议买入';
        riskLevel = 'LOW';
      } else if (overallTrend.includes('STRONG_DOWNTREND')) {
        action = 'STRONG_SELL';
        reason = '所有时间周期强势下跌，趋势一致性极高';
        riskLevel = 'LOW';
      } else if (overallTrend.includes('DOWNTREND')) {
        action = 'SELL';
        reason = '多时间周期下跌趋势，建议卖出';
        riskLevel = 'LOW';
      }
    } else if (alignmentScore < 50) {
      action = 'WAIT';
      reason = '时间周期冲突，建议观望等待明确信号';
      riskLevel = 'HIGH';
    } else {
      action = 'HOLD';
      reason = '趋势不够明确，建议持有观察';
      riskLevel = 'MEDIUM';
    }

    return { action, reason, riskLevel };
  }

  // 辅助方法
  private calculateSlope(values: number[]): number {
    if (values.length < 2) return 0;
    const first = values[0];
    const last = values[values.length - 1];
    return (last - first) / first / values.length;
  }

  private calculateVolatility(prices: number[]): number {
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    return Math.sqrt(variance);
  }

  private checkTrendAlignment(trends: TrendType[]): boolean {
    const uptrends = trends.filter(t => t.includes('UPTREND')).length;
    const downtrends = trends.filter(t => t.includes('DOWNTREND')).length;
    const ranging = trends.filter(t => t === 'RANGING').length;

    return uptrends >= 3 || downtrends >= 3;
  }

  private calculateAlignmentScore(timeframes: Record<TimeframeType, ITimeframeTrend>): number {
    const trends = Object.values(timeframes).map(t => t.trend);
    const trendGroups = {
      uptrend: trends.filter(t => t.includes('UPTREND')).length,
      downtrend: trends.filter(t => t.includes('DOWNTREND')).length,
      ranging: trends.filter(t => t === 'RANGING').length,
    };

    const maxGroup = Math.max(...Object.values(trendGroups));
    return (maxGroup / trends.length) * 100;
  }

  private findConflictingTimeframes(timeframes: Record<TimeframeType, ITimeframeTrend>): TimeframeType[] {
    const majorityTrend = this.calculateOverallTrend(timeframes);
    const conflicting: TimeframeType[] = [];

    Object.entries(timeframes).forEach(([tf, data]) => {
      if (this.isConflictingTrend(data.trend, majorityTrend)) {
        conflicting.push(tf as TimeframeType);
      }
    });

    return conflicting;
  }

  private isConflictingTrend(trend1: TrendType, trend2: TrendType): boolean {
    const isUptrend1 = trend1.includes('UPTREND');
    const isDowntrend1 = trend1.includes('DOWNTREND');
    const isUptrend2 = trend2.includes('UPTREND');
    const isDowntrend2 = trend2.includes('DOWNTREND');

    return (isUptrend1 && isDowntrend2) || (isDowntrend1 && isUptrend2);
  }

  private generateTrendAnalysis(
    trend: TrendType,
    strength: number,
    confidence: number,
    divergence: boolean,
    timeframe: TimeframeType,
  ): string {
    let analysis = `${timeframe}周期显示${this.getTrendDescription(trend)}`;
    
    if (strength > 80) {
      analysis += '，趋势强度很强';
    } else if (strength > 60) {
      analysis += '，趋势强度中等';
    } else {
      analysis += '，趋势强度较弱';
    }

    if (confidence > 80) {
      analysis += '，可信度高';
    } else if (confidence > 60) {
      analysis += '，可信度中等';
    } else {
      analysis += '，可信度较低';
    }

    if (divergence) {
      analysis += '，检测到背离信号';
    }

    return analysis;
  }

  private getTrendDescription(trend: TrendType): string {
    switch (trend) {
      case 'STRONG_UPTREND': return '强势上涨趋势';
      case 'UPTREND': return '上涨趋势';
      case 'WEAK_UPTREND': return '弱势上涨趋势';
      case 'RANGING': return '震荡整理';
      case 'WEAK_DOWNTREND': return '弱势下跌趋势';
      case 'DOWNTREND': return '下跌趋势';
      case 'STRONG_DOWNTREND': return '强势下跌趋势';
      default: return '未知趋势';
    }
  }
} 