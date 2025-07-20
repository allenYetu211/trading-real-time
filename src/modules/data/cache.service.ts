import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { KlineData } from 'src/shared/interfaces';
import { IntervalType } from 'src/shared/enums';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly redis: Redis;
  private readonly cacheTTL: number;

  constructor(private readonly configService: ConfigService) {
    const redisConfig = this.configService.get('redis');
    this.cacheTTL = parseInt(process.env.CACHE_TTL) || 300; // 默认5分钟

    this.redis = new Redis({
      host: redisConfig.host,
      port: redisConfig.port,
      password: redisConfig.password,
      db: redisConfig.db,
    });

    this.redis.on('connect', () => {
      this.logger.log('Redis连接成功');
    });

    this.redis.on('error', (error) => {
      this.logger.error('Redis连接错误:', error);
    });
  }

  /**
   * 生成缓存键
   */
  private generateKey(prefix: string, symbol: string, interval: IntervalType, suffix?: string): string {
    const parts = [prefix, symbol, interval];
    if (suffix) parts.push(suffix);
    return parts.join(':');
  }

  /**
   * 缓存K线数据列表
   */
  async cacheKlineData(symbol: string, interval: IntervalType, data: KlineData[]): Promise<void> {
    try {
      const key = this.generateKey('kline', symbol, interval, 'list');
      await this.redis.setex(key, this.cacheTTL, JSON.stringify(data));
      // this.logger.debug(`缓存K线数据: ${key}, 数量: ${data.length}`);
    } catch (error) {
      this.logger.error('缓存K线数据失败:', error);
    }
  }

  /**
   * 获取缓存的K线数据
   */
  async getCachedKlineData(symbol: string, interval: IntervalType): Promise<KlineData[] | null> {
    try {
      const key = this.generateKey('kline', symbol, interval, 'list');
      const cached = await this.redis.get(key);
      
      if (cached) {
        // this.logger.debug(`命中K线数据缓存: ${key}`);
        return JSON.parse(cached);
      }
      
      return null;
    } catch (error) {
      this.logger.error('获取缓存K线数据失败:', error);
      return null;
    }
  }

  /**
   * 缓存最新价格
   */
  async cacheLatestPrice(symbol: string, price: number): Promise<void> {
    try {
      const key = this.generateKey('price', symbol, 'latest' as IntervalType);
      await this.redis.setex(key, this.cacheTTL, price.toString());
      // this.logger.debug(`缓存最新价格: ${symbol} = ${price}`);
    } catch (error) {
      this.logger.error('缓存价格失败:', error);
    }
  }

  /**
   * 获取缓存的最新价格
   */
  async getCachedLatestPrice(symbol: string): Promise<number | null> {
    try {
      const key = this.generateKey('price', symbol, 'latest' as IntervalType);
      const cached = await this.redis.get(key);
      
      if (cached) {
        this.logger.debug(`命中价格缓存: ${symbol} = ${cached}`);
        return parseFloat(cached);
      }
      
      return null;
    } catch (error) {
      this.logger.error('获取缓存价格失败:', error);
      return null;
    }
  }

  /**
   * 缓存24小时统计数据
   */
  async cache24hrStats(symbol: string, stats: any): Promise<void> {
    try {
      const key = this.generateKey('stats', symbol, '24hr' as IntervalType);
      await this.redis.setex(key, this.cacheTTL, JSON.stringify(stats));
      this.logger.debug(`缓存24h统计: ${symbol}`);
    } catch (error) {
      this.logger.error('缓存24h统计失败:', error);
    }
  }

  /**
   * 获取缓存的24小时统计数据
   */
  async getCached24hrStats(symbol: string): Promise<any | null> {
    try {
      const key = this.generateKey('stats', symbol, '24hr' as IntervalType);
      const cached = await this.redis.get(key);
      
      if (cached) {
        this.logger.debug(`命中24h统计缓存: ${symbol}`);
        return JSON.parse(cached);
      }
      
      return null;
    } catch (error) {
      this.logger.error('获取缓存24h统计失败:', error);
      return null;
    }
  }

  /**
   * 删除缓存
   */
  async deleteCache(pattern: string): Promise<number> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length === 0) return 0;

      await this.redis.del(...keys);
      this.logger.debug(`删除缓存: ${pattern}, 数量: ${keys.length}`);
      return keys.length;
    } catch (error) {
      this.logger.error('删除缓存失败:', error);
      return 0;
    }
  }

  /**
   * 清空所有缓存
   */
  async clearAllCache(): Promise<void> {
    try {
      await this.redis.flushdb();
      this.logger.log('已清空所有缓存');
    } catch (error) {
      this.logger.error('清空缓存失败:', error);
    }
  }

  /**
   * 获取缓存统计信息
   */
  async getCacheStats(): Promise<{
    usedMemory: string;
    totalKeys: number;
    hitRate: string;
  }> {
    try {
      const info = await this.redis.info('memory');
      const keyspace = await this.redis.info('keyspace');
      const stats = await this.redis.info('stats');
      
      // 解析内存使用
      const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);
      const usedMemory = memoryMatch ? memoryMatch[1] : '0B';
      
      // 解析键总数
      const keyspaceMatch = keyspace.match(/keys=(\d+)/);
      const totalKeys = keyspaceMatch ? parseInt(keyspaceMatch[1]) : 0;
      
      // 解析命中率
      const hitsMatch = stats.match(/keyspace_hits:(\d+)/);
      const missesMatch = stats.match(/keyspace_misses:(\d+)/);
      const hits = hitsMatch ? parseInt(hitsMatch[1]) : 0;
      const misses = missesMatch ? parseInt(missesMatch[1]) : 0;
      const hitRate = hits + misses > 0 ? ((hits / (hits + misses)) * 100).toFixed(2) + '%' : '0%';
      
      return {
        usedMemory,
        totalKeys,
        hitRate,
      };
    } catch (error) {
      this.logger.error('获取缓存统计失败:', error);
      return {
        usedMemory: '0B',
        totalKeys: 0,
        hitRate: '0%',
      };
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      this.logger.error('Redis健康检查失败:', error);
      return false;
    }
  }

  /**
   * 关闭连接
   */
  async onModuleDestroy() {
    await this.redis.quit();
    this.logger.log('Redis连接已关闭');
  }
} 