/**
 * Bot 连接状态枚举
 */
export enum BotConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error',
  RECONNECTING = 'reconnecting',
}

/**
 * 消息类型枚举
 */
export enum MessageType {
  TEXT = 'text',
  HTML = 'html',
  MARKDOWN = 'markdown',
  PHOTO = 'photo',
  DOCUMENT = 'document',
}