import { Injectable, Logger } from '@nestjs/common';
import { OkxOrderData, ProcessedTradeData } from '../interfaces/okx-trade.interface';

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
   * 按交易对和持仓方向分组订单
   */
  private groupOrdersByTrade(orders: OkxOrderData[]): Map<string, OkxOrderData[]> {
    const groups = new Map<string, OkxOrderData[]>();

    for (const order of orders) {
      // 只处理已成交的订单
      if (order.state !== 'filled') {
        continue;
      }

      // 生成交易组键：交易对 + 持仓方向 + 大致时间窗口
      const timeWindow = this.getTimeWindow(order.fillTime);
      const tradeKey = `${order.instId}_${order.posSide}_${timeWindow}`;

      if (!groups.has(tradeKey)) {
        groups.set(tradeKey, []);
      }
      groups.get(tradeKey)!.push(order);
    }

    return groups;
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
} 