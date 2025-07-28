import { Controller, Post, Body, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MultiTimeframeTrendService } from './services/multi-timeframe-trend.service';
import { SupportResistanceService } from './services/support-resistance.service';
import { 
  TechnicalAnalysisRequestDto,
  MultiTimeframeTrendRequestDto,
  SupportResistanceRequestDto,
  MultiTimeframeTrendResponseDto,
  SupportResistanceAnalysisResponseDto,
  TechnicalAnalysisResponseDto
} from './dto';

/**
 * 技术分析控制器
 * 提供多时间周期趋势分析和支撑阻力位分析
 */
@ApiTags('Technical Analysis')
@Controller('api/technical-analysis')
export class TechnicalAnalysisController {
  private readonly logger = new Logger(TechnicalAnalysisController.name);

  constructor(
    private readonly multiTimeframeTrendService: MultiTimeframeTrendService,
    private readonly supportResistanceService: SupportResistanceService,
  ) {}

  /**
   * 多时间周期趋势分析
   */
  @Post('trend/multi-timeframe')
  @ApiOperation({ summary: '多时间周期趋势分析' })
  @ApiResponse({
    status: 200,
    description: '返回15分钟、1小时、4小时、1日的趋势分析结果',
    type: MultiTimeframeTrendResponseDto,
  })
  async analyzeMultiTimeframeTrend(
    @Body() body: MultiTimeframeTrendRequestDto,
  ): Promise<MultiTimeframeTrendResponseDto> {
    this.logger.log(`收到多时间周期趋势分析请求: ${JSON.stringify(body)}`);

    const { symbol, exchange = 'binance' } = body;

    try {
      const result = await this.multiTimeframeTrendService.analyzeMultiTimeframeTrend(
        symbol,
        exchange,
      );

      this.logger.log(`多时间周期趋势分析完成: ${symbol} - ${result.overallTrend}`);
      return result as any;

    } catch (error) {
      this.logger.error(`多时间周期趋势分析失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 支撑阻力位分析
   */
  @Post('support-resistance')
  @ApiOperation({ summary: '支撑阻力位分析' })
  @ApiResponse({
    status: 200,
    description: '返回基于K线和EMA的支撑阻力位分析结果',
    type: SupportResistanceAnalysisResponseDto,
  })
  async analyzeSupportResistance(
    @Body() body: SupportResistanceRequestDto,
  ): Promise<SupportResistanceAnalysisResponseDto> {
    this.logger.log(`收到支撑阻力位分析请求: ${JSON.stringify(body)}`);

    const { symbol, exchange = 'binance' } = body;

    try {
      const result = await this.supportResistanceService.analyzeSupportResistance(
        symbol,
        exchange,
      );

      this.logger.log(`支撑阻力位分析完成: ${symbol}, 找到${result.allLevels.supports.length}个支撑位，${result.allLevels.resistances.length}个阻力位`);
      return result as any;

    } catch (error) {
      this.logger.error(`支撑阻力位分析失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 完整技术分析
   */
  @Post('comprehensive')
  @ApiOperation({ summary: '完整技术分析（趋势+支撑阻力位）' })
  @ApiResponse({
    status: 200,
    description: '返回包含趋势分析和支撑阻力位分析的完整技术分析结果',
    type: TechnicalAnalysisResponseDto,
  })
  async comprehensiveTechnicalAnalysis(
    @Body() body: TechnicalAnalysisRequestDto,
  ): Promise<TechnicalAnalysisResponseDto> {
    this.logger.log(`收到完整技术分析请求: ${JSON.stringify(body)}`);

    const { symbol, exchange = 'binance' } = body;

    try {
      // 并行执行趋势分析和支撑阻力位分析
      const [trendAnalysis, supportResistanceAnalysis] = await Promise.all([
        this.multiTimeframeTrendService.analyzeMultiTimeframeTrend(symbol, exchange),
        this.supportResistanceService.analyzeSupportResistance(symbol, exchange),
      ]);

      // 生成综合评估
      const overallAssessment = this.generateOverallAssessment(
        trendAnalysis,
        supportResistanceAnalysis,
      );

      const result: TechnicalAnalysisResponseDto = {
        symbol,
        timestamp: Date.now(),
        trendAnalysis: trendAnalysis as any,
        supportResistanceAnalysis: supportResistanceAnalysis as any,
        overallAssessment,
      };

      this.logger.log(`完整技术分析完成: ${symbol} - ${overallAssessment.marketCondition}`);
      return result;

    } catch (error) {
      this.logger.error(`完整技术分析失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 生成综合评估
   */
  private generateOverallAssessment(trendAnalysis: any, supportResistanceAnalysis: any) {
    const { overallTrend, overallConfidence, trendAlignment } = trendAnalysis;
    const { keyLevels, currentPosition } = supportResistanceAnalysis;

    // 判断市场状况
    let marketCondition: any = 'NEUTRAL';
    if (overallTrend.includes('UPTREND')) {
      marketCondition = 'BULLISH';
    } else if (overallTrend.includes('DOWNTREND')) {
      marketCondition = 'BEARISH';
    } else if (overallConfidence < 50) {
      marketCondition = 'VOLATILE';
    }

    // 评估风险级别
    let riskLevel: any = 'MEDIUM';
    if (trendAlignment.isAligned && overallConfidence > 80) {
      riskLevel = 'LOW';
    } else if (trendAlignment.alignmentScore < 50 || overallConfidence < 40) {
      riskLevel = 'HIGH';
    }

    // 检查是否接近关键位置
    if (currentPosition.inSupportZone || currentPosition.inResistanceZone) {
      riskLevel = 'HIGH';
    }

    // 评估机会等级
    let opportunity: any = 'FAIR';
    if (marketCondition === 'BULLISH' && riskLevel === 'LOW' && keyLevels.nearestSupport) {
      opportunity = 'EXCELLENT';
    } else if (marketCondition === 'BEARISH' && riskLevel === 'LOW' && keyLevels.nearestResistance) {
      opportunity = 'EXCELLENT';
    } else if ((marketCondition === 'BULLISH' || marketCondition === 'BEARISH') && riskLevel === 'MEDIUM') {
      opportunity = 'GOOD';
    } else if (riskLevel === 'HIGH' || marketCondition === 'VOLATILE') {
      opportunity = 'POOR';
    }

    // 确定适合的时间框架
    let timeframe: any = 'MEDIUM_TERM';
    if (trendAlignment.isAligned && overallTrend.includes('STRONG')) {
      timeframe = 'LONG_TERM';
    } else if (overallConfidence < 60 || !trendAlignment.isAligned) {
      timeframe = 'SHORT_TERM';
    }

    // 生成综合建议
    let recommendation = this.generateRecommendation(
      marketCondition,
      riskLevel,
      opportunity,
      timeframe,
      overallTrend,
      currentPosition,
      keyLevels,
    );

    return {
      marketCondition,
      riskLevel,
      opportunity,
      timeframe,
      recommendation,
    };
  }

  /**
   * 生成综合建议
   */
  private generateRecommendation(
    marketCondition: string,
    riskLevel: string,
    opportunity: string,
    timeframe: string,
    overallTrend: string,
    currentPosition: any,
    keyLevels: any,
  ): string {
    let recommendation = '';

    // 基础趋势判断
    if (marketCondition === 'BULLISH') {
      recommendation += '多时间周期呈现上涨趋势';
    } else if (marketCondition === 'BEARISH') {
      recommendation += '多时间周期呈现下跌趋势';
    } else if (marketCondition === 'VOLATILE') {
      recommendation += '市场波动较大，趋势不明确';
    } else {
      recommendation += '市场处于震荡状态';
    }

    // 支撑阻力位信息
    if (keyLevels.nearestSupport && keyLevels.nearestResistance) {
      const supportPrice = keyLevels.nearestSupport.priceRange.center.toFixed(2);
      const resistancePrice = keyLevels.nearestResistance.priceRange.center.toFixed(2);
      recommendation += `，当前在${supportPrice}支撑位和${resistancePrice}阻力位之间运行`;
    }

    // 位置分析
    if (currentPosition.inSupportZone) {
      recommendation += '，目前位于支撑区域，可关注反弹机会';
    } else if (currentPosition.inResistanceZone) {
      recommendation += '，目前位于阻力区域，需谨慎追高';
    } else if (currentPosition.priceAction === 'APPROACHING_SUPPORT') {
      recommendation += '，价格正接近支撑位，可逢低关注';
    } else if (currentPosition.priceAction === 'APPROACHING_RESISTANCE') {
      recommendation += '，价格正接近阻力位，建议减仓或观望';
    }

    // 风险和机会评估
    if (riskLevel === 'LOW' && opportunity === 'EXCELLENT') {
      recommendation += '。风险较低，机会优秀，适合积极参与';
    } else if (riskLevel === 'MEDIUM' && opportunity === 'GOOD') {
      recommendation += '。风险中等，机会良好，可适度参与';
    } else if (riskLevel === 'HIGH' || opportunity === 'POOR') {
      recommendation += '。当前风险较高，建议观望等待更好时机';
    }

    // 时间框架建议
    if (timeframe === 'LONG_TERM') {
      recommendation += '，适合长期投资策略';
    } else if (timeframe === 'MEDIUM_TERM') {
      recommendation += '，适合中期交易策略';
    } else {
      recommendation += '，仅适合短期交易，需密切关注';
    }

    return recommendation;
  }
} 