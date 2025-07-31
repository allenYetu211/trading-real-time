import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { TradingNotificationService } from './trading-notification.service';
import { TradingZone, TriggerEvent } from '../interfaces';

// 新增穿越事件接口
export interface CrossingEvent extends TriggerEvent {
  crossingType: 'ENTER' | 'EXIT' | 'THROUGH';
  previousPrice: number;
}

/**
 * 价格触发检测服务
 * 检测实时价格是否触及买入/卖出区间，触发时发送通知
 */
@Injectable()
export class PriceTriggerDetectionService {
  private readonly logger = new Logger(PriceTriggerDetectionService.name);
  
  // 记录已触发的价格点，避免重复通知
  private triggeredZones = new Map<string, Set<string>>();
  
  // 记录当前价格在各区间的状态
  private zoneStates = new Map<string, Map<string, boolean>>(); // symbol -> zoneKey -> isInZone
  
  // 触发冷却时间（秒）- 同一区间触发后的冷却期
  private readonly triggerCooldown = 900; // 15分钟 = 900秒
  private readonly crossingCooldown = 300; // 5分钟 = 300秒  
  private readonly batchNotificationDelay = 5; // 5秒
  private readonly globalNotificationCooldown = 900; // 15分钟全局冷却
  
  // 记录触发历史：triggerKey -> 触发时间戳
  private triggerHistory = new Map<string, number>();
  
  // 记录待发送通知
  private pendingNotifications = new Map<string, TriggerEvent[]>();
  
  // 记录已经在区间内触发过的标记，避免重复触发
  private zoneTriggeredFlags = new Map<string, Set<string>>(); // symbol -> Set<zoneKey>
  
  // 记录每个symbol的最后一次通知时间
  private lastNotificationTime = new Map<string, number>(); // symbol -> timestamp

  constructor(
    private readonly prismaService: PrismaService,
    private readonly tradingNotificationService: TradingNotificationService,
  ) {}

  /**
   * 检查价格触发条件
   */
  async checkPriceTriggers(symbol: string, currentPrice: number): Promise<void> {
    try {
      // 检查全局通知频率限制（15分钟内最多一次）
      if (this.isInGlobalCooldown(symbol)) {
        // this.logger.debug(`${symbol} 在全局通知冷却期内，跳过所有检查`);
        return;
      }

      // 获取最新的分析结果
      const latestAnalysis = await this.getLatestAnalysisResult(symbol);
      
      if (!latestAnalysis || !latestAnalysis.buyZones || !latestAnalysis.sellZones) {
        this.logger.debug(`${symbol} 没有可用的交易区间数据`);
        return;
      }

      // 解析买入和卖出区间
      const buyZones = JSON.parse(latestAnalysis.buyZones) as TradingZone[];
      const sellZones = JSON.parse(latestAnalysis.sellZones) as TradingZone[];

      // 清理过期的区间触发标记
      this.cleanupZoneFlags(symbol, currentPrice, buyZones, 'BUY');
      this.cleanupZoneFlags(symbol, currentPrice, sellZones, 'SELL');

      // 检查买入区间触发和穿越
      let hasTriggered = false;
      for (const buyZone of buyZones) {
        const triggered = await this.checkZoneStateChange(symbol, 'BUY', currentPrice, buyZone);
        if (triggered) {
          hasTriggered = true;
          break; // 立即停止检查其他买入区间
        }
      }

      // 如果买入信号已触发，跳过卖出信号检查以避免同时发送多个信号
      if (!hasTriggered) {
        // 检查卖出区间触发和穿越
        for (const sellZone of sellZones) {
          const triggered = await this.checkZoneStateChange(symbol, 'SELL', currentPrice, sellZone);
          if (triggered) {
            hasTriggered = true;
            break; // 立即停止检查其他卖出区间
          }
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
   * 检查区间状态变化并处理相应事件
   */
  private async checkZoneStateChange(
    symbol: string,
    triggerType: 'BUY' | 'SELL',
    currentPrice: number,
    zone: TradingZone
  ): Promise<boolean> {
    const zoneKey = `${triggerType}_${zone.price}`;
    const symbolStateMap = this.getOrCreateZoneStateMap(symbol);
    
    const wasInZone = symbolStateMap.get(zoneKey) || false;
    const isInZone = this.isPriceInZone(currentPrice, zone);
    
    // 更新区间状态
    symbolStateMap.set(zoneKey, isInZone);
    
    if (!wasInZone && isInZone) {
      // 进入区间
      this.logger.log(`${symbol} 价格 ${currentPrice} 进入${triggerType === 'BUY' ? '买入' : '卖出'}区间 ${zone.price} (±${zone.tolerance})`);
      const triggered = await this.handleZoneTrigger(symbol, triggerType, currentPrice, zone);
      await this.handleZoneCrossing(symbol, triggerType, currentPrice, zone, 'ENTER');
      return triggered;
    } else if (wasInZone && !isInZone) {
      // 离开区间
      this.logger.log(`${symbol} 价格 ${currentPrice} 离开${triggerType === 'BUY' ? '买入' : '卖出'}区间 ${zone.price} (±${zone.tolerance})`);
      await this.handleZoneCrossing(symbol, triggerType, currentPrice, zone, 'EXIT');
      return false;
    } else if (isInZone) {
      // 仍在区间内，检查是否需要重新触发
      if (this.shouldRetriggerZone(symbol, triggerType, zone.price)) {
        this.logger.log(`${symbol} 价格 ${currentPrice} 重新触发${triggerType === 'BUY' ? '买入' : '卖出'}区间 ${zone.price} (±${zone.tolerance})`);
        const triggered = await this.handleZoneTrigger(symbol, triggerType, currentPrice, zone);
        return triggered;
      }
    }
    
    return false;
  }

  /**
   * 获取或创建区间状态映射
   */
  private getOrCreateZoneStateMap(symbol: string): Map<string, boolean> {
    if (!this.zoneStates.has(symbol)) {
      this.zoneStates.set(symbol, new Map());
    }
    return this.zoneStates.get(symbol)!;
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
   * 判断是否应该重新触发区间
   */
  private shouldRetriggerZone(symbol: string, triggerType: string, price: number): boolean {
    const triggerKey = `${symbol}_${triggerType}_${price}`;
    const lastTriggerTime = this.triggerHistory.get(triggerKey);
    
    if (!lastTriggerTime) {
      return true;
    }
    
    const now = Date.now();
    const timeSinceLastTrigger = (now - lastTriggerTime) / 1000;
    
    // 如果超过冷却时间，允许重新触发
    return timeSinceLastTrigger >= this.triggerCooldown;
  }

  /**
   * 处理区间穿越事件
   */
  private async handleZoneCrossing(
    symbol: string,
    triggerType: 'BUY' | 'SELL',
    currentPrice: number,
    zone: TradingZone,
    crossingType: 'ENTER' | 'EXIT'
  ): Promise<void> {
    const crossingKey = `${symbol}_${triggerType}_${zone.price}_${crossingType}`;
    
    // 穿越事件使用更短的冷却时间
    if (this.isInCrossingCooldown(crossingKey)) {
      this.logger.debug(`${crossingKey} 在穿越冷却期内，跳过通知`);
      return;
    }

    try {
      const crossingEvent: CrossingEvent = {
        symbol,
        triggerType,
        currentPrice,
        targetPrice: zone.price,
        tolerance: zone.tolerance,
        confidence: zone.confidence,
        timestamp: Date.now(),
        crossingType,
        previousPrice: currentPrice, // 这里可以传入真实的前一个价格
      };

      // 发送穿越通知
      await this.tradingNotificationService.sendZoneCrossingNotification(crossingEvent);

      // 记录穿越历史
      this.recordTrigger(crossingKey);

      // this.logger.log(
      //   `区间穿越已记录: ${symbol} ${crossingType} ${triggerType} 区间 ${zone.price} (±${zone.tolerance})，当前价格: ${currentPrice}`
      // );

    } catch (error) {
      this.logger.error(`处理区间穿越失败: ${error.message}`);
    }
  }

  /**
   * 处理区间触发事件
   */
  private async handleZoneTrigger(
    symbol: string,
    triggerType: 'BUY' | 'SELL',
    currentPrice: number,
    zone: TradingZone
  ): Promise<boolean> {
    // 检查是否已经在当前区间内触发过
    if (this.hasTriggeredInCurrentZone(symbol, triggerType, zone)) {
      this.logger.debug(`${symbol} ${triggerType} 区间 ${zone.price} 已经触发过，跳过重复通知`);
      return false;
    }

    const triggerKey = `${symbol}_${triggerType}_${zone.price}`;
    
    // 检查冷却时间
    if (this.isInCooldown(triggerKey)) {
      this.logger.debug(`${triggerKey} 在冷却期内，跳过通知`);
      return false;
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

      // 标记区间已触发
      this.markZoneTriggered(symbol, triggerType, zone);

      // 记录全局通知时间
      this.lastNotificationTime.set(symbol, Date.now());

      // 添加到待发送通知队列（用于合并同类型的多个触发）
      await this.addToPendingNotifications(triggerEvent);

      // 记录触发历史
      this.recordTrigger(triggerKey);

      // this.logger.log(
      //   `价格触发已记录: ${symbol} ${triggerType} 区间 ${zone.price} (±${zone.tolerance})，当前价格: ${currentPrice}`
      // );

      return true;

    } catch (error) {
      this.logger.error(`处理价格触发失败: ${error.message}`);
      return false;
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
   * 检查全局通知频率限制（15分钟内最多一次）
   */
  private isInGlobalCooldown(symbol: string): boolean {
    const lastNotifyTime = this.lastNotificationTime.get(symbol);
    if (!lastNotifyTime) {
      return false;
    }
    
    const now = Date.now();
    const timeSinceLastNotify = (now - lastNotifyTime) / 1000;
    return timeSinceLastNotify < this.globalNotificationCooldown;
  }

  /**
   * 检查是否已经在当前区间内触发过
   */
  private hasTriggeredInCurrentZone(symbol: string, triggerType: 'BUY' | 'SELL', zone: TradingZone): boolean {
    const zoneKey = this.generateZoneKey(triggerType, zone);
    const symbolTriggers = this.zoneTriggeredFlags.get(symbol);
    return symbolTriggers?.has(zoneKey) || false;
  }

  /**
   * 生成区间唯一标识
   */
  private generateZoneKey(triggerType: 'BUY' | 'SELL', zone: TradingZone): string {
    return `${triggerType}_${zone.price.toFixed(6)}_${zone.tolerance.toFixed(6)}`;
  }

  /**
   * 标记区间已触发
   */
  private markZoneTriggered(symbol: string, triggerType: 'BUY' | 'SELL', zone: TradingZone): void {
    const zoneKey = this.generateZoneKey(triggerType, zone);
    
    if (!this.zoneTriggeredFlags.has(symbol)) {
      this.zoneTriggeredFlags.set(symbol, new Set());
    }
    
    this.zoneTriggeredFlags.get(symbol)!.add(zoneKey);
  }

  /**
   * 清理过期的区间触发标记（当价格离开区间时）
   */
  private cleanupZoneFlags(symbol: string, currentPrice: number, zones: TradingZone[], triggerType: 'BUY' | 'SELL'): void {
    const symbolTriggers = this.zoneTriggeredFlags.get(symbol);
    if (!symbolTriggers) return;

    // 检查当前价格是否还在已触发的区间内
    zones.forEach(zone => {
      const zoneKey = this.generateZoneKey(triggerType, zone);
      if (symbolTriggers.has(zoneKey)) {
        const inZone = this.isPriceInZone(currentPrice, zone);
        if (!inZone) {
          // 价格已离开区间，清除触发标记
          symbolTriggers.delete(zoneKey);
          this.logger.debug(`清理区间触发标记: ${symbol} ${zoneKey}`);
        }
      }
    });
  }

  /**
   * 检查是否在穿越冷却期内
   */
  private isInCrossingCooldown(crossingKey: string): boolean {
    const lastTriggerTime = this.triggerHistory.get(crossingKey);
    if (!lastTriggerTime) {
      return false;
    }
    
    const now = Date.now();
    const timeSinceLastTrigger = (now - lastTriggerTime) / 1000;
    return timeSinceLastTrigger < this.crossingCooldown;
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
    
    // 清理区间状态
    this.zoneStates.delete(symbol);
    
    // 清理相关的触发历史
    const keysToDelete: string[] = [];
    for (const [key] of this.triggerHistory) {
      if (key.startsWith(`${symbol}_`)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.triggerHistory.delete(key));
    
    this.logger.log(`已清理 ${symbol} 的过期触发记录和区间状态`);
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
    
    // this.logger.debug(`添加到通知队列: ${notificationKey}, 当前队列长度: ${pendingList.length}`);
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
      
      // this.logger.log(`批量通知已发送: ${notificationKey}, 包含 ${pendingList.length} 个触发`);
      
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
    globalCooldowns: number;
    zoneTriggeredFlags: number;
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

    // 计算全局冷却数量
    let globalCooldowns = 0;
    for (const [symbol, timestamp] of this.lastNotificationTime) {
      const timeSinceLastNotify = (now - timestamp) / 1000;
      if (timeSinceLastNotify < this.globalNotificationCooldown) {
        globalCooldowns++;
      }
    }

    // 计算区间触发标记数量
    let zoneTriggeredFlags = 0;
    for (const flagSet of this.zoneTriggeredFlags.values()) {
      zoneTriggeredFlags += flagSet.size;
    }

    return {
      totalTriggers: this.triggerHistory.size,
      activeCooldowns,
      triggeredZonesCount,
      globalCooldowns,
      zoneTriggeredFlags,
    };
  }

  /**
   * 添加手动测试通知功能
   */
  async testNotificationSystem(symbol: string, testPrice: number): Promise<{
    telegramStatus: any;
    testResults: any;
  }> {
    this.logger.log(`🧪 测试通知系统 - ${symbol} @ ${testPrice}`);
    
    const telegramStatus = this.tradingNotificationService.getNotificationStatus();
    this.logger.log(`Telegram状态: ${JSON.stringify(telegramStatus)}`);
    
    // 测试基本通知
    const testNotificationResult = await this.tradingNotificationService.sendTestNotification();
    this.logger.log(`测试通知结果: ${testNotificationResult}`);
    
    // 测试价格触发
    const triggerTestResult = await this.testPriceTrigger(symbol, testPrice, true);
    
    return {
      telegramStatus,
      testResults: {
        testNotificationSent: testNotificationResult,
        priceTriggerTest: triggerTestResult,
      }
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

  /**
   * 检查可能错过的区间穿越触发
   * 当价格出现大幅跳跃时，检查是否错过了中间的区间触发
   */
  async checkPossibleMissedTriggers(
    symbol: string,
    previousPrice: number,
    currentPrice: number
  ): Promise<void> {
    try {
      // 获取最新的分析结果
      const latestAnalysis = await this.getLatestAnalysisResult(symbol);
      
      if (!latestAnalysis || !latestAnalysis.buyZones || !latestAnalysis.sellZones) {
        return;
      }

      const buyZones = JSON.parse(latestAnalysis.buyZones) as TradingZone[];
      const sellZones = JSON.parse(latestAnalysis.sellZones) as TradingZone[];

      // 确定价格变动方向
      const isMovingUp = currentPrice > previousPrice;
      const isMovingDown = currentPrice < previousPrice;

      // 检查买入区间是否被穿越
      for (const buyZone of buyZones) {
        if (this.wasZoneCrossed(previousPrice, currentPrice, buyZone)) {
          this.logger.warn(
            `检测到可能错过的买入区间穿越: ${symbol} 价格从 ${previousPrice} -> ${currentPrice}，穿越区间 ${buyZone.price} (±${buyZone.tolerance})`
          );
          
          // 使用区间中心价格触发通知
          await this.handleZoneTrigger(symbol, 'BUY', buyZone.price, buyZone);
        }
      }

      // 检查卖出区间是否被穿越
      for (const sellZone of sellZones) {
        if (this.wasZoneCrossed(previousPrice, currentPrice, sellZone)) {
          this.logger.warn(
            `检测到可能错过的卖出区间穿越: ${symbol} 价格从 ${previousPrice} -> ${currentPrice}，穿越区间 ${sellZone.price} (±${sellZone.tolerance})`
          );
          
          // 使用区间中心价格触发通知
          await this.handleZoneTrigger(symbol, 'SELL', sellZone.price, sellZone);
        }
      }

    } catch (error) {
      this.logger.error(`检查可能错过的触发失败: ${error.message}`);
    }
  }

  /**
   * 判断价格变动是否穿越了指定区间
   */
  private wasZoneCrossed(
    previousPrice: number,
    currentPrice: number,
    zone: TradingZone
  ): boolean {
    const lowerBound = zone.price - zone.tolerance;
    const upperBound = zone.price + zone.tolerance;

    // 检查是否从区间外进入区间内，或从区间内离开区间外
    const wasOutsideZone = previousPrice < lowerBound || previousPrice > upperBound;
    const isInsideZone = currentPrice >= lowerBound && currentPrice <= upperBound;
    const wasInsideZone = previousPrice >= lowerBound && previousPrice <= upperBound;
    const isOutsideZone = currentPrice < lowerBound || currentPrice > upperBound;

    // 价格从区间外进入区间内
    const enteredZone = wasOutsideZone && isInsideZone;
    
    // 价格从区间内离开到区间外
    const exitedZone = wasInsideZone && isOutsideZone;

    // 价格跨越了整个区间（快速穿越）
    const crossedThrough = (
      (previousPrice < lowerBound && currentPrice > upperBound) ||
      (previousPrice > upperBound && currentPrice < lowerBound)
    );

    return enteredZone || crossedThrough;
  }

  /**
   * 调试分析数据格式
   */
  async debugAnalysisData(symbol: string): Promise<any> {
    const latestAnalysis = await this.getLatestAnalysisResult(symbol);
    
    if (!latestAnalysis) {
      return {
        hasData: false,
        message: `没有找到 ${symbol} 的分析数据`
      };
    }

    let buyZones = [];
    let sellZones = [];
    let buyZonesRaw = null;
    let sellZonesRaw = null;

    try {
      buyZonesRaw = latestAnalysis.buyZones;
      sellZonesRaw = latestAnalysis.sellZones;
      
      if (buyZonesRaw) {
        buyZones = JSON.parse(buyZonesRaw);
      }
      if (sellZonesRaw) {
        sellZones = JSON.parse(sellZonesRaw);
      }
    } catch (error) {
      return {
        hasData: true,
        parseError: error.message,
        buyZonesRaw,
        sellZonesRaw
      };
    }

    return {
      hasData: true,
      symbol,
      currentPrice: latestAnalysis.currentPrice,
      timestamp: latestAnalysis.timestamp,
      buyZones: {
        count: buyZones.length,
        sample: buyZones.slice(0, 3), // 只显示前3个作为示例
        raw: buyZonesRaw
      },
      sellZones: {
        count: sellZones.length,
        sample: sellZones.slice(0, 3),
        raw: sellZonesRaw
      },
      analysis: {
        id: latestAnalysis.id,
        createdAt: latestAnalysis.createdAt
      }
    };
  }
}