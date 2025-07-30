import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as ccxt from 'ccxt';
import { PrismaService } from 'src/prisma/prisma.service';
import { CoinConfigService } from 'src/modules/coin-config/coin-config.service';
import { PriceTriggerDetectionService } from './price-trigger-detection.service';

/**
 * 实时价格监控服务
 * 使用ccxt WebSocket连接获取实时价格数据
 */
@Injectable()
export class RealtimePriceMonitorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RealtimePriceMonitorService.name);
  
  private exchange: ccxt.Exchange | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  private readonly reconnectDelay = 5000; // 5秒
  
  // 存储监控的交易对和最新价格
  private monitoredSymbols = new Set<string>();
  private latestPrices = new Map<string, number>();
  private priceUpdateListeners = new Map<string, Array<(price: number) => void>>();

  constructor(
    private readonly prismaService: PrismaService,
    private readonly coinConfigService: CoinConfigService,
    private readonly priceTriggerDetectionService: PriceTriggerDetectionService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.initializeWebSocketConnection();
    await this.startMonitoring();
  }

  async onModuleDestroy(): Promise<void> {
    await this.disconnect();
  }

  /**
   * 初始化交易所连接
   */
  private async initializeWebSocketConnection(): Promise<void> {
    try {
      // 使用Binance REST API进行价格监控
      this.exchange = new ccxt.binance({
        enableRateLimit: true,
        sandbox: false,
        rateLimit: 1200, // 每分钟限制50次请求
        options: {
          defaultType: 'spot',
        },
      });

      await this.exchange.loadMarkets();
      this.isConnected = true;
      this.logger.log('Binance 交易所初始化成功');
      
    } catch (error) {
      this.logger.error(`交易所连接初始化失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 开始监控所有活跃交易对
   */
  private async startMonitoring(): Promise<void> {
    try {
      // 获取所有活跃的交易对
      const activeConfigs = await this.coinConfigService.findActiveConfigs();
      
      for (const config of activeConfigs) {
        await this.addSymbolToMonitor(config.symbol);
      }

      this.logger.log(`开始监控 ${this.monitoredSymbols.size} 个交易对的实时价格`);
      
    } catch (error) {
      this.logger.error(`启动价格监控失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 添加交易对到监控列表
   */
  async addSymbolToMonitor(symbol: string): Promise<void> {
    if (this.monitoredSymbols.has(symbol)) {
      this.logger.debug(`交易对 ${symbol} 已在监控列表中`);
      return;
    }

    try {
      this.monitoredSymbols.add(symbol);
      this.logger.log(`添加 ${symbol} 到价格监控`);
      
      // 启动该交易对的价格监控
      await this.watchSymbolPrice(symbol);
      
    } catch (error) {
      this.logger.error(`添加 ${symbol} 到监控失败: ${error.message}`);
      this.monitoredSymbols.delete(symbol);
    }
  }

  /**
   * 从监控列表移除交易对
   */
  removeSymbolFromMonitor(symbol: string): void {
    if (this.monitoredSymbols.has(symbol)) {
      this.monitoredSymbols.delete(symbol);
      this.latestPrices.delete(symbol);
      this.priceUpdateListeners.delete(symbol);
      this.logger.log(`移除 ${symbol} 的价格监控`);
    }
  }

  /**
   * 监控单个交易对的价格
   */
  private async watchSymbolPrice(symbol: string): Promise<void> {
    if (!this.exchange) {
      throw new Error('交易所未初始化');
    }

    try {
      // 使用定时轮询的方式获取价格，因为Binance的watchTicker不支持
      while (this.monitoredSymbols.has(symbol)) {
        try {
          const ticker = await this.exchange.fetchTicker(symbol);
          const price = ticker.last;
          
          if (price) {
            await this.handlePriceUpdate(symbol, price);
          }
          
          // 每5秒获取一次价格
          await this.sleep(5000);
          
        } catch (error) {
          this.logger.error(`监控 ${symbol} 价格时出错: ${error.message}`);
          
          // 如果是连接错误，尝试重连
          if (this.shouldReconnect(error)) {
            await this.attemptReconnect();
          }
          
          // 等待一段时间后继续
          await this.sleep(10000);
        }
      }
      
    } catch (error) {
      this.logger.error(`启动 ${symbol} 价格监控失败: ${error.message}`);
    }
  }

  /**
   * 处理价格更新
   */
  private async handlePriceUpdate(symbol: string, price: number): Promise<void> {
    const previousPrice = this.latestPrices.get(symbol);
    this.latestPrices.set(symbol, price);

    this.logger.debug(`${symbol} 价格更新: ${price}`);

    try {
      // 检查价格触发条件
      await this.priceTriggerDetectionService.checkPriceTriggers(symbol, price);
      
      // 通知监听器
      const listeners = this.priceUpdateListeners.get(symbol) || [];
      listeners.forEach(listener => {
        try {
          listener(price);
        } catch (error) {
          this.logger.error(`价格更新监听器执行失败: ${error.message}`);
        }
      });
      
    } catch (error) {
      this.logger.error(`处理 ${symbol} 价格更新失败: ${error.message}`);
    }
  }

  /**
   * 添加价格更新监听器
   */
  addPriceUpdateListener(symbol: string, listener: (price: number) => void): void {
    if (!this.priceUpdateListeners.has(symbol)) {
      this.priceUpdateListeners.set(symbol, []);
    }
    this.priceUpdateListeners.get(symbol)!.push(listener);
  }

  /**
   * 获取最新价格
   */
  getLatestPrice(symbol: string): number | undefined {
    return this.latestPrices.get(symbol);
  }

  /**
   * 获取所有监控的交易对及其最新价格
   */
  getAllLatestPrices(): Map<string, number> {
    return new Map(this.latestPrices);
  }

  /**
   * 判断是否应该重连
   */
  private shouldReconnect(error: any): boolean {
    const reconnectableErrors = [
      'Connection lost',
      'NetworkError',
      'ECONNRESET',
      'ENOTFOUND',
      'ETIMEDOUT'
    ];
    
    return reconnectableErrors.some(errorType => 
      error.message?.includes(errorType) || error.code?.includes(errorType)
    );
  }

  /**
   * 尝试重连
   */
  private async attemptReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error('达到最大重连次数，停止重连');
      return;
    }

    this.reconnectAttempts++;
    this.isConnected = false;
    
    this.logger.warn(`尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    await this.sleep(this.reconnectDelay);
    
    try {
      await this.initializeWebSocketConnection();
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.logger.log('WebSocket 重连成功');
      
    } catch (error) {
      this.logger.error(`重连失败: ${error.message}`);
    }
  }

  /**
   * 断开连接
   */
  private async disconnect(): Promise<void> {
    try {
      if (this.exchange) {
        await this.exchange.close();
        this.exchange = null;
      }
      
      this.isConnected = false;
      this.monitoredSymbols.clear();
      this.latestPrices.clear();
      this.priceUpdateListeners.clear();
      
      this.logger.log('WebSocket 连接已断开');
      
    } catch (error) {
      this.logger.error(`断开连接时出错: ${error.message}`);
    }
  }

  /**
   * 获取连接状态
   */
  getConnectionStatus(): {
    isConnected: boolean;
    monitoredSymbolsCount: number;
    reconnectAttempts: number;
  } {
    return {
      isConnected: this.isConnected,
      monitoredSymbolsCount: this.monitoredSymbols.size,
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  /**
   * 等待指定时间
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 手动刷新监控列表
   */
  async refreshMonitoredSymbols(): Promise<void> {
    this.logger.log('刷新监控的交易对列表');
    
    // 获取当前活跃的配置
    const activeConfigs = await this.coinConfigService.findActiveConfigs();
    const activeSymbols = new Set(activeConfigs.map(config => config.symbol));
    
    // 移除不再活跃的交易对
    for (const symbol of this.monitoredSymbols) {
      if (!activeSymbols.has(symbol)) {
        this.removeSymbolFromMonitor(symbol);
      }
    }
    
    // 添加新的活跃交易对
    for (const symbol of activeSymbols) {
      if (!this.monitoredSymbols.has(symbol)) {
        await this.addSymbolToMonitor(symbol);
      }
    }
    
    this.logger.log(`监控列表已刷新，当前监控 ${this.monitoredSymbols.size} 个交易对`);
  }
}