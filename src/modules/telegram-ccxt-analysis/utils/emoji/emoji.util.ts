/**
 * 表情符号工具类
 * 管理所有Telegram消息中使用的表情符号
 */
export class EmojiUtil {
  /**
   * 获取趋势表情符号
   */
  static getTrendEmoji(trend: string): string {
    const emojis = {
      'STRONG_UPTREND': '🚀',
      'UPTREND': '📈',
      'WEAK_UPTREND': '📊',
      'RANGING': '➡️',
      'WEAK_DOWNTREND': '📉',
      'DOWNTREND': '🔻',
      'STRONG_DOWNTREND': '💥',
    };
    return emojis[trend] || '❓';
  }

  /**
   * 获取时间周期表情符号
   */
  static getTimeframeEmoji(timeframe: string): string {
    const emojis = {
      '15m': '⚡',
      '1h': '🕐',
      '4h': '⏰',
      '1d': '📅',
    };
    return emojis[timeframe] || '📊';
  }

  /**
   * 获取交易动作表情符号
   */
  static getActionEmoji(action: string): string {
    const emojis = {
      'STRONG_BUY': '🚀',
      'BUY': '💚',
      'HOLD': '🤚',
      'SELL': '🔴',
      'STRONG_SELL': '💥',
      'WAIT': '⏳',
    };
    return emojis[action] || '❓';
  }

  /**
   * 获取置信度等级表情符号
   */
  static getConfidenceEmoji(confidence: number): string {
    if (confidence >= 80) return '🔥';
    if (confidence >= 60) return '✅';
    if (confidence >= 40) return '⚠️';
    return '❌';
  }

  /**
   * 获取支撑阻力位强度表情符号
   */
  static getStrengthEmoji(strength: string): string {
    const emojis = {
      'MAJOR': '🔴',
      'STRONG': '🟠',
      'MEDIUM': '🟡',
      'WEAK': '🟢',
    };
    return emojis[strength] || '⚪';
  }

  /**
   * 获取价格动作表情符号
   */
  static getPriceActionEmoji(action: string): string {
    const emojis = {
      'APPROACHING_SUPPORT': '⬇️',
      'APPROACHING_RESISTANCE': '⬆️',
      'BREAKING_SUPPORT': '💥',
      'BREAKING_RESISTANCE': '🚀',
      'BOUNCING_OFF_SUPPORT': '⤴️',
      'REJECTING_RESISTANCE': '⤵️',
    };
    return emojis[action] || '➡️';
  }

  /**
   * 获取风险等级表情符号
   */
  static getRiskEmoji(risk: string): string {
    const emojis = {
      'HIGH': '🔴',
      'MEDIUM': '🟡',
      'LOW': '🟢',
    };
    return emojis[risk] || '⚪';
  }
} 