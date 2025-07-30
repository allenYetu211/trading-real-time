import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { TradingNotificationService } from './trading-notification.service';
import { TradingZone, TriggerEvent } from '../interfaces';

/**
 * 价格触发检测服务
 * 检测实时价格是否触及买入/卖出区间，触发时发送通知
 */
@Injectable()
export class PriceTriggerDetectionService {
  private readonly logger = new Logger(PriceTriggerDetectionService.name);
  
  // 记录已触发的价格点，避免重复通知
  private triggeredZones = new Map<string, Set<string>>();
  
  // 触发冷却时间（秒）- 同一区间触发后的冷却期
  private readonly triggerCooldown = 60; // 5分钟
  private readonly batchNotificationDelay = 10; // 10秒内的触发合并为一条通知
  private triggerHistory = new Map<string, number>();
  private pendingNotifications = new Map<string, TriggerEvent[]>();

  constructor(
    private readonly prismaService: PrismaService,
    private readonly tradingNotificationService: TradingNotificationService,
  ) {}

  /**
   * 检查价格触发条件
   */
  async checkPriceTriggers(symbol: string, currentPrice: number): Promise<void> {
    try {
      // 获取最新的分析结果
      const latestAnalysis = await this.getLatestAnalysisResult(symbol);
      
      if (!latestAnalysis || !latestAnalysis.buyZones || !latestAnalysis.sellZones) {
        this.logger.debug(`${symbol} 没有可用的交易区间数据`);
        return;
      }

      // 解析买入和卖出区间
      const buyZones = JSON.parse(latestAnalysis.buyZones) as TradingZone[];
      const sellZones = JSON.parse(latestAnalysis.sellZones) as TradingZone[];

      // 检查买入区间触发
      for (const buyZone of buyZones) {
        if (this.isPriceInZone(currentPrice, buyZone)) {
          await this.handleZoneTrigger(symbol, 'BUY', currentPrice, buyZone);
        }
      }

      // 检查卖出区间触发
      for (const sellZone of sellZones) {
        if (this.isPriceInZone(currentPrice, sellZone)) {
          await this.handleZoneTrigger(symbol, 'SELL', currentPrice, sellZone);
        }
      }

    } catch (error) {
      this.logger.error(`检查 ${symbol} 价格触发失败: ${error.message}`);
    }
  }

  /**
   * 获取最新的分析结果
   */
  private async getLatestAnalysisResult(symbol: string) {
    return await this.prismaService.analysisResult.findFirst({
      where: { 
        symbol,
        buyZones: { not: null },
        sellZones: { not: null },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 判断价格是否在指定区间内
   */
  private isPriceInZone(currentPrice: number, zone: TradingZone): boolean {
    const lowerBound = zone.price - zone.tolerance;
    const upperBound = zone.price + zone.tolerance;
    return currentPrice >= lowerBound && currentPrice <= upperBound;
  }

  /**
   * 处理区间触发事件
   */
  private async handleZoneTrigger(
    symbol: string,
    triggerType: 'BUY' | 'SELL',
    currentPrice: number,
    zone: TradingZone
  ): Promise<void> {
    const triggerKey = `${symbol}_${triggerType}_${zone.price}`;
    
    // 检查冷却时间
    if (this.isInCooldown(triggerKey)) {
      this.logger.debug(`${triggerKey} 在冷却期内，跳过通知`);
      return;
    }

    // 检查是否已经触发过这个区间
    if (this.hasTriggeredRecently(symbol, triggerType, zone.price)) {
      this.logger.debug(`${symbol} ${triggerType} 区间 ${zone.price} 最近已触发，跳过通知`);
      return;
    }

    try {
      const triggerEvent: TriggerEvent = {
        symbol,
        triggerType,
        currentPrice,
        targetPrice: zone.price,
        tolerance: zone.tolerance,
        confidence: zone.confidence,
        timestamp: Date.now(),
      };

      // 添加到待发送通知队列（用于合并同类型的多个触发）
      await this.addToPendingNotifications(triggerEvent);

      // 记录触发历史
      this.recordTrigger(triggerKey);
      this.addToTriggeredZones(symbol, triggerType, zone.price);

      this.logger.log(
        `价格触发已记录: ${symbol} ${triggerType} 区间 ${zone.price} (±${zone.tolerance})，当前价格: ${currentPrice}`
      );

    } catch (error) {
      this.logger.error(`处理价格触发失败: ${error.message}`);
    }
  }

  /**
   * 检查是否在冷却期内
   */
  private isInCooldown(triggerKey: string): boolean {
    const lastTriggerTime = this.triggerHistory.get(triggerKey);
    if (!lastTriggerTime) {
      return false;
    }
    
    const now = Date.now();
    const timeSinceLastTrigger = (now - lastTriggerTime) / 1000;
    return timeSinceLastTrigger < this.triggerCooldown;
  }

  /**
   * 记录触发时间
   */
  private recordTrigger(triggerKey: string): void {
    this.triggerHistory.set(triggerKey, Date.now());
  }

  /**
   * 检查是否最近触发过
   */
  private hasTriggeredRecently(symbol: string, triggerType: string, price: number): boolean {
    const symbolKey = `${symbol}_${triggerType}`;
    const triggeredSet = this.triggeredZones.get(symbolKey);
    return triggeredSet?.has(price.toString()) || false;
  }

  /**
   * 添加到已触发区间
   */
  private addToTriggeredZones(symbol: string, triggerType: string, price: number): void {
    const symbolKey = `${symbol}_${triggerType}`;
    
    if (!this.triggeredZones.has(symbolKey)) {
      this.triggeredZones.set(symbolKey, new Set());
    }
    
    this.triggeredZones.get(symbolKey)!.add(price.toString());
  }

  /**
   * 清理过期的触发记录
   * 当有新的分析结果时调用，清理旧的触发记录
   */
  async clearExpiredTriggers(symbol: string): Promise<void> {
    const symbolBuyKey = `${symbol}_BUY`;
    const symbolSellKey = `${symbol}_SELL`;
    
    this.triggeredZones.delete(symbolBuyKey);
    this.triggeredZones.delete(symbolSellKey);
    
    // 清理相关的触发历史
    const keysToDelete: string[] = [];
    for (const [key] of this.triggerHistory) {
      if (key.startsWith(`${symbol}_`)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.triggerHistory.delete(key));
    
    this.logger.debug(`已清理 ${symbol} 的过期触发记录`);
  }

  /**
   * 添加到待发送通知队列（智能合并）
   */
  private async addToPendingNotifications(triggerEvent: TriggerEvent): Promise<void> {
    const notificationKey = `${triggerEvent.symbol}_${triggerEvent.triggerType}`;
    
    // 如果没有待发送的通知，创建新的队列
    if (!this.pendingNotifications.has(notificationKey)) {
      this.pendingNotifications.set(notificationKey, []);
    }
    
    const pendingList = this.pendingNotifications.get(notificationKey)!;
    pendingList.push(triggerEvent);
    
    // 如果这是第一个触发，设置延迟发送
    if (pendingList.length === 1) {
      setTimeout(async () => {
        await this.sendBatchedNotifications(notificationKey);
      }, this.batchNotificationDelay * 1000);
    }
    
    this.logger.debug(`添加到通知队列: ${notificationKey}, 当前队列长度: ${pendingList.length}`);
  }

  /**
   * 发送批量合并的通知
   */
  private async sendBatchedNotifications(notificationKey: string): Promise<void> {
    const pendingList = this.pendingNotifications.get(notificationKey);
    
    if (!pendingList || pendingList.length === 0) {
      return;
    }
    
    try {
      if (pendingList.length === 1) {
        // 单个触发，发送普通通知
        await this.tradingNotificationService.sendPriceTriggerNotification(pendingList[0]);
      } else {
        // 多个触发，发送合并通知
        await this.tradingNotificationService.sendMultiZoneTriggerNotification(pendingList);
      }
      
      this.logger.log(`批量通知已发送: ${notificationKey}, 包含 ${pendingList.length} 个触发`);
      
    } catch (error) {
      this.logger.error(`发送批量通知失败: ${error.message}`);
    } finally {
      // 清理已处理的通知
      this.pendingNotifications.delete(notificationKey);
    }
  }

  /**
   * 获取触发统计信息
   */
  getTriggerStatistics(): {
    totalTriggers: number;
    activeCooldowns: number;
    triggeredZonesCount: number;
  } {
    const now = Date.now();
    let activeCooldowns = 0;
    
    for (const [key, timestamp] of this.triggerHistory) {
      const timeSinceLastTrigger = (now - timestamp) / 1000;
      if (timeSinceLastTrigger < this.triggerCooldown) {
        activeCooldowns++;
      }
    }
    
    let triggeredZonesCount = 0;
    for (const triggeredSet of this.triggeredZones.values()) {
      triggeredZonesCount += triggeredSet.size;
    }

    return {
      totalTriggers: this.triggerHistory.size,
      activeCooldowns,
      triggeredZonesCount,
    };
  }

  /**
   * 手动测试价格触发
   */
  async testPriceTrigger(
    symbol: string,
    testPrice: number,
    forceNotification = false
  ): Promise<{
    buyTriggered: boolean;
    sellTriggered: boolean;
    notifications: TriggerEvent[];
  }> {
    this.logger.log(`测试 ${symbol} 在价格 ${testPrice} 的触发条件`);

    const result = {
      buyTriggered: false,
      sellTriggered: false,
      notifications: [] as TriggerEvent[],
    };

    try {
      const latestAnalysis = await this.getLatestAnalysisResult(symbol);
      
      if (!latestAnalysis || !latestAnalysis.buyZones || !latestAnalysis.sellZones) {
        this.logger.warn(`${symbol} 没有可用的交易区间数据`);
        return result;
      }

      const buyZones = JSON.parse(latestAnalysis.buyZones) as TradingZone[];
      const sellZones = JSON.parse(latestAnalysis.sellZones) as TradingZone[];

      // 测试买入区间
      for (const buyZone of buyZones) {
        if (this.isPriceInZone(testPrice, buyZone)) {
          result.buyTriggered = true;
          result.notifications.push({
            symbol,
            triggerType: 'BUY',
            currentPrice: testPrice,
            targetPrice: buyZone.price,
            tolerance: buyZone.tolerance,
            confidence: buyZone.confidence,
            timestamp: Date.now(),
          });

          if (forceNotification) {
            await this.tradingNotificationService.sendPriceTriggerNotification(
              result.notifications[result.notifications.length - 1]
            );
          }
        }
      }

      // 测试卖出区间
      for (const sellZone of sellZones) {
        if (this.isPriceInZone(testPrice, sellZone)) {
          result.sellTriggered = true;
          result.notifications.push({
            symbol,
            triggerType: 'SELL',
            currentPrice: testPrice,
            targetPrice: sellZone.price,
            tolerance: sellZone.tolerance,
            confidence: sellZone.confidence,
            timestamp: Date.now(),
          });

          if (forceNotification) {
            await this.tradingNotificationService.sendPriceTriggerNotification(
              result.notifications[result.notifications.length - 1]
            );
          }
        }
      }

      this.logger.log(
        `测试结果: ${symbol} @ ${testPrice} - 买入触发: ${result.buyTriggered}, 卖出触发: ${result.sellTriggered}`
      );

    } catch (error) {
      this.logger.error(`测试价格触发失败: ${error.message}`);
    }

    return result;
  }
}