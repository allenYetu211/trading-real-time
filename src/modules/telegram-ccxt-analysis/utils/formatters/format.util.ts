/**
 * 格式化工具类
 * 提供通用的数据格式化功能
 */
export class FormatUtil {
  /**
   * 格式化价格显示
   */
  static formatPrice(price: number): string {
    if (price >= 1000) {
      return price.toFixed(2);
    } else if (price >= 100) {
      return price.toFixed(3);
    } else if (price >= 10) {
      return price.toFixed(4);
    } else if (price >= 1) {
      return price.toFixed(5);
    } else {
      return price.toFixed(6);
    }
  }

  /**
   * 格式化百分比显示
   */
  static formatPercentage(value: number, decimals: number = 2): string {
    return `${value.toFixed(decimals)}%`;
  }

  /**
   * 格式化时间显示
   */
  static formatTime(): string {
    return new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
  }

  /**
   * 获取趋势描述
   */
  static getTrendDescription(trend: string): string {
    const descriptions = {
      'STRONG_UPTREND': '强势上涨',
      'UPTREND': '上涨趋势',
      'WEAK_UPTREND': '弱势上涨',
      'RANGING': '震荡整理',
      'WEAK_DOWNTREND': '弱势下跌',
      'DOWNTREND': '下跌趋势',
      'STRONG_DOWNTREND': '强势下跌',
    };
    return descriptions[trend] || trend;
  }

  /**
   * 获取置信度等级描述
   */
  static getConfidenceLevel(confidence: number): string {
    if (confidence >= 80) return '高';
    if (confidence >= 60) return '中等';
    if (confidence >= 40) return '较低';
    return '低';
  }

  /**
   * 获取交易动作描述
   */
  static getActionDescription(action: string): string {
    const descriptions = {
      'STRONG_BUY': '强烈买入',
      'BUY': '买入',
      'HOLD': '持有',
      'SELL': '卖出',
      'STRONG_SELL': '强烈卖出',
      'WAIT': '等待',
    };
    return descriptions[action] || action;
  }

  /**
   * 获取价格动作描述
   */
  static getPriceActionDescription(action: string): string {
    const descriptions = {
      'APPROACHING_SUPPORT': '正接近支撑位',
      'APPROACHING_RESISTANCE': '正接近阻力位',
      'BREAKING_SUPPORT': '突破支撑位',
      'BREAKING_RESISTANCE': '突破阻力位',
      'BOUNCING_OFF_SUPPORT': '支撑位反弹',
      'REJECTING_RESISTANCE': '阻力位回调',
    };
    return descriptions[action] || action;
  }

  /**
   * 获取位置状态描述
   */
  static getPositionStatus(currentPosition: any): string {
    if (currentPosition.inSupportZone) {
      return '位于支撑区域 📉';
    }
    if (currentPosition.inResistanceZone) {
      return '位于阻力区域 📈';
    }
    if (currentPosition.betweenLevels) {
      return '位于支撑阻力位之间 📊';
    }
    return '中性位置 ➡️';
  }

  /**
   * 计算最近价格范围
   */
  static calculateRecentPriceRange(emaDetailedData: any, days: number = 100): { min: number; max: number } {
    if (!emaDetailedData || !emaDetailedData.klines || emaDetailedData.klines.length === 0) {
      return { min: 0, max: 0 };
    }

    const recentKlines = emaDetailedData.klines.slice(-days);
    const prices = recentKlines.flatMap((kline: any) => [kline.high, kline.low]);
    
    return {
      min: Math.min(...prices),
      max: Math.max(...prices)
    };
  }
} 