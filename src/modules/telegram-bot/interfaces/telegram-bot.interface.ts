import * as TelegramBot from 'node-telegram-bot-api';

/**
 * Telegram 配置接口
 */
export interface TelegramConfig {
  enabled: boolean;
  botToken: string;
  chatId: string;
}

/**
 * 消息发送选项
 */
export interface MessageOptions {
  parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  disable_web_page_preview?: boolean;
  disable_notification?: boolean;
  reply_markup?: TelegramBot.InlineKeyboardMarkup | TelegramBot.ReplyKeyboardMarkup;
}

/**
 * 消息发送结果
 */
export interface SendMessageResult {
  success: boolean;
  messageId?: number;
  error?: string;
}

/**
 * Bot 状态信息
 */
export interface BotStatus {
  isConnected: boolean;
  isEnabled: boolean;
  lastError?: string;
  uptime?: number;
  connectionStatus?: string;
  reconnectAttempts?: number;
  maxReconnectAttempts?: number;
  isReconnecting?: boolean;
}

/**
 * 命令处理器接口
 */
export interface CommandHandler {
  command: string;
  description: string;
  handler: (msg: TelegramBot.Message) => Promise<void>;
}

/**
 * 回调查询处理器接口
 */
export interface CallbackQueryHandler {
  pattern: string | RegExp;
  description: string;
  handler: (query: TelegramBot.CallbackQuery) => Promise<void>;
}

/**
 * 消息处理器接口
 */
export interface MessageHandler {
  description: string;
  handler: (msg: TelegramBot.Message) => Promise<boolean>; // 返回 true 表示已处理，false 表示未处理
}