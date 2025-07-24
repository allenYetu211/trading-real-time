import { Injectable, Logger } from '@nestjs/common';
import { OkxOrderData, ProcessedTradeData, OkxFillData } from '../interfaces/okx-trade.interface';

@Injectable()
export class TradeProcessorService {
  private readonly logger = new Logger(TradeProcessorService.name);

  /**
   * 处理 OKX 订单数据，转换为系统交易记录
   */
  async processOrders(orders: OkxOrderData[]): Promise<ProcessedTradeData[]> {
    this.logger.log(`开始处理 ${orders.length} 笔 OKX 订单数据`);

    // 按交易对和持仓方向分组订单
    const groupedTrades = this.groupOrdersByTrade(orders);
    
    // 转换为系统交易记录
    const processedTrades: ProcessedTradeData[] = [];
    
    for (const [tradeKey, tradeOrders] of groupedTrades.entries()) {
      try {
        const processedTrade = this.convertToTradeRecord(tradeKey, tradeOrders);
        if (processedTrade) {
          processedTrades.push(processedTrade);
        }
      } catch (error) {
        this.logger.error(`处理交易组 ${tradeKey} 失败:`, error);
      }
    }

    this.logger.log(`成功处理 ${processedTrades.length} 笔交易记录`);
    return processedTrades;
  }

  /**
   * 处理 OKX 成交明细数据，转换为系统交易记录
   * 这个方法比处理订单数据更准确，因为成交明细反映了真实的交易情况
   */
  async processFillData(fills: OkxFillData[]): Promise<ProcessedTradeData[]> {
    this.logger.log(`开始处理 ${fills.length} 笔 OKX 成交明细数据`);

    // 按交易对和持仓方向分组成交明细
    const groupedTrades = this.groupFillsByTrade(fills);
    
    // 转换为系统交易记录
    const processedTrades: ProcessedTradeData[] = [];
    
    for (const [tradeKey, tradeFills] of groupedTrades.entries()) {
      try {
        const processedTrade = this.convertFillsToTradeRecord(tradeKey, tradeFills);
        if (processedTrade) {
          processedTrades.push(processedTrade);
        }
      } catch (error) {
        this.logger.error(`处理成交明细组 ${tradeKey} 失败:`, error);
      }
    }

    this.logger.log(`从成交明细成功处理 ${processedTrades.length} 笔交易记录`);
    return processedTrades;
  }

  /**
   * 简化处理：将已完成的订单直接转换为交易记录
   * 不进行复杂的分组逻辑
   */
  async processCompletedOrders(orders: OkxOrderData[]): Promise<ProcessedTradeData[]> {
    this.logger.log(`开始处理 ${orders.length} 笔已完成的 OKX 订单`);

    const processedTrades: ProcessedTradeData[] = [];
    
    for (const order of orders) {
      try {
        // 只处理已完成的订单
        if (order.state !== 'filled') {
          continue;
        }

        // 将单个订单转换为交易记录
        const processedTrade = this.convertOrderToTrade(order);
        if (processedTrade) {
          processedTrades.push(processedTrade);
        }
      } catch (error) {
        this.logger.error(`处理订单 ${order.ordId} 失败:`, error);
      }
    }

    this.logger.log(`成功处理 ${processedTrades.length} 笔交易记录`);
    return processedTrades;
  }

  /**
   * 将单个已完成订单转换为交易记录
   */
  private convertOrderToTrade(order: OkxOrderData): ProcessedTradeData | null {
    try {
      const instrument = order.instId;
      const direction = this.mapOrderSideToDirection(order.side, order.posSide);
      
      // 使用订单ID作为交易ID
      const tradeId = order.ordId;
      
      return {
        tradeId,
        instrument,
        direction,
        status: 'CLOSED', // 已完成的订单状态为CLOSED
        entryTime: new Date(parseInt(order.fillTime)), // 使用最新成交时间
        actualEntryPrice: parseFloat(order.avgPx || order.fillPx), // 使用成交均价
        actualExitPrice: parseFloat(order.avgPx || order.fillPx), // 对于已完成订单，进出价相同
        positionSize: parseFloat(order.accFillSz), // 累计成交数量
        pnl: order.pnl ? parseFloat(order.pnl) : 0,
        fees: order.fee ? parseFloat(order.fee) : 0,
        leverage: order.lever ? parseFloat(order.lever) : 1,
        okxOrderIds: [order.ordId],
        rawData: order,
      };
    } catch (error) {
      this.logger.error(`转换订单 ${order.ordId} 失败:`, error);
      return null;
    }
  }

  /**
   * 按交易对和持仓方向分组成交明细
   */
  private groupFillsByTrade(fills: OkxFillData[]): Map<string, OkxFillData[]> {
    const groups = new Map<string, OkxFillData[]>();

    // 按时间排序
    const sortedFills = fills.sort((a, b) => parseInt(a.ts) - parseInt(b.ts));

    // 按交易对和方向分组
    const instrumentGroups = new Map<string, OkxFillData[]>();
    
    for (const fill of sortedFills) {
      const instrumentKey = `${fill.instId}_${fill.posSide}`;
      if (!instrumentGroups.has(instrumentKey)) {
        instrumentGroups.set(instrumentKey, []);
      }
      instrumentGroups.get(instrumentKey)!.push(fill);
    }

    // 对每个交易对+方向组合进行智能分组
    for (const [instrumentKey, instrumentFills] of instrumentGroups.entries()) {
      const tradeGroups = this.smartGroupFillsByPosition(instrumentFills);
      
      // 将分组结果添加到总结果中
      tradeGroups.forEach((group, index) => {
        const groupKey = `${instrumentKey}_${index}`;
        groups.set(groupKey, group);
      });
    }

    return groups;
  }

  /**
   * 基于仓位逻辑的智能成交明细分组
   */
  private smartGroupFillsByPosition(fills: OkxFillData[]): OkxFillData[][] {
    const tradeGroups: OkxFillData[][] = [];
    let currentGroup: OkxFillData[] = [];
    let currentPosition = 0; // 当前净仓位
    
    this.logger.debug(`开始分组 ${fills.length} 个成交明细，交易对: ${fills[0]?.instId}, 方向: ${fills[0]?.posSide}`);
    
    for (const fill of fills) {
      const fillSize = parseFloat(fill.fillSz);
      const isOpening = this.isOpeningFill(fill);
      
      this.logger.debug(`成交: ${fill.side} ${fillSize}, 开仓: ${isOpening}, 当前仓位: ${currentPosition}`);
      
      if (isOpening) {
        // 开仓成交
        if (currentPosition === 0 && currentGroup.length > 0) {
          // 新交易开始，保存之前的交易
          tradeGroups.push([...currentGroup]);
          currentGroup = [];
        }
        currentGroup.push(fill);
        currentPosition += fillSize;
      } else {
        // 平仓成交
        if (currentGroup.length > 0) {
          currentGroup.push(fill);
          currentPosition -= fillSize;
          
          // 如果仓位接近于0，说明这笔交易完成
          if (Math.abs(currentPosition) < 0.0001) {
            tradeGroups.push([...currentGroup]);
            this.logger.debug(`完成一笔交易，包含 ${currentGroup.length} 个成交明细`);
            currentGroup = [];
            currentPosition = 0;
          }
        }
      }
    }
    
    // 处理未完成的交易（持仓中）
    if (currentGroup.length > 0) {
      this.logger.debug(`添加未完成交易，包含 ${currentGroup.length} 个成交明细`);
      tradeGroups.push(currentGroup);
    }
    
    this.logger.debug(`成交明细分组完成，总共 ${tradeGroups.length} 笔交易`);
    return tradeGroups;
  }

  /**
   * 判断成交明细是否为开仓
   */
  private isOpeningFill(fill: OkxFillData): boolean {
    // 对于永续合约的仓位逻辑：
    // long 方向：buy = 开多仓, sell = 平多仓
    // short 方向：sell = 开空仓, buy = 平空仓
    
    if (fill.posSide === 'long') {
      return fill.side === 'buy'; // 买入 = 开多仓
    } else if (fill.posSide === 'short') {
      return fill.side === 'sell'; // 卖出 = 开空仓
    }
    
    return true; // 默认当作开仓
  }

  /**
   * 将成交明细组转换为交易记录
   */
  private convertFillsToTradeRecord(tradeKey: string, fills: OkxFillData[]): ProcessedTradeData | null {
    if (fills.length === 0) return null;

    // 按时间排序
    fills.sort((a, b) => parseInt(a.ts) - parseInt(b.ts));

    const firstFill = fills[0];
    const lastFill = fills[fills.length - 1];

    // 分离开仓和平仓成交
    const openFills = fills.filter(fill => 
      (fill.side === 'buy' && fill.posSide === 'long') ||
      (fill.side === 'sell' && fill.posSide === 'short')
    );
    
    const closeFills = fills.filter(fill => 
      (fill.side === 'sell' && fill.posSide === 'long') ||
      (fill.side === 'buy' && fill.posSide === 'short')
    );

    // 计算基础信息
    const instrument = this.normalizeInstrument(firstFill.instId);
    const direction = firstFill.posSide === 'long' ? 'LONG' : 'SHORT';
    const status = closeFills.length > 0 ? 'CLOSED' : 'OPEN';

    // 计算开仓均价
    let totalOpenSize = 0;
    let totalOpenValue = 0;
    for (const fill of openFills) {
      const size = parseFloat(fill.fillSz);
      const price = parseFloat(fill.fillPx);
      totalOpenSize += size;
      totalOpenValue += size * price;
    }
    
    const actualEntryPrice = totalOpenSize > 0 ? totalOpenValue / totalOpenSize : 0;

    // 计算平仓均价
    let actualExitPrice: number | undefined;
    if (closeFills.length > 0) {
      let totalCloseSize = 0;
      let totalCloseValue = 0;
      for (const fill of closeFills) {
        const size = parseFloat(fill.fillSz);
        const price = parseFloat(fill.fillPx);
        totalCloseSize += size;
        totalCloseValue += size * price;
      }
      actualExitPrice = totalCloseSize > 0 ? totalCloseValue / totalCloseSize : undefined;
    }

    // 计算时间
    const entryTime = new Date(parseInt(firstFill.ts));
    const exitTime = closeFills.length > 0 ? new Date(parseInt(lastFill.ts)) : undefined;
    const duration = exitTime ? Math.round((exitTime.getTime() - entryTime.getTime()) / (1000 * 60)) : undefined;

    // 计算手续费和PNL
    let totalFees = 0;
    for (const fill of fills) {
      if (fill.fee) {
        totalFees += Math.abs(parseFloat(fill.fee));
      }
    }

    // 计算 PNL（对于成交明细，需要手动计算）
    let totalPnl = 0;
    if (actualExitPrice && actualEntryPrice && totalOpenSize > 0) {
      if (direction === 'LONG') {
        totalPnl = (actualExitPrice - actualEntryPrice) * totalOpenSize;
      } else {
        totalPnl = (actualEntryPrice - actualExitPrice) * totalOpenSize;
      }
    }

    // 计算其他指标
    const positionSize = totalOpenSize;
    const leverage = 1; // 成交明细中没有杠杆信息，设为默认值
    const margin = actualEntryPrice > 0 ? (positionSize * actualEntryPrice) / leverage : 0;
    const netPnl = totalPnl - totalFees;
    const rorPercentage = margin > 0 ? (netPnl / margin) * 100 : 0;

    // 生成交易ID
    const tradeId = this.generateTradeId(instrument, direction, entryTime);

    const processedTrade: ProcessedTradeData = {
      tradeId,
      instrument,
      direction,
      status,
      leverage,
      entryTime,
      exitTime,
      duration,
      actualEntryPrice,
      actualExitPrice,
      positionSize,
      margin,
      pnl: totalPnl,
      rorPercentage,
      fees: totalFees,
      netPnl,
      initialTakeProfit: undefined, // 成交明细中没有止盈止损信息
      initialStopLoss: undefined,
      hitTakeProfit: false,
      hitStopLoss: false,
      okxOrderIds: [...new Set(fills.map(f => f.ordId))], // 去重的订单ID列表
      rawData: fills,
      notes: `从 OKX 成交明细同步的交易记录，包含 ${fills.length} 个成交明细`,
    };

    this.logger.debug(`处理成交明细交易记录: ${tradeId}, PNL: $${totalPnl.toFixed(2)}`);
    
    return processedTrade;
  }

  /**
   * 按交易对和持仓方向分组订单（改进版：基于仓位变化逻辑）
   */
  private groupOrdersByTrade(orders: OkxOrderData[]): Map<string, OkxOrderData[]> {
    const groups = new Map<string, OkxOrderData[]>();

    // 按时间排序
    const sortedOrders = orders
      .filter(order => order.state === 'filled')
      .sort((a, b) => parseInt(a.fillTime) - parseInt(b.fillTime));

    // 按交易对和方向分组
    const instrumentGroups = new Map<string, OkxOrderData[]>();
    
    for (const order of sortedOrders) {
      const instrumentKey = `${order.instId}_${order.posSide}`;
      if (!instrumentGroups.has(instrumentKey)) {
        instrumentGroups.set(instrumentKey, []);
      }
      instrumentGroups.get(instrumentKey)!.push(order);
    }

    // 对每个交易对+方向组合进行智能分组
    for (const [instrumentKey, instrumentOrders] of instrumentGroups.entries()) {
      const tradeGroups = this.smartGroupByPosition(instrumentOrders);
      
      // 将分组结果添加到总结果中
      tradeGroups.forEach((group, index) => {
        const groupKey = `${instrumentKey}_${index}`;
        groups.set(groupKey, group);
      });
    }

    return groups;
  }

  /**
   * 基于仓位逻辑的智能分组
   */
  private smartGroupByPosition(orders: OkxOrderData[]): OkxOrderData[][] {
    const tradeGroups: OkxOrderData[][] = [];
    let currentGroup: OkxOrderData[] = [];
    let currentPosition = 0; // 当前净仓位
    
    this.logger.debug(`开始分组 ${orders.length} 个订单，交易对: ${orders[0]?.instId}, 方向: ${orders[0]?.posSide}`);
    
    for (const order of orders) {
      const orderSize = parseFloat(order.accFillSz);
      const isOpeningOrder = this.isOpeningOrder(order);
      
      this.logger.debug(`订单: ${order.side} ${orderSize}, 开仓: ${isOpeningOrder}, 当前仓位: ${currentPosition}`);
      
      if (isOpeningOrder) {
        // 开仓订单
        if (currentPosition === 0 && currentGroup.length > 0) {
          // 新交易开始，保存之前的交易
          tradeGroups.push([...currentGroup]);
          currentGroup = [];
        }
        currentGroup.push(order);
        currentPosition += orderSize;
      } else {
        // 平仓订单
        if (currentGroup.length > 0) {
          currentGroup.push(order);
          currentPosition -= orderSize;
          
          // 如果仓位接近于0，说明这笔交易完成
          if (Math.abs(currentPosition) < 0.0001) {
            tradeGroups.push([...currentGroup]);
            this.logger.debug(`完成一笔交易，包含 ${currentGroup.length} 个订单`);
            currentGroup = [];
            currentPosition = 0;
          }
        }
      }
    }
    
    // 处理未完成的交易（持仓中）
    if (currentGroup.length > 0) {
      this.logger.debug(`添加未完成交易，包含 ${currentGroup.length} 个订单`);
      tradeGroups.push(currentGroup);
    }
    
    this.logger.debug(`分组完成，总共 ${tradeGroups.length} 笔交易`);
    return tradeGroups;
  }

  /**
   * 判断是否为开仓订单
   */
  private isOpeningOrder(order: OkxOrderData): boolean {
    // 对于永续合约的仓位逻辑：
    // long 方向：buy = 开多仓, sell = 平多仓
    // short 方向：sell = 开空仓, buy = 平空仓
    
    if (order.posSide === 'long') {
      return order.side === 'buy'; // 买入 = 开多仓
    } else if (order.posSide === 'short') {
      return order.side === 'sell'; // 卖出 = 开空仓
    }
    
    return true; // 默认当作开仓
  }

  /**
   * 获取时间窗口（用于分组相近时间的订单）
   */
  private getTimeWindow(timestamp: string): string {
    const date = new Date(parseInt(timestamp));
    // 按天分组，同一天内相同交易对和方向的订单认为是同一笔交易
    // 这样可以避免跨小时的交易被错误分组
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  }

  /**
   * 将订单组转换为交易记录
   */
  private convertToTradeRecord(tradeKey: string, orders: OkxOrderData[]): ProcessedTradeData | null {
    if (orders.length === 0) return null;

    // 按时间排序
    orders.sort((a, b) => parseInt(a.fillTime) - parseInt(b.fillTime));

    const firstOrder = orders[0];
    const lastOrder = orders[orders.length - 1];

    // 分离开仓和平仓订单
    const openOrders = orders.filter(order => 
      (order.side === 'buy' && order.posSide === 'long') ||
      (order.side === 'sell' && order.posSide === 'short')
    );
    
    const closeOrders = orders.filter(order => 
      (order.side === 'sell' && order.posSide === 'long') ||
      (order.side === 'buy' && order.posSide === 'short')
    );

    // 计算基础信息
    const instrument = this.normalizeInstrument(firstOrder.instId);
    const direction = firstOrder.posSide === 'long' ? 'LONG' : 'SHORT';
    const status = closeOrders.length > 0 ? 'CLOSED' : 'OPEN';

    // 计算开仓均价
    let totalOpenSize = 0;
    let totalOpenValue = 0;
    for (const order of openOrders) {
      const size = parseFloat(order.accFillSz);
      const price = parseFloat(order.avgPx);
      totalOpenSize += size;
      totalOpenValue += size * price;
    }
    
    // 计算开仓价格的多种方案
    let actualEntryPrice = 0;
    if (totalOpenSize > 0) {
      // 方案1：有明确的开仓订单
      actualEntryPrice = totalOpenValue / totalOpenSize;
    } else if (orders.length > 0) {
      // 方案2：没有明确开仓订单，尝试从所有订单中推断
      
      // 先尝试使用第一个订单（按时间排序后的最早订单）
      const firstOrderPrice = parseFloat(firstOrder.avgPx);
      const firstOrderSize = parseFloat(firstOrder.accFillSz);
      
      if (firstOrderPrice > 0 && firstOrderSize > 0) {
        actualEntryPrice = firstOrderPrice;
        totalOpenSize = firstOrderSize;
        this.logger.warn(`交易 ${tradeKey} 没有明确的开仓订单，使用第一个订单价格: ${actualEntryPrice}`);
      } else {
        // 方案3：如果第一个订单价格无效，使用所有订单的平均价格
        let totalPrice = 0;
        let validOrders = 0;
        for (const order of orders) {
          const price = parseFloat(order.avgPx);
          if (price > 0) {
            totalPrice += price;
            validOrders++;
          }
        }
        if (validOrders > 0) {
          actualEntryPrice = totalPrice / validOrders;
          totalOpenSize = parseFloat(firstOrder.accFillSz);
          this.logger.warn(`交易 ${tradeKey} 使用所有订单的平均价格作为开仓价格: ${actualEntryPrice}`);
        }
      }
    }

    // 计算平仓均价
    let actualExitPrice: number | undefined;
    if (closeOrders.length > 0) {
      let totalCloseSize = 0;
      let totalCloseValue = 0;
      for (const order of closeOrders) {
        const size = parseFloat(order.accFillSz);
        const price = parseFloat(order.avgPx);
        totalCloseSize += size;
        totalCloseValue += size * price;
      }
      actualExitPrice = totalCloseSize > 0 ? totalCloseValue / totalCloseSize : undefined;
    }

    // 计算时间
    const entryTime = new Date(parseInt(firstOrder.fillTime));
    const exitTime = closeOrders.length > 0 ? new Date(parseInt(lastOrder.fillTime)) : undefined;
    const duration = exitTime ? Math.round((exitTime.getTime() - entryTime.getTime()) / (1000 * 60)) : undefined;

    // 计算 PNL 和手续费
    let totalPnl = 0;
    let totalFees = 0;
    for (const order of orders) {
      if (order.pnl) {
        totalPnl += parseFloat(order.pnl);
      }
      if (order.fee) {
        totalFees += Math.abs(parseFloat(order.fee));
      }
    }

    // 计算其他指标
    const positionSize = totalOpenSize;
    const leverage = parseFloat(firstOrder.lever);
    const margin = actualEntryPrice > 0 ? (positionSize * actualEntryPrice) / leverage : 0;
    const netPnl = totalPnl - totalFees;
    const rorPercentage = margin > 0 ? (netPnl / margin) * 100 : 0;

    // 提取止盈止损信息
    const initialTakeProfit = firstOrder.tpTriggerPx ? parseFloat(firstOrder.tpTriggerPx) : undefined;
    const initialStopLoss = firstOrder.slTriggerPx ? parseFloat(firstOrder.slTriggerPx) : undefined;

    // 生成交易ID
    const tradeId = this.generateTradeId(instrument, direction, entryTime);

    const processedTrade: ProcessedTradeData = {
      tradeId,
      instrument,
      direction,
      status,
      leverage,
      entryTime,
      exitTime,
      duration,
      actualEntryPrice,
      actualExitPrice,
      positionSize,
      margin,
      pnl: totalPnl,
      rorPercentage,
      fees: totalFees,
      netPnl,
      initialTakeProfit,
      initialStopLoss,
      hitTakeProfit: false, // 需要进一步分析确定
      hitStopLoss: false,   // 需要进一步分析确定
      okxOrderIds: orders.map(o => o.ordId),
      rawData: orders,
      notes: `从 OKX 同步的交易记录，包含 ${orders.length} 个订单`,
    };

    this.logger.debug(`处理交易记录: ${tradeId}, PNL: $${totalPnl.toFixed(2)}`);
    
    return processedTrade;
  }

  /**
   * 标准化交易对名称
   */
  private normalizeInstrument(instId: string): string {
    // 将 BTC-USDT-SWAP 转换为 BTC-USDT
    return instId.replace('-SWAP', '').replace('-FUTURES', '');
  }

  /**
   * 生成交易ID
   */
  private generateTradeId(instrument: string, direction: string, entryTime: Date): string {
    const dateStr = entryTime.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = entryTime.toISOString().slice(11, 16).replace(':', '');
    return `${instrument}-${direction}-${dateStr}-${timeStr}`;
  }

  /**
   * 验证交易数据完整性
   */
  validateTradeData(trade: ProcessedTradeData): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!trade.tradeId) {
      errors.push('缺少交易ID');
    }

    if (!trade.instrument) {
      errors.push('缺少交易对');
    }

    if (!['LONG', 'SHORT'].includes(trade.direction)) {
      errors.push('交易方向无效');
    }

    if (!['OPEN', 'CLOSED'].includes(trade.status)) {
      errors.push('交易状态无效');
    }

    if (!trade.entryTime) {
      errors.push('缺少开仓时间');
    }

    if (!trade.actualEntryPrice || trade.actualEntryPrice <= 0) {
      errors.push('开仓价格无效');
      console.log(`调试信息 - 交易 ${trade.tradeId}:`, {
        actualEntryPrice: trade.actualEntryPrice,
        positionSize: trade.positionSize,
        rawOrdersCount: trade.okxOrderIds?.length,
        direction: trade.direction,
        status: trade.status
      });
    }

    if (trade.status === 'CLOSED' && (!trade.actualExitPrice || trade.actualExitPrice <= 0)) {
      errors.push('已完成交易缺少有效的平仓价格');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 将订单方向映射到交易方向
   */
  private mapOrderSideToDirection(side: string, posSide: string): 'LONG' | 'SHORT' {
    // 对于永续合约：
    // - 开多仓：side=buy, posSide=long
    // - 平多仓：side=sell, posSide=long
    // - 开空仓：side=sell, posSide=short  
    // - 平空仓：side=buy, posSide=short
    
    if (posSide === 'long') {
      return 'LONG';
    } else if (posSide === 'short') {
      return 'SHORT';
    }
    
    // 如果没有持仓方向信息，根据买卖方向判断
    return side === 'buy' ? 'LONG' : 'SHORT';
  }
} 