import { Injectable, Logger } from '@nestjs/common';
import { KlineData } from 'src/shared/interfaces';
import { PatternType, SignalType } from 'src/shared/enums';

export interface PatternResult {
  type: PatternType;
  signal: SignalType;
  confidence: number; // 置信度 0-100
  startTime: number;
  endTime: number;
  description: string;
  keyLevels?: {
    support?: number;
    resistance?: number;
    breakoutLevel?: number;
  };
}

export interface SupportResistanceLevel {
  level: number;
  strength: number; // 强度 1-10
  type: 'support' | 'resistance';
  touchCount: number;
  firstTouch: number;
  lastTouch: number;
}

@Injectable()
export class PatternRecognitionService {
  private readonly logger = new Logger(PatternRecognitionService.name);

  /**
   * 识别支撑和阻力位
   */
  identifySupportResistance(data: KlineData[], lookback: number = 50): SupportResistanceLevel[] {
    if (data.length < lookback) {
      return [];
    }

    const levels: SupportResistanceLevel[] = [];
    const tolerance = 0.005; // 0.5% 容差

    // 寻找局部高点和低点
    const localExtremes = this.findLocalExtremes(data, 5);
    
    for (const extreme of localExtremes) {
      const level = extreme.type === 'high' ? extreme.price : extreme.price;
      
      // 计算该价位被触及的次数
      let touchCount = 0;
      let firstTouch = extreme.timestamp;
      let lastTouch = extreme.timestamp;
      
      for (const kline of data) {
        const high = kline.highPrice;
        const low = kline.lowPrice;
        
        // 检查是否触及该价位
        if (extreme.type === 'high') {
          if (Math.abs(high - level) / level <= tolerance) {
            touchCount++;
            if (kline.openTime < firstTouch) firstTouch = kline.openTime;
            if (kline.openTime > lastTouch) lastTouch = kline.openTime;
          }
        } else {
          if (Math.abs(low - level) / level <= tolerance) {
            touchCount++;
            if (kline.openTime < firstTouch) firstTouch = kline.openTime;
            if (kline.openTime > lastTouch) lastTouch = kline.openTime;
          }
        }
      }
      
      // 只保留被多次触及的重要位置
      if (touchCount >= 2) {
        levels.push({
          level,
          strength: Math.min(touchCount, 10),
          type: extreme.type === 'high' ? 'resistance' : 'support',
          touchCount,
          firstTouch,
          lastTouch,
        });
      }
    }
    
    // 去重和排序
    return this.consolidateLevels(levels, tolerance);
  }

  /**
   * 识别箱体形态
   */
  identifyBoxPattern(data: KlineData[], minDuration: number = 20): PatternResult[] {
    if (data.length < minDuration * 2) {
      return [];
    }

    const patterns: PatternResult[] = [];
    const supportResistanceLevels = this.identifySupportResistance(data);
    
    // 寻找支撑和阻力位接近的区域
    for (let i = 0; i < supportResistanceLevels.length; i++) {
      for (let j = i + 1; j < supportResistanceLevels.length; j++) {
        const level1 = supportResistanceLevels[i];
        const level2 = supportResistanceLevels[j];
        
        // 确保一个是支撑，一个是阻力
        if (level1.type === level2.type) continue;
        
        const support = level1.type === 'support' ? level1 : level2;
        const resistance = level1.type === 'resistance' ? level1 : level2;
        
        // 检查箱体高度是否合理（不要太小或太大）
        const boxHeight = resistance.level - support.level;
        const boxHeightPercent = boxHeight / support.level;
        
        if (boxHeightPercent < 0.02 || boxHeightPercent > 0.15) continue;
        
        // 检查在这个区间内价格是否震荡
        const boxData = this.getDataInTimeRange(data, 
          Math.max(support.firstTouch, resistance.firstTouch),
          Math.min(support.lastTouch, resistance.lastTouch)
        );
        
        if (boxData.length < minDuration) continue;
        
        // 验证箱体的有效性
        const boxValidation = this.validateBoxPattern(boxData, support.level, resistance.level);
        
        if (boxValidation.isValid) {
          patterns.push({
            type: PatternType.BOX,
            signal: SignalType.NEUTRAL,
            confidence: boxValidation.confidence,
            startTime: Math.max(support.firstTouch, resistance.firstTouch),
            endTime: Math.min(support.lastTouch, resistance.lastTouch),
            description: `箱体形态: 支撑位 ${support.level.toFixed(2)}, 阻力位 ${resistance.level.toFixed(2)}`,
            keyLevels: {
              support: support.level,
              resistance: resistance.level,
            },
          });
        }
      }
    }
    
    return patterns;
  }

  /**
   * 识别突破形态
   */
  identifyBreakoutPattern(data: KlineData[], volumeThreshold: number = 1.5): PatternResult[] {
    const patterns: PatternResult[] = [];
    const supportResistanceLevels = this.identifySupportResistance(data);
    
    // 获取最近的价格数据
    const recentData = data.slice(-20);
    if (recentData.length === 0) return patterns;
    
    const currentPrice = recentData[recentData.length - 1].closePrice;
    const currentVolume = recentData[recentData.length - 1].volume;
    
    // 计算平均成交量
    const avgVolume = recentData.reduce((sum, kline) => sum + kline.volume, 0) / recentData.length;
    
    for (const level of supportResistanceLevels) {
      const distance = Math.abs(currentPrice - level.level) / level.level;
      
      // 检查是否发生突破
      if (distance <= 0.01) { // 价格接近关键位
        let breakoutType: SignalType = SignalType.NEUTRAL;
        let breakoutLevel = level.level;
        
        if (level.type === 'resistance' && currentPrice > level.level) {
          breakoutType = SignalType.BUY;
        } else if (level.type === 'support' && currentPrice < level.level) {
          breakoutType = SignalType.SELL;
        }
        
        if (breakoutType !== SignalType.NEUTRAL) {
          // 检查成交量是否放大
          const volumeConfirmation = currentVolume > avgVolume * volumeThreshold;
          const confidence = this.calculateBreakoutConfidence(
            recentData, 
            level, 
            volumeConfirmation
          );
          
          if (confidence >= 60) {
            patterns.push({
              type: PatternType.BREAKOUT,
              signal: breakoutType,
              confidence,
              startTime: recentData[0].openTime,
              endTime: recentData[recentData.length - 1].openTime,
              description: `${level.type === 'resistance' ? '阻力' : '支撑'}位突破: ${level.level.toFixed(2)}`,
              keyLevels: {
                breakoutLevel,
              },
            });
          }
        }
      }
    }
    
    return patterns;
  }

  /**
   * 识别趋势形态
   */
  identifyTrendPattern(data: KlineData[], period: number = 20): PatternResult[] {
    if (data.length < period) {
      return [];
    }

    const patterns: PatternResult[] = [];
    const recentData = data.slice(-period);
    
    // 计算趋势线
    const trendAnalysis = this.analyzeTrend(recentData);
    
    if (trendAnalysis.strength >= 0.6) {
      const signal = trendAnalysis.direction > 0 ? SignalType.BUY : SignalType.SELL;
      const trendType = trendAnalysis.direction > 0 ? PatternType.UPTREND : PatternType.DOWNTREND;
      
      patterns.push({
        type: trendType,
        signal,
        confidence: trendAnalysis.strength * 100,
        startTime: recentData[0].openTime,
        endTime: recentData[recentData.length - 1].openTime,
        description: `${trendAnalysis.direction > 0 ? '上升' : '下降'}趋势，强度: ${(trendAnalysis.strength * 100).toFixed(1)}%`,
      });
    }
    
    return patterns;
  }

  /**
   * 识别反转形态
   */
  identifyReversalPattern(data: KlineData[]): PatternResult[] {
    const patterns: PatternResult[] = [];
    
    // 寻找双顶/双底
    const doubleTops = this.identifyDoubleTopBottom(data, 'top');
    const doubleBtms = this.identifyDoubleTopBottom(data, 'bottom');
    
    patterns.push(...doubleTops, ...doubleBtms);
    
    // 寻找头肩形态
    const headShoulders = this.identifyHeadAndShoulders(data);
    patterns.push(...headShoulders);
    
    return patterns;
  }

  /**
   * 综合模式识别
   */
  recognizeAllPatterns(data: KlineData[]): PatternResult[] {
    const allPatterns: PatternResult[] = [];
    
    try {
      // 识别各种形态
      const boxPatterns = this.identifyBoxPattern(data);
      const breakoutPatterns = this.identifyBreakoutPattern(data);
      const trendPatterns = this.identifyTrendPattern(data);
      const reversalPatterns = this.identifyReversalPattern(data);
      
      allPatterns.push(
        ...boxPatterns,
        ...breakoutPatterns,
        ...trendPatterns,
        ...reversalPatterns
      );
      
      // 按置信度排序
      allPatterns.sort((a, b) => b.confidence - a.confidence);
      
      this.logger.debug(`识别到 ${allPatterns.length} 个形态`);
      
    } catch (error) {
      this.logger.error('形态识别失败:', error);
    }
    
    return allPatterns;
  }

  // ===== 私有辅助方法 =====

  private findLocalExtremes(data: KlineData[], window: number): Array<{
    timestamp: number;
    price: number;
    type: 'high' | 'low';
  }> {
    const extremes: Array<{ timestamp: number; price: number; type: 'high' | 'low' }> = [];
    
    for (let i = window; i < data.length - window; i++) {
      const current = data[i];
      const slice = data.slice(i - window, i + window + 1);
      
      // 检查是否为局部最高点
      const isLocalHigh = slice.every(kline => current.highPrice >= kline.highPrice);
      if (isLocalHigh) {
        extremes.push({
          timestamp: current.openTime,
          price: current.highPrice,
          type: 'high',
        });
      }
      
      // 检查是否为局部最低点
      const isLocalLow = slice.every(kline => current.lowPrice <= kline.lowPrice);
      if (isLocalLow) {
        extremes.push({
          timestamp: current.openTime,
          price: current.lowPrice,
          type: 'low',
        });
      }
    }
    
    return extremes;
  }

  private consolidateLevels(levels: SupportResistanceLevel[], tolerance: number): SupportResistanceLevel[] {
    const consolidated: SupportResistanceLevel[] = [];
    
    for (const level of levels) {
      const existing = consolidated.find(l => 
        Math.abs(l.level - level.level) / level.level <= tolerance && l.type === level.type
      );
      
      if (existing) {
        // 合并级别
        existing.strength = Math.max(existing.strength, level.strength);
        existing.touchCount += level.touchCount;
        existing.firstTouch = Math.min(existing.firstTouch, level.firstTouch);
        existing.lastTouch = Math.max(existing.lastTouch, level.lastTouch);
      } else {
        consolidated.push({ ...level });
      }
    }
    
    return consolidated.sort((a, b) => b.strength - a.strength);
  }

  private getDataInTimeRange(data: KlineData[], startTime: number, endTime: number): KlineData[] {
    return data.filter(kline => kline.openTime >= startTime && kline.openTime <= endTime);
  }

  private validateBoxPattern(data: KlineData[], support: number, resistance: number): {
    isValid: boolean;
    confidence: number;
  } {
    let touchSupport = 0;
    let touchResistance = 0;
    let withinBox = 0;
    const tolerance = 0.01;
    
    for (const kline of data) {
      // 检查支撑位触及
      if (Math.abs(kline.lowPrice - support) / support <= tolerance) {
        touchSupport++;
      }
      
      // 检查阻力位触及
      if (Math.abs(kline.highPrice - resistance) / resistance <= tolerance) {
        touchResistance++;
      }
      
      // 检查是否在箱体内
      if (kline.lowPrice >= support * 0.99 && kline.highPrice <= resistance * 1.01) {
        withinBox++;
      }
    }
    
    const boxRatio = withinBox / data.length;
    const isValid = boxRatio >= 0.7 && touchSupport >= 2 && touchResistance >= 2;
    const confidence = Math.min(boxRatio * 100, 95);
    
    return { isValid, confidence };
  }

  private calculateBreakoutConfidence(
    data: KlineData[], 
    level: SupportResistanceLevel, 
    volumeConfirmation: boolean
  ): number {
    let confidence = 50;
    
    // 级别强度加分
    confidence += level.strength * 5;
    
    // 成交量确认加分
    if (volumeConfirmation) {
      confidence += 20;
    }
    
    // 突破幅度加分
    const currentPrice = data[data.length - 1].closePrice;
    const breakoutPercent = Math.abs(currentPrice - level.level) / level.level;
    confidence += Math.min(breakoutPercent * 1000, 15);
    
    return Math.min(confidence, 95);
  }

  private analyzeTrend(data: KlineData[]): {
    direction: number;
    strength: number;
  } {
    if (data.length < 5) {
      return { direction: 0, strength: 0 };
    }
    
    const prices = data.map(kline => kline.closePrice);
    let upMoves = 0;
    let downMoves = 0;
    
    for (let i = 1; i < prices.length; i++) {
      if (prices[i] > prices[i - 1]) {
        upMoves++;
      } else if (prices[i] < prices[i - 1]) {
        downMoves++;
      }
    }
    
    const totalMoves = upMoves + downMoves;
    const direction = upMoves > downMoves ? 1 : -1;
    const strength = Math.abs(upMoves - downMoves) / totalMoves;
    
    return { direction, strength };
  }

  private identifyDoubleTopBottom(data: KlineData[], type: 'top' | 'bottom'): PatternResult[] {
    // 简化实现，实际可以更复杂
    return [];
  }

  private identifyHeadAndShoulders(data: KlineData[]): PatternResult[] {
    // 简化实现，实际可以更复杂
    return [];
  }
} 