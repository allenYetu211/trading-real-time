import { Injectable, Logger } from '@nestjs/common';
import { OkxPendingOrderData, ProcessedPendingOrderData } from '../interfaces/okx-trade.interface';

@Injectable()
export class PendingOrderProcessorService {
  private readonly logger = new Logger(PendingOrderProcessorService.name);

  /**
   * 处理 OKX 挂单数据，转换为系统格式
   */
  async processPendingOrders(orders: OkxPendingOrderData[]): Promise<ProcessedPendingOrderData[]> {
    this.logger.log(`开始处理 ${orders.length} 笔 OKX 挂单数据`);

    const processedOrders: ProcessedPendingOrderData[] = [];
    
    for (const order of orders) {
      try {
        const processedOrder = this.convertToProcessedOrder(order);
        if (processedOrder) {
          processedOrders.push(processedOrder);
        }
      } catch (error) {
        this.logger.error(`处理挂单 ${order.ordId} 失败:`, error);
      }
    }

    this.logger.log(`成功处理 ${processedOrders.length} 笔挂单记录`);
    return processedOrders;
  }

  /**
   * 将 OKX 挂单数据转换为处理后的格式
   */
  private convertToProcessedOrder(order: OkxPendingOrderData): ProcessedPendingOrderData | null {
    if (!order.ordId) return null;

    const instrument = this.normalizeInstrument(order.instId);
    const direction = order.posSide === 'long' ? 'LONG' : 'SHORT';
    const size = parseFloat(order.sz);
    const price = parseFloat(order.px);
    const filledSize = parseFloat(order.accFillSz || '0');
    const remainingSize = size - filledSize;
    const leverage = parseFloat(order.lever || '1');
    const fees = Math.abs(parseFloat(order.fee || '0'));
    
    // 提取止盈止损信息
    const takeProfit = order.tpTriggerPx ? parseFloat(order.tpTriggerPx) : undefined;
    const stopLoss = order.slTriggerPx ? parseFloat(order.slTriggerPx) : undefined;

    // 处理时间
    const createTime = new Date(parseInt(order.cTime));
    const updateTime = new Date(parseInt(order.uTime));

    // 处理状态
    let status: 'live' | 'partially_filled' = 'live';
    if (filledSize > 0 && filledSize < size) {
      status = 'partially_filled';
    }

    const processedOrder: ProcessedPendingOrderData = {
      orderId: order.ordId,
      instrument,
      direction,
      orderType: order.ordType,
      side: order.side,
      size,
      price,
      filledSize,
      remainingSize,
      leverage,
      takeProfit,
      stopLoss,
      createTime,
      updateTime,
      status,
      fees,
      rawData: order,
    };

    this.logger.debug(`处理挂单: ${order.ordId}, 类型: ${order.ordType}, 剩余: ${remainingSize.toFixed(4)}`);
    
    return processedOrder;
  }

  /**
   * 标准化交易对名称
   */
  private normalizeInstrument(instId: string): string {
    // 将 BTC-USDT-SWAP 转换为 BTC-USDT
    return instId.replace('-SWAP', '').replace('-FUTURES', '');
  }

  /**
   * 验证挂单数据完整性
   */
  validatePendingOrderData(order: ProcessedPendingOrderData): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!order.orderId) {
      errors.push('缺少订单ID');
    }

    if (!order.instrument) {
      errors.push('缺少交易对');
    }

    if (!['LONG', 'SHORT'].includes(order.direction)) {
      errors.push('交易方向无效');
    }

    if (!order.createTime) {
      errors.push('缺少创建时间');
    }

    if (!order.price || order.price <= 0) {
      errors.push('委托价格无效');
    }

    if (!order.size || order.size <= 0) {
      errors.push('委托数量无效');
    }

    if (order.remainingSize < 0) {
      errors.push('剩余数量不能为负数');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 获取挂单统计信息
   */
  getOrderStatistics(orders: ProcessedPendingOrderData[]): {
    totalOrders: number;
    liveOrders: number;
    partiallyFilledOrders: number;
    totalValue: number;
    instruments: string[];
  } {
    const liveOrders = orders.filter(o => o.status === 'live').length;
    const partiallyFilledOrders = orders.filter(o => o.status === 'partially_filled').length;
    const totalValue = orders.reduce((sum, order) => sum + (order.remainingSize * order.price), 0);
    const instruments = [...new Set(orders.map(o => o.instrument))];

    return {
      totalOrders: orders.length,
      liveOrders,
      partiallyFilledOrders,
      totalValue,
      instruments,
    };
  }
} 