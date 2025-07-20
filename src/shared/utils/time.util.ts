import { IntervalType } from '../enums';

export class TimeUtil {
  /**
   * 将时间间隔转换为毫秒
   */
  static intervalToMilliseconds(interval: IntervalType): number {
    const intervalMap: Record<IntervalType, number> = {
      [IntervalType.ONE_MINUTE]: 60 * 1000,
      [IntervalType.FIVE_MINUTES]: 5 * 60 * 1000,
      [IntervalType.FIFTEEN_MINUTES]: 15 * 60 * 1000,
      [IntervalType.THIRTY_MINUTES]: 30 * 60 * 1000,
      [IntervalType.ONE_HOUR]: 60 * 60 * 1000,
      [IntervalType.FOUR_HOURS]: 4 * 60 * 60 * 1000,
      [IntervalType.ONE_DAY]: 24 * 60 * 60 * 1000,
      [IntervalType.ONE_WEEK]: 7 * 24 * 60 * 60 * 1000,
    };
    
    return intervalMap[interval] || 60 * 1000;
  }

  /**
   * 获取K线开始时间
   */
  static getKlineStartTime(timestamp: number, interval: IntervalType): number {
    const intervalMs = this.intervalToMilliseconds(interval);
    return Math.floor(timestamp / intervalMs) * intervalMs;
  }

  /**
   * 获取K线结束时间
   */
  static getKlineEndTime(timestamp: number, interval: IntervalType): number {
    const startTime = this.getKlineStartTime(timestamp, interval);
    const intervalMs = this.intervalToMilliseconds(interval);
    return startTime + intervalMs - 1;
  }

  /**
   * 检查时间戳是否在同一个K线周期内
   */
  static isSameKlinePeriod(timestamp1: number, timestamp2: number, interval: IntervalType): boolean {
    const startTime1 = this.getKlineStartTime(timestamp1, interval);
    const startTime2 = this.getKlineStartTime(timestamp2, interval);
    return startTime1 === startTime2;
  }

  /**
   * 格式化时间戳为可读字符串
   */
  static formatTimestamp(timestamp: number, includeTime = true): string {
    const date = new Date(timestamp);
    const dateStr = date.toISOString().split('T')[0];
    
    if (!includeTime) {
      return dateStr;
    }
    
    const timeStr = date.toISOString().split('T')[1].split('.')[0];
    return `${dateStr} ${timeStr}`;
  }

  /**
   * 获取指定时间前的时间戳
   */
  static getTimestampBefore(currentTime: number, intervals: number, intervalType: IntervalType): number {
    const intervalMs = this.intervalToMilliseconds(intervalType);
    return currentTime - (intervals * intervalMs);
  }

  /**
   * 验证时间间隔是否有效
   */
  static isValidInterval(interval: string): interval is IntervalType {
    return Object.values(IntervalType).includes(interval as IntervalType);
  }

  /**
   * 获取当前时间的K线时间戳
   */
  static getCurrentKlineTime(interval: IntervalType): number {
    return this.getKlineStartTime(Date.now(), interval);
  }

  /**
   * 计算两个时间戳之间的K线数量
   */
  static getKlineCountBetween(startTime: number, endTime: number, interval: IntervalType): number {
    const intervalMs = this.intervalToMilliseconds(interval);
    return Math.floor((endTime - startTime) / intervalMs);
  }
} 