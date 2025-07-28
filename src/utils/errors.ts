// 错误处理工具

import { logger } from './logger';

export class ErrorHandler {
  private static readonly MAX_RETRIES = 5;
  private static readonly BASE_DELAY = 1000; // 1秒

  /**
   * 处理API错误，包含重试逻辑
   */
  static async handleApiError<T>(
    operation: () => Promise<T>,
    context: string,
    retryCount: number = 0
  ): Promise<T> {
    try {
      return await operation();
    } catch (error: any) {
      logger.error(`API error in ${context}`, error, { retryCount });

      if (retryCount >= this.MAX_RETRIES) {
        throw new Error(`API调用失败，已达最大重试次数: ${error.message}`);
      }

      // 根据错误类型决定是否重试
      if (this.shouldRetry(error)) {
        const delay = this.calculateDelay(retryCount);
        logger.info(`Retrying ${context} in ${delay}ms`, { retryCount: retryCount + 1 });
        
        await this.delay(delay);
        return this.handleApiError(operation, context, retryCount + 1);
      }

      throw error;
    }
  }

  /**
   * 判断错误是否应该重试
   */
  private static shouldRetry(error: any): boolean {
    // 网络错误
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      return true;
    }

    // HTTP状态码错误
    if (error.response?.status) {
      const status = error.response.status;
      // 5xx服务器错误和429限流错误可以重试
      return status >= 500 || status === 429;
    }

    // 币安API特定错误码
    if (error.response?.data?.code) {
      const code = error.response.data.code;
      // -1003: 请求过于频繁
      // -1021: 时间戳错误
      return code === -1003 || code === -1021;
    }

    return false;
  }

  /**
   * 计算指数退避延迟
   */
  private static calculateDelay(retryCount: number): number {
    const exponentialDelay = this.BASE_DELAY * Math.pow(2, retryCount);
    const jitter = Math.random() * 1000; // 添加随机抖动
    return Math.min(exponentialDelay + jitter, 30000); // 最大30秒
  }

  /**
   * 延迟函数
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 处理数据验证错误
   */
  static validateData<T>(
    data: any,
    validator: (data: any) => data is T,
    context: string
  ): T {
    if (!validator(data)) {
      const error = new Error(`数据验证失败: ${context}`);
      logger.error('Data validation failed', error, { data });
      throw error;
    }
    return data;
  }

  /**
   * 安全执行函数，捕获并记录错误
   */
  static async safeExecute<T>(
    operation: () => Promise<T>,
    context: string,
    defaultValue?: T
  ): Promise<T | undefined> {
    try {
      return await operation();
    } catch (error: any) {
      logger.error(`Safe execution failed in ${context}`, error);
      return defaultValue;
    }
  }

  /**
   * 处理数据库操作错误
   */
  static async handleDatabaseError<T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<T> {
    try {
      return await operation();
    } catch (error: any) {
      logger.error(`Database error in ${context}`, error);
      
      // 连接错误可以重试
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        throw new Error(`数据库连接失败: ${error.message}`);
      }
      
      // 其他数据库错误
      throw new Error(`数据库操作失败: ${error.message}`);
    }
  }

  /**
   * 处理分析计算错误
   */
  static handleAnalysisError(error: any, context: string, symbol?: string): never {
    logger.error(`Analysis error in ${context}`, error, { symbol });
    
    if (error.message.includes('insufficient data')) {
      throw new Error(`数据不足，无法进行${context}分析${symbol ? ` (${symbol})` : ''}`);
    }
    
    if (error.message.includes('division by zero')) {
      throw new Error(`计算错误，除零异常在${context}${symbol ? ` (${symbol})` : ''}`);
    }
    
    throw new Error(`${context}分析失败${symbol ? ` (${symbol})` : ''}: ${error.message}`);
  }

  /**
   * 创建错误摘要，用于用户友好的错误显示
   */
  static createErrorSummary(errors: Error[]): string {
    if (errors.length === 0) {
      return '无错误';
    }
    
    if (errors.length === 1) {
      return errors[0].message;
    }
    
    const errorCounts = new Map<string, number>();
    errors.forEach(error => {
      const key = error.constructor.name;
      errorCounts.set(key, (errorCounts.get(key) || 0) + 1);
    });
    
    const summary = Array.from(errorCounts.entries())
      .map(([type, count]) => `${type}: ${count}`)
      .join(', ');
    
    return `多个错误 (${errors.length}): ${summary}`;
  }

  /**
   * 监控函数执行时间
   */
  static async withTiming<T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<{ result: T; duration: number }> {
    const startTime = Date.now();
    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      logger.debug(`${context} completed`, { duration });
      return { result, duration };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`${context} failed`, error as Error, { duration });
      throw error;
    }
  }
}

// 数据验证器
export class DataValidators {
  static isKlineData(data: any): data is import('../types').KlineData {
    return (
      data &&
      typeof data.symbol === 'string' &&
      typeof data.timeframe === 'string' &&
      typeof data.openTime === 'number' &&
      typeof data.closeTime === 'number' &&
      typeof data.open === 'number' &&
      typeof data.high === 'number' &&
      typeof data.low === 'number' &&
      typeof data.close === 'number' &&
      typeof data.volume === 'number'
    );
  }

  static isKlineDataArray(data: any): data is import('../types').KlineData[] {
    return Array.isArray(data) && data.every(item => this.isKlineData(item));
  }

  static isValidSymbol(symbol: string): boolean {
    return /^[A-Z]{2,10}USDT$/.test(symbol);
  }

  static isValidTimeframe(timeframe: string): boolean {
    return ['15m', '1h', '4h', '1d', '1w'].includes(timeframe);
  }

  static isValidDirection(direction: string): direction is 'LONG' | 'SHORT' {
    return direction === 'LONG' || direction === 'SHORT';
  }

  static isValidPrice(price: number): boolean {
    return typeof price === 'number' && price > 0 && isFinite(price);
  }

  static isValidRiskRewardRatio(ratio: number): boolean {
    return typeof ratio === 'number' && ratio > 0 && isFinite(ratio);
  }
}