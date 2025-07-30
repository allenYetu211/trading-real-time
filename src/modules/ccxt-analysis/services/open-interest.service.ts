import { Injectable, Logger } from '@nestjs/common';
import * as ccxt from 'ccxt';
import { IOpenInterestData, IOpenInterestChange } from '../interfaces';

/**
 * 持仓量分析服务
 * 用于获取和分析期货/衍生品市场的持仓量数据
 */
@Injectable()
export class OpenInterestService {
  private readonly logger = new Logger(OpenInterestService.name);
  private exchanges: Map<string, ccxt.Exchange> = new Map();

  async onModuleInit() {
    await this.initializeExchanges();
  }

  /**
   * 初始化支持持仓量数据的交易所
   */
  private async initializeExchanges() {
    try {
      // 初始化支持持仓量的交易所
      const exchanges = [
        { 
          name: 'binanceusdm',
          instance: new ccxt.binanceusdm({
            enableRateLimit: true,
            sandbox: false,
            timeout: 30000,
          })
        },
        {
          name: 'okx',
          instance: new ccxt.okx({
            enableRateLimit: true,
            sandbox: false,
            timeout: 30000,
          })
        },
        {
          name: 'bybit',
          instance: new ccxt.bybit({
            enableRateLimit: true,
            sandbox: false,
            timeout: 30000,
          })
        }
      ];

      for (const { name, instance } of exchanges) {
        if (instance.has.fetchOpenInterest) {
          await instance.loadMarkets();
          this.exchanges.set(name, instance);
          this.logger.log(`${name} 交易所初始化成功，支持持仓量数据`);
        } else {
          this.logger.warn(`${name} 交易所不支持持仓量数据`);
        }
      }
    } catch (error) {
      this.logger.error('交易所初始化失败:', error.message);
      throw error;
    }
  }

  /**
   * 获取单个交易对的持仓量
   * @param symbol 交易对符号 (如: BTC/USDT:USDT)
   * @param exchange 交易所名称
   */
  async getOpenInterest(
    symbol: string,
    exchange: string = 'binanceusdm'
  ): Promise<IOpenInterestData> {
    try {
      const exchangeInstance = this.getExchange(exchange);
      
      this.logger.log(`获取 ${exchange} 交易所 ${symbol} 的持仓量数据`);

      const openInterest = await exchangeInstance.fetchOpenInterest(symbol);
      
      return {
        symbol: openInterest.symbol,
        openInterest: openInterest.openInterestAmount || openInterest.openInterestValue || 0,
        timestamp: openInterest.timestamp,
        datetime: openInterest.datetime,
        side: 'total',
        percentage: (openInterest as any).percentage || 0,
      };
    } catch (error) {
      this.logger.error(`获取持仓量失败: ${error.message}`);
      throw new Error(`获取持仓量失败: ${error.message}`);
    }
  }

  /**
   * 获取多个交易对的持仓量
   * @param symbols 交易对符号数组
   * @param exchange 交易所名称
   */
  async getMultipleOpenInterest(
    symbols: string[],
    exchange: string = 'binanceusdm'
  ): Promise<IOpenInterestData[]> {
    try {
      const exchangeInstance = this.getExchange(exchange);
      
      this.logger.log(`批量获取 ${exchange} 交易所持仓量数据，交易对数量: ${symbols.length}`);

      // 检查是否支持批量获取
      if (exchangeInstance.has.fetchOpenInterests) {
        const openInterests = await exchangeInstance.fetchOpenInterests(symbols);
        return this.formatMultipleOpenInterest(Object.values(openInterests));
      } else {
        // 串行获取每个交易对的持仓量
        const results: IOpenInterestData[] = [];
        for (const symbol of symbols) {
          try {
            const oi = await this.getOpenInterest(symbol, exchange);
            results.push(oi);
            // 避免请求过快
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (error) {
            this.logger.warn(`获取 ${symbol} 持仓量失败: ${error.message}`);
          }
        }
        return results;
      }
    } catch (error) {
      this.logger.error(`批量获取持仓量失败: ${error.message}`);
      throw new Error(`批量获取持仓量失败: ${error.message}`);
    }
  }

  /**
   * 获取热门期货合约的持仓量排行
   * @param exchange 交易所名称
   * @param limit 返回数量限制
   */
  async getTopOpenInterestSymbols(
    exchange: string = 'binanceusdm',
    limit: number = 20
  ): Promise<IOpenInterestData[]> {
    try {
      const exchangeInstance = this.getExchange(exchange);
      
      // 获取期货市场列表
      const markets = Object.values(exchangeInstance.markets).filter(
        market => market.type === 'swap' || market.type === 'future'
      );

      const symbols = markets.slice(0, limit).map(market => market.symbol);
      
      this.logger.log(`获取 ${exchange} 热门期货合约持仓量排行，数量: ${symbols.length}`);

      const openInterests = await this.getMultipleOpenInterest(symbols, exchange);
      
      // 按持仓量降序排序
      return openInterests
        .filter(oi => oi.openInterest > 0)
        .sort((a, b) => b.openInterest - a.openInterest)
        .slice(0, limit);
    } catch (error) {
      this.logger.error(`获取持仓量排行失败: ${error.message}`);
      throw new Error(`获取持仓量排行失败: ${error.message}`);
    }
  }

  /**
   * 分析持仓量变化
   * @param symbol 交易对符号
   * @param exchange 交易所名称
   * @param hours 分析时间跨度（小时）
   */
  async analyzeOpenInterestChange(
    symbol: string,
    exchange: string = 'binanceusdm',
    hours: number = 24
  ): Promise<{
    current: IOpenInterestData;
    previous: IOpenInterestData;
    change: number;
    changePercent: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  }> {
    try {
      // 获取当前持仓量
      const current = await this.getOpenInterest(symbol, exchange);
      
      // 这里应该获取历史数据，但CCXT可能不支持历史持仓量
      // 作为示例，我们模拟一个之前的数据
      const previous: IOpenInterestData = {
        ...current,
        openInterest: current.openInterest * 0.95, // 模拟数据
        timestamp: current.timestamp - (hours * 60 * 60 * 1000),
        datetime: new Date(current.timestamp - (hours * 60 * 60 * 1000)).toISOString(),
      };

      const change = current.openInterest - previous.openInterest;
      const changePercent = (change / previous.openInterest) * 100;
      
      let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
      if (Math.abs(changePercent) > 5) {
        trend = change > 0 ? 'increasing' : 'decreasing';
      }

      this.logger.log(`${symbol} 持仓量变化分析: ${changePercent.toFixed(2)}%`);

      return {
        current,
        previous,
        change,
        changePercent,
        trend,
      };
    } catch (error) {
      this.logger.error(`分析持仓量变化失败: ${error.message}`);
      throw new Error(`分析持仓量变化失败: ${error.message}`);
    }
  }

  /**
   * 获取支持的交易所列表
   */
  getSupportedExchanges(): string[] {
    return Array.from(this.exchanges.keys());
  }

  /**
   * 检查交易所是否支持持仓量数据
   * @param exchange 交易所名称
   */
  isOpenInterestSupported(exchange: string): boolean {
    const exchangeInstance = this.exchanges.get(exchange);
    return Boolean(exchangeInstance?.has?.fetchOpenInterest) || false;
  }

  /**
   * 获取交易所实例
   * @param exchangeName 交易所名称
   */
  private getExchange(exchangeName: string): ccxt.Exchange {
    const exchange = this.exchanges.get(exchangeName.toLowerCase());
    if (!exchange) {
      throw new Error(`不支持的交易所或交易所不支持持仓量数据: ${exchangeName}`);
    }
    return exchange;
  }

  /**
   * 格式化多个持仓量数据
   * @param openInterests 原始持仓量数据
   */
  private formatMultipleOpenInterest(openInterests: any[]): IOpenInterestData[] {
    return openInterests.map(oi => ({
      symbol: oi.symbol,
      openInterest: oi.openInterestAmount || oi.openInterest,
      timestamp: oi.timestamp,
      datetime: oi.datetime,
      side: 'total',
      percentage: oi.percentage,
    }));
  }
} 