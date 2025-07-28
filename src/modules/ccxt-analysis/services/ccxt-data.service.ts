import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as ccxt from 'ccxt';
import { IOHLCVData, ICCXTConfig } from '../interfaces';

/**
 * CCXT数据服务
 * 使用CCXT库直接从交易所获取市场数据
 */
@Injectable()
export class CCXTDataService implements OnModuleInit {
  private readonly logger = new Logger(CCXTDataService.name);
  private exchanges: Map<string, ccxt.Exchange> = new Map();

  async onModuleInit() {
    // 初始化支持的交易所
    await this.initializeExchanges();
  }

  /**
   * 初始化交易所实例
   */
  private async initializeExchanges() {
    try {
      // 初始化Binance交易所
      const binance = new ccxt.binance({
        enableRateLimit: true,
        sandbox: false, // 使用正式环境
        timeout: 30000,
        options: {
          defaultType: 'spot', // 现货交易
        },
      });

      // 验证交易所连接
      await binance.loadMarkets();
      this.exchanges.set('binance', binance);
      this.logger.log('Binance交易所初始化成功');

      // 可以添加更多交易所
      // const okx = new ccxt.okx({ enableRateLimit: true });
      // this.exchanges.set('okx', okx);

    } catch (error) {
      this.logger.error('交易所初始化失败:', error.message);
      throw error;
    }
  }

  /**
   * 获取OHLCV数据
   * @param symbol 交易对符号 (如: BTC/USDT)
   * @param timeframe 时间周期 (如: 1d, 4h, 1h, 15m)
   * @param limit 数据条数
   * @param exchange 交易所名称 (默认: binance)
   */
  async getOHLCVData(
    symbol: string,
    timeframe: string = '1d',
    limit: number = 1000,
    exchange: string = 'binance',
  ): Promise<IOHLCVData[]> {
    try {
      // 标准化交易对符号格式
      const normalizedSymbol = this.normalizeSymbol(symbol);
      
      // 获取交易所实例
      const exchangeInstance = this.getExchange(exchange);
      
      this.logger.log(`获取${exchange}交易所${normalizedSymbol}的${timeframe}数据，数量：${limit}条`);

      // 从CCXT获取原始OHLCV数据
      const ohlcvData = await exchangeInstance.fetchOHLCV(
        normalizedSymbol,
        timeframe,
        undefined, // since参数，undefined表示获取最新数据
        limit,
      );

      // 转换为标准格式
      const formattedData: IOHLCVData[] = ohlcvData.map(([timestamp, open, high, low, close, volume]) => ({
        timestamp,
        datetime: new Date(timestamp).toISOString(),
        open: parseFloat(open.toString()),
        high: parseFloat(high.toString()),
        low: parseFloat(low.toString()),
        close: parseFloat(close.toString()),
        volume: parseFloat(volume.toString()),
      }));

      this.logger.log(`成功获取${formattedData.length}条OHLCV数据`);
      return formattedData;

    } catch (error) {
      this.logger.error(`获取OHLCV数据失败: ${error.message}`);
      throw new Error(`获取市场数据失败: ${error.message}`);
    }
  }

  /**
   * 获取当前价格
   * @param symbol 交易对符号
   * @param exchange 交易所名称
   */
  async getCurrentPrice(symbol: string, exchange: string = 'binance'): Promise<number> {
    try {
      const normalizedSymbol = this.normalizeSymbol(symbol);
      const exchangeInstance = this.getExchange(exchange);

      const ticker = await exchangeInstance.fetchTicker(normalizedSymbol);
      return parseFloat(ticker.last.toString());
    } catch (error) {
      this.logger.error(`获取当前价格失败: ${error.message}`);
      throw new Error(`获取当前价格失败: ${error.message}`);
    }
  }

  /**
   * 获取24小时价格统计
   * @param symbol 交易对符号
   * @param exchange 交易所名称
   */
  async get24hStats(symbol: string, exchange: string = 'binance') {
    try {
      const normalizedSymbol = this.normalizeSymbol(symbol);
      const exchangeInstance = this.getExchange(exchange);

      const ticker = await exchangeInstance.fetchTicker(normalizedSymbol);
      
      return {
        high: parseFloat(ticker.high?.toString() || '0'),
        low: parseFloat(ticker.low?.toString() || '0'),
        change: parseFloat(ticker.change?.toString() || '0'),
        changePercent: parseFloat(ticker.percentage?.toString() || '0'),
        volume: parseFloat(ticker.baseVolume?.toString() || '0'),
      };
    } catch (error) {
      this.logger.error(`获取24小时统计失败: ${error.message}`);
      throw new Error(`获取24小时统计失败: ${error.message}`);
    }
  }

  /**
   * 获取支持的交易对列表
   * @param exchange 交易所名称
   */
  async getSupportedSymbols(exchange: string = 'binance'): Promise<string[]> {
    try {
      const exchangeInstance = this.getExchange(exchange);
      const markets = await exchangeInstance.loadMarkets();
      
      return Object.keys(markets);
    } catch (error) {
      this.logger.error(`获取支持的交易对失败: ${error.message}`);
      throw new Error(`获取支持的交易对失败: ${error.message}`);
    }
  }

  /**
   * 获取交易所实例
   * @param exchangeName 交易所名称
   */
  private getExchange(exchangeName: string): ccxt.Exchange {
    const exchange = this.exchanges.get(exchangeName.toLowerCase());
    if (!exchange) {
      throw new Error(`不支持的交易所: ${exchangeName}`);
    }
    return exchange;
  }

  /**
   * 标准化交易对符号
   * @param symbol 原始符号 (如: SOLUSDT, SOL/USDT)
   */
  private normalizeSymbol(symbol: string): string {
    // 将SOLUSDT格式转换为SOL/USDT格式
    if (!symbol.includes('/')) {
      // 常见的USDT配对
      if (symbol.endsWith('USDT')) {
        const base = symbol.replace('USDT', '');
        return `${base}/USDT`;
      }
      // 常见的BTC配对
      if (symbol.endsWith('BTC')) {
        const base = symbol.replace('BTC', '');
        return `${base}/BTC`;
      }
      // 常见的ETH配对
      if (symbol.endsWith('ETH')) {
        const base = symbol.replace('ETH', '');
        return `${base}/ETH`;
      }
      // 默认假设是USDT配对
      return `${symbol}/USDT`;
    }
    
    return symbol.toUpperCase();
  }

  /**
   * 检查交易所连接状态
   * @param exchange 交易所名称
   */
  async checkExchangeHealth(exchange: string = 'binance'): Promise<boolean> {
    try {
      const exchangeInstance = this.getExchange(exchange);
      await exchangeInstance.fetchStatus();
      return true;
    } catch (error) {
      this.logger.error(`交易所${exchange}连接检查失败: ${error.message}`);
      return false;
    }
  }
} 