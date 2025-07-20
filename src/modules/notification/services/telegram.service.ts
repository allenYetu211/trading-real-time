import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as TelegramBot from 'node-telegram-bot-api';
import { NotificationData, AnalysisNotification } from '../notification.service';

export interface TelegramConfig {
  botToken: string;
  chatId: string;
  enabled: boolean;
  parseMode: 'HTML' | 'Markdown';
  disableWebPagePreview: boolean;
  disableNotification: boolean;
}

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private bot: TelegramBot | null = null;
  private config: TelegramConfig;

  constructor(private readonly configService: ConfigService) {
    this.config = this.configService.get<TelegramConfig>('telegram')!;
    this.initializeBot();
  }

  /**
   * 初始化 Telegram Bot
   */
  private initializeBot(): void {
    if (!this.config.enabled) {
      this.logger.log('Telegram 通知已禁用');
      return;
    }

    if (!this.config.botToken) {
      this.logger.warn('Telegram Bot Token 未配置，跳过初始化');
      return;
    }

    if (!this.config.chatId) {
      this.logger.warn('Telegram Chat ID 未配置，跳过初始化');
      return;
    }

    try {
      this.bot = new TelegramBot(this.config.botToken, { polling: false });
      this.logger.log('Telegram Bot 初始化成功');
    } catch (error) {
      this.logger.error('Telegram Bot 初始化失败:', error);
      this.bot = null;
    }
  }

  /**
   * 发送通知到 Telegram
   */
  async sendNotification(data: NotificationData): Promise<boolean> {
    if (!this.isEnabled()) {
      return false;
    }

    try {
      const message = this.formatMessage(data);
      
      await this.bot!.sendMessage(this.config.chatId, message, {
        parse_mode: this.config.parseMode,
        disable_web_page_preview: this.config.disableWebPagePreview,
        disable_notification: this.config.disableNotification,
      });

      this.logger.log('Telegram 通知发送成功');
      return true;
    } catch (error) {
      this.logger.error('Telegram 通知发送失败:', error);
      return false;
    }
  }

  /**
   * 发送分析通知到 Telegram
   */
  async sendAnalysisNotification(data: AnalysisNotification): Promise<boolean> {
    if (!this.isEnabled()) {
      return false;
    }

    try {
      const message = this.formatAnalysisMessage(data);
      
      await this.bot!.sendMessage(this.config.chatId, message, {
        parse_mode: this.config.parseMode,
        disable_web_page_preview: this.config.disableWebPagePreview,
        disable_notification: this.config.disableNotification,
      });

      this.logger.log('Telegram 分析通知发送成功');
      return true;
    } catch (error) {
      this.logger.error('Telegram 分析通知发送失败:', error);
      return false;
    }
  }

  /**
   * 检查 Telegram 服务是否可用
   */
  isEnabled(): boolean {
    return (
      this.config.enabled &&
      this.bot !== null &&
      !!this.config.botToken &&
      !!this.config.chatId
    );
  }

  /**
   * 格式化普通通知消息
   */
  private formatMessage(data: NotificationData): string {
    const typeEmoji = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌'
    };

    const timestamp = new Date(data.timestamp).toLocaleString('zh-CN', {
      timeZone: 'Asia/Shanghai'
    });

    return `
${typeEmoji[data.type]} <b>${this.escapeHtml(data.title)}</b>

📝 ${this.escapeHtml(data.message)}

🕐 时间: <code>${timestamp}</code>
`.trim();
  }

  /**
   * 格式化分析通知消息
   */
  private formatAnalysisMessage(data: AnalysisNotification): string {
    const signalEmoji = {
      'BUY': '🚀',
      'SELL': '📉',
      'NEUTRAL': '⚖️'
    };

    const typeEmoji = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌'
    };

    const confidenceLevel = data.confidence >= 80 ? '高' :
                           data.confidence >= 60 ? '中' : '低';

    const timestamp = new Date(data.timestamp).toLocaleString('zh-CN', {
      timeZone: 'Asia/Shanghai'
    });

    let message = `
${typeEmoji[data.type]} <b>交易信号提醒</b>

${signalEmoji[data.signal]} <b>${this.escapeHtml(data.symbol)}(${this.escapeHtml(data.interval)})</b>
📊 信号: <b>${this.escapeHtml(data.signal)}</b>
🎯 置信度: <b>${data.confidence}%</b> (${confidenceLevel})

📝 总结: ${this.escapeHtml(data.summary)}
`.trim();

    if (data.patterns) {
      message += `\n🔍 形态: <code>${this.escapeHtml(data.patterns)}</code>`;
    }

    if (data.supportResistance) {
      message += `\n📈 关键位: <code>${this.escapeHtml(data.supportResistance)}</code>`;
    }

    message += `\n\n🕐 时间: <code>${timestamp}</code>`;

    return message;
  }

  /**
   * HTML 转义
   */
  private escapeHtml(text: string): string {
    if (!text) return '';
    
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  /**
   * 测试 Telegram 连接
   */
  async testConnection(): Promise<boolean> {
    if (!this.isEnabled()) {
      this.logger.warn('Telegram 服务未启用或配置不完整');
      return false;
    }

    try {
      const me = await this.bot!.getMe();
      this.logger.log(`Telegram Bot 连接测试成功: @${me.username}`);
      
      // 发送测试消息
      await this.sendNotification({
        title: '🧪 连接测试',
        message: 'Telegram Bot 连接正常',
        type: 'info',
        timestamp: new Date().toISOString(),
      });
      
      return true;
    } catch (error) {
      this.logger.error('Telegram 连接测试失败:', error);
      return false;
    }
  }

  /**
   * 获取 Telegram Bot 信息
   */
  async getBotInfo(): Promise<any | null> {
    if (!this.isEnabled()) {
      return null;
    }

    try {
      return await this.bot!.getMe();
    } catch (error) {
      this.logger.error('获取 Bot 信息失败:', error);
      return null;
    }
  }

  /**
   * 发送自定义消息
   */
  async sendCustomMessage(message: string): Promise<boolean> {
    if (!this.isEnabled()) {
      return false;
    }

    try {
      await this.bot!.sendMessage(this.config.chatId, message, {
        parse_mode: this.config.parseMode,
        disable_web_page_preview: this.config.disableWebPagePreview,
        disable_notification: this.config.disableNotification,
      });

      this.logger.log('自定义 Telegram 消息发送成功');
      return true;
    } catch (error) {
      this.logger.error('自定义 Telegram 消息发送失败:', error);
      return false;
    }
  }
} 