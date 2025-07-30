import { Injectable, Logger } from '@nestjs/common';
import { CoreTechnicalAnalysisResult } from '../../../shared/interfaces/analysis.interface';

// CCXT 分析服务
import { EMAAnalysisService } from '../../ccxt-analysis/services/ema-analysis.service';

// 技术分析服务
import { MultiTimeframeTrendService } from './multi-timeframe-trend.service';
import { SupportResistanceService } from './support-resistance.service';

/**
 * 核心技术分析服务
 * 提供统一的完整技术分析计算逻辑，确保所有分析类型都基于相同的准确计算
 */
@Injectable()
export class CoreTechnicalAnalysisService {
  private readonly logger = new Logger(CoreTechnicalAnalysisService.name);

  constructor(
    private readonly emaAnalysisService: EMAAnalysisService,
    private readonly multiTimeframeTrendService: MultiTimeframeTrendService,
    private readonly supportResistanceService: SupportResistanceService,
  ) {}

  /**
   * 执行完整技术分析
   * 这是所有技术分析的核心方法，返回准确的计算结果
   * 
   * @param symbol 交易对符号
   * @param exchange 交易所名称，默认为 'binance'
   * @returns 完整的技术分析结果
   */
  async performComprehensiveAnalysis(
    symbol: string, 
    exchange: string = 'binance'
  ): Promise<CoreTechnicalAnalysisResult> {
    this.logger.log(`开始执行 ${symbol} 核心技术分析`);

    try {
      // 并行执行所有分析功能 (使用100根K线，约4-5个月数据)
      const [emaAnalysis, emaDetailedData, trendAnalysis, srAnalysis] = await Promise.all([
        this.emaAnalysisService.analyzeEMA(symbol, '1d', [20, 60, 120]),
        this.emaAnalysisService.getDetailedEMAData(symbol, '1d', [20, 60, 120], 100),
        this.multiTimeframeTrendService.analyzeMultiTimeframeTrend(symbol, exchange),
        this.supportResistanceService.analyzeSupportResistance(symbol, exchange),
      ]);

      const result: CoreTechnicalAnalysisResult = {
        symbol,
        timestamp: Date.now(),
        emaAnalysis,
        emaDetailedData,
        trendAnalysis,
        srAnalysis,
      };

      this.logger.log(`${symbol} 核心技术分析完成`);
      return result;

    } catch (error) {
      this.logger.error(`核心技术分析失败 ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * 获取趋势分析结果
   * 基于核心分析结果提取趋势相关数据
   */
  async getTrendAnalysis(symbol: string, exchange: string = 'binance'): Promise<any> {
    const coreResult = await this.performComprehensiveAnalysis(symbol, exchange);
    return coreResult.trendAnalysis;
  }

  /**
   * 获取支撑阻力位分析结果
   * 基于核心分析结果提取支撑阻力位相关数据
   */
  async getSupportResistanceAnalysis(symbol: string, exchange: string = 'binance'): Promise<any> {
    const coreResult = await this.performComprehensiveAnalysis(symbol, exchange);
    return coreResult.srAnalysis;
  }

  /**
   * 获取EMA分析结果
   * 基于核心分析结果提取EMA相关数据
   */
  async getEMAAnalysis(symbol: string, exchange: string = 'binance'): Promise<{ analysis: any; detailedData: any }> {
    const coreResult = await this.performComprehensiveAnalysis(symbol, exchange);
    return {
      analysis: coreResult.emaAnalysis,
      detailedData: coreResult.emaDetailedData,
    };
  }
}