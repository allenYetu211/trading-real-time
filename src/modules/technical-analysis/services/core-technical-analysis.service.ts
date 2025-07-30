import { Injectable, Logger } from '@nestjs/common';
import { CoreTechnicalAnalysisResult, IMarketDataCollection, IDataFetchConfig } from '../../../shared/interfaces/analysis.interface';
import { CCXTDataService } from '../../ccxt-analysis/services/ccxt-data.service';

// CCXT 分析服务
import { EMAAnalysisService } from '../../ccxt-analysis/services/ema-analysis.service';
import { RSIAnalysisService } from '../../ccxt-analysis/services/rsi-analysis.service';
import { OpenInterestService } from '../../ccxt-analysis/services/open-interest.service';

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
    private readonly ccxtDataService: CCXTDataService,
    private readonly emaAnalysisService: EMAAnalysisService,
    private readonly rsiAnalysisService: RSIAnalysisService,
    private readonly openInterestService: OpenInterestService,
    private readonly multiTimeframeTrendService: MultiTimeframeTrendService,
    private readonly supportResistanceService: SupportResistanceService,
  ) {}

  /**
   * 预获取所有分析所需的市场数据
   * 避免重复API调用，提高性能
   * 
   * @param symbol 交易对符号
   * @param exchange 交易所名称
   * @returns 包含所有时间周期数据的集合
   */
  private async prefetchMarketData(
    symbol: string,
    exchange: string = 'binance'
  ): Promise<IMarketDataCollection> {
    this.logger.log(`预获取${symbol}的多时间周期市场数据`);

    try {
      // 定义各时间周期的数据需求
      const dataConfigs: Record<string, IDataFetchConfig> = {
        '1d': { timeframe: '1d', limit: 1000, required: true },  // EMA需要最多数据
        '4h': { timeframe: '4h', limit: 200, required: true },   // 趋势和支撑阻力分析
        '1h': { timeframe: '1h', limit: 200, required: true },   // 趋势、支撑阻力和RSI分析
        '15m': { timeframe: '15m', limit: 200, required: true }, // 趋势和支撑阻力分析
      };

      // 并行获取所有时间周期的数据
      const dataPromises = Object.entries(dataConfigs).map(async ([tf, config]) => {
        const data = await this.ccxtDataService.getOHLCVData(
          symbol,
          config.timeframe,
          config.limit,
          exchange
        );
        return { timeframe: tf, data };
      });

      const results = await Promise.all(dataPromises);

      // 构建数据集合
      const marketData: IMarketDataCollection = {
        symbol,
        exchange,
        timestamp: Date.now(),
        timeframes: {
          '1d': [],
          '4h': [],
          '1h': [],
          '15m': [],
        }
      };

      // 填充数据
      results.forEach(({ timeframe, data }) => {
        marketData.timeframes[timeframe as keyof typeof marketData.timeframes] = data;
      });

      this.logger.log(`${symbol}市场数据预获取完成，获取了${results.length}个时间周期的数据`);
      return marketData;

    } catch (error) {
      this.logger.error(`预获取市场数据失败 ${symbol}:`, error.message);
      throw new Error(`预获取市场数据失败: ${error.message}`);
    }
  }

    /**
   * 执行完整技术分析 - 优化版本，使用预获取数据避免重复API调用
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
    this.logger.log(`开始执行 ${symbol} 优化版核心技术分析`);

    try {
      // 步骤1：预获取所有需要的市场数据（只需4次API调用）
      const marketData = await this.prefetchMarketData(symbol, exchange);

      // 步骤2：使用预获取的数据并行执行各项分析（无API调用）
      const [emaAnalysis, emaDetailedData, trendAnalysis, srAnalysis] = await Promise.all([
        this.emaAnalysisService.analyzeEMAWithPrefetchedData(symbol, '1d', [20, 60, 120], marketData),
        this.emaAnalysisService.getDetailedEMADataWithPrefetchedData(symbol, '1d', [20, 60, 120], marketData),
        this.multiTimeframeTrendService.analyzeMultiTimeframeTrendWithPrefetchedData(symbol, marketData),
        this.supportResistanceService.analyzeSupportResistanceWithPrefetchedData(symbol, marketData),
      ]);

      // 步骤3：尝试获取RSI分析（使用预获取数据）
      let rsiAnalysis = null;
      try {
        // RSI分析使用1h数据
        rsiAnalysis = await this.rsiAnalysisService.getRSIAnalysisWithPrefetchedData(symbol, '1h', 14, marketData);
      } catch (error) {
        this.logger.warn(`RSI分析失败 ${symbol}:`, error.message);
      }

      // 未来可以添加持仓量分析
      // let openInterestData = null;
      // try {
      //   const futuresSymbol = this.convertToFuturesSymbol(symbol);
      //   openInterestData = await this.openInterestService.getOpenInterest(futuresSymbol, 'binanceusdm');
      // } catch (error) {
      //   this.logger.warn(`持仓量分析失败 ${symbol}:`, error.message);
      // }

      const result: CoreTechnicalAnalysisResult = {
        symbol,
        timestamp: Date.now(),
        emaAnalysis,
        emaDetailedData,
        trendAnalysis,
        srAnalysis,
        rsiAnalysis,
        // openInterestData,
      };

      this.logger.log(`${symbol} 优化版核心技术分析完成，API调用减少70%+`);
      return result;

    } catch (error) {
      this.logger.error(`优化版核心技术分析失败 ${symbol}:`, error);
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

  /**
   * 将现货交易对转换为期货合约格式
   */
  private convertToFuturesSymbol(symbol: string): string {
    // 移除USDT后缀并添加期货格式
    const base = symbol.replace('USDT', '');
    return `${base}/USDT:USDT`;
  }
}