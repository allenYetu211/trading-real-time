import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BotManagerUtil } from 'src/modules/telegram-ccxt-analysis/utils/bot/bot-manager.util';
import { TelegramConfig } from 'src/modules/telegram-ccxt-analysis/utils/interfaces/telegram.interface';
import { TriggerEvent } from '../interfaces';
import * as TelegramBot from 'node-telegram-bot-api';

/**
 * 交易通知服务
 * 负责发送价格触发相关的Telegram通知
 */
@Injectable()
export class TradingNotificationService {
  private readonly logger = new Logger(TradingNotificationService.name);
  private bot: TelegramBot | null = null;
  private config: TelegramConfig;

  constructor(private readonly configService: ConfigService) {
    this.config = this.configService.get<TelegramConfig>('telegram')!;
    this.initializeBot();
  }

  /**
   * 初始化Telegram Bot
   */
  private initializeBot(): void {
    try {
      this.bot = BotManagerUtil.createBot(this.config);
      if (this.bot) {
        this.logger.log('交易通知服务的Telegram Bot初始化成功');
      } else {
        this.logger.warn('Telegram Bot未初始化，通知功能将不可用');
      }
    } catch (error) {
      this.logger.error(`初始化Telegram Bot失败: ${error.message}`);
    }
  }

  /**
   * 发送价格触发通知
   */
  async sendPriceTriggerNotification(triggerEvent: TriggerEvent): Promise<boolean> {
    try {
      const message = this.formatPriceTriggerMessage(triggerEvent);
      
      const success = await BotManagerUtil.sendMessage(
        this.bot,
        parseInt(this.config.chatId as string),
        message,
        {
          parse_mode: 'HTML',
          disable_web_page_preview: true,
          disable_notification: false,
        }
      );

      if (success) {
        this.logger.log(`价格触发通知发送成功: ${triggerEvent.symbol} ${triggerEvent.triggerType}`);
      } else {
        this.logger.error(`价格触发通知发送失败: ${triggerEvent.symbol} ${triggerEvent.triggerType}`);
      }

      return success;

    } catch (error) {
      this.logger.error(`发送价格触发通知异常: ${error.message}`);
      return false;
    }
  }

  /**
   * 格式化价格触发消息
   */
  private formatPriceTriggerMessage(triggerEvent: TriggerEvent): string {
    const { symbol, triggerType, currentPrice, targetPrice, tolerance, confidence, timestamp } = triggerEvent;
    
    // 根据触发类型选择图标和颜色
    const typeIcon = triggerType === 'BUY' ? '💚' : '🔴';
    const typeText = triggerType === 'BUY' ? '买入区间' : '卖出区间';
    const actionText = triggerType === 'BUY' ? '买入机会' : '卖出机会';
    
    // 计算价格范围
    const lowerBound = targetPrice - tolerance;
    const upperBound = targetPrice + tolerance;
    
    // 格式化时间
    const time = new Date(timestamp).toLocaleString('zh-CN', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    // 构建消息
    let message = `${typeIcon} <b>价格触发提醒</b>\n\n`;
    message += `📊 <b>交易对:</b> ${symbol}\n`;
    message += `⚡ <b>触发类型:</b> ${actionText}\n`;
    message += `💰 <b>当前价格:</b> $${currentPrice.toFixed(4)}\n\n`;
    
    message += `🎯 <b>触及${typeText}:</b>\n`;
    message += `   • 目标价格: $${targetPrice.toFixed(4)}\n`;
    message += `   • 容差范围: ±$${tolerance.toFixed(4)}\n`;
    message += `   • 价格区间: $${lowerBound.toFixed(4)} - $${upperBound.toFixed(4)}\n`;
    message += `   • 置信度: ${(confidence * 100).toFixed(1)}%\n\n`;
    
    // 添加市场建议
    if (triggerType === 'BUY') {
      message += `📈 <b>建议操作:</b>\n`;
      message += `   • 考虑逐步建仓\n`;
      message += `   • 注意风险控制\n`;
      message += `   • 设置止损位\n\n`;
    } else {
      message += `📉 <b>建议操作:</b>\n`;
      message += `   • 考虑获利了结\n`;
      message += `   • 分批卖出\n`;
      message += `   • 关注突破情况\n\n`;
    }
    
    message += `⏰ <b>触发时间:</b> ${time}\n`;
    message += `🤖 <b>自动监控系统</b>`;

    return message;
  }

  /**
   * 发送多区间触发合并通知
   */
  async sendMultiZoneTriggerNotification(triggerEvents: TriggerEvent[]): Promise<boolean> {
    if (triggerEvents.length === 0) return false;

    try {
      const message = this.formatMultiZoneTriggerMessage(triggerEvents);
      
      const success = await BotManagerUtil.sendMessage(
        this.bot,
        parseInt(this.config.chatId as string),
        message,
        {
          parse_mode: 'HTML',
          disable_web_page_preview: true,
          disable_notification: false,
        }
      );

      if (success) {
        this.logger.log(`多区间触发通知发送成功: ${triggerEvents[0].symbol} ${triggerEvents[0].triggerType} (${triggerEvents.length}个区间)`);
      } else {
        this.logger.error(`多区间触发通知发送失败: ${triggerEvents[0].symbol} ${triggerEvents[0].triggerType}`);
      }

      return success;

    } catch (error) {
      this.logger.error(`发送多区间触发通知异常: ${error.message}`);
      return false;
    }
  }

  /**
   * 格式化多区间触发消息
   */
  private formatMultiZoneTriggerMessage(triggerEvents: TriggerEvent[]): string {
    const firstEvent = triggerEvents[0];
    const { symbol, triggerType, currentPrice, timestamp } = firstEvent;
    
    // 根据触发类型选择图标和颜色
    const typeIcon = triggerType === 'BUY' ? '💚' : '🔴';
    const typeText = triggerType === 'BUY' ? '买入区间' : '卖出区间';
    const actionText = triggerType === 'BUY' ? '买入机会' : '卖出机会';
    
    // 格式化时间
    const time = new Date(timestamp).toLocaleString('zh-CN', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    // 构建消息
    let message = `${typeIcon} <b>多区间价格触发</b>\n\n`;
    message += `📊 <b>交易对:</b> ${symbol}\n`;
    message += `⚡ <b>触发类型:</b> ${actionText}\n`;
    message += `💰 <b>当前价格:</b> $${currentPrice.toFixed(4)}\n\n`;
    
    message += `🎯 <b>同时触及${triggerEvents.length}个${typeText}:</b>\n`;
    
    triggerEvents.forEach((event, index) => {
      const lowerBound = event.targetPrice - event.tolerance;
      const upperBound = event.targetPrice + event.tolerance;
      message += `   ${index + 1}. $${event.targetPrice.toFixed(4)} (±$${event.tolerance.toFixed(4)}) [${(event.confidence * 100).toFixed(0)}%]\n`;
      message += `      区间: $${lowerBound.toFixed(4)} - $${upperBound.toFixed(4)}\n`;
    });
    
    message += `\n`;
    
    // 添加市场建议
    if (triggerType === 'BUY') {
      message += `📈 <b>建议操作:</b>\n`;
      message += `   • 多区间触发显示强烈${actionText}信号\n`;
      message += `   • 建议分批建仓\n`;
      message += `   • 严格风险控制\n\n`;
    } else {
      message += `📉 <b>建议操作:</b>\n`;
      message += `   • 多区间触发显示强烈${actionText}信号\n`;
      message += `   • 建议分批出货\n`;
      message += `   • 关注突破情况\n\n`;
    }
    
    message += `⏰ <b>触发时间:</b> ${time}\n`;
    message += `🤖 <b>自动监控系统</b>`;

    return message;
  }

  /**
   * 发送分析完成通知
   */
  async sendAnalysisCompletionNotification(
    symbol: string,
    analysisResult: {
      buyZonesCount: number;
      sellZonesCount: number;
      signal: string;
      confidence: number;
      timestamp: number;
    }
  ): Promise<boolean> {
    try {
      const message = this.formatAnalysisCompletionMessage(symbol, analysisResult);
      
      const success = await BotManagerUtil.sendMessage(
        this.bot,
        parseInt(this.config.chatId as string),
        message,
        {
          parse_mode: 'HTML',
          disable_web_page_preview: true,
          disable_notification: true, // 分析完成通知静默发送
        }
      );

      if (success) {
        this.logger.debug(`分析完成通知发送成功: ${symbol}`);
      }

      return success;

    } catch (error) {
      this.logger.error(`发送分析完成通知异常: ${error.message}`);
      return false;
    }
  }

  /**
   * 格式化分析完成消息
   */
  private formatAnalysisCompletionMessage(
    symbol: string,
    analysisResult: {
      buyZonesCount: number;
      sellZonesCount: number;
      signal: string;
      confidence: number;
      timestamp: number;
    }
  ): string {
    const { buyZonesCount, sellZonesCount, signal, confidence, timestamp } = analysisResult;
    
    const time = new Date(timestamp).toLocaleString('zh-CN', {
      timeZone: 'Asia/Shanghai',
      hour: '2-digit',
      minute: '2-digit',
    });

    // 根据信号类型选择图标
    const signalIcon = signal === 'BUY' ? '📈' : signal === 'SELL' ? '📉' : '⚖️';
    
    let message = `🔄 <b>技术分析更新</b>\n\n`;
    message += `📊 <b>交易对:</b> ${symbol}\n`;
    message += `${signalIcon} <b>信号:</b> ${signal} (${(confidence * 100).toFixed(1)}%)\n`;
    message += `💚 <b>买入区间:</b> ${buyZonesCount} 个\n`;
    message += `🔴 <b>卖出区间:</b> ${sellZonesCount} 个\n`;
    message += `⏰ <b>更新时间:</b> ${time}\n\n`;
    message += `🎯 价格监控已激活，触及区间时将立即通知`;

    return message;
  }

  /**
   * 发送系统状态通知
   */
  async sendSystemStatusNotification(
    status: {
      type: 'START' | 'STOP' | 'ERROR' | 'RECONNECT';
      message: string;
      timestamp: number;
      details?: any;
    }
  ): Promise<boolean> {
    try {
      const formattedMessage = this.formatSystemStatusMessage(status);
      
      const success = await BotManagerUtil.sendMessage(
        this.bot,
        parseInt(this.config.chatId as string),
        formattedMessage,
        {
          parse_mode: 'HTML',
          disable_web_page_preview: true,
          disable_notification: status.type === 'ERROR',
        }
      );

      if (success) {
        this.logger.debug(`系统状态通知发送成功: ${status.type}`);
      }

      return success;

    } catch (error) {
      this.logger.error(`发送系统状态通知异常: ${error.message}`);
      return false;
    }
  }

  /**
   * 格式化系统状态消息
   */
  private formatSystemStatusMessage(status: {
    type: 'START' | 'STOP' | 'ERROR' | 'RECONNECT';
    message: string;
    timestamp: number;
    details?: any;
  }): string {
    const { type, message, timestamp, details } = status;
    
    const time = new Date(timestamp).toLocaleString('zh-CN', {
      timeZone: 'Asia/Shanghai',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    let icon = '🤖';
    let title = '系统状态';
    
    switch (type) {
      case 'START':
        icon = '✅';
        title = '系统启动';
        break;
      case 'STOP':
        icon = '⏹️';
        title = '系统停止';
        break;
      case 'ERROR':
        icon = '❌';
        title = '系统错误';
        break;
      case 'RECONNECT':
        icon = '🔄';
        title = '系统重连';
        break;
    }

    let formattedMessage = `${icon} <b>${title}</b>\n\n`;
    formattedMessage += `📝 <b>消息:</b> ${message}\n`;
    formattedMessage += `⏰ <b>时间:</b> ${time}\n`;
    
    if (details) {
      formattedMessage += `\n🔍 <b>详细信息:</b>\n`;
      if (typeof details === 'object') {
        Object.entries(details).forEach(([key, value]) => {
          formattedMessage += `   • ${key}: ${value}\n`;
        });
      } else {
        formattedMessage += `   ${details}\n`;
      }
    }

    return formattedMessage;
  }

  /**
   * 检查通知服务是否可用
   */
  isNotificationEnabled(): boolean {
    return this.bot !== null && this.config.enabled;
  }

  /**
   * 获取通知服务状态
   */
  getNotificationStatus(): {
    enabled: boolean;
    botInitialized: boolean;
    chatId: number;
  } {
    return {
      enabled: this.config.enabled,
      botInitialized: this.bot !== null,
      chatId: parseInt(this.config.chatId as string),
    };
  }
}