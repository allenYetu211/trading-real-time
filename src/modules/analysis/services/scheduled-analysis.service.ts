import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AnalysisService } from '../analysis.service';
import { NotificationService } from '../../notification/notification.service';
import { CoinConfigService } from '../../coin-config/coin-config.service';
import { IntervalType } from 'src/shared/enums';

@Injectable()
export class ScheduledAnalysisService {
  private readonly logger = new Logger(ScheduledAnalysisService.name);

  constructor(
    private readonly analysisService: AnalysisService,
    private readonly notificationService: NotificationService,
    private readonly coinConfigService: CoinConfigService,
  ) {}

  /**
   * 每15分钟执行一次15分钟周期分析
   */
  @Cron('0 */15 * * * *') // 每15分钟的第0秒执行
  async analyze15MinuteInterval(): Promise<void> {
    await this.executeScheduledAnalysis(IntervalType.FIFTEEN_MINUTES, '15分钟');
  }

  /**
   * 每小时执行一次1小时周期分析
   */
  @Cron('0 0 * * * *') // 每小时的第0分0秒执行
  async analyze1HourInterval(): Promise<void> {
    await this.executeScheduledAnalysis(IntervalType.ONE_HOUR, '1小时');
  }

  /**
   * 每4小时执行一次4小时周期分析
   */
  @Cron('0 0 */4 * * *') // 每4小时的第0分0秒执行
  async analyze4HourInterval(): Promise<void> {
    await this.executeScheduledAnalysis(IntervalType.FOUR_HOURS, '4小时');
  }

  /**
   * 每天早上8点执行日线分析
   */
  @Cron('0 0 8 * * *') // 每天早上8点执行
  async analyzeDailyInterval(): Promise<void> {
    await this.executeScheduledAnalysis(IntervalType.ONE_DAY, '日线');
  }

  /**
   * 执行定时分析
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

      // 发送定时分析总结通知
      const successRate = targetConfigs.length > 0 ? ((successCount / targetConfigs.length) * 100).toFixed(1) : '0';
      await this.notificationService.sendNotification({
        title: `📊 ${intervalName}定时分析完成`,
        message: `分析了${targetConfigs.length}个交易对，成功率: ${successRate}%`,
        type: successCount === targetConfigs.length ? 'success' : 'warning',
        timestamp: new Date().toISOString(),
        data: {
          interval: intervalName,
          total: targetConfigs.length,
          successful: successCount,
          failed: failCount,
          successRate: parseFloat(successRate)
        }
      });

      this.logger.log(`🎯 ${intervalName}定时分析完成: ${successCount}/${targetConfigs.length} 成功`);

    } catch (error) {
      this.logger.error(`定时分析执行失败: ${intervalName}`, error);

      // 发送系统错误通知
      await this.notificationService.sendNotification({
        title: `❌ ${intervalName}定时分析系统错误`,
        message: `定时分析服务出现错误: ${error.message}`,
        type: 'error',
        timestamp: new Date().toISOString(),
        data: { interval: intervalName, error: error.message, scheduled: true }
      });
    }
  }

  /**
   * 手动触发所有周期的分析（用于测试）
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