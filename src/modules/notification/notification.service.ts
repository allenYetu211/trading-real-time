import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ComprehensiveAnalysis } from 'src/shared/interfaces/analysis.interface';
import { CreateNotificationDto, NotificationListDto } from './dto';
import { NotificationRecord } from './entities/notification-record.entity';
import { TelegramService } from './services/telegram.service';

export interface NotificationData {
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
  data?: any;
}

export interface AnalysisNotification extends NotificationData {
  symbol: string;
  interval: string;
  signal: string;
  confidence: number;
  summary: string;
  patterns?: string;
  supportResistance?: string;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly telegramService: TelegramService,
  ) {}

  /**
   * 发送分析通知
   */
  async sendAnalysisNotification(
    symbol: string,
    interval: string,
    analysis: ComprehensiveAnalysis
  ): Promise<void> {
    const notification = this.formatAnalysisNotification(symbol, interval, analysis);
    
    await Promise.all([
      // this.sendConsoleNotification(notification),
      this.saveToDatabase(notification),
      this.sendTelegramNotification(notification),
      // 这里可以添加其他通知方式
      // this.sendEmailNotification(notification),
    ]);
  }

  /**
   * 发送通用通知
   */
  async sendNotification(data: NotificationData): Promise<void> {
    await Promise.all([
      // this.sendConsoleNotification(data),
      this.saveToDatabase(data),
      this.sendTelegramNotification(data),
    ]);
  }

  /**
   * 创建通知记录
   */
  async createNotification(dto: CreateNotificationDto): Promise<NotificationRecord> {
    try {
      const record = await this.prisma.notificationRecord.create({
        data: {
          title: dto.title,
          message: dto.message,
          type: dto.type,
          symbol: dto.symbol,
          interval: dto.interval,
          signal: dto.signal,
          confidence: dto.confidence,
          summary: dto.summary,
          patterns: dto.patterns,
          supportResistance: dto.supportResistance,
          data: dto.data,
          timestamp: new Date(dto.timestamp),
        },
      });

      this.logger.log(`通知记录已保存: ${record.id}`);
      return {
        ...record,
        confidence: record.confidence ? Number(record.confidence) : undefined,
      } as NotificationRecord;
    } catch (error) {
      this.logger.error('创建通知记录失败:', error);
      throw error;
    }
  }

  /**
   * 查询通知记录列表
   */
  async getNotificationList(dto: NotificationListDto): Promise<{
    data: NotificationRecord[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const where = {
        ...(dto.type && { type: dto.type }),
        ...(dto.symbol && { symbol: dto.symbol }),
        ...(dto.interval && { interval: dto.interval }),
        ...(dto.signal && { signal: dto.signal }),
        ...(dto.startDate || dto.endDate) && {
          timestamp: {
            ...(dto.startDate && { gte: new Date(dto.startDate) }),
            ...(dto.endDate && { lte: new Date(dto.endDate) }),
          },
        },
      };

      const [data, total] = await Promise.all([
        this.prisma.notificationRecord.findMany({
          where,
          orderBy: { timestamp: 'desc' },
          skip: (dto.page - 1) * dto.limit,
          take: dto.limit,
        }),
        this.prisma.notificationRecord.count({ where }),
      ]);

      return {
        data: data.map(record => ({
          ...record,
          confidence: record.confidence ? Number(record.confidence) : undefined,
        })) as NotificationRecord[],
        total,
        page: dto.page,
        limit: dto.limit,
      };
    } catch (error) {
      this.logger.error('查询通知记录失败:', error);
      throw error;
    }
  }

  /**
   * 发送控制台通知
   */
  private async sendConsoleNotification(data: NotificationData): Promise<void> {
    const emoji = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌'
    };

    const logMethod = data.type === 'error' ? 'error' : 
                     data.type === 'warning' ? 'warn' : 'log';

    this.logger[logMethod](`${emoji[data.type]} ${data.title}`);
    
    if (data.message) {
      this.logger[logMethod](`   ${data.message}`);
    }

    // 如果是分析通知，显示详细信息
    if ('signal' in data) {
      const analysisData = data as AnalysisNotification;
      this.logger[logMethod](`   📊 信号: ${analysisData.signal}`);
      this.logger[logMethod](`   🎯 置信度: ${analysisData.confidence}%`);
      this.logger[logMethod](`   📝 总结: ${analysisData.summary}`);
      
      if (analysisData.patterns) {
        this.logger[logMethod](`   🔍 形态: ${analysisData.patterns}`);
      }
      
      if (analysisData.supportResistance) {
        this.logger[logMethod](`   📈 关键位: ${analysisData.supportResistance}`);
      }
    }
  }

  /**
   * 保存到数据库
   */
  private async saveToDatabase(data: NotificationData): Promise<void> {
    try {
      const analysisData = 'signal' in data ? data as AnalysisNotification : null;
      
      await this.prisma.notificationRecord.create({
        data: {
          title: data.title,
          message: data.message,
          type: data.type,
          symbol: analysisData?.symbol,
          interval: analysisData?.interval,
          signal: analysisData?.signal,
          confidence: analysisData?.confidence,
          summary: analysisData?.summary,
          patterns: analysisData?.patterns,
          supportResistance: analysisData?.supportResistance,
          data: data.data ? JSON.stringify(data.data) : null,
          timestamp: new Date(data.timestamp),
        },
      });

      // this.logger.debug('通知已保存到数据库');
    } catch (error) {
      this.logger.error('保存通知到数据库失败:', error);
      throw error;
    }
  }

  /**
   * 格式化分析通知
   */
  private formatAnalysisNotification(
    symbol: string,
    interval: string,
    analysis: ComprehensiveAnalysis
  ): AnalysisNotification {
    const signalEmoji = {
      'BUY': '🚀',
      'SELL': '📉',
      'NEUTRAL': '⚖️'
    };

    const confidenceLevel = analysis.score.confidence >= 80 ? '高' :
                           analysis.score.confidence >= 60 ? '中' : '低';

    const type = analysis.score.signal === 'BUY' ? 'success' :
                 analysis.score.signal === 'SELL' ? 'warning' : 'info';

    return {
      title: `${signalEmoji[analysis.score.signal] || '📊'} ${symbol}(${interval}) 图像结构分析`,
      message: `${analysis.score.signal} 信号 (${confidenceLevel}置信度)`,
      type,
      timestamp: new Date().toISOString(),
      symbol,
      interval,
      signal: analysis.score.signal,
      confidence: analysis.score.confidence,
      summary: analysis.summary,
      patterns: analysis.patterns.map(p => p.description).join(', ') || '无明显形态',
      supportResistance: analysis.supportResistance.length > 0 ? 
        `${analysis.supportResistance.length}个关键位` : '暂无关键位',
      data: analysis
    };
  }

  /**
   * 获取通知历史 (保持向后兼容)
   */
  async getNotificationHistory(date?: string): Promise<NotificationData[]> {
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];
      const startDate = new Date(targetDate);
      const endDate = new Date(targetDate);
      endDate.setDate(endDate.getDate() + 1);

      const records = await this.prisma.notificationRecord.findMany({
        where: {
          timestamp: {
            gte: startDate,
            lt: endDate,
          },
        },
        orderBy: { timestamp: 'desc' },
      });

             return records.map(record => ({
         title: record.title,
         message: record.message,
         type: record.type as 'info' | 'success' | 'warning' | 'error',
         timestamp: record.timestamp.toISOString(),
         data: record.data ? JSON.parse(record.data) : undefined,
         ...(record.symbol && { symbol: record.symbol }),
         ...(record.interval && { interval: record.interval }),
         ...(record.signal && { signal: record.signal }),
         ...(record.confidence && { confidence: Number(record.confidence) }),
         ...(record.summary && { summary: record.summary }),
         ...(record.patterns && { patterns: record.patterns }),
         ...(record.supportResistance && { supportResistance: record.supportResistance }),
       }));
    } catch (error) {
      this.logger.error('获取通知历史失败:', error);
      return [];
    }
  }

  /**
   * 获取通知统计
   */
  async getNotificationStats(date?: string): Promise<{
    today: number;
    byType: Record<string, number>;
    bySignal?: Record<string, number>;
  }> {
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];
      const startDate = new Date(targetDate);
      const endDate = new Date(targetDate);
      endDate.setDate(endDate.getDate() + 1);

      const records = await this.prisma.notificationRecord.findMany({
        where: {
          timestamp: {
            gte: startDate,
            lt: endDate,
          },
        },
        select: {
          type: true,
          signal: true,
        },
      });

      const byType = records.reduce((acc, record) => {
        acc[record.type] = (acc[record.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const bySignal = records
        .filter(record => record.signal)
        .reduce((acc, record) => {
          acc[record.signal!] = (acc[record.signal!] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

      return {
        today: records.length,
        byType,
        bySignal,
      };
    } catch (error) {
      this.logger.error('获取通知统计失败:', error);
      throw error;
    }
  }

  /**
   * 发送Telegram通知
   */
  private async sendTelegramNotification(data: NotificationData): Promise<void> {
    try {
      if ('signal' in data) {
        // 分析通知
        await this.telegramService.sendAnalysisNotification(data as AnalysisNotification);
      } else {
        // 普通通知
        await this.telegramService.sendNotification(data);
      }
    } catch (error) {
      this.logger.error('发送 Telegram 通知失败:', error);
    }
  }

  /**
   * 发送邮件通知 (可扩展)
   */
  private async sendEmailNotification(data: NotificationData): Promise<void> {
    // TODO: 实现邮件通知
    // const emailConfig = this.configService.get('email');
    // 
    // if (emailConfig && emailConfig.enabled) {
    //   // 发送邮件
    // }
  }
} 