import { Injectable, Logger } from '@nestjs/common';
import { BinanceApiService } from './binance/binance-api.service';
import { DataStorageService } from './data-storage.service';
import { CacheService } from './cache.service';
import { GetKlineDataDto } from './dto';
import { KlineData } from 'src/shared/interfaces';
import { IntervalType } from 'src/shared/enums';

@Injectable()
export class DataService {
  private readonly logger = new Logger(DataService.name);

  constructor(
    private readonly binanceApiService: BinanceApiService,
    private readonly dataStorageService: DataStorageService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * 获取K线数据（优先从缓存，然后数据库，最后API）
   */
  async getKlineData(params: GetKlineDataDto): Promise<KlineData[]> {
    const { symbol, interval, limit, startTime, endTime } = params;

    // 1. 尝试从缓存获取
    if (!startTime && !endTime) {
      const cachedData = await this.cacheService.getCachedKlineData(symbol, interval);
      if (cachedData && cachedData.length >= limit) {
        this.logger.debug(`从缓存返回K线数据: ${symbol} ${interval}`);
        return cachedData.slice(0, limit);
      }
    }

    // 2. 尝试从数据库获取
    const dbData = await this.dataStorageService.getKlineData(
      symbol, 
      interval, 
      limit, 
      startTime, 
      endTime
    );

    if (dbData.length >= limit) {
      this.logger.debug(`从数据库返回K线数据: ${symbol} ${interval}, 数量: ${dbData.length}`);
      
      // 缓存数据库查询结果
      if (!startTime && !endTime) {
        await this.cacheService.cacheKlineData(symbol, interval, dbData);
      }
      
      return dbData;
    }

    // 3. 从Binance API获取
    this.logger.debug(`从API获取K线数据: ${symbol} ${interval}`);
    const apiData = await this.binanceApiService.getKlineData(
      symbol, 
      interval, 
      limit, 
      startTime, 
      endTime
    );

    // 4. 保存到数据库
    if (apiData.length > 0) {
      await this.dataStorageService.saveKlineData(apiData);
      
      // 缓存API数据
      if (!startTime && !endTime) {
        await this.cacheService.cacheKlineData(symbol, interval, apiData);
      }
    }

    return apiData;
  }

  /**
   * 获取最新价格
   */
  async getLatestPrice(symbol: string): Promise<number> {
    // 1. 尝试从缓存获取
    const cachedPrice = await this.cacheService.getCachedLatestPrice(symbol);
    if (cachedPrice !== null) {
      this.logger.debug(`从缓存返回最新价格: ${symbol} = ${cachedPrice}`);
      return cachedPrice;
    }

    // 2. 从API获取
    const price = await this.binanceApiService.getLatestPrice(symbol);
    
    // 3. 缓存价格
    await this.cacheService.cacheLatestPrice(symbol, price);
    
    this.logger.debug(`从API获取最新价格: ${symbol} = ${price}`);
    return price;
  }

  /**
   * 获取24小时价格统计
   */
  async get24hrTicker(symbol: string): Promise<any> {
    // 1. 尝试从缓存获取
    const cachedStats = await this.cacheService.getCached24hrStats(symbol);
    if (cachedStats) {
      this.logger.debug(`从缓存返回24h统计: ${symbol}`);
      return cachedStats;
    }

    // 2. 从API获取
    const stats = await this.binanceApiService.get24hrTicker(symbol);
    
    // 3. 缓存统计数据
    await this.cacheService.cache24hrStats(symbol, stats);
    
    this.logger.debug(`从API获取24h统计: ${symbol}`);
    return stats;
  }

  /**
   * 刷新单个币种的数据
   */
  async refreshSymbolData(symbol: string, interval: IntervalType, limit: number = 100): Promise<{
    klineCount: number;
    latestPrice: number;
    stats: any;
  }> {
    this.logger.log(`刷新数据: ${symbol} ${interval}`);

    // 1. 获取最新K线数据
    const klineData = await this.binanceApiService.getKlineData(symbol, interval, limit);
    
    // 2. 保存到数据库
    const { count } = await this.dataStorageService.saveKlineData(klineData);
    
    // 3. 更新缓存
    await this.cacheService.cacheKlineData(symbol, interval, klineData);
    
    // 4. 获取最新价格
    const latestPrice = await this.binanceApiService.getLatestPrice(symbol);
    await this.cacheService.cacheLatestPrice(symbol, latestPrice);
    
    // 5. 获取24h统计
    const stats = await this.binanceApiService.get24hrTicker(symbol);
    await this.cacheService.cache24hrStats(symbol, stats);

    this.logger.log(`数据刷新完成: ${symbol} ${interval}, K线: ${count}条`);

    return {
      klineCount: count,
      latestPrice,
      stats,
    };
  }

  /**
   * 批量刷新活跃币种数据
   */
  async refreshActiveSymbolsData(): Promise<{
    successCount: number;
    failureCount: number;
    details: Array<{ symbol: string; interval: string; success: boolean; error?: string }>;
  }> {
    // 这里需要获取活跃的币种配置，暂时使用占位符
    // 实际实现中需要注入CoinConfigService
    const activeConfigs = [
      { symbol: 'BTCUSDT', interval: IntervalType.ONE_HOUR },
      { symbol: 'ETHUSDT', interval: IntervalType.FOUR_HOURS },
    ];

    let successCount = 0;
    let failureCount = 0;
    const details: Array<{ symbol: string; interval: string; success: boolean; error?: string }> = [];

    for (const config of activeConfigs) {
      try {
        await this.refreshSymbolData(config.symbol, config.interval);
        successCount++;
        details.push({
          symbol: config.symbol,
          interval: config.interval,
          success: true,
        });
      } catch (error) {
        failureCount++;
        details.push({
          symbol: config.symbol,
          interval: config.interval,
          success: false,
          error: error.message,
        });
        this.logger.error(`刷新数据失败: ${config.symbol} ${config.interval}`, error);
      }
    }

    this.logger.log(`批量刷新完成: 成功 ${successCount}, 失败 ${failureCount}`);

    return {
      successCount,
      failureCount,
      details,
    };
  }

  /**
   * 验证交易对是否有效
   */
  async validateSymbol(symbol: string): Promise<boolean> {
    try {
      return await this.binanceApiService.isSymbolValid(symbol);
    } catch (error) {
      this.logger.error(`验证交易对失败: ${symbol}`, error);
      return false;
    }
  }

  /**
   * 获取数据统计信息
   */
  async getDataStats(): Promise<{
    database: any;
    cache: any;
    api: { serverTime: number; isHealthy: boolean };
  }> {
    const [dbStats, cacheStats] = await Promise.all([
      this.dataStorageService.getKlineStats(),
      this.cacheService.getCacheStats(),
    ]);

    let apiHealthy = false;
    let serverTime = 0;
    
    try {
      serverTime = await this.binanceApiService.getServerTime();
      apiHealthy = true;
    } catch (error) {
      this.logger.error('API健康检查失败:', error);
    }

    return {
      database: dbStats,
      cache: cacheStats,
      api: {
        serverTime,
        isHealthy: apiHealthy,
      },
    };
  }

  /**
   * 清理缓存
   */
  async clearCache(pattern?: string): Promise<number> {
    if (pattern) {
      return await this.cacheService.deleteCache(pattern);
    } else {
      await this.cacheService.clearAllCache();
      return 0;
    }
  }

  /**
   * 系统健康检查
   */
  async healthCheck(): Promise<{
    database: boolean;
    cache: boolean;
    api: boolean;
    overall: boolean;
  }> {
    const [dbHealth, cacheHealth, apiHealth] = await Promise.all([
      this.dataStorageService.getKlineStats().then(() => true).catch(() => false),
      this.cacheService.healthCheck(),
      this.binanceApiService.getServerTime().then(() => true).catch(() => false),
    ]);

    const overall = dbHealth && cacheHealth && apiHealth;

    return {
      database: dbHealth,
      cache: cacheHealth,
      api: apiHealth,
      overall,
    };
  }
} 