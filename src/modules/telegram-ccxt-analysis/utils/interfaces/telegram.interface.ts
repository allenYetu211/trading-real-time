/**
 * Telegram 配置接口
 */
export interface TelegramConfig {
  botToken: string;
  chatId: string;
  enabled: boolean;
  parseMode: 'HTML' | 'Markdown';
  disableWebPagePreview: boolean;
  disableNotification: boolean;
}

/**
 * 用户状态接口
 */
export interface UserState {
  action: string;
  data?: any;
  timestamp: number;
}

/**
 * 交易对选项接口
 */
export interface SymbolOption {
  text: string;
  callback_data: string;
}

/**
 * 时间周期选项接口
 */
export interface TimeframeOption {
  key: string;
  label: string;
}

/**
 * 分析类型枚举
 */
export enum AnalysisType {
  COMPREHENSIVE = 'comprehensive',
  TREND = 'trend',
  SUPPORT_RESISTANCE = 'support_resistance',
  EMA = 'ema',
  RSI = 'rsi',
  OPEN_INTEREST = 'open_interest'
}

/**
 * 消息发送选项接口
 */
export interface MessageOptions {
  parse_mode?: 'HTML' | 'Markdown';
  disable_web_page_preview?: boolean;
  disable_notification?: boolean;
  reply_markup?: any;
} 