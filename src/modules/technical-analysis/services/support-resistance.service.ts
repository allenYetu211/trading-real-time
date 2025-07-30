import { Injectable, Logger } from '@nestjs/common';
import { CCXTDataService } from 'src/modules/ccxt-analysis/services/ccxt-data.service';
import { 
  ISupportResistanceAnalysis, 
  ISupportResistanceLevel, 
  TimeframeType, 
  SupportResistanceType, 
  LevelStrength,
  IKlineData 
} from '../interfaces';
import { IMarketDataCollection } from 'src/shared/interfaces/analysis.interface';

/**
 * 支撑阻力位分析服务
 * 基于K线和EMA分析价格的支撑阻力位
 */
@Injectable()
export class SupportResistanceService {
  private readonly logger = new Logger(SupportResistanceService.name);

  constructor(private readonly ccxtDataService: CCXTDataService) {}

  /**
   * 分析支撑阻力位 - 使用预获取数据的重载方法
   * @param symbol 交易对符号
   * @param marketData 预获取的市场数据
   */
  async analyzeSupportResistanceWithPrefetchedData(
    symbol: string,
    marketData: IMarketDataCollection,
  ): Promise<ISupportResistanceAnalysis> {
    this.logger.log(`使用预获取数据分析${symbol}的支撑阻力位`);

    try {
      // 从预获取数据中获取各时间周期的数据
      const data15m = marketData.timeframes['15m'];
      const data1h = marketData.timeframes['1h'];
      const data4h = marketData.timeframes['4h'];
      const data1d = marketData.timeframes['1d'];

      // 验证数据完整性
      if (!data15m || !data1h || !data4h || !data1d) {
        throw new Error('预获取数据中缺少必要的时间周期数据');
      }

      const currentPrice = data15m[data15m.length - 1].close;

      // 从不同时间周期识别支撑阻力位
      const allLevels: ISupportResistanceLevel[] = [];

      // 日线级别的关键位置 (权重最高)
      const dailyLevels = this.identifyLevelsFromKlineData(data1d, '1d', currentPrice);
      allLevels.push(...dailyLevels);

      // 4小时级别
      const h4Levels = this.identifyLevelsFromKlineData(data4h, '4h', currentPrice);
      allLevels.push(...h4Levels);

      // 1小时级别
      const h1Levels = this.identifyLevelsFromKlineData(data1h, '1h', currentPrice);
      allLevels.push(...h1Levels);

      // 15分钟级别 (近期精确位置)
      const m15Levels = this.identifyLevelsFromKlineData(data15m, '15m', currentPrice);
      allLevels.push(...m15Levels);

      // 合并和过滤重复的位置
      const consolidatedLevels = this.consolidateLevels(allLevels, currentPrice);

      // 按类型分组
      const supports = consolidatedLevels.filter(level => level.type === 'SUPPORT');
      const resistances = consolidatedLevels.filter(level => level.type === 'RESISTANCE');

      // 找到关键位置
      const keyLevels = this.identifyKeyLevels(supports, resistances, currentPrice);

      // 分析当前位置
      const currentPosition = this.analyzeCurrentPosition(supports, resistances, currentPrice);

      // 生成交易区间
      const tradingZones = this.generateTradingZones(supports, resistances, currentPrice);

      const result: ISupportResistanceAnalysis = {
        symbol,
        currentPrice,
        timestamp: Date.now(),
        keyLevels,
        allLevels: {
          supports: supports.sort((a, b) => b.priceRange.center - a.priceRange.center),
          resistances: resistances.sort((a, b) => a.priceRange.center - b.priceRange.center),
        },
        currentPosition,
        tradingZones,
      };

      this.logger.log(`使用预获取数据的支撑阻力位分析完成: ${symbol}, 发现${supports.length}个支撑位，${resistances.length}个阻力位`);
      return result;

    } catch (error) {
      this.logger.error(`使用预获取数据的支撑阻力位分析失败: ${error.message}`);
      throw new Error(`使用预获取数据的支撑阻力位分析失败: ${error.message}`);
    }
  }

  /**
   * 分析支撑阻力位
   * @param symbol 交易对符号
   * @param exchange 交易所名称
   */
  async analyzeSupportResistance(
    symbol: string,
    exchange: string = 'binance',
  ): Promise<ISupportResistanceAnalysis> {
    this.logger.log(`开始分析${symbol}的支撑阻力位`);

    try {
      // 获取多时间周期数据用于分析
      const timeframes: TimeframeType[] = ['15m', '1h', '4h', '1d'];
      const klineDataPromises = timeframes.map(tf => 
        this.ccxtDataService.getOHLCVData(symbol, tf, 200, exchange)
      );

      const [data15m, data1h, data4h, data1d] = await Promise.all(klineDataPromises);
      const currentPrice = data15m[data15m.length - 1].close;

      // 从不同时间周期识别支撑阻力位
      const allLevels: ISupportResistanceLevel[] = [];

      // 日线级别的关键位置 (权重最高)
      const dailyLevels = this.identifyLevelsFromKlineData(data1d, '1d', currentPrice);
      allLevels.push(...dailyLevels);

      // 4小时级别
      const h4Levels = this.identifyLevelsFromKlineData(data4h, '4h', currentPrice);
      allLevels.push(...h4Levels);

      // 1小时级别
      const h1Levels = this.identifyLevelsFromKlineData(data1h, '1h', currentPrice);
      allLevels.push(...h1Levels);

      // 15分钟级别 (近期精确位置)
      const m15Levels = this.identifyLevelsFromKlineData(data15m, '15m', currentPrice);
      allLevels.push(...m15Levels);

      // 合并和过滤重复的位置
      const consolidatedLevels = this.consolidateLevels(allLevels, currentPrice);

      // 按类型分组
      const supports = consolidatedLevels.filter(level => level.type === 'SUPPORT');
      const resistances = consolidatedLevels.filter(level => level.type === 'RESISTANCE');

      // 找到关键位置
      const keyLevels = this.identifyKeyLevels(supports, resistances, currentPrice);

      // 分析当前位置
      const currentPosition = this.analyzeCurrentPosition(supports, resistances, currentPrice);

      // 生成交易区间
      const tradingZones = this.generateTradingZones(supports, resistances, currentPrice);

      const result: ISupportResistanceAnalysis = {
        symbol,
        currentPrice,
        timestamp: Date.now(),
        keyLevels,
        allLevels: {
          supports: supports.sort((a, b) => b.priceRange.center - a.priceRange.center),
          resistances: resistances.sort((a, b) => a.priceRange.center - b.priceRange.center),
        },
        currentPosition,
        tradingZones,
      };

      this.logger.log(`支撑阻力位分析完成: ${symbol}, 发现${supports.length}个支撑位，${resistances.length}个阻力位`);
      return result;

    } catch (error) {
      this.logger.error(`支撑阻力位分析失败: ${error.message}`);
      throw new Error(`支撑阻力位分析失败: ${error.message}`);
    }
  }

  /**
   * 从K线数据识别支撑阻力位
   */
  private identifyLevelsFromKlineData(
    klineData: any[],
    timeframe: TimeframeType,
    currentPrice: number,
  ): ISupportResistanceLevel[] {
    const levels: ISupportResistanceLevel[] = [];

    // 识别高低点
    const swingHighs = this.findSwingHighs(klineData);
    const swingLows = this.findSwingLows(klineData);

    // 从摆动高点创建阻力位
    swingHighs.forEach(high => {
      const level = this.createResistanceLevel(high, klineData, timeframe, currentPrice);
      if (level) levels.push(level);
    });

    // 从摆动低点创建支撑位
    swingLows.forEach(low => {
      const level = this.createSupportLevel(low, klineData, timeframe, currentPrice);
      if (level) levels.push(level);
    });

    // 基于成交量的关键位置
    const volumeLevels = this.identifyVolumeLevels(klineData, timeframe, currentPrice);
    levels.push(...volumeLevels);

    return levels;
  }

  /**
   * 寻找摆动高点
   */
  private findSwingHighs(klineData: any[], lookback: number = 5): any[] {
    const swingHighs = [];

    for (let i = lookback; i < klineData.length - lookback; i++) {
      const currentHigh = klineData[i].high;
      let isSwingHigh = true;

      // 检查左右两边的价格
      for (let j = i - lookback; j <= i + lookback; j++) {
        if (j !== i && klineData[j].high >= currentHigh) {
          isSwingHigh = false;
          break;
        }
      }

      if (isSwingHigh) {
        swingHighs.push({
          ...klineData[i],
          index: i,
          price: currentHigh,
        });
      }
    }

    return swingHighs;
  }

  /**
   * 寻找摆动低点
   */
  private findSwingLows(klineData: any[], lookback: number = 5): any[] {
    const swingLows = [];

    for (let i = lookback; i < klineData.length - lookback; i++) {
      const currentLow = klineData[i].low;
      let isSwingLow = true;

      // 检查左右两边的价格
      for (let j = i - lookback; j <= i + lookback; j++) {
        if (j !== i && klineData[j].low <= currentLow) {
          isSwingLow = false;
          break;
        }
      }

      if (isSwingLow) {
        swingLows.push({
          ...klineData[i],
          index: i,
          price: currentLow,
        });
      }
    }

    return swingLows;
  }

  /**
   * 创建阻力位
   */
  private createResistanceLevel(
    swingHigh: any,
    klineData: any[],
    timeframe: TimeframeType,
    currentPrice: number,
  ): ISupportResistanceLevel | null {
    const price = swingHigh.price;
    
    // 只考虑在当前价格之上的阻力位
    if (price <= currentPrice * 1.001) return null;

    // 计算价格区间（考虑波动性）
    const volatility = this.calculateVolatility(klineData);
    const range = price * volatility * 0.5;

    // 计算触及次数和强度
    const touchCount = this.countTouches(klineData, price, range, 'RESISTANCE');
    const strength = this.calculateLevelStrength(touchCount, timeframe, price, currentPrice);

    // 计算置信度
    const confidence = this.calculateLevelConfidence(touchCount, strength, timeframe, volatility);

    return {
      type: 'RESISTANCE',
      priceRange: {
        min: price - range,
        max: price + range,
        center: price,
      },
      strength,
      confidence: Math.round(confidence),
      touchCount,
      lastTouch: swingHigh.timestamp,
      distance: ((price - currentPrice) / currentPrice) * 100,
      isActive: this.isLevelActive(price, currentPrice, klineData),
      timeframe,
      description: this.generateLevelDescription('RESISTANCE', price, touchCount, strength, timeframe),
    };
  }

  /**
   * 创建支撑位
   */
  private createSupportLevel(
    swingLow: any,
    klineData: any[],
    timeframe: TimeframeType,
    currentPrice: number,
  ): ISupportResistanceLevel | null {
    const price = swingLow.price;
    
    // 只考虑在当前价格之下的支撑位
    if (price >= currentPrice * 0.999) return null;

    // 计算价格区间（考虑波动性）
    const volatility = this.calculateVolatility(klineData);
    const range = price * volatility * 0.5;

    // 计算触及次数和强度
    const touchCount = this.countTouches(klineData, price, range, 'SUPPORT');
    const strength = this.calculateLevelStrength(touchCount, timeframe, price, currentPrice);

    // 计算置信度
    const confidence = this.calculateLevelConfidence(touchCount, strength, timeframe, volatility);

    return {
      type: 'SUPPORT',
      priceRange: {
        min: price - range,
        max: price + range,
        center: price,
      },
      strength,
      confidence: Math.round(confidence),
      touchCount,
      lastTouch: swingLow.timestamp,
      distance: ((currentPrice - price) / currentPrice) * 100,
      isActive: this.isLevelActive(price, currentPrice, klineData),
      timeframe,
      description: this.generateLevelDescription('SUPPORT', price, touchCount, strength, timeframe),
    };
  }

  /**
   * 基于成交量识别关键位置
   */
  private identifyVolumeLevels(
    klineData: any[],
    timeframe: TimeframeType,
    currentPrice: number,
  ): ISupportResistanceLevel[] {
    const levels: ISupportResistanceLevel[] = [];

    // 找到成交量异常高的K线
    const volumes = klineData.map(k => k.volume);
    const avgVolume = volumes.reduce((sum, v) => sum + v, 0) / volumes.length;
    const highVolumeThreshold = avgVolume * 2;

    const highVolumeCandles = klineData.filter(k => k.volume > highVolumeThreshold);

    highVolumeCandles.forEach(candle => {
      // 成交量高点通常是重要的支撑阻力位
      const highPrice = candle.high;
      const lowPrice = candle.low;

      if (highPrice > currentPrice * 1.005) {
        // 阻力位
        levels.push(this.createVolumeLevelResistance(candle, timeframe, currentPrice));
      }

      if (lowPrice < currentPrice * 0.995) {
        // 支撑位
        levels.push(this.createVolumeLevelSupport(candle, timeframe, currentPrice));
      }
    });

    return levels.filter(level => level !== null);
  }

  /**
   * 创建基于成交量的阻力位
   */
  private createVolumeLevelResistance(candle: any, timeframe: TimeframeType, currentPrice: number): ISupportResistanceLevel {
    const price = candle.high;
    const range = price * 0.005; // 0.5% 范围

    return {
      type: 'RESISTANCE',
      priceRange: {
        min: price - range,
        max: price + range,
        center: price,
      },
      strength: 'MEDIUM',
      confidence: 70,
      touchCount: 1,
      lastTouch: candle.timestamp,
      distance: ((price - currentPrice) / currentPrice) * 100,
      isActive: true,
      timeframe,
      description: `${timeframe}成交量异常区域阻力位 ${price.toFixed(5)}`,
    };
  }

  /**
   * 创建基于成交量的支撑位
   */
  private createVolumeLevelSupport(candle: any, timeframe: TimeframeType, currentPrice: number): ISupportResistanceLevel {
    const price = candle.low;
    const range = price * 0.005; // 0.5% 范围

    return {
      type: 'SUPPORT',
      priceRange: {
        min: price - range,
        max: price + range,
        center: price,
      },
      strength: 'MEDIUM',
      confidence: 70,
      touchCount: 1,
      lastTouch: candle.timestamp,
      distance: ((currentPrice - price) / currentPrice) * 100,
      isActive: true,
      timeframe,
      description: `${timeframe}成交量异常区域支撑位 ${price.toFixed(5)}`,
    };
  }

  /**
   * 合并相近的支撑阻力位
   */
  private consolidateLevels(levels: ISupportResistanceLevel[], currentPrice: number): ISupportResistanceLevel[] {
    const consolidated: ISupportResistanceLevel[] = [];
    const tolerance = currentPrice * 0.01; // 1% 容忍度

    levels.forEach(level => {
      const existing = consolidated.find(existing => 
        existing.type === level.type &&
        Math.abs(existing.priceRange.center - level.priceRange.center) < tolerance
      );

      if (existing) {
        // 合并位置
        this.mergeLevels(existing, level);
      } else {
        consolidated.push({ ...level });
      }
    });

    // 过滤掉置信度太低的位置
    return consolidated.filter(level => level.confidence >= 40);
  }

  /**
   * 合并两个相近的位置
   */
  private mergeLevels(existing: ISupportResistanceLevel, newLevel: ISupportResistanceLevel): void {
    // 使用加权平均合并价格
    const weight1 = this.getLevelWeight(existing);
    const weight2 = this.getLevelWeight(newLevel);
    const totalWeight = weight1 + weight2;

    existing.priceRange.center = (existing.priceRange.center * weight1 + newLevel.priceRange.center * weight2) / totalWeight;
    existing.touchCount += newLevel.touchCount;
    existing.confidence = Math.min(existing.confidence + 10, 100);
    
    // 更新强度
    if (newLevel.strength === 'MAJOR' || existing.strength === 'MAJOR') {
      existing.strength = 'MAJOR';
    } else if (newLevel.strength === 'STRONG' || existing.strength === 'STRONG') {
      existing.strength = 'STRONG';
    }
  }

  /**
   * 获取位置权重
   */
  private getLevelWeight(level: ISupportResistanceLevel): number {
    const timeframeWeights = { '1d': 4, '4h': 3, '1h': 2, '15m': 1 };
    const strengthWeights = { 'MAJOR': 4, 'STRONG': 3, 'MEDIUM': 2, 'WEAK': 1 };
    
    return timeframeWeights[level.timeframe] * strengthWeights[level.strength];
  }

  /**
   * 识别关键位置
   */
  private identifyKeyLevels(
    supports: ISupportResistanceLevel[],
    resistances: ISupportResistanceLevel[],
    currentPrice: number,
  ) {
    const nearestSupport = supports
      .filter(s => s.priceRange.center < currentPrice)
      .sort((a, b) => b.priceRange.center - a.priceRange.center)[0] || null;

    const nearestResistance = resistances
      .filter(r => r.priceRange.center > currentPrice)
      .sort((a, b) => a.priceRange.center - b.priceRange.center)[0] || null;

    const strongestSupport = supports
      .sort((a, b) => this.getLevelWeight(b) - this.getLevelWeight(a))[0] || null;

    const strongestResistance = resistances
      .sort((a, b) => this.getLevelWeight(b) - this.getLevelWeight(a))[0] || null;

    return {
      nearestSupport,
      nearestResistance,
      strongestSupport,
      strongestResistance,
    };
  }

  /**
   * 分析当前位置
   */
  private analyzeCurrentPosition(
    supports: ISupportResistanceLevel[],
    resistances: ISupportResistanceLevel[],
    currentPrice: number,
  ) {
    const nearSupport = supports.find(s => 
      currentPrice >= s.priceRange.min && currentPrice <= s.priceRange.max
    );

    const nearResistance = resistances.find(r => 
      currentPrice >= r.priceRange.min && currentPrice <= r.priceRange.max
    );

    const nextResistance = resistances
      .filter(r => r.priceRange.center > currentPrice)
      .sort((a, b) => a.priceRange.center - b.priceRange.center)[0];

    const nextSupport = supports
      .filter(s => s.priceRange.center < currentPrice)
      .sort((a, b) => b.priceRange.center - a.priceRange.center)[0];

    let priceAction: any = 'CONSOLIDATING';

    if (nextResistance && (nextResistance.priceRange.center - currentPrice) / currentPrice < 0.02) {
      priceAction = 'APPROACHING_RESISTANCE';
    } else if (nextSupport && (currentPrice - nextSupport.priceRange.center) / currentPrice < 0.02) {
      priceAction = 'APPROACHING_SUPPORT';
    }

    return {
      betweenLevels: !nearSupport && !nearResistance,
      inSupportZone: !!nearSupport,
      inResistanceZone: !!nearResistance,
      priceAction,
    };
  }

  /**
   * 生成交易区间
   */
  private generateTradingZones(
    supports: ISupportResistanceLevel[],
    resistances: ISupportResistanceLevel[],
    currentPrice: number,
  ) {
    const buyZones = supports
      .filter(s => s.strength !== 'WEAK' && s.confidence > 60)
      .map(s => ({
        priceRange: { min: s.priceRange.min, max: s.priceRange.max },
        strength: s.strength,
        reason: `${s.timeframe}级别${s.strength}支撑位`,
      }));

    const sellZones = resistances
      .filter(r => r.strength !== 'WEAK' && r.confidence > 60)
      .map(r => ({
        priceRange: { min: r.priceRange.min, max: r.priceRange.max },
        strength: r.strength,
        reason: `${r.timeframe}级别${r.strength}阻力位`,
      }));

    return { buyZones, sellZones };
  }

  // 辅助方法
  private calculateVolatility(klineData: any[]): number {
    const returns = [];
    for (let i = 1; i < klineData.length; i++) {
      const prevClose = klineData[i - 1].close;
      const currClose = klineData[i].close;
      returns.push((currClose - prevClose) / prevClose);
    }

    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    return Math.sqrt(variance);
  }

  private countTouches(klineData: any[], price: number, range: number, type: SupportResistanceType): number {
    let touches = 0;
    const minPrice = price - range;
    const maxPrice = price + range;

    klineData.forEach(candle => {
      if (type === 'SUPPORT') {
        if (candle.low >= minPrice && candle.low <= maxPrice) {
          touches++;
        }
      } else {
        if (candle.high >= minPrice && candle.high <= maxPrice) {
          touches++;
        }
      }
    });

    return touches;
  }

  private calculateLevelStrength(
    touchCount: number,
    timeframe: TimeframeType,
    price: number,
    currentPrice: number,
  ): LevelStrength {
    let score = 0;

    // 触及次数得分
    if (touchCount >= 5) score += 4;
    else if (touchCount >= 3) score += 3;
    else if (touchCount >= 2) score += 2;
    else score += 1;

    // 时间周期权重
    const timeframeScores = { '1d': 4, '4h': 3, '1h': 2, '15m': 1 };
    score += timeframeScores[timeframe];

    // 距离当前价格的影响
    const distance = Math.abs(price - currentPrice) / currentPrice;
    if (distance < 0.05) score += 2; // 近期位置更重要
    else if (distance < 0.1) score += 1;

    if (score >= 8) return 'MAJOR';
    if (score >= 6) return 'STRONG';
    if (score >= 4) return 'MEDIUM';
    return 'WEAK';
  }

  private calculateLevelConfidence(
    touchCount: number,
    strength: LevelStrength,
    timeframe: TimeframeType,
    volatility: number,
  ): number {
    let confidence = 50;

    // 触及次数影响
    confidence += touchCount * 10;

    // 强度影响
    const strengthBonus = { 'MAJOR': 20, 'STRONG': 15, 'MEDIUM': 10, 'WEAK': 0 };
    confidence += strengthBonus[strength];

    // 时间周期影响
    const timeframeBonus = { '1d': 15, '4h': 10, '1h': 5, '15m': 0 };
    confidence += timeframeBonus[timeframe];

    // 波动性影响
    if (volatility < 0.02) confidence += 10;
    else if (volatility > 0.05) confidence -= 10;

    return Math.min(Math.max(confidence, 0), 100);
  }

  private isLevelActive(price: number, currentPrice: number, klineData: any[]): boolean {
    // 检查最近是否被突破
    const recent10 = klineData.slice(-10);
    const wasBreached = recent10.some(candle => 
      (price < currentPrice && candle.close < price * 0.99) ||
      (price > currentPrice && candle.close > price * 1.01)
    );

    return !wasBreached;
  }

  private generateLevelDescription(
    type: SupportResistanceType,
    price: number,
    touchCount: number,
    strength: LevelStrength,
    timeframe: TimeframeType,
  ): string {
    const typeText = type === 'SUPPORT' ? '支撑位' : '阻力位';
    const strengthText = this.getStrengthText(strength);
    
    return `${timeframe}级别${strengthText}${typeText} ${price.toFixed(5)}，已触及${touchCount}次`;
  }

  private getStrengthText(strength: LevelStrength): string {
    switch (strength) {
      case 'MAJOR': return '重要';
      case 'STRONG': return '强';
      case 'MEDIUM': return '中等';
      case 'WEAK': return '弱';
      default: return '';
    }
  }
} 