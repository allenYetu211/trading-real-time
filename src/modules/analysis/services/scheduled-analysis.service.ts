import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AnalysisService } from '../analysis.service';
import { NotificationService } from '../../notification/notification.service';
import { CoinConfigService } from '../../coin-config/coin-config.service';
import { DataService } from '../../data/data.service';
import { IntervalType } from 'src/shared/enums';

@Injectable()
export class ScheduledAnalysisService {
  private readonly logger = new Logger(ScheduledAnalysisService.name);

  constructor(
    private readonly analysisService: AnalysisService,
    private readonly notificationService: NotificationService,
    private readonly coinConfigService: CoinConfigService,
    private readonly dataService: DataService,
  ) {}

  /**
   * 每5分钟执行一次综合多周期分析
   */
  // @Cron('0 */5 * * * *') // 每5分钟的第0秒执行
  async performComprehensiveMultiTimeframeAnalysis(): Promise<void> {
    try {
      this.logger.log(`🕐 开始执行5分钟综合多周期分析`);

      const activeConfigs = await this.coinConfigService.findActiveConfigs();
      
      if (activeConfigs.length === 0) {
        this.logger.warn(`⚠️  没有活跃配置，跳过分析`);
        return;
      }

      // 要分析的时间周期
      const analysisIntervals = [
        IntervalType.FIVE_MINUTES,
        IntervalType.FIFTEEN_MINUTES,
        IntervalType.ONE_HOUR,
        IntervalType.FOUR_HOURS,
      ];

      // 按币种分组分析
      const symbols = [...new Set(activeConfigs.map(config => config.symbol))];
      
      let totalSymbols = symbols.length;
      let completedSymbols = 0;
      
      for (const symbol of symbols) {
        try {
          this.logger.log(`🎯 开始分析 ${symbol} 的多周期数据... (${completedSymbols + 1}/${totalSymbols})`);
          
          // 并行获取所有时间周期的数据和分析
          const analysisPromises = analysisIntervals.map(async (interval) => {
            try {
              // 确保有足够的数据
              await this.ensureDataAvailability(symbol as string, interval);
              
              // 执行分析
              const analysis = await this.analysisService.performComprehensiveAnalysis(
                symbol as string,
                interval,
                100 // 分析最近100根K线
              );
              
              return {
                symbol: symbol as string,
                interval,
                analysis,
                success: true,
              };
            } catch (error) {
                             this.logger.error(`❌ ${symbol} ${interval} 分析失败:`, (error as Error).message);
                             return {
                 symbol,
                 interval,
                 error: (error as Error).message,
                 success: false,
               };
            }
          });

          const results = await Promise.all(analysisPromises);
          
          // 统计成功和失败的分析
          const successfulAnalyses = results.filter(r => r.success) as Array<{ 
            symbol: string; 
            interval: IntervalType; 
            analysis: any; 
            success: true; 
          }>;
          const failedAnalyses = results.filter(r => !r.success);
          
          if (successfulAnalyses.length > 0) {
            // 发送综合分析通知
            await this.sendComprehensiveAnalysisNotification(symbol as string, successfulAnalyses);
            
            this.logger.log(
              `✅ ${symbol} 多周期分析完成: 成功 ${successfulAnalyses.length}/${analysisIntervals.length} 个周期`
            );
          }
          
          // 发送失败分析的错误通知
          for (const failed of failedAnalyses) {
            await this.notificationService.sendNotification({
              title: `❌ ${failed.symbol as string}(${failed.interval as string}) 分析失败`,
              message: `图像结构分析出现错误: ${failed.error as string}`,
              type: 'error',
              timestamp: new Date().toISOString(),
              data: { 
                symbol: failed.symbol as string, 
                interval: failed.interval as string, 
                error: failed.error as string,
                scheduled: true,
                multiTimeframe: true
              }
            });
          }

          completedSymbols++;
          
          // 币种间添加小延迟，避免过度负载
          if (completedSymbols < totalSymbols) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }

        } catch (error) {
          this.logger.error(`❌ ${symbol} 综合分析失败:`, (error as Error).message);
          
          await this.notificationService.sendNotification({
            title: `❌ ${symbol} 综合多周期分析失败`,
            message: `综合分析过程出现错误: ${(error as Error).message}`,
            type: 'error',
            timestamp: new Date().toISOString(),
            data: { symbol, error: (error as Error).message, scheduled: true, multiTimeframe: true }
          });
        }
      }

      this.logger.log(`✅ 5分钟综合多周期分析完成，共分析 ${totalSymbols} 个币种`);

    } catch (error) {
      this.logger.error('综合多周期分析失败:', error);
    }
  }

  /**
   * 确保数据可用性
   */
  private async ensureDataAvailability(symbol: string, interval: IntervalType): Promise<void> {
    try {
      // 获取最新数据，确保数据是最新的
      await this.dataService.getKlineData({
        symbol,
        interval,
        limit: 100
      });
    } catch (error) {
      this.logger.warn(`数据获取警告 ${symbol} ${interval}:`, error.message);
      // 不抛出错误，允许分析继续
    }
  }

  /**
   * 发送综合分析通知
   */
  private async sendComprehensiveAnalysisNotification(
    symbol: string, 
    analyses: Array<{ symbol: string; interval: IntervalType; analysis: any; success: true }>
  ): Promise<void> {
    try {
      const analysisData = analyses.map(a => ({
        interval: a.interval as string,
        signal: a.analysis.score.signal as string,
        confidence: a.analysis.score.confidence as number,
        trend: a.analysis.score.trend as number,
        momentum: a.analysis.score.momentum as number,
        patterns: a.analysis.patterns as any[],
        keyLevels: a.analysis.supportResistance as any[]
      }));

      // 计算综合信号强度
      const avgConfidence = analysisData.reduce((sum, a) => sum + a.confidence, 0) / analysisData.length;
      const strongSignals = analysisData.filter(a => a.confidence >= 70);
      const consistentSignals = this.findConsistentSignals(analysisData);

      await this.notificationService.sendMultiTimeframeAnalysisNotification(
        symbol,
        analysisData,
        {
          avgConfidence: Number(avgConfidence.toFixed(1)),
          strongSignalsCount: strongSignals.length,
          consistentSignals,
          timestamp: new Date().toISOString()
        }
      );

    } catch (error) {
      this.logger.error(`发送综合分析通知失败 ${symbol}:`, error);
    }
  }

  /**
   * 查找一致的信号
   */
  private findConsistentSignals(analysisData: any[]): string[] {
    const signalCounts = { BUY: 0, SELL: 0, HOLD: 0 };
    
    analysisData.forEach(a => {
      if (a.confidence >= 60) { // 只考虑置信度较高的信号
        signalCounts[a.signal] = (signalCounts[a.signal] || 0) + 1;
      }
    });

    const consistent = [];
    const totalHighConfidenceSignals = Object.values(signalCounts).reduce((sum, count) => sum + count, 0);
    
    if (totalHighConfidenceSignals >= 2) {
      Object.entries(signalCounts).forEach(([signal, count]) => {
        if (count >= 2) {
          consistent.push(`${signal}(${count}个周期一致)`);
        }
      });
    }

    return consistent;
  }

  /**
   * 每天早上8点执行日线分析（保留）
   */
  // @Cron('0 0 8 * * *') // 每天早上8点执行
  async analyzeDailyInterval(): Promise<void> {
    await this.executeScheduledAnalysis(IntervalType.ONE_DAY, '日线');
  }

  /**
   * 执行定时分析（保留作为备用方法）
   */
  private async executeScheduledAnalysis(interval: IntervalType, intervalName: string): Promise<void> {
    try {
      this.logger.log(`🕐 开始执行定时分析: ${intervalName}周期`);

      const activeConfigs = await this.coinConfigService.findActiveConfigs();
      const targetConfigs = activeConfigs.filter(config => config.interval === interval);

      if (targetConfigs.length === 0) {
        this.logger.warn(`⚠️  没有${intervalName}周期的活跃配置，跳过分析`);
        return;
      }

      let successCount = 0;
      let failCount = 0;

      for (const config of targetConfigs) {
        try {
          const analysis = await this.analysisService.performComprehensiveAnalysis(
            config.symbol,
            interval,
            100
          );

          // 发送分析通知
          await this.notificationService.sendAnalysisNotification(
            config.symbol,
            interval,
            analysis
          );

          successCount++;
          this.logger.log(
            `✅ 定时分析完成: ${config.symbol}(${intervalName}) 信号: ${analysis.score.signal} 置信度: ${analysis.score.confidence}%`
          );

          // 分析间隔延迟，避免过度负载
          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
          failCount++;
          this.logger.error(`❌ 定时分析失败: ${config.symbol}(${intervalName})`, error.message);

          // 发送分析失败通知
          await this.notificationService.sendNotification({
            title: `❌ ${config.symbol}(${intervalName}) 定时分析失败`,
            message: `图像结构分析出现错误: ${error.message}`,
            type: 'error',
            timestamp: new Date().toISOString(),
            data: { symbol: config.symbol, interval, error: error.message, scheduled: true }
          });
        }
      }

      this.logger.log(`📊 ${intervalName}周期分析总结: 成功 ${successCount}, 失败 ${failCount}`);

    } catch (error) {
      this.logger.error(`执行定时分析失败 ${intervalName}:`, error);
    }
  }

  /**
   * 手动触发综合多周期分析（用于测试）
   */
  async triggerComprehensiveAnalysis(): Promise<void> {
    this.logger.log('🚀 手动触发综合多周期分析...');
    await this.performComprehensiveMultiTimeframeAnalysis();
    this.logger.log('✅ 手动综合分析完成');
  }

  /**
   * 手动触发所有周期的分析（保留作为备用，用于测试）
   */
  async triggerManualAnalysis(): Promise<void> {
    this.logger.log('🚀 手动触发所有周期分析...');

    const intervals = [
      { type: IntervalType.FIFTEEN_MINUTES, name: '15分钟' },
      { type: IntervalType.ONE_HOUR, name: '1小时' },
      { type: IntervalType.FOUR_HOURS, name: '4小时' },
      { type: IntervalType.ONE_DAY, name: '日线' },
    ];

    for (const interval of intervals) {
      await this.executeScheduledAnalysis(interval.type, interval.name);
      // 间隔5秒执行下一个周期
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    this.logger.log('✅ 手动分析完成');
  }
}