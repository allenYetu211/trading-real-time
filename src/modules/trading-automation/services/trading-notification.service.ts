import { Injectable, Logger } from '@nestjs/common';
import { TelegramBotService, BotStatus, SendMessageResult } from 'src/modules/telegram-bot';
import { TriggerEvent } from '../interfaces';
import { CrossingEvent } from './price-trigger-detection.service';

/**
 * 交易通知服务
 * 负责发送价格触发相关的Telegram通知
 * 使用统一的 TelegramBotService 来发送消息
 */
@Injectable()
export class TradingNotificationService {
  private readonly logger = new Logger(TradingNotificationService.name);

  constructor(private readonly telegramBotService: TelegramBotService) {}

  /**
   * 发送价格触发通知
   */
  async sendPriceTriggerNotification(triggerEvent: TriggerEvent): Promise<boolean> {
    try {
      const message = this.formatPriceTriggerMessage(triggerEvent);
      
      const result = await this.telegramBotService.sendToDefaultChat(message, {
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        disable_notification: false,
      });

      if (result.success) {
        this.logger.log(`价格触发通知发送成功: ${triggerEvent.symbol} ${triggerEvent.triggerType}`);
      } else {
        this.logger.error(`价格触发通知发送失败: ${triggerEvent.symbol} ${triggerEvent.triggerType} - ${result.error}`);
      }

      return result.success;

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
    const actionText = triggerType === 'BUY' ? '买入信号' : '卖出信号';
    
    // 计算价格偏差
    const priceDeviation = ((currentPrice - targetPrice) / targetPrice * 100).toFixed(2);
    
    // 计算容差百分比（tolerance是绝对价格值，需要转换为百分比）
    const tolerancePercentage = ((tolerance / targetPrice) * 100).toFixed(2);
    
    const message = `
🎯 <b>${actionText}</b> ${typeIcon}

📊 <b>交易对:</b> ${symbol}
💰 <b>当前价格:</b> $${currentPrice.toFixed(6)}
🎯 <b>目标价格:</b> $${targetPrice.toFixed(6)}
📈 <b>偏差:</b> ${priceDeviation}%
⚡ <b>容差:</b> ±${tolerancePercentage}%
🎯 <b>置信度:</b> ${(confidence * 100).toFixed(1)}%

⏰ <b>时间:</b> ${new Date(timestamp).toLocaleString('zh-CN')}

#价格触发 #${symbol.replace('/', '')} #${triggerType}
    `.trim();

    return message;
  }

  /**
   * 发送多区域触发通知
   */
  async sendMultiZoneTriggerNotification(triggerEvents: TriggerEvent[]): Promise<boolean> {
    try {
      if (triggerEvents.length === 0) return false;

      const symbol = triggerEvents[0].symbol;
      const message = this.formatMultiZoneTriggerMessage(triggerEvents);
      
      const result = await this.telegramBotService.sendToDefaultChat(message, {
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        disable_notification: false,
      });

      if (result.success) {
        this.logger.log(`多区域触发通知发送成功: ${symbol} (${triggerEvents.length}个区域)`);
      } else {
        this.logger.error(`多区域触发通知发送失败: ${symbol} - ${result.error}`);
      }

      return result.success;

    } catch (error) {
      this.logger.error(`发送多区域触发通知异常: ${error.message}`);
      return false;
    }
  }

  /**
   * 格式化多区域触发消息
   */
  private formatMultiZoneTriggerMessage(triggerEvents: TriggerEvent[]): string {
    const symbol = triggerEvents[0].symbol;
    const currentPrice = triggerEvents[0].currentPrice;
    
    const buyEvents = triggerEvents.filter(e => e.triggerType === 'BUY');
    const sellEvents = triggerEvents.filter(e => e.triggerType === 'SELL');
    
    let message = `
🚨 <b>多区域价格触发</b> 🚨

📊 <b>交易对:</b> ${symbol}
💰 <b>当前价格:</b> $${currentPrice.toFixed(6)}
⏰ <b>时间:</b> ${new Date().toLocaleString('zh-CN')}

`;

    if (buyEvents.length > 0) {
      message += `\n💚 <b>买入信号 (${buyEvents.length}个):</b>\n`;
      buyEvents.forEach((event, index) => {
        const deviation = ((event.currentPrice - event.targetPrice) / event.targetPrice * 100).toFixed(2);
        message += `${index + 1}. 目标: $${event.targetPrice.toFixed(6)} | 偏差: ${deviation}% | 置信度: ${(event.confidence * 100).toFixed(1)}%\n`;
      });
    }

    if (sellEvents.length > 0) {
      message += `\n🔴 <b>卖出信号 (${sellEvents.length}个):</b>\n`;
      sellEvents.forEach((event, index) => {
        const deviation = ((event.currentPrice - event.targetPrice) / event.targetPrice * 100).toFixed(2);
        message += `${index + 1}. 目标: $${event.targetPrice.toFixed(6)} | 偏差: ${deviation}% | 置信度: ${(event.confidence * 100).toFixed(1)}%\n`;
      });
    }

    message += `\n#多区域触发 #${symbol.replace('/', '')} #批量信号`;

    return message.trim();
  }

  /**
   * 发送系统状态通知
   */
  async sendSystemStatusNotification(status: {
    type: 'info' | 'warning' | 'error';
    title: string;
    message: string;
    timestamp?: number;
  }): Promise<boolean> {
    try {
      const formattedMessage = this.formatSystemStatusMessage(status);
      
      const result = await this.telegramBotService.sendToDefaultChat(formattedMessage, {
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        disable_notification: status.type === 'error' ? false : true,
      });

      if (result.success) {
        this.logger.log(`系统状态通知发送成功: ${status.type} - ${status.title}`);
      } else {
        this.logger.error(`系统状态通知发送失败: ${status.type} - ${status.title} - ${result.error}`);
      }

      return result.success;

    } catch (error) {
      this.logger.error(`发送系统状态通知异常: ${error.message}`);
      return false;
    }
  }

  /**
   * 格式化系统状态消息
   */
  private formatSystemStatusMessage(status: {
    type: 'info' | 'warning' | 'error';
    title: string;
    message: string;
    timestamp?: number;
  }): string {
    const icons = {
      info: 'ℹ️',
      warning: '⚠️',
      error: '❌'
    };

    const typeNames = {
      info: '信息',
      warning: '警告',
      error: '错误'
    };

    const timestamp = status.timestamp || Date.now();

    const message = `
${icons[status.type]} <b>系统${typeNames[status.type]}</b>

📋 <b>标题:</b> ${status.title}
📝 <b>详情:</b> ${status.message}
⏰ <b>时间:</b> ${new Date(timestamp).toLocaleString('zh-CN')}

#系统通知 #${status.type}
    `.trim();

    return message;
  }

  /**
   * 发送区间穿越通知
   */
  async sendZoneCrossingNotification(crossingEvent: CrossingEvent): Promise<boolean> {
    try {
      const message = this.formatZoneCrossingMessage(crossingEvent);
      
      const result = await this.telegramBotService.sendToDefaultChat(message, {
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        disable_notification: false,
      });

      // if (result.success) {
      //   this.logger.log(`区间穿越通知发送成功: ${crossingEvent.symbol} ${crossingEvent.crossingType} ${crossingEvent.triggerType}`);
      // } else {
      //   this.logger.error(`区间穿越通知发送失败: ${crossingEvent.symbol} ${crossingEvent.crossingType} ${crossingEvent.triggerType} - ${result.error}`);
      // }

      return result.success;

    } catch (error) {
      this.logger.error(`发送区间穿越通知异常: ${error.message}`);
      return false;
    }
  }

  /**
   * 格式化区间穿越消息
   */
  private formatZoneCrossingMessage(crossingEvent: CrossingEvent): string {
    const { symbol, triggerType, currentPrice, targetPrice, tolerance, confidence, timestamp, crossingType } = crossingEvent;
    
    // 根据穿越类型选择图标和文本
    const crossingIcon = crossingType === 'ENTER' ? '🎯' : '⬅️';
    const crossingText = crossingType === 'ENTER' ? '进入' : '离开';
    const typeIcon = triggerType === 'BUY' ? '💚' : '🔴';
    const zoneText = triggerType === 'BUY' ? '买入区间' : '卖出区间';
    
    // 计算价格偏差
    const priceDeviation = ((currentPrice - targetPrice) / targetPrice * 100).toFixed(2);
    
    // 计算容差百分比（tolerance是绝对价格值，需要转换为百分比）
    const tolerancePercentage = ((tolerance / targetPrice) * 100).toFixed(2);
    
    const message = `
${crossingIcon} <b>区间穿越</b> ${typeIcon}

📊 <b>交易对:</b> ${symbol}
🎯 <b>事件:</b> ${crossingText}${zoneText}
💰 <b>当前价格:</b> $${currentPrice.toFixed(6)}
🎯 <b>区间中心:</b> $${targetPrice.toFixed(6)}
📈 <b>偏差:</b> ${priceDeviation}%
⚡ <b>容差:</b> ±${tolerancePercentage}%
🎯 <b>置信度:</b> ${(confidence * 100).toFixed(1)}%

⏰ <b>时间:</b> ${new Date(timestamp).toLocaleString('zh-CN')}

#区间穿越 #${symbol.replace('/', '')} #${triggerType} #${crossingType}
    `.trim();

    return message;
  }

  /**
   * 发送测试通知
   */
  async sendTestNotification(): Promise<boolean> {
    const testMessage = `
🧪 <b>Telegram Bot 测试</b>

✅ 消息发送功能正常
⏰ 测试时间: ${new Date().toLocaleString('zh-CN')}

#测试通知
    `.trim();

    const result = await this.telegramBotService.sendToDefaultChat(testMessage, {
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      disable_notification: false,
    });

    if (result.success) {
      this.logger.log('测试通知发送成功');
    } else {
      this.logger.error(`测试通知发送失败: ${result.error}`);
    }

    return result.success;
  }

  /**
   * 获取通知服务状态
   */
  getNotificationStatus(): {
    telegramBotStatus: BotStatus;
    isReady: boolean;
  } {
    const telegramBotStatus = this.telegramBotService.getBotStatus();
    
    return {
      telegramBotStatus,
      isReady: telegramBotStatus.isEnabled && telegramBotStatus.isConnected,
    };
  }

  /**
   * 检查服务是否准备就绪
   */
  isReady(): boolean {
    return this.telegramBotService.isEnabled();
  }
}