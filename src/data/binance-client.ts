// 币安API客户端

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import crypto from 'crypto';
import { KlineData, ApiStatus, KlineRequest } from '../types';
import { logger } from '../utils/logger';
import { ErrorHandler } from '../utils/errors';
import { BINANCE_ENDPOINTS, TIMEFRAMES, PERFORMANCE_THRESHOLDS } from '../utils/constants';
import config from '../config';

export interface BinanceKlineResponse {
  [index: number]: string | number;
  0: number; // Open time
  1: string; // Open price
  2: string; // High price
  3: string; // Low price
  4: string; // Close price
  5: string; // Volume
  6: number; // Close time
  7: string; // Quote asset volume
  8: number; // Number of trades
  9: string; // Taker buy base asset volume
  10: string; // Taker buy quote asset volume
  11: string; // Ignore
}

export interface BinanceTickerResponse {
  symbol: string;
  price: string;
}

export class BinanceClient {
  private client: AxiosInstance;
  private apiKey: string;
  private secretKey: string;
  private weightUsed: number = 0;
  private weightResetTime: number = Date.now() + 60000; // 1分钟后重置
  private readonly weightLimit: number;
  private readonly weightBuffer: number;

  constructor() {
    this.apiKey = config.binance.apiKey;
    this.secretKey = config.binance.secretKey;
    this.weightLimit = config.binance.weightLimit;
    this.weightBuffer = config.binance.weightBuffer;

    this.client = axios.create({
      baseURL: config.binance.baseUrl,
      timeout: config.binance.requestTimeout,
      headers: {
        'X-MBX-APIKEY': this.apiKey,
        'Content-Type': 'application/json'
      }
    });

    // 请求拦截器
    this.client.interceptors.request.use(
      (config) => {
        logger.debug('Binance API request', {
          method: config.method,
          url: config.url,
          params: config.params
        });
        return config;
      },
      (error) => {
        logger.error('Binance API request error', error);
        return Promise.reject(error);
      }
    );

    // 响应拦截器
    this.client.interceptors.response.use(
      (response) => {
        this.updateWeightUsage(response);
        logger.debug('Binance API response', {
          status: response.status,
          weightUsed: this.weightUsed,
          url: response.config.url
        });
        return response;
      },
      (error) => {
        if (error.response) {
          logger.error('Binance API error response', error, {
            status: error.response.status,
            data: error.response.data,
            url: error.config?.url
          });
        } else {
          logger.error('Binance API network error', error);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * 更新权重使用情况
   */
  private updateWeightUsage(response: AxiosResponse): void {
    const weightHeader = response.headers['x-mbx-used-weight-1m'];
    if (weightHeader) {
      this.weightUsed = parseInt(weightHeader, 10);
      this.weightResetTime = Date.now() + 60000;
    }
  }

  /**
   * 检查权重限制
   */
  private checkWeightLimit(requiredWeight: number = 1): void {
    // 如果超过重置时间，重置权重计数
    if (Date.now() > this.weightResetTime) {
      this.weightUsed = 0;
      this.weightResetTime = Date.now() + 60000;
    }

    const availableWeight = this.weightLimit - this.weightBuffer - this.weightUsed;
    if (requiredWeight > availableWeight) {
      const waitTime = this.weightResetTime - Date.now();
      throw new Error(`API权重不足，需要等待 ${Math.ceil(waitTime / 1000)} 秒`);
    }
  }

  /**
   * 创建签名
   */
  private createSignature(queryString: string): string {
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(queryString)
      .digest('hex');
  }

  /**
   * 获取K线数据
   */
  async getKlineData(
    symbol: string,
    interval: string,
    limit: number = 500,
    startTime?: number,
    endTime?: number
  ): Promise<KlineData[]> {
    this.checkWeightLimit(1);

    const params: any = {
      symbol: symbol.toUpperCase(),
      interval,
      limit: Math.min(limit, 1000) // 币安限制最大1000
    };

    if (startTime) params.startTime = startTime;
    if (endTime) params.endTime = endTime;

    return ErrorHandler.handleApiError(async () => {
      const response = await this.client.get<BinanceKlineResponse[]>(
        BINANCE_ENDPOINTS.KLINES,
        { params }
      );

      return response.data.map(kline => this.transformKlineData(kline, symbol, interval));
    }, `getKlineData(${symbol}, ${interval})`);
  }

  /**
   * 批量获取K线数据
   */
  async getBatchKlineData(requests: KlineRequest[]): Promise<Map<string, KlineData[]>> {
    const results = new Map<string, KlineData[]>();
    const errors: Error[] = [];

    // 检查总权重需求
    this.checkWeightLimit(requests.length);

    // 并发请求，但限制并发数量
    const concurrencyLimit = 5;
    const chunks = this.chunkArray(requests, concurrencyLimit);

    for (const chunk of chunks) {
      const promises = chunk.map(async (request) => {
        try {
          const key = `${request.symbol}_${request.timeframe}`;
          const data = await this.getKlineData(
            request.symbol,
            request.timeframe,
            request.limit
          );
          results.set(key, data);
        } catch (error) {
          errors.push(error as Error);
          logger.error('Batch kline request failed', error as Error, request);
        }
      });

      await Promise.all(promises);
      
      // 在批次之间添加小延迟，避免过于频繁的请求
      if (chunks.indexOf(chunk) < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    if (errors.length > 0) {
      logger.warn(`Batch request completed with ${errors.length} errors`, {
        totalRequests: requests.length,
        successfulRequests: results.size,
        errors: errors.map(e => e.message)
      });
    }

    return results;
  }

  /**
   * 获取最新价格
   */
  async getLatestPrice(symbol: string): Promise<number> {
    this.checkWeightLimit(1);

    return ErrorHandler.handleApiError(async () => {
      const response = await this.client.get<BinanceTickerResponse>(
        BINANCE_ENDPOINTS.TICKER_PRICE,
        {
          params: { symbol: symbol.toUpperCase() }
        }
      );

      return parseFloat(response.data.price);
    }, `getLatestPrice(${symbol})`);
  }

  /**
   * 获取多个交易对的最新价格
   */
  async getBatchLatestPrices(symbols: string[]): Promise<Map<string, number>> {
    this.checkWeightLimit(2); // 批量价格查询权重为2

    return ErrorHandler.handleApiError(async () => {
      const symbolsParam = symbols.map(s => s.toUpperCase());
      const response = await this.client.get<BinanceTickerResponse[]>(
        BINANCE_ENDPOINTS.TICKER_PRICE,
        {
          params: { symbols: JSON.stringify(symbolsParam) }
        }
      );

      const priceMap = new Map<string, number>();
      response.data.forEach(ticker => {
        priceMap.set(ticker.symbol, parseFloat(ticker.price));
      });

      return priceMap;
    }, `getBatchLatestPrices([${symbols.join(', ')}])`);
  }

  /**
   * 获取交易所信息
   */
  async getExchangeInfo(): Promise<any> {
    this.checkWeightLimit(10);

    return ErrorHandler.handleApiError(async () => {
      const response = await this.client.get(BINANCE_ENDPOINTS.EXCHANGE_INFO);
      return response.data;
    }, 'getExchangeInfo');
  }

  /**
   * 获取API状态
   */
  getApiStatus(): ApiStatus {
    return {
      connected: true, // 简化实现，实际可以通过ping接口检查
      weightUsed: this.weightUsed,
      weightLimit: this.weightLimit,
      lastError: undefined
    };
  }

  /**
   * 获取剩余权重
   */
  getRemainingWeight(): number {
    // 如果超过重置时间，返回满权重
    if (Date.now() > this.weightResetTime) {
      return this.weightLimit - this.weightBuffer;
    }
    return Math.max(0, this.weightLimit - this.weightBuffer - this.weightUsed);
  }

  /**
   * 转换币安K线数据格式
   */
  private transformKlineData(
    kline: BinanceKlineResponse,
    symbol: string,
    timeframe: string
  ): KlineData {
    return {
      symbol,
      timeframe,
      openTime: kline[0] as number,
      closeTime: kline[6] as number,
      open: parseFloat(kline[1] as string),
      high: parseFloat(kline[2] as string),
      low: parseFloat(kline[3] as string),
      close: parseFloat(kline[4] as string),
      volume: parseFloat(kline[5] as string)
    };
  }

  /**
   * 数组分块工具函数
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * 验证交易对是否有效
   */
  async validateSymbol(symbol: string): Promise<boolean> {
    try {
      await this.getLatestPrice(symbol);
      return true;
    } catch (error) {
      logger.warn(`Symbol validation failed: ${symbol}`, { error });
      return false;
    }
  }

  /**
   * 获取支持的时间周期
   */
  getSupportedTimeframes(): string[] {
    return Object.values(TIMEFRAMES);
  }

  /**
   * 检查时间周期是否支持
   */
  isTimeframeSupported(timeframe: string): boolean {
    return this.getSupportedTimeframes().includes(timeframe);
  }

  /**
   * 获取权重使用统计
   */
  getWeightStats(): {
    used: number;
    limit: number;
    remaining: number;
    resetTime: number;
    utilizationRate: number;
  } {
    const remaining = this.getRemainingWeight();
    const usable = this.weightLimit - this.weightBuffer;
    
    return {
      used: this.weightUsed,
      limit: this.weightLimit,
      remaining,
      resetTime: this.weightResetTime,
      utilizationRate: (this.weightUsed / usable) * 100
    };
  }

  /**
   * 测试连接
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.client.get('/api/v3/ping');
      logger.info('Binance API connection test successful');
      return true;
    } catch (error) {
      logger.error('Binance API connection test failed', error as Error);
      return false;
    }
  }
}