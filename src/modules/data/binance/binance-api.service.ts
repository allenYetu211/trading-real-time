import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { KlineData, BinanceKlineResponse } from 'src/shared/interfaces';
import { IntervalType } from 'src/shared/enums';

@Injectable()
export class BinanceApiService {
  private readonly logger = new Logger(BinanceApiService.name);
  private readonly axiosInstance: AxiosInstance;
  private readonly baseUrl: string;
  private readonly requestTimeout: number;
  private readonly maxRetries: number;
  private readonly retryDelay: number;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('binance.apiBaseUrl');
    this.requestTimeout = this.configService.get<number>('binance.requestTimeout');
    this.maxRetries = this.configService.get<number>('binance.maxRetries');
    this.retryDelay = this.configService.get<number>('binance.retryDelay');

    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: this.requestTimeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  /**
   * 设置请求和响应拦截器
   */
  private setupInterceptors(): void {
    // 请求拦截器
    this.axiosInstance.interceptors.request.use(
      (config) => {
        this.logger.debug(`发起请求: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        this.logger.error('请求配置错误:', error);
        return Promise.reject(error);
      }
    );

    // 响应拦截器
    this.axiosInstance.interceptors.response.use(
      (response) => {
        this.logger.debug(`请求成功: ${response.config.url} - ${response.status}`);
        return response;
      },
      (error) => {
        this.logger.error(`请求失败: ${error.config?.url} - ${error.response?.status}`);
        return Promise.reject(error);
      }
    );
  }

  /**
   * 获取历史K线数据
   */
  async getKlineData(
    symbol: string,
    interval: IntervalType,
    limit: number = 100,
    startTime?: number,
    endTime?: number
  ): Promise<KlineData[]> {
    try {
      const params: any = {
        symbol: symbol.toUpperCase(),
        interval,
        limit: Math.min(limit, 1000), // Binance API限制最多1000条
      };

      if (startTime) {
        params.startTime = startTime;
      }

      if (endTime) {
        params.endTime = endTime;
      }

      const response = await this.makeRequestWithRetry<BinanceKlineResponse[]>(
        '/api/v3/klines',
        { params }
      );

      return this.transformKlineData(response.data, symbol, interval);
    } catch (error) {
      this.logger.error(`获取K线数据失败 - Symbol: ${symbol}, Interval: ${interval}`, error);
      throw new HttpException(
        `获取 ${symbol} 的K线数据失败`,
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
  }

  /**
   * 获取最新价格
   */
  async getLatestPrice(symbol: string): Promise<number> {
    try {
      const response = await this.makeRequestWithRetry<{ price: string }>(
        '/api/v3/ticker/price',
        { params: { symbol: symbol.toUpperCase() } }
      );

      return parseFloat(response.data.price);
    } catch (error) {
      this.logger.error(`获取最新价格失败 - Symbol: ${symbol}`, error);
      throw new HttpException(
        `获取 ${symbol} 的最新价格失败`,
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
  }

  /**
   * 获取24小时价格变化统计
   */
  async get24hrTicker(symbol: string): Promise<{
    symbol: string;
    priceChange: number;
    priceChangePercent: number;
    lastPrice: number;
    volume: number;
    openPrice: number;
    highPrice: number;
    lowPrice: number;
  }> {
    try {
      const response = await this.makeRequestWithRetry<any>(
        '/api/v3/ticker/24hr',
        { params: { symbol: symbol.toUpperCase() } }
      );

      const data = response.data;
      return {
        symbol: data.symbol,
        priceChange: parseFloat(data.priceChange),
        priceChangePercent: parseFloat(data.priceChangePercent),
        lastPrice: parseFloat(data.lastPrice),
        volume: parseFloat(data.volume),
        openPrice: parseFloat(data.openPrice),
        highPrice: parseFloat(data.highPrice),
        lowPrice: parseFloat(data.lowPrice),
      };
    } catch (error) {
      this.logger.error(`获取24小时价格统计失败 - Symbol: ${symbol}`, error);
      throw new HttpException(
        `获取 ${symbol} 的24小时价格统计失败`,
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
  }

  /**
   * 检查交易对是否存在
   */
  async isSymbolValid(symbol: string): Promise<boolean> {
    try {
      await this.getLatestPrice(symbol);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取服务器时间
   */
  async getServerTime(): Promise<number> {
    try {
      const response = await this.makeRequestWithRetry<{ serverTime: number }>(
        '/api/v3/time'
      );
      return response.data.serverTime;
    } catch (error) {
      this.logger.error('获取服务器时间失败', error);
      throw new HttpException(
        '获取Binance服务器时间失败',
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
  }

  /**
   * 带重试机制的请求方法
   */
  private async makeRequestWithRetry<T>(
    url: string,
    config: any = {},
    retryCount: number = 0
  ): Promise<AxiosResponse<T>> {
    try {
      return await this.axiosInstance.get<T>(url, config);
    } catch (error) {
      // 禁用重试机制，失败立即抛出错误
      this.logger.error(`请求失败，不进行重试: ${url}`);
      throw error;
    }
  }

  /**
   * 判断是否应该重试
   */
  private shouldRetry(error: any): boolean {
    // 禁用所有重试
    return false;
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 转换Binance K线数据格式
   */
  private transformKlineData(
    rawData: BinanceKlineResponse[], 
    symbol: string, 
    interval: IntervalType
  ): KlineData[] {
    return rawData.map(item => ({
      symbol,
      interval,
      openTime: item[0],
      closeTime: item[6],
      openPrice: parseFloat(item[1]),
      highPrice: parseFloat(item[2]),
      lowPrice: parseFloat(item[3]),
      closePrice: parseFloat(item[4]),
      volume: parseFloat(item[5]),
      quoteAssetVolume: parseFloat(item[7]),
      numberOfTrades: item[8],
      takerBuyBaseAssetVolume: parseFloat(item[9]),
      takerBuyQuoteAssetVolume: parseFloat(item[10]),
    }));
  }
} 