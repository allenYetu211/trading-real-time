import * as TelegramBot from 'node-telegram-bot-api';
import { Logger } from '@nestjs/common';
import { TelegramConfig, MessageOptions, UserState } from '../interfaces';

/**
 * Telegram Bot 管理工具类
 * 负责Bot的创建、配置和基本操作
 */
export class BotManagerUtil {
  private static readonly logger = new Logger(BotManagerUtil.name);

  /**
   * 创建并初始化Telegram Bot
   */
  static createBot(config: TelegramConfig): TelegramBot | null {
    try {
      if (!config?.enabled) {
        this.logger.log('Telegram 功能已禁用');
        return null;
      }

      if (!config?.botToken) {
        this.logger.warn('Telegram Bot Token 未配置，跳过初始化');
        return null;
      }

      if (!config.chatId) {
        this.logger.warn('Telegram Chat ID 未配置，跳过初始化');
        return null;
      }

      const bot = new TelegramBot(config.botToken, { polling: true });
      this.logger.log('Telegram Bot 创建成功');
      return bot;

    } catch (error) {
      this.logger.error('创建 Telegram Bot 失败:', error);
      return null;
    }
  }

  /**
   * 发送消息
   */
  static async sendMessage(
    bot: TelegramBot | null,
    chatId: number,
    message: string,
    options?: MessageOptions
  ): Promise<boolean> {
    if (!bot) {
      this.logger.warn('Bot 未初始化，无法发送消息');
      return false;
    }

    try {
      const defaultOptions: MessageOptions = {
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        disable_notification: false,
      };

      const finalOptions = { ...defaultOptions, ...options };
      await bot.sendMessage(chatId, message, finalOptions);
      return true;

    } catch (error) {
      this.logger.error(`发送消息失败 (chatId: ${chatId}):`, error);
      return false;
    }
  }

  /**
   * 编辑消息
   */
  static async editMessage(
    bot: TelegramBot | null,
    chatId: number,
    messageId: number,
    message: string,
    options?: MessageOptions
  ): Promise<boolean> {
    if (!bot) {
      this.logger.warn('Bot 未初始化，无法编辑消息');
      return false;
    }

    try {
      const defaultOptions: MessageOptions = {
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      };

      const finalOptions = { ...defaultOptions, ...options };
      await bot.editMessageText(message, {
        chat_id: chatId,
        message_id: messageId,
        ...finalOptions
      });
      return true;

    } catch (error) {
      this.logger.error(`编辑消息失败 (chatId: ${chatId}, messageId: ${messageId}):`, error);
      return false;
    }
  }

  /**
   * 删除消息
   */
  static async deleteMessage(
    bot: TelegramBot | null,
    chatId: number,
    messageId: number
  ): Promise<boolean> {
    if (!bot) {
      this.logger.warn('Bot 未初始化，无法删除消息');
      return false;
    }

    try {
      await bot.deleteMessage(chatId, messageId);
      return true;

    } catch (error) {
      this.logger.error(`删除消息失败 (chatId: ${chatId}, messageId: ${messageId}):`, error);
      return false;
    }
  }

  /**
   * 回答回调查询
   */
  static async answerCallbackQuery(
    bot: TelegramBot | null,
    callbackQueryId: string,
    text?: string,
    showAlert: boolean = false
  ): Promise<boolean> {
    if (!bot) {
      this.logger.warn('Bot 未初始化，无法回答回调查询');
      return false;
    }

    try {
      await bot.answerCallbackQuery(callbackQueryId, {
        text,
        show_alert: showAlert
      });
      return true;

    } catch (error) {
      this.logger.error(`回答回调查询失败 (queryId: ${callbackQueryId}):`, error);
      return false;
    }
  }

  /**
   * 获取Bot信息
   */
  static async getBotInfo(bot: TelegramBot | null): Promise<any> {
    if (!bot) {
      return null;
    }

    try {
      return await bot.getMe();
    } catch (error) {
      this.logger.error('获取Bot信息失败:', error);
      return null;
    }
  }

  /**
   * 测试Bot连接
   */
  static async testConnection(bot: TelegramBot | null, chatId: number): Promise<boolean> {
    if (!bot) {
      return false;
    }

    try {
      await bot.getMe();
      await this.sendMessage(bot, chatId, '🧪 CCXT 分析机器人连接测试成功！');
      return true;

    } catch (error) {
      this.logger.error('连接测试失败:', error);
      return false;
    }
  }

  /**
   * 清理用户状态
   */
  static cleanupUserStates(
    userStates: Map<string, UserState>,
    timeout: number = 5 * 60 * 1000
  ): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    userStates.forEach((state, key) => {
      if (now - state.timestamp > timeout) {
        expiredKeys.push(key);
      }
    });

    expiredKeys.forEach(key => {
      userStates.delete(key);
    });

    if (expiredKeys.length > 0) {
      this.logger.debug(`清理了 ${expiredKeys.length} 个过期的用户状态`);
    }
  }

  /**
   * 设置用户状态
   */
  static setUserState(
    userStates: Map<string, UserState>,
    userId: string,
    action: string,
    data?: any
  ): void {
    userStates.set(userId, {
      action,
      data,
      timestamp: Date.now()
    });
  }

  /**
   * 获取用户状态
   */
  static getUserState(
    userStates: Map<string, UserState>,
    userId: string
  ): UserState | undefined {
    return userStates.get(userId);
  }

  /**
   * 清除用户状态
   */
  static clearUserState(
    userStates: Map<string, UserState>,
    userId: string
  ): void {
    userStates.delete(userId);
  }
} 