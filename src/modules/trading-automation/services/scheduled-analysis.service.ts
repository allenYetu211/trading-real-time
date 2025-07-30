import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';
import { CoreTechnicalAnalysisService } from 'src/modules/technical-analysis/services/core-technical-analysis.service';
import { SupportResistanceService } from 'src/modules/technical-analysis/services/support-resistance.service';
import { CoinConfigService } from 'src/modules/coin-config/coin-config.service';

/**
 * 定时技术分析服务
 * 每15分钟对所有活跃交易对执行完整技术分析并存储结果
 */
@Injectable()
export class ScheduledAnalysisService {
  private readonly logger = new Logger(ScheduledAnalysisService.name);
  private isAnalysisRunning = false;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly coreTechnicalAnalysisService: CoreTechnicalAnalysisService,
    private readonly supportResistanceService: SupportResistanceService,
    private readonly coinConfigService: CoinConfigService,
  ) {}

  /**
   * 每1分钟执行一次完整技术分析
   * 定时任务：每1分钟的第0秒执行
   */

  // @Cron('0 */15 * * * *', {
  @Cron('0 */1 * * * *', {
    name: 'scheduled-technical-analysis',
    timeZone: 'Asia/Shanghai',
  })
  async executeScheduledAnalysis(): Promise<void> {
    if (this.isAnalysisRunning) {
      this.logger.warn('上一次分析尚未完成，跳过本次执行');
      return;
    }

    this.isAnalysisRunning = true;
    const startTime = Date.now();

    try {
      this.logger.log('开始执行定时技术分析...');

      // 获取所有活跃的交易对配置
      const activeConfigs = await this.coinConfigService.findActiveConfigs();
      this.logger.log(`发现 ${activeConfigs.length} 个活跃的交易对配置`);

      if (activeConfigs.length === 0) {
        this.logger.warn('没有发现活跃的交易对配置');
        return;
      }

      // 并行执行技术分析
      const analysisPromises = activeConfigs.map(config =>
        this.analyzeSymbol(config.symbol, config.interval)
      );

      const results = await Promise.allSettled(analysisPromises);
      
      // 统计结果
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      const duration = Date.now() - startTime;
      this.logger.log(
        `定时技术分析完成: 成功 ${successful}，失败 ${failed}，耗时 ${duration}ms`
      );

      // 记录失败的分析
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          const config = activeConfigs[index];
          this.logger.error(
            `分析失败 ${config.symbol}(${config.interval}): ${result.reason}`
          );
        }
      });

    } catch (error) {
      this.logger.error(`定时技术分析执行异常: ${error.message}`, error.stack);
    } finally {
      this.isAnalysisRunning = false;
    }
  }

  /**
   * 对单个交易对执行完整技术分析
   */
  private async analyzeSymbol(symbol: string, interval: string): Promise<void> {
    try {
      this.logger.debug(`开始分析 ${symbol}(${interval})`);

      // 执行核心技术分析
      const analysisResult = await this.coreTechnicalAnalysisService.performComprehensiveAnalysis(
        symbol
      );

      // 从核心分析结果中获取支撑阻力分析
      const supportResistanceAnalysis = analysisResult.srAnalysis;

      // 准备存储数据
      const timestamp = BigInt(Date.now());
      const currentPrice = supportResistanceAnalysis.currentPrice;

      // 转换买入/卖出区间为JSON字符串
      const buyZonesJson = JSON.stringify(supportResistanceAnalysis.tradingZones?.buyZones || []);
      const sellZonesJson = JSON.stringify(supportResistanceAnalysis.tradingZones?.sellZones || []);

      // 从趋势分析中提取评分信息
      const trendAnalysis = analysisResult.trendAnalysis;
      const emaAnalysis = analysisResult.emaAnalysis;

      // 存储分析结果到数据库
      await this.prismaService.analysisResult.create({
        data: {
          symbol,
          interval,
          timestamp,
          trendScore: trendAnalysis?.overallTrend?.score || 0,
          momentumScore: emaAnalysis?.momentum?.score || 0,
          volatilityScore: trendAnalysis?.volatility?.score || 0,
          signal: trendAnalysis?.overallTrend?.direction || 'HOLD',
          confidence: trendAnalysis?.overallTrend?.confidence || 0.5,
          patterns: JSON.stringify(trendAnalysis?.patterns || []),
          supportResistance: JSON.stringify({
            supports: supportResistanceAnalysis.allLevels?.supports || [],
            resistances: supportResistanceAnalysis.allLevels?.resistances || [],
          }),
          buyZones: buyZonesJson,
          sellZones: sellZonesJson,
          currentPrice,
          summary: this.generateAnalysisSummary(analysisResult, supportResistanceAnalysis),
        },
      });

      this.logger.debug(`分析完成并存储: ${symbol}(${interval})`);

    } catch (error) {
      this.logger.error(`分析 ${symbol}(${interval}) 失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 生成分析摘要
   */
  private generateAnalysisSummary(
    analysisResult: any,
    supportResistanceAnalysis: any
  ): string {
    const buyZoneCount = supportResistanceAnalysis.tradingZones?.buyZones?.length || 0;
    const sellZoneCount = supportResistanceAnalysis.tradingZones?.sellZones?.length || 0;
    const signal = analysisResult.trendAnalysis?.overallTrend?.direction || 'HOLD';
    const confidence = analysisResult.trendAnalysis?.overallTrend?.confidence || 0.5;
    const trendScore = analysisResult.trendAnalysis?.overallTrend?.score || 0;
    
    return `技术分析: ${signal} (置信度: ${(confidence * 100).toFixed(1)}%)，` +
           `趋势评分: ${trendScore}，` +
           `发现 ${buyZoneCount} 个买入区间，${sellZoneCount} 个卖出区间`;
  }

  /**
   * 手动触发分析（用于测试）
   */
  async triggerManualAnalysis(symbol?: string): Promise<void> {
    this.logger.log(`手动触发技术分析: ${symbol || '所有交易对'}`);
    
    if (symbol) {
      // 分析单个交易对，找到第一个匹配的配置
      const configs = await this.coinConfigService.findAll({ symbol });
      const config = configs.find(c => c.isActive);
      if (!config) {
        throw new Error(`未找到交易对 ${symbol} 的活跃配置`);
      }
      await this.analyzeSymbol(config.symbol, config.interval);
    } else {
      // 分析所有交易对
      await this.executeScheduledAnalysis();
    }
  }

  /**
   * 获取分析服务状态
   */
  getAnalysisStatus(): {
    isRunning: boolean;
    lastExecutionTime?: number;
  } {
    return {
      isRunning: this.isAnalysisRunning,
    };
  }
}