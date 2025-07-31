import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as TelegramBot from 'node-telegram-bot-api';
import {
  TelegramConfig,
  MessageOptions,
  SendMessageResult,
  BotStatus,
  CommandHandler,
  CallbackQueryHandler,
  MessageHandler,
} from './interfaces';
import { BotConnectionStatus } from './enums';

/**
 * 统一的 Telegram Bot 服务
 * 管理单一的 bot 实例，提供消息发送和命令处理功能
 */
@Injectable()
export class TelegramBotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramBotService.name);
  private bot: TelegramBot | null = null;
  private config: TelegramConfig;
  private connectionStatus: BotConnectionStatus = BotConnectionStatus.DISCONNECTED;
  private commandHandlers = new Map<string, CommandHandler>();
  private callbackQueryHandlers: CallbackQueryHandler[] = [];
  private messageHandlers: MessageHandler[] = [];
  private startTime: number = Date.now();
  private lastError: string | null = null;
  private reconnectAttempts: number = 0;
  private readonly maxReconnectAttempts: number = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  constructor(private readonly configService: ConfigService) {
    this.config = this.configService.get<TelegramConfig>('telegram')!;
  }

  async onModuleInit(): Promise<void> {
    await this.initializeBot();
  }

  async onModuleDestroy(): Promise<void> {
    await this.destroyBot();
  }

  /**
   * 初始化 Telegram Bot
   */
  private async initializeBot(): Promise<void> {
    try {
      // 详细的配置检查和日志
      this.logger.log(`Telegram 配置检查:`);
      this.logger.log(`- Enabled: ${this.config?.enabled}`);
      this.logger.log(`- Bot Token: ${this.config?.botToken ? '已设置' : '未设置'}`);
      this.logger.log(`- Chat ID: ${this.config?.chatId ? this.config.chatId : '未设置'}`);

      if (!this.config?.enabled) {
        this.logger.warn('Telegram 功能已禁用 - 检查环境变量 TELEGRAM_ENABLED 或确保 TELEGRAM_BOT_TOKEN 和 TELEGRAM_CHAT_ID 都已设置');
        return;
      }

      if (!this.config?.botToken) {
        this.logger.error('Telegram Bot Token 未配置 - 请设置环境变量 TELEGRAM_BOT_TOKEN');
        return;
      }

      if (!this.config.chatId) {
        this.logger.error('Telegram Chat ID 未配置 - 请设置环境变量 TELEGRAM_CHAT_ID');
        return;
      }

      this.connectionStatus = BotConnectionStatus.CONNECTING;
      this.bot = new TelegramBot(this.config.botToken, { 
        polling: true
      });

      // 设置错误处理
      this.bot.on('error', (error) => {
        this.logger.error(`Telegram Bot 错误: ${error.message}`);
        this.lastError = error.message;
        this.connectionStatus = BotConnectionStatus.ERROR;
        this.handleBotError(error);
      });

      // 设置轮询错误处理
      this.bot.on('polling_error', (error) => {
        this.logger.error(`Telegram Bot 轮询错误: ${error.message}`);
        this.lastError = error.message;
        this.connectionStatus = BotConnectionStatus.ERROR;
        this.handleBotError(error);
      });

      // 设置消息处理
      this.bot.on('message', async (msg) => {
        await this.handleIncomingMessage(msg);
      });

      // 设置回调查询处理
      this.bot.on('callback_query', async (query) => {
        await this.handleCallbackQuery(query);
      });

      this.connectionStatus = BotConnectionStatus.CONNECTED;
      this.lastError = null;
      this.startTime = Date.now();
      this.reconnectAttempts = 0; // 重置重连计数器
      this.clearReconnectTimeout(); // 清理重连超时
      this.logger.log('Telegram Bot 初始化成功');

    } catch (error) {
      this.logger.error(`初始化 Telegram Bot 失败: ${error.message}`);
      this.lastError = error.message;
      this.connectionStatus = BotConnectionStatus.ERROR;
    }
  }

  /**
   * 销毁 Bot 实例
   */
  private async destroyBot(): Promise<void> {
    this.clearReconnectTimeout(); // 清理重连超时
    
    if (this.bot) {
      try {
        await this.bot.stopPolling();
        this.bot = null;
        this.connectionStatus = BotConnectionStatus.DISCONNECTED;
        this.logger.log('Telegram Bot 已停止');
      } catch (error) {
        this.logger.error(`停止 Telegram Bot 失败: ${error.message}`);
      }
    }
  }

  /**
   * 处理传入的消息
   */
  private async handleIncomingMessage(msg: TelegramBot.Message): Promise<void> {
    const text = msg.text || '';
    
    // 检查是否是命令
    if (text.startsWith('/')) {
      const command = text.split(' ')[0];
      const handler = this.commandHandlers.get(command);
      
      if (handler) {
        try {
          await handler.handler(msg);
        } catch (error) {
          this.logger.error(`处理命令 ${command} 失败: ${error.message}`);
        }
      }
    } else {
      // 处理非命令消息
      for (const messageHandler of this.messageHandlers) {
        try {
          const handled = await messageHandler.handler(msg);
          if (handled) {
            break; // 如果消息被处理，则停止尝试其他处理器
          }
        } catch (error) {
          this.logger.error(`消息处理器错误: ${error.message}`);
        }
      }
    }
  }

  /**
   * 处理回调查询
   */
  private async handleCallbackQuery(query: TelegramBot.CallbackQuery): Promise<void> {
    const data = query.data || '';
    
    // 尝试匹配回调查询处理器
    for (const handler of this.callbackQueryHandlers) {
      let isMatch = false;
      
      if (typeof handler.pattern === 'string') {
        isMatch = data === handler.pattern || data.startsWith(handler.pattern);
      } else {
        isMatch = handler.pattern.test(data);
      }
      
      if (isMatch) {
        try {
          // 先回答回调查询
          await this.bot!.answerCallbackQuery(query.id);
          // 然后处理逻辑
          await handler.handler(query);
          return;
        } catch (error) {
          this.logger.error(`处理回调查询失败: ${error.message}`);
          try {
            await this.bot!.answerCallbackQuery(query.id, {
              text: '处理请求时发生错误',
              show_alert: true
            });
          } catch (answerError) {
            this.logger.error(`回答回调查询失败: ${answerError.message}`);
          }
        }
        return;
      }
    }
    
    // 如果没有找到匹配的处理器，回答查询避免加载状态
    try {
      await this.bot!.answerCallbackQuery(query.id, {
        text: '未找到对应的处理器',
        show_alert: true
      });
    } catch (error) {
      this.logger.error(`回答未处理的回调查询失败: ${error.message}`);
    }
  }

  /**
   * 发送消息
   */
  async sendMessage(
    message: string,
    chatId?: number | string,
    options?: MessageOptions
  ): Promise<SendMessageResult> {
    try {
      if (!this.isEnabled()) {
        return {
          success: false,
          error: 'Telegram Bot 未启用或未连接'
        };
      }

      const targetChatId = chatId || this.config.chatId;
      
      const result = await this.bot!.sendMessage(targetChatId, message, {
        parse_mode: options?.parse_mode || 'HTML',
        disable_web_page_preview: options?.disable_web_page_preview ?? true,
        disable_notification: options?.disable_notification ?? false,
        reply_markup: options?.reply_markup,
      });

      this.logger.debug(`消息发送成功，消息ID: ${result.message_id}`);
      
      return {
        success: true,
        messageId: result.message_id
      };

    } catch (error) {
      this.logger.error(`发送消息失败: ${error.message}`);
      this.lastError = error.message;
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 发送消息到默认聊天
   */
  async sendToDefaultChat(message: string, options?: MessageOptions): Promise<SendMessageResult> {
    return this.sendMessage(message, undefined, options);
  }

  /**
   * 注册命令处理器
   */
  registerCommandHandler(handler: CommandHandler): void {
    this.commandHandlers.set(handler.command, handler);
    this.logger.debug(`注册命令处理器: ${handler.command}`);
  }

  /**
   * 取消注册命令处理器
   */
  unregisterCommandHandler(command: string): void {
    this.commandHandlers.delete(command);
    this.logger.debug(`取消注册命令处理器: ${command}`);
  }

  /**
   * 批量注册命令处理器
   */
  registerCommandHandlers(handlers: CommandHandler[]): void {
    handlers.forEach(handler => this.registerCommandHandler(handler));
  }

  /**
   * 注册回调查询处理器
   */
  registerCallbackQueryHandler(handler: CallbackQueryHandler): void {
    this.callbackQueryHandlers.push(handler);
    this.logger.debug(`注册回调查询处理器: ${handler.pattern}`);
  }

  /**
   * 取消注册回调查询处理器
   */
  unregisterCallbackQueryHandler(pattern: string | RegExp): void {
    this.callbackQueryHandlers = this.callbackQueryHandlers.filter(
      handler => handler.pattern !== pattern
    );
    this.logger.debug(`取消注册回调查询处理器: ${pattern}`);
  }

  /**
   * 批量注册回调查询处理器
   */
  registerCallbackQueryHandlers(handlers: CallbackQueryHandler[]): void {
    handlers.forEach(handler => this.registerCallbackQueryHandler(handler));
  }

  /**
   * 注册消息处理器
   */
  registerMessageHandler(handler: MessageHandler): void {
    this.messageHandlers.push(handler);
    this.logger.debug(`注册消息处理器: ${handler.description}`);
  }

  /**
   * 批量注册消息处理器
   */
  registerMessageHandlers(handlers: MessageHandler[]): void {
    handlers.forEach(handler => this.registerMessageHandler(handler));
  }

  /**
   * 设置 Bot 命令菜单
   */
  async setBotCommands(commands: Array<{command: string, description: string}>): Promise<boolean> {
    if (!this.bot) {
      this.logger.warn('Bot 未初始化，无法设置命令');
      return false;
    }

    try {
      await this.bot.setMyCommands(commands);
      this.logger.log(`成功设置 ${commands.length} 个 Bot 命令`);
      return true;
    } catch (error) {
      this.logger.error(`设置 Bot 命令失败: ${error.message}`);
      return false;
    }
  }

  /**
   * 获取 bot 状态
   */
  getBotStatus(): BotStatus {
    return {
      isConnected: this.connectionStatus === BotConnectionStatus.CONNECTED,
      isEnabled: this.config?.enabled && !!this.bot,
      lastError: this.lastError || undefined,
      uptime: this.connectionStatus === BotConnectionStatus.CONNECTED 
        ? Date.now() - this.startTime 
        : undefined,
      connectionStatus: this.connectionStatus,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
      isReconnecting: this.connectionStatus === BotConnectionStatus.RECONNECTING
    };
  }

  /**
   * 检查 bot 是否启用且连接正常
   */
  isEnabled(): boolean {
    return (
      this.config?.enabled &&
      !!this.bot &&
      this.connectionStatus === BotConnectionStatus.CONNECTED
    );
  }

  /**
   * 检查 bot 是否连接
   */
  isConnected(): boolean {
    return this.connectionStatus === BotConnectionStatus.CONNECTED;
  }

  /**
   * 获取配置信息
   */
  getConfig(): TelegramConfig {
    return { ...this.config };
  }

  /**
   * 重新连接 bot
   */
  async reconnect(): Promise<void> {
    this.logger.log('尝试重新连接 Telegram Bot...');
    this.reconnectAttempts = 0; // 手动重连时重置计数器
    await this.destroyBot();
    await this.initializeBot();
  }

  /**
   * 处理 Bot 错误
   */
  private handleBotError(error: any): void {
    // 检查是否是 409 错误（Conflict - 通常是多个轮询实例冲突）
    const errorMessage = error.message || error.toString();
    const is409Error = errorMessage.includes('409') || 
                       errorMessage.includes('Conflict') ||
                       errorMessage.includes('terminated by other getUpdates request');

    if (is409Error) {
      this.logger.warn(`检测到 409 冲突错误，准备重连: ${errorMessage}`);
      this.scheduleReconnect();
    }
  }

  /**
   * 调度重连
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error(`已达到最大重连次数 (${this.maxReconnectAttempts})，停止重连尝试`);
      return;
    }

    // 清理之前的重连超时
    this.clearReconnectTimeout();

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000); // 指数退避，最大30秒

    this.logger.log(`第 ${this.reconnectAttempts} 次重连尝试，将在 ${delay}ms 后执行`);
    this.connectionStatus = BotConnectionStatus.RECONNECTING;

    this.reconnectTimeout = setTimeout(async () => {
      try {
        await this.destroyBot();
        await new Promise(resolve => setTimeout(resolve, 1000)); // 额外等待1秒
        await this.initializeBot();
      } catch (error) {
        this.logger.error(`重连失败: ${error.message}`);
        this.connectionStatus = BotConnectionStatus.ERROR;
        // 如果重连失败，继续调度下一次重连
        this.scheduleReconnect();
      }
    }, delay);
  }

  /**
   * 清理重连超时
   */
  private clearReconnectTimeout(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }
}