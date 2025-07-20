import { Injectable, Logger } from '@nestjs/common';
import { DataService } from '../data/data.service';
import { IndicatorService, IndicatorResult } from './indicators/indicator.service';
import { PatternRecognitionService, PatternResult, SupportResistanceLevel } from './patterns/pattern-recognition.service';
import { KlineData } from 'src/shared/interfaces';
import { IntervalType, PatternType, SignalType } from 'src/shared/enums';
import { PrismaService } from 'src/prisma/prisma.service';

export interface AnalysisResult {
  id?: number;
  symbol: string;
  interval: string;
  timestamp: number;
  trendScore: number;
  momentumScore: number;
  volatilityScore: number;
  signal: SignalType;
  confidence: number;
  patterns: any[];
  supportResistance: any[];
  summary: string;
  createdAt?: Date;
}

export interface ComprehensiveAnalysis {
  symbol: string;
  interval: IntervalType;
  timestamp: number;
  klineCount: number;
  
  // 技术指标
  indicators: {
    [key: string]: IndicatorResult[];
  };
  
  // 图形形态
  patterns: PatternResult[];
  
  // 支撑阻力位
  supportResistance: SupportResistanceLevel[];
  
  // 综合评分
  score: {
    trend: number; // 趋势强度 -100 到 100
    momentum: number; // 动量 -100 到 100
    volatility: number; // 波动率 0 到 100
    signal: SignalType; // 综合信号
    confidence: number; // 置信度 0 到 100
  };
  
  // 分析总结
  summary: string;
}

@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name);

  constructor(
    private readonly dataService: DataService,
    private readonly indicatorService: IndicatorService,
    private readonly patternService: PatternRecognitionService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * 执行综合分析
   */
  async performComprehensiveAnalysis(
    symbol: string, 
    interval: IntervalType, 
    limit: number = 100
  ): Promise<ComprehensiveAnalysis> {
    try {
      // this.logger.log(`开始分析: ${symbol} ${interval}`);
      
      // 获取K线数据
      const klineData = await this.dataService.getKlineData({
        symbol,
        interval,
        limit,
      });
      
      if (klineData.length < 20) {
        throw new Error(`数据不足，需要至少20根K线，当前只有${klineData.length}根`);
      }
      
      // 并行计算各种分析
      const [indicators, patterns, supportResistance] = await Promise.all([
        this.calculateIndicators(klineData),
        this.recognizePatterns(klineData),
        this.identifySupportResistance(klineData),
      ]);
      
      // 计算综合评分
      const score = this.calculateComprehensiveScore(klineData, indicators, patterns);
      
      // 生成分析总结
      const summary = this.generateAnalysisSummary(score, patterns, supportResistance);
      
      const analysis: ComprehensiveAnalysis = {
        symbol,
        interval,
        timestamp: Date.now(),
        klineCount: klineData.length,
        indicators,
        patterns,
        supportResistance,
        score,
        summary,
      };
      
      // 保存分析结果到数据库
      await this.saveAnalysisResult(analysis);
      
      // this.logger.log(`分析完成: ${symbol} ${interval}, 信号: ${score.signal}, 置信度: ${score.confidence}%`);
      
      return analysis;
      
    } catch (error) {
      this.logger.error(`分析失败: ${symbol} ${interval}`, error);
      throw error;
    }
  }

  /**
   * 批量分析活跃配置
   */
  async performBatchAnalysis(): Promise<ComprehensiveAnalysis[]> {
    // 获取活跃配置 - 这里暂时硬编码，实际应该从数据库获取
    const activeConfigs = [
      { symbol: 'BTCUSDT', interval: IntervalType.ONE_HOUR },
      { symbol: 'ETHUSDT', interval: IntervalType.FOUR_HOURS },
      { symbol: 'ADAUSDT', interval: IntervalType.FIFTEEN_MINUTES },
    ];
    
    const results: ComprehensiveAnalysis[] = [];
    
    for (const config of activeConfigs) {
      try {
        const analysis = await this.performComprehensiveAnalysis(config.symbol, config.interval);
        results.push(analysis);
      } catch (error) {
        this.logger.error(`批量分析失败: ${config.symbol} ${config.interval}`, error);
      }
    }
    
    return results;
  }

  /**
   * 获取历史分析结果
   */
  async getHistoricalAnalysis(
    symbol: string,
    interval: IntervalType,
    limit: number = 10
  ): Promise<AnalysisResult[]> {
    const results = await this.prisma.analysisResult.findMany({
      where: {
        symbol,
        interval,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });
    
    return results.map(result => ({
      id: result.id,
      symbol: result.symbol,
      interval: result.interval,
      timestamp: Number(result.timestamp),
      trendScore: Number(result.trendScore),
      momentumScore: Number(result.momentumScore),
      volatilityScore: Number(result.volatilityScore),
      signal: result.signal as SignalType,
      confidence: Number(result.confidence),
      patterns: result.patterns ? JSON.parse(result.patterns) : [],
      supportResistance: result.supportResistance ? JSON.parse(result.supportResistance) : [],
      summary: result.summary,
      createdAt: result.createdAt,
    }));
  }

  /**
   * 计算技术指标
   */
  private async calculateIndicators(data: KlineData[]): Promise<{ [key: string]: IndicatorResult[] }> {
    const indicators = [
      'sma20', 'sma50', 'ema12', 'ema26', 
      'macd', 'rsi', 'bollinger', 'stochastic', 'momentum'
    ];
    
    return this.indicatorService.calculateMultipleIndicators(data, indicators);
  }

  /**
   * 识别图形形态
   */
  private async recognizePatterns(data: KlineData[]): Promise<PatternResult[]> {
    return this.patternService.recognizeAllPatterns(data);
  }

  /**
   * 识别支撑阻力位
   */
  private async identifySupportResistance(data: KlineData[]): Promise<SupportResistanceLevel[]> {
    return this.patternService.identifySupportResistance(data);
  }

  /**
   * 计算综合评分
   */
  private calculateComprehensiveScore(
    data: KlineData[],
    indicators: { [key: string]: IndicatorResult[] },
    patterns: PatternResult[]
  ): {
    trend: number;
    momentum: number;
    volatility: number;
    signal: SignalType;
    confidence: number;
  } {
    let trendScore = 0;
    let momentumScore = 0;
    let volatilityScore = 0;
    
    // 基于移动平均线计算趋势分数
    if (indicators.sma20 && indicators.sma50) {
      const sma20Latest = indicators.sma20[indicators.sma20.length - 1]?.value as number;
      const sma50Latest = indicators.sma50[indicators.sma50.length - 1]?.value as number;
      const currentPrice = data[data.length - 1].closePrice;
      
      if (sma20Latest && sma50Latest) {
        // 价格相对于均线的位置
        const priceVsSma20 = ((currentPrice - sma20Latest) / sma20Latest) * 100;
        const priceVsSma50 = ((currentPrice - sma50Latest) / sma50Latest) * 100;
        
        // 均线排列
        const smaAlignment = ((sma20Latest - sma50Latest) / sma50Latest) * 100;
        
        trendScore = Math.max(-100, Math.min(100, 
          priceVsSma20 * 0.4 + priceVsSma50 * 0.3 + smaAlignment * 0.3
        ));
      }
    }
    
    // 基于RSI和MACD计算动量分数
    if (indicators.rsi) {
      const rsiLatest = indicators.rsi[indicators.rsi.length - 1]?.value as number;
      if (rsiLatest) {
        // RSI转换为动量分数
        momentumScore += (rsiLatest - 50) * 2; // -100 到 100
      }
    }
    
    if (indicators.macd) {
      const macdLatest = indicators.macd[indicators.macd.length - 1]?.value as any;
      if (macdLatest?.histogram) {
        // MACD柱状图归一化
        momentumScore += Math.max(-50, Math.min(50, macdLatest.histogram * 1000));
      }
    }
    
    momentumScore = Math.max(-100, Math.min(100, momentumScore / 2));
    
    // 基于布林带计算波动率
    if (indicators.bollinger) {
      const bbLatest = indicators.bollinger[indicators.bollinger.length - 1]?.value as any;
      const currentPrice = data[data.length - 1].closePrice;
      
      if (bbLatest?.upper && bbLatest?.lower) {
        const bbWidth = (bbLatest.upper - bbLatest.lower) / bbLatest.middle;
        volatilityScore = Math.min(100, bbWidth * 500);
        
        // 价格在布林带中的位置
        const bbPosition = (currentPrice - bbLatest.lower) / (bbLatest.upper - bbLatest.lower);
        if (bbPosition > 0.8) momentumScore += 10;
        if (bbPosition < 0.2) momentumScore -= 10;
      }
    }
    
    // 基于形态识别调整分数
    for (const pattern of patterns) {
      const weight = pattern.confidence / 100;
      
      switch (pattern.signal) {
        case SignalType.BUY:
          trendScore += 20 * weight;
          momentumScore += 15 * weight;
          break;
        case SignalType.SELL:
          trendScore -= 20 * weight;
          momentumScore -= 15 * weight;
          break;
      }
    }
    
    // 确保分数在范围内
    trendScore = Math.max(-100, Math.min(100, trendScore));
    momentumScore = Math.max(-100, Math.min(100, momentumScore));
    volatilityScore = Math.max(0, Math.min(100, volatilityScore));
    
    // 确定综合信号
    const combinedScore = (trendScore + momentumScore) / 2;
    let signal: SignalType = SignalType.NEUTRAL;
    let confidence = 0;
    
    if (combinedScore > 20) {
      signal = SignalType.BUY;
      confidence = Math.min(95, Math.abs(combinedScore));
    } else if (combinedScore < -20) {
      signal = SignalType.SELL;
      confidence = Math.min(95, Math.abs(combinedScore));
    } else {
      signal = SignalType.NEUTRAL;
      confidence = 50 + Math.abs(combinedScore);
    }
    
    // 基于形态置信度调整总体置信度
    const patternConfidence = patterns.length > 0 
      ? Math.max(...patterns.map(p => p.confidence)) 
      : 0;
    confidence = (confidence + patternConfidence) / 2;
    
    return {
      trend: Math.round(trendScore),
      momentum: Math.round(momentumScore),
      volatility: Math.round(volatilityScore),
      signal,
      confidence: Math.round(confidence),
    };
  }

  /**
   * 生成分析总结
   */
  private generateAnalysisSummary(
    score: any,
    patterns: PatternResult[],
    supportResistance: SupportResistanceLevel[]
  ): string {
    const parts: string[] = [];
    
    // 趋势分析
    if (score.trend > 30) {
      parts.push('强上升趋势');
    } else if (score.trend > 10) {
      parts.push('弱上升趋势');
    } else if (score.trend < -30) {
      parts.push('强下降趋势');
    } else if (score.trend < -10) {
      parts.push('弱下降趋势');
    } else {
      parts.push('横盘整理');
    }
    
    // 动量分析
    if (score.momentum > 20) {
      parts.push('动量强劲');
    } else if (score.momentum < -20) {
      parts.push('动量疲弱');
    } else {
      parts.push('动量中性');
    }
    
    // 波动率分析
    if (score.volatility > 60) {
      parts.push('高波动');
    } else if (score.volatility < 30) {
      parts.push('低波动');
    } else {
      parts.push('中等波动');
    }
    
    // 形态分析
    const significantPatterns = patterns.filter(p => p.confidence > 70);
    if (significantPatterns.length > 0) {
      const patternTypes = significantPatterns.map(p => {
        switch (p.type) {
          case PatternType.BOX: return '箱体';
          case PatternType.BREAKOUT: return '突破';
          case PatternType.UPTREND: return '上升趋势';
          case PatternType.DOWNTREND: return '下降趋势';
          default: return '特殊形态';
        }
      });
      parts.push(`识别到${patternTypes.join('、')}形态`);
    }
    
    // 支撑阻力分析
    const strongLevels = supportResistance.filter(l => l.strength >= 5);
    if (strongLevels.length > 0) {
      parts.push(`${strongLevels.length}个重要支撑阻力位`);
    }
    
    // 信号总结
    const signalText = score.signal === SignalType.BUY ? '看多' : 
                      score.signal === SignalType.SELL ? '看空' : '观望';
    parts.push(`综合信号: ${signalText}(置信度${score.confidence}%)`);
    
    return parts.join('，');
  }

  /**
   * 保存分析结果
   */
  private async saveAnalysisResult(analysis: ComprehensiveAnalysis): Promise<void> {
    try {
      await this.prisma.analysisResult.create({
        data: {
          symbol: analysis.symbol,
          interval: analysis.interval,
          timestamp: BigInt(analysis.timestamp),
          trendScore: analysis.score.trend,
          momentumScore: analysis.score.momentum,
          volatilityScore: analysis.score.volatility,
          signal: analysis.score.signal,
          confidence: analysis.score.confidence,
          patterns: JSON.stringify(analysis.patterns),
          supportResistance: JSON.stringify(analysis.supportResistance),
          summary: analysis.summary,
        },
      });
      
      // this.logger.debug(`分析结果已保存: ${analysis.symbol} ${analysis.interval}`);
    } catch (error) {
      this.logger.error('保存分析结果失败:', error);
    }
  }
} 