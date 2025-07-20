import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as WebSocket from 'ws';
import { KlineData } from 'src/shared/interfaces';
import { IntervalType } from 'src/shared/enums';
import { DataStorageService } from '../data-storage.service';
import { CacheService } from '../cache.service';

interface BinanceKlineEvent {
  e: string; // 事件类型
  E: number; // 事件时间
  s: string; // 交易对
  k: {
    t: number; // 开盘时间
    T: number; // 收盘时间
    s: string; // 交易对
    i: string; // K线间隔
    f: number; // 第一笔成交ID
    L: number; // 最后一笔成交ID
    o: string; // 开盘价
    c: string; // 收盘价
    h: string; // 最高价
    l: string; // 最低价
    v: string; // 成交量
    n: number; // 成交笔数
    x: boolean; // K线是否完结
    q: string; // 成交额
    V: string; // 主动买入成交量
    Q: string; // 主动买入成交额
  };
}

@Injectable()
export class WebSocketService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WebSocketService.name);
  private readonly baseUrl: string;
  private connections = new Map<string, WebSocket>();
  private subscriptions = new Map<string, Set<string>>();
  private reconnectAttempts = new Map<string, number>();
  private readonly maxReconnectAttempts = 5;
  private readonly reconnectDelay = 5000; // 5秒

  constructor(
    private readonly configService: ConfigService,
    private readonly dataStorageService: DataStorageService,
    private readonly cacheService: CacheService,
  ) {
    const binanceConfig = this.configService.get('binance');
    this.baseUrl = binanceConfig.wsBaseUrl;
  }

  async onModuleInit() {
    this.logger.log('WebSocket服务初始化');
  }

  async onModuleDestroy() {
    this.logger.log('关闭所有WebSocket连接');
    for (const [key, ws] of this.connections) {
      ws.close();
    }
    this.connections.clear();
    this.subscriptions.clear();
  }

  /**
   * 订阅K线数据流
   */
  async subscribeKline(symbol: string, interval: IntervalType): Promise<void> {
    const streamName = `${symbol.toLowerCase()}@kline_${interval}`;
    const connectionKey = `kline_${symbol}_${interval}`;

    if (this.connections.has(connectionKey)) {
      this.logger.warn(`已存在连接: ${connectionKey}`);
      return;
    }

    const wsUrl = `${this.baseUrl}/ws/${streamName}`;
    this.logger.log(`订阅K线数据流: ${streamName}`);

    const ws = new WebSocket(wsUrl);
    this.connections.set(connectionKey, ws);
    this.reconnectAttempts.set(connectionKey, 0);

    if (!this.subscriptions.has(connectionKey)) {
      this.subscriptions.set(connectionKey, new Set());
    }
    this.subscriptions.get(connectionKey)!.add(streamName);

    ws.on('open', () => {
      this.logger.log(`WebSocket连接已建立: ${streamName}`);
      this.reconnectAttempts.set(connectionKey, 0);
    });

    ws.on('message', (data: WebSocket.Data) => {
      try {
        const event: BinanceKlineEvent = JSON.parse(data.toString());
        this.handleKlineEvent(event);
      } catch (error) {
        this.logger.error('解析WebSocket消息失败:', error);
      }
    });

    ws.on('error', (error) => {
      this.logger.error(`WebSocket错误 ${streamName}:`, error);
    });

    ws.on('close', (code, reason) => {
      this.logger.warn(`WebSocket连接关闭 ${streamName}: ${code} - ${reason}`);
      this.connections.delete(connectionKey);
      this.handleReconnect(connectionKey, symbol, interval);
    });
  }

  /**
   * 取消订阅K线数据流
   */
  async unsubscribeKline(symbol: string, interval: IntervalType): Promise<void> {
    const connectionKey = `kline_${symbol}_${interval}`;
    const ws = this.connections.get(connectionKey);

    if (ws) {
      this.logger.log(`取消订阅K线数据流: ${symbol} ${interval}`);
      ws.close();
      this.connections.delete(connectionKey);
      this.subscriptions.delete(connectionKey);
      this.reconnectAttempts.delete(connectionKey);
    }
  }

  /**
   * 批量订阅多个币种的K线数据
   */
  async subscribeMultipleKlines(configs: Array<{ symbol: string; interval: IntervalType }>): Promise<void> {
    const streams = configs.map(config => 
      `${config.symbol.toLowerCase()}@kline_${config.interval}`
    );
    
    if (streams.length === 0) return;

    const connectionKey = 'multi_klines';
    const wsUrl = `${this.baseUrl}/stream?streams=${streams.join('/')}`;
    
    this.logger.log(`批量订阅K线数据流: ${streams.length}个流`);

    const ws = new WebSocket(wsUrl);
    this.connections.set(connectionKey, ws);
    this.subscriptions.set(connectionKey, new Set(streams));
    this.reconnectAttempts.set(connectionKey, 0);

    ws.on('open', () => {
      this.logger.log(`批量WebSocket连接已建立，订阅了 ${streams.length} 个数据流`);
      this.reconnectAttempts.set(connectionKey, 0);
    });

    ws.on('message', (data: WebSocket.Data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.data && message.data.e === 'kline') {
          this.handleKlineEvent(message.data);
        }
      } catch (error) {
        this.logger.error('解析批量WebSocket消息失败:', error);
      }
    });

    ws.on('error', (error) => {
      this.logger.error('批量WebSocket错误:', error);
    });

    ws.on('close', (code, reason) => {
      this.logger.warn(`批量WebSocket连接关闭: ${code} - ${reason}`);
      this.connections.delete(connectionKey);
      this.handleMultipleReconnect(connectionKey, configs);
    });
  }

  /**
   * 处理K线事件
   */
  private async handleKlineEvent(event: BinanceKlineEvent): Promise<void> {
    try {
      const klineData: KlineData = {
        symbol: event.k.s,
        interval: event.k.i as IntervalType,
        openTime: event.k.t,
        closeTime: event.k.T,
        openPrice: parseFloat(event.k.o),
        highPrice: parseFloat(event.k.h),
        lowPrice: parseFloat(event.k.l),
        closePrice: parseFloat(event.k.c),
        volume: parseFloat(event.k.v),
        quoteAssetVolume: parseFloat(event.k.q),
        numberOfTrades: event.k.n,
        takerBuyBaseAssetVolume: parseFloat(event.k.V),
        takerBuyQuoteAssetVolume: parseFloat(event.k.Q),
      };

      // 只有K线完结时才保存到数据库
      if (event.k.x) {
        await this.dataStorageService.saveKline(klineData);
        this.logger.debug(`保存完结K线: ${klineData.symbol} ${klineData.interval} ${new Date(klineData.openTime).toISOString()}`);
      }

      // 实时更新缓存（无论是否完结）
      await this.cacheService.cacheLatestPrice(klineData.symbol, klineData.closePrice);
      
      this.logger.debug(`处理K线事件: ${klineData.symbol} ${klineData.interval} 价格: ${klineData.closePrice} 完结: ${event.k.x}`);
    } catch (error) {
      this.logger.error('处理K线事件失败:', error);
    }
  }

  /**
   * 处理重连
   */
  private async handleReconnect(connectionKey: string, symbol: string, interval: IntervalType): Promise<void> {
    const attempts = this.reconnectAttempts.get(connectionKey) || 0;
    
    if (attempts >= this.maxReconnectAttempts) {
      this.logger.error(`达到最大重连次数，放弃重连: ${connectionKey}`);
      this.reconnectAttempts.delete(connectionKey);
      return;
    }

    this.reconnectAttempts.set(connectionKey, attempts + 1);
    this.logger.log(`${this.reconnectDelay / 1000}秒后重连 ${connectionKey} (第${attempts + 1}次)`);

    setTimeout(() => {
      if (!this.connections.has(connectionKey)) {
        this.subscribeKline(symbol, interval);
      }
    }, this.reconnectDelay);
  }

  /**
   * 处理批量重连
   */
  private async handleMultipleReconnect(connectionKey: string, configs: Array<{ symbol: string; interval: IntervalType }>): Promise<void> {
    const attempts = this.reconnectAttempts.get(connectionKey) || 0;
    
    if (attempts >= this.maxReconnectAttempts) {
      this.logger.error(`达到最大重连次数，放弃重连: ${connectionKey}`);
      this.reconnectAttempts.delete(connectionKey);
      return;
    }

    this.reconnectAttempts.set(connectionKey, attempts + 1);
    this.logger.log(`${this.reconnectDelay / 1000}秒后重连批量订阅 (第${attempts + 1}次)`);

    setTimeout(() => {
      if (!this.connections.has(connectionKey)) {
        this.subscribeMultipleKlines(configs);
      }
    }, this.reconnectDelay);
  }

  /**
   * 获取连接状态
   */
  getConnectionStatus(): Array<{
    key: string;
    status: string;
    streams: string[];
    reconnectAttempts: number;
  }> {
    const status = [];
    
    for (const [key, ws] of this.connections) {
      const streams = Array.from(this.subscriptions.get(key) || []);
      const attempts = this.reconnectAttempts.get(key) || 0;
      
      status.push({
        key,
        status: this.getWebSocketStatus(ws.readyState),
        streams,
        reconnectAttempts: attempts,
      });
    }
    
    return status;
  }

  /**
   * 获取WebSocket状态字符串
   */
  private getWebSocketStatus(readyState: number): string {
    switch (readyState) {
      case WebSocket.CONNECTING: return 'CONNECTING';
      case WebSocket.OPEN: return 'OPEN';
      case WebSocket.CLOSING: return 'CLOSING';
      case WebSocket.CLOSED: return 'CLOSED';
      default: return 'UNKNOWN';
    }
  }

  /**
   * 健康检查
   */
  healthCheck(): {
    totalConnections: number;
    activeConnections: number;
    totalStreams: number;
    status: string;
  } {
    const totalConnections = this.connections.size;
    const activeConnections = Array.from(this.connections.values())
      .filter(ws => ws.readyState === WebSocket.OPEN).length;
    const totalStreams = Array.from(this.subscriptions.values())
      .reduce((total, streams) => total + streams.size, 0);
    
    const status = totalConnections === 0 ? 'idle' : 
                   activeConnections === totalConnections ? 'healthy' : 'degraded';

    return {
      totalConnections,
      activeConnections,
      totalStreams,
      status,
    };
  }
} 