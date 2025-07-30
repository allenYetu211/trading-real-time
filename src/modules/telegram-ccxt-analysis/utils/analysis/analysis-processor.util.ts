import { Logger } from '@nestjs/common';
import { CoreTechnicalAnalysisService } from '../../../technical-analysis/services/core-technical-analysis.service';
import { 
  ComprehensiveAnalysisFormatter,
  TrendAnalysisFormatter,
  SupportResistanceFormatter
} from '../formatters';
import { AnalysisType } from '../interfaces';

/**
 * 分析处理器工具类
 * 负责执行各种技术分析并格式化结果
 */
export class AnalysisProcessorUtil {
  private static readonly logger = new Logger(AnalysisProcessorUtil.name);

  /**
   * 执行完整技术分析
   */
  static async performComprehensiveAnalysis(
    coreTechnicalAnalysisService: CoreTechnicalAnalysisService,
    symbol: string
  ): Promise<string> {
    try {
      this.logger.log(`开始执行 ${symbol} 完整技术分析`);

      // 使用核心服务执行完整技术分析
      const coreResult = await coreTechnicalAnalysisService.performComprehensiveAnalysis(symbol);

      // 格式化消息
      const message = ComprehensiveAnalysisFormatter.formatMessage(
        symbol,
        coreResult.emaAnalysis,
        coreResult.emaDetailedData,
        coreResult.trendAnalysis,
        coreResult.srAnalysis
      );

      this.logger.log(`${symbol} 完整技术分析完成`);
      return message;

    } catch (error) {
      this.logger.error(`完整技术分析失败 ${symbol}:`, error);
      throw new Error(`技术分析失败: ${error.message}`);
    }
  }

  /**
   * 执行趋势分析
   */
  static async performTrendAnalysis(
    coreTechnicalAnalysisService: CoreTechnicalAnalysisService,
    symbol: string
  ): Promise<string> {
    try {
      this.logger.log(`开始执行 ${symbol} 趋势分析`);

      // 使用核心服务获取趋势分析结果
      const trendAnalysis = await coreTechnicalAnalysisService.getTrendAnalysis(symbol);

      // 格式化消息
      const message = TrendAnalysisFormatter.formatMessage(symbol, trendAnalysis);

      this.logger.log(`${symbol} 趋势分析完成`);
      return message;

    } catch (error) {
      this.logger.error(`趋势分析失败 ${symbol}:`, error);
      throw new Error(`趋势分析失败: ${error.message}`);
    }
  }

  /**
   * 执行支撑阻力位分析
   */
  static async performSupportResistanceAnalysis(
    coreTechnicalAnalysisService: CoreTechnicalAnalysisService,
    symbol: string
  ): Promise<string> {
    try {
      this.logger.log(`开始执行 ${symbol} 支撑阻力位分析`);

      // 使用核心服务获取支撑阻力位分析结果
      const srAnalysis = await coreTechnicalAnalysisService.getSupportResistanceAnalysis(symbol);

      // 格式化消息
      const message = SupportResistanceFormatter.formatMessage(symbol, srAnalysis);

      this.logger.log(`${symbol} 支撑阻力位分析完成`);
      return message;

    } catch (error) {
      this.logger.error(`支撑阻力位分析失败 ${symbol}:`, error);
      throw new Error(`支撑阻力位分析失败: ${error.message}`);
    }
  }

  /**
   * 根据分析类型执行相应的分析
   */
  static async performAnalysisByType(
    coreTechnicalAnalysisService: CoreTechnicalAnalysisService,
    symbol: string,
    analysisType: AnalysisType
  ): Promise<string> {
    switch (analysisType) {
      case AnalysisType.COMPREHENSIVE:
        return this.performComprehensiveAnalysis(coreTechnicalAnalysisService, symbol);
      
      case AnalysisType.TREND:
        return this.performTrendAnalysis(coreTechnicalAnalysisService, symbol);
      
      case AnalysisType.SUPPORT_RESISTANCE:
        return this.performSupportResistanceAnalysis(coreTechnicalAnalysisService, symbol);
      
      default:
        return this.performComprehensiveAnalysis(coreTechnicalAnalysisService, symbol);
    }
  }

  /**
   * 获取分析类型的描述文本
   */
  static getAnalysisTypeDescription(analysisType: AnalysisType): string {
    const descriptions = {
      [AnalysisType.COMPREHENSIVE]: '完整技术分析',
      [AnalysisType.TREND]: '多时间周期趋势分析',
      [AnalysisType.SUPPORT_RESISTANCE]: '支撑阻力位分析',
      [AnalysisType.EMA]: 'EMA技术分析'
    };
    
    return descriptions[analysisType] || '完整技术分析';
  }

  /**
   * 验证交易对格式
   */
  static validateSymbol(symbol: string): boolean {
    // 基本的交易对格式验证
    const symbolRegex = /^[A-Z]{2,10}USDT?$/;
    return symbolRegex.test(symbol.toUpperCase());
  }

  /**
   * 标准化交易对名称
   */
  static normalizeSymbol(symbol: string): string {
    let normalized = symbol.toUpperCase().trim();
    
    // 移除可能的特殊字符
    normalized = normalized.replace(/[^A-Z0-9]/g, '');
    
    // 如果没有USDT后缀，添加它
    if (!normalized.endsWith('USDT') && !normalized.endsWith('USD')) {
      normalized += 'USDT';
    }
    
    return normalized;
  }
} 