// 数据管理器

import { IDataManager } from '../interfaces';
import { KlineData, ApiStatus, KlineRequest } from '../types';
import { BinanceClient } from './binance-client';
import { logger } from '../utils/logger';
import { ErrorHandler, DataValidators } from '../utils/errors';
import { LOG_CONTEXTS, DEFAULT_CONFIG } from '../utils/constants';
import config from '../config';

export class DataManager implements IDataManager {
  private binanceClient: BinanceClient;
  private logger = logger.setContext(LOG_CONTEXTS.DATA_MANAGER);

  constructor() {
    this.binanceClient = new BinanceClient();
  }

  /**
   * 获取K线数据
   */
  async getKlineData(
    symbol: string,
    timeframe: string,
    limit: number = DEFAULT_CONFIG.ANALYSIS.KLINE_LIMIT.EMA_CALCULATION
  ): Promise<KlineData[]> {
    this.logger.debug('Getting kline data', { symbol, timeframe, limit });

    // 验证输入参数
    if (!DataValidators.isValidSymbol(symbol)) {
      throw new Error(`无效的交易对: ${symbol}`);
    }

    if (!DataValidators.isValidTimeframe(timeframe)) {
      throw new Error(`不支持的时间周期: ${timeframe}`);
    }

    if (limit <= 0 || limit > 1000) {
      throw new Error(`无效的数据数量限制: ${limit} (必须在1-1000之间)`);
    }

    const startTime = Date.now();

    try {
      const data = await this.binanceClient.getKlineData(symbol, timeframe, limit);
      
      // 验证返回的数据
      if (!DataValidators.isKlineDataArray(data)) {
        throw new Error('API返回的数据格式无效');
      }

      if (data.length === 0) {
        throw new Error(`没有获取到${symbol}的${timeframe}数据`);
      }

      const duration = Date.now() - startTime;
      this.logger.info('Kline data retrieved successfully', {
        symbol,
        timeframe,
        count: data.length,
        duration
      });

      // 按时间排序，确保数据顺序正确
      return data.sort((a, b) => a.openTime - b.openTime);

    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Failed to get kline data', error as Error, {
        symbol,
        timeframe,
        limit,
        duration
      });
      throw error;
    }
  }

  /**
   * 获取最新价格
   */
  async getLatestPrice(symbol: string): Promise<number> {
    this.logger.debug('Getting latest price', { symbol });

    if (!DataValidators.isValidSymbol(symbol)) {
      throw new Error(`无效的交易对: ${symbol}`);
    }

    const startTime = Date.now();

    try {
      const price = await this.binanceClient.getLatestPrice(symbol);
      
      if (!DataValidators.isValidPrice(price)) {
        throw new Error(`获取到无效的价格数据: ${price}`);
      }

      const duration = Date.now() - startTime;
      this.logger.debug('Latest price retrieved', {
        symbol,
        price,
        duration
      });

      return price;

    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Failed to get latest price', error as Error, {
        symbol,
        duration
      });
      throw error;
    }
  }

  /**
   * 批量获取K线数据
   */
  async getBatchKlineData(requests: KlineRequest[]): Promise<Map<string, KlineData[]>> {
    this.logger.info('Starting batch kline data retrieval', {
      requestCount: requests.length
    });

    // 验证请求数量
    if (requests.length === 0) {
      return new Map();
    }

    if (requests.length > config.analysis.maxTradingPairs * 4) { // 4个时间周期
      throw new Error(`批量请求数量过多: ${requests.length}`);
    }

    // 验证每个请求
    const invalidRequests = requests.filter(req => 
      !DataValidators.isValidSymbol(req.symbol) || 
      !DataValidators.isValidTimeframe(req.timeframe)
    );

    if (invalidRequests.length > 0) {
      throw new Error(`包含无效的请求: ${JSON.stringify(invalidRequests)}`);
    }

    const startTime = Date.now();
    const results = new Map<string, KlineData[]>();
    const errors: string[] = [];

    try {
      // 使用币安客户端的批量获取功能
      const batchResults = await this.binanceClient.getBatchKlineData(requests);
      
      // 验证和处理结果
      for (const [key, data] of batchResults.entries()) {
        if (DataValidators.isKlineDataArray(data) && data.length > 0) {
          // 按时间排序
          const sortedData = data.sort((a, b) => a.openTime - b.openTime);
          results.set(key, sortedData);
        } else {
          errors.push(`${key}: 数据无效或为空`);
        }
      }

      const duration = Date.now() - startTime;
      this.logger.info('Batch kline data retrieval completed', {
        requestCount: requests.length,
        successCount: results.size,
        errorCount: errors.length,
        duration
      });

      if (errors.length > 0) {
        this.logger.warn('Some batch requests failed', { errors });
      }

      return results;

    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Batch kline data retrieval failed', error as Error, {
        requestCount: requests.length,
        duration
      });
      throw error;
    }
  }

  /**
   * 获取API状态
   */
  getApiStatus(): ApiStatus {
    try {
      const status = this.binanceClient.getApiStatus();
      const weightStats = this.binanceClient.getWeightStats();
      
      return {
        connected: status.connected,
        lastError: status.lastError,
        weightUsed: weightStats.used,
        weightLimit: weightStats.limit
      };
    } catch (error) {
      this.logger.error('Failed to get API status', error as Error);
      return {
        connected: false,
        lastError: (error as Error).message,
        weightUsed: 0,
        weightLimit: config.binance.weightLimit
      };
    }
  }

  /**
   * 获取剩余权重
   */
  getRemainingWeight(): number {
    try {
      return this.binanceClient.getRemainingWeight();
    } catch (error) {
      this.logger.error('Failed to get remaining weight', error as Error);
      return 0;
    }
  }

  /**
   * 验证数据完整性
   */
  async validateDataIntegrity(data: KlineData[]): Promise<boolean> {
    if (!Array.isArray(data) || data.length === 0) {
      return false;
    }

    // 检查数据格式
    const isValidFormat = data.every(kline => DataValidators.isKlineData(kline));
    if (!isValidFormat) {
      this.logger.warn('Data format validation failed');
      return false;
    }

    // 检查时间序列连续性
    const sortedData = [...data].sort((a, b) => a.openTime - b.openTime);
    let hasGaps = false;
    
    for (let i = 1; i < sortedData.length; i++) {
      const prev = sortedData[i - 1];
      const curr = sortedData[i];
      
      // 检查时间间隔是否合理（允许一定的误差）
      const expectedInterval = this.getTimeframeInterval(curr.timeframe);
      const actualInterval = curr.openTime - prev.closeTime;
      
      if (Math.abs(actualInterval - expectedInterval) > expectedInterval * 0.1) {
        hasGaps = true;
        this.logger.warn('Data gap detected', {
          symbol: curr.symbol,
          timeframe: curr.timeframe,
          prevClose: new Date(prev.closeTime).toISOString(),
          currOpen: new Date(curr.openTime).toISOString(),
          gap: actualInterval
        });
      }
    }

    // 检查价格数据的合理性
    const hasInvalidPrices = data.some(kline => 
      !DataValidators.isValidPrice(kline.open) ||
      !DataValidators.isValidPrice(kline.high) ||
      !DataValidators.isValidPrice(kline.low) ||
      !DataValidators.isValidPrice(kline.close) ||
      kline.high < Math.max(kline.open, kline.close) ||
      kline.low > Math.min(kline.open, kline.close)
    );

    if (hasInvalidPrices) {
      this.logger.warn('Invalid price data detected');
      return false;
    }

    return !hasGaps;
  }

  /**
   * 清理和标准化数据
   */
  cleanAndNormalizeData(data: KlineData[]): KlineData[] {
    if (!Array.isArray(data)) {
      return [];
    }

    return data
      .filter(kline => DataValidators.isKlineData(kline))
      .map(kline => ({
        ...kline,
        // 确保价格精度
        open: Math.round(kline.open * 100000000) / 100000000,
        high: Math.round(kline.high * 100000000) / 100000000,
        low: Math.round(kline.low * 100000000) / 100000000,
        close: Math.round(kline.close * 100000000) / 100000000,
        volume: Math.round(kline.volume * 100000000) / 100000000
      }))
      .sort((a, b) => a.openTime - b.openTime);
  }

  /**
   * 获取时间周期对应的毫秒间隔
   */
  private getTimeframeInterval(timeframe: string): number {
    const intervals: Record<string, number> = {
      '1m': 60 * 1000,
      '3m': 3 * 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '30m': 30 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '2h': 2 * 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '8h': 8 * 60 * 60 * 1000,
      '12h': 12 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
      '3d': 3 * 24 * 60 * 60 * 1000,
      '1w': 7 * 24 * 60 * 60 * 1000,
      '1M': 30 * 24 * 60 * 60 * 1000
    };
    
    return intervals[timeframe] || 60 * 1000; // 默认1分钟
  }

  /**
   * 获取数据统计信息
   */
  getDataStats(data: KlineData[]): {
    count: number;
    timeRange: { start: number; end: number };
    priceRange: { min: number; max: number };
    volumeStats: { total: number; average: number; max: number };
  } {
    if (!data || data.length === 0) {
      return {
        count: 0,
        timeRange: { start: 0, end: 0 },
        priceRange: { min: 0, max: 0 },
        volumeStats: { total: 0, average: 0, max: 0 }
      };
    }

    const sortedData = [...data].sort((a, b) => a.openTime - b.openTime);
    const prices = data.flatMap(k => [k.open, k.high, k.low, k.close]);
    const volumes = data.map(k => k.volume);

    return {
      count: data.length,
      timeRange: {
        start: sortedData[0].openTime,
        end: sortedData[sortedData.length - 1].closeTime
      },
      priceRange: {
        min: Math.min(...prices),
        max: Math.max(...prices)
      },
      volumeStats: {
        total: volumes.reduce((sum, vol) => sum + vol, 0),
        average: volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length,
        max: Math.max(...volumes)
      }
    };
  }

  /**
   * 测试连接
   */
  async testConnection(): Promise<boolean> {
    this.logger.info('Testing Binance API connection');
    
    try {
      const isConnected = await this.binanceClient.testConnection();
      
      if (isConnected) {
        this.logger.info('Binance API connection test successful');
      } else {
        this.logger.error('Binance API connection test failed');
      }
      
      return isConnected;
    } catch (error) {
      this.logger.error('Connection test error', error as Error);
      return false;
    }
  }

  /**
   * 获取支持的交易对列表
   */
  async getSupportedSymbols(): Promise<string[]> {
    try {
      const exchangeInfo = await this.binanceClient.getExchangeInfo();
      
      // 过滤出USDT交易对且状态为TRADING的
      const usdtSymbols = exchangeInfo.symbols
        .filter((symbol: any) => 
          symbol.quoteAsset === 'USDT' && 
          symbol.status === 'TRADING'
        )
        .map((symbol: any) => symbol.symbol);

      this.logger.info('Retrieved supported symbols', { count: usdtSymbols.length });
      return usdtSymbols;
      
    } catch (error) {
      this.logger.error('Failed to get supported symbols', error as Error);
      return config.analysis.defaultSymbols;
    }
  }

  /**
   * 获取权重使用统计
   */
  getWeightStats(): {
    used: number;
    limit: number;
    remaining: number;
    utilizationRate: number;
  } {
    try {
      const stats = this.binanceClient.getWeightStats();
      return {
        used: stats.used,
        limit: stats.limit,
        remaining: stats.remaining,
        utilizationRate: stats.utilizationRate
      };
    } catch (error) {
      this.logger.error('Failed to get weight stats', error as Error);
      return {
        used: 0,
        limit: config.binance.weightLimit,
        remaining: config.binance.weightLimit,
        utilizationRate: 0
      };
    }
  }
}