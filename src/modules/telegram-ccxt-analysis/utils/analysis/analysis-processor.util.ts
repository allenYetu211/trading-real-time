import { Logger } from '@nestjs/common';
import { CoreTechnicalAnalysisService } from '../../../technical-analysis/services/core-technical-analysis.service';
import { OpenInterestService } from '../../../ccxt-analysis/services/open-interest.service';
import { RSIAnalysisService } from '../../../ccxt-analysis/services/rsi-analysis.service';
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
        coreResult.srAnalysis,
        coreResult.rsiAnalysis,
        coreResult.openInterestData
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
    analysisType: AnalysisType,
    rsiAnalysisService?: RSIAnalysisService,
    openInterestService?: OpenInterestService
  ): Promise<string> {
    switch (analysisType) {
      case AnalysisType.COMPREHENSIVE:
        return this.performComprehensiveAnalysis(coreTechnicalAnalysisService, symbol);
      
      case AnalysisType.TREND:
        return this.performTrendAnalysis(coreTechnicalAnalysisService, symbol);
      
      case AnalysisType.SUPPORT_RESISTANCE:
        return this.performSupportResistanceAnalysis(coreTechnicalAnalysisService, symbol);
      
      case AnalysisType.RSI:
        return this.performRSIAnalysis(rsiAnalysisService, symbol);
      
      case AnalysisType.OPEN_INTEREST:
        return this.performOpenInterestAnalysis(openInterestService, symbol);
      
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
      [AnalysisType.EMA]: 'EMA技术分析',
      [AnalysisType.RSI]: 'RSI技术分析',
      [AnalysisType.OPEN_INTEREST]: '持仓量分析'
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

  /**
   * 执行RSI分析
   */
  static async performRSIAnalysis(
    rsiAnalysisService: RSIAnalysisService,
    symbol: string
  ): Promise<string> {
    try {
      this.logger.log(`开始执行 ${symbol} RSI分析`);

      // 执行多时间周期RSI分析
      const timeframes = ['15m', '1h', '4h', '1d'];
      const multiTimeframeRSI = await rsiAnalysisService.getMultiTimeframeRSI(symbol, timeframes);

      // 格式化多时间周期RSI分析消息
      const message = this.formatMultiTimeframeRSIMessage(multiTimeframeRSI, symbol);

      this.logger.log(`${symbol} RSI分析完成`);
      return message;

    } catch (error) {
      this.logger.error(`RSI分析失败 ${symbol}:`, error);
      throw new Error(`RSI分析失败: ${error.message}`);
    }
  }

  /**
   * 执行持仓量分析
   */
  static async performOpenInterestAnalysis(
    openInterestService: OpenInterestService,
    symbol: string
  ): Promise<string> {
    try {
      this.logger.log(`开始执行 ${symbol} 持仓量分析`);

      // 转换为期货合约格式
      const futuresSymbol = this.convertToFuturesSymbol(symbol);
      
      // 执行持仓量分析
      const oiData = await openInterestService.getOpenInterest(futuresSymbol, 'binanceusdm');
      const oiRanking = await openInterestService.getTopOpenInterestSymbols('binanceusdm', 10);

      // 格式化持仓量分析消息
      const message = this.formatOpenInterestMessage(oiData, oiRanking, futuresSymbol);

      this.logger.log(`${symbol} 持仓量分析完成`);
      return message;

    } catch (error) {
      this.logger.error(`持仓量分析失败 ${symbol}:`, error);
      throw new Error(`持仓量分析失败: ${error.message}`);
    }
  }

  /**
   * 格式化多时间周期RSI分析消息
   */
  private static formatMultiTimeframeRSIMessage(multiTimeframeData: any, symbol: string): string {
    const signalEmoji = {
      'strong_buy': '🟢',
      'buy': '🟡', 
      'hold': '🔵',
      'sell': '🟠',
      'strong_sell': '🔴'
    };

    const timeframeLabels = {
      '15m': '15分钟',
      '1h': '1小时',
      '4h': '4小时', 
      '1d': '日线'
    };

    let message = `
📉 <b>多时间周期 RSI 分析报告</b>

📊 <b>交易对:</b> ${symbol}

🕐 <b>各时间周期 RSI:</b>
`;

    // 遍历各时间周期数据
    Object.entries(multiTimeframeData).forEach(([timeframe, analysis]: [string, any]) => {
      const { currentRSI, signal, trend, riskLevel } = analysis;
      const tfLabel = timeframeLabels[timeframe] || timeframe;
      const emoji = signalEmoji[signal] || '⚪';
      
      message += `
• <b>${tfLabel}:</b> RSI ${currentRSI.rsi.toFixed(2)} | ${emoji} ${signal.toUpperCase()} | ${trend}`;
    });

    // 综合分析
    const signals = Object.values(multiTimeframeData).map((data: any) => data.signal);
    const bullishCount = signals.filter(s => s === 'strong_buy' || s === 'buy').length;
    const bearishCount = signals.filter(s => s === 'strong_sell' || s === 'sell').length;
    
    let overallSignal = 'hold';
    if (bullishCount > bearishCount) overallSignal = 'buy';
    if (bearishCount > bullishCount) overallSignal = 'sell';

    const overallEmoji = signalEmoji[overallSignal] || '⚪';
    
    message += `

📊 <b>综合判断:</b>
• ${overallEmoji} 总体信号: ${overallSignal.toUpperCase()}
• 看涨信号: ${bullishCount}/4 | 看跌信号: ${bearishCount}/4

💡 <b>操作建议:</b>
• 多个时间周期信号一致时，信号更可靠
• 短期RSI用于入场时机，长期RSI确定趋势  
• RSI 大于 70 为超买区域，RSI 小于 30 为超卖区域

⏰ <b>分析时间:</b> ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}
`;

    return message.trim();
  }

  /**
   * 格式化持仓量分析消息
   */
  private static formatOpenInterestMessage(oiData: any, ranking: any[], symbol: string): string {
    const formatNumber = (num: number) => {
      if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
      if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
      if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
      return num.toFixed(2);
    };

    let message = `
💰 <b>持仓量分析报告</b>

📊 <b>合约:</b> ${symbol}
💰 <b>当前持仓量:</b> ${formatNumber(oiData.openInterest)}
⏰ <b>更新时间:</b> ${new Date(oiData.timestamp).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}

📈 <b>热门合约持仓量排行:</b>
`;

    ranking.slice(0, 5).forEach((item, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
      message += `${medal} ${item.symbol}: ${formatNumber(item.openInterest)}\n`;
    });

    message += `
⏰ <b>分析时间:</b> ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`;

    return message.trim();
  }

  /**
   * 将现货交易对转换为期货合约格式
   */
  private static convertToFuturesSymbol(symbol: string): string {
    // 移除USDT后缀并添加期货格式
    const base = symbol.replace('USDT', '');
    return `${base}/USDT:USDT`;
  }
} 