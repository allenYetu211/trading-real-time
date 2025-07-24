import { Injectable, Logger } from '@nestjs/common';
import { TradingHistoryService } from 'src/modules/trading-history/trading-history.service';
import { TradeDirection, TradeStatus } from 'src/modules/trading-history/enums';
import { OkxApiService } from './okx-api.service';
import { TradeProcessorService } from './trade-processor.service';
import { PendingOrderProcessorService } from './pending-order-processor.service';
import { 
  SyncParams, 
  SyncResult, 
  ProcessedTradeData,
  ProcessedPendingOrderData,
  OkxDataResponse
} from '../interfaces/okx-trade.interface';

@Injectable()
export class OkxSyncService {
  private readonly logger = new Logger(OkxSyncService.name);

  constructor(
    private readonly okxApiService: OkxApiService,
    private readonly tradeProcessorService: TradeProcessorService,
    private readonly pendingOrderProcessorService: PendingOrderProcessorService,
    private readonly tradingHistoryService: TradingHistoryService,
  ) {}

  /**
   * 同步 OKX 历史交易记录（优先使用成交明细）
   */
  async syncHistoryTrades(params: SyncParams = {}): Promise<SyncResult> {
    this.logger.log(`开始同步 OKX 历史交易记录，参数: ${JSON.stringify(params)}`);

    const result: SyncResult = {
      success: false,
      processedCount: 0,
      createdCount: 0,
      updatedCount: 0,
      errors: [],
      trades: [],
    };

    try {
      // 1. 检查 API 配置
      if (!this.okxApiService.isConfigured()) {
        result.errors.push('OKX API 配置不完整，请检查环境变量');
        return result;
      }

      // 2. 测试 API 连接
      const connectionTest = await this.okxApiService.testConnection();
      if (!connectionTest.success) {
        result.errors.push(`API 连接失败: ${connectionTest.message}`);
        return result;
      }

      // 3. 优先使用成交明细（fills）而不是订单数据，这样更准确
      this.logger.log('尝试获取成交明细（fills）数据...');
      let fills;
      try {
        fills = await this.okxApiService.getTradeHistory(params);
        this.logger.log(`成功获取 ${fills.length} 笔成交明细`);
      } catch (error) {
        this.logger.warn('获取成交明细失败，尝试获取历史成交明细:', error.message);
        fills = await this.okxApiService.getTradeHistoryArchive(params);
        this.logger.log(`从历史档案获取 ${fills.length} 笔成交明细`);
      }

      if (fills.length === 0) {
        this.logger.log('未获取到新的成交数据');
        result.success = true;
        return result;
      }

      // 4. 处理成交明细数据（这比处理订单数据更准确）
      const processedTrades = await this.tradeProcessorService.processFillData(fills);
      result.processedCount = processedTrades.length;
      result.trades = processedTrades;

      // 5. 保存到数据库
      const saveResults = await this.saveTradesToDatabase(processedTrades);
      result.createdCount = saveResults.created;
      result.updatedCount = saveResults.updated;
      result.errors.push(...saveResults.errors);

      result.success = result.errors.length === 0;

      this.logger.log(
        `同步完成: 处理 ${result.processedCount} 笔交易，创建 ${result.createdCount} 笔，更新 ${result.updatedCount} 笔`
      );

      return result;
    } catch (error: any) {
      this.logger.error('同步 OKX 历史交易记录失败:', error);
      result.errors.push(error.message);
      return result;
    }
  }

  /**
   * 同步当前挂单信息
   */
  async syncPendingOrders(params: SyncParams = {}): Promise<{
    success: boolean;
    orders: ProcessedPendingOrderData[];
    errors: string[];
  }> {
    this.logger.log(`开始同步 OKX 当前挂单，参数: ${JSON.stringify(params)}`);

    const result = {
      success: false,
      orders: [] as ProcessedPendingOrderData[],
      errors: [] as string[],
    };

    try {
      // 1. 检查 API 配置
      if (!this.okxApiService.isConfigured()) {
        result.errors.push('OKX API 配置不完整，请检查环境变量');
        return result;
      }

      // 2. 获取当前挂单数据
      const pendingOrders = await this.okxApiService.getPendingOrders(params);
      if (pendingOrders.length === 0) {
        this.logger.log('当前没有挂单');
        result.success = true;
        return result;
      }

      // 3. 处理挂单数据
      const processedOrders = await this.pendingOrderProcessorService.processPendingOrders(pendingOrders);
      
      // 4. 验证数据
      const validOrders = [];
      for (const order of processedOrders) {
        const validation = this.pendingOrderProcessorService.validatePendingOrderData(order);
        if (validation.valid) {
          validOrders.push(order);
        } else {
          this.logger.warn(`跳过无效挂单 ${order.orderId}: ${validation.errors.join(', ')}`);
          result.errors.push(`跳过挂单 ${order.orderId}: ${validation.errors.join(', ')}`);
        }
      }

      result.orders = validOrders;
      result.success = true;

      // 5. 输出统计信息
      const stats = this.pendingOrderProcessorService.getOrderStatistics(validOrders);
      this.logger.log(`挂单同步完成: 总计 ${stats.totalOrders} 笔，活跃 ${stats.liveOrders} 笔，部分成交 ${stats.partiallyFilledOrders} 笔`);
      this.logger.log(`涉及交易对: ${stats.instruments.join(', ')}`);

      return result;
    } catch (error: any) {
      this.logger.error('同步 OKX 当前挂单失败:', error);
      result.errors.push(error.message);
      return result;
    }
  }

  /**
   * 获取完整的OKX状态（包括历史交易、挂单、持仓）
   */
  async getCompleteStatus(params: SyncParams = {}): Promise<{
    success: boolean;
    trades: ProcessedTradeData[];
    pendingOrders: ProcessedPendingOrderData[];
    positions: any[];
    errors: string[];
  }> {
    this.logger.log('开始获取完整的OKX状态');

    const result = {
      success: false,
      trades: [] as ProcessedTradeData[],
      pendingOrders: [] as ProcessedPendingOrderData[],
      positions: [] as any[],
      errors: [] as string[],
    };

    try {
      // 1. 检查 API 配置
      if (!this.okxApiService.isConfigured()) {
        result.errors.push('OKX API 配置不完整，请检查环境变量');
        return result;
      }

      // 2. 获取完整数据
      const okxData = await this.okxApiService.getCompleteOkxData(params);

      // 3. 处理成交明细
      if (okxData.fills.length > 0) {
        try {
          result.trades = await this.tradeProcessorService.processFillData(okxData.fills);
        } catch (error) {
          this.logger.error('处理成交明细失败:', error);
          result.errors.push(`处理成交明细失败: ${error.message}`);
        }
      }

      // 4. 处理挂单
      if (okxData.pendingOrders.length > 0) {
        try {
          result.pendingOrders = await this.pendingOrderProcessorService.processPendingOrders(okxData.pendingOrders);
        } catch (error) {
          this.logger.error('处理挂单失败:', error);
          result.errors.push(`处理挂单失败: ${error.message}`);
        }
      }

      // 5. 处理持仓（简单返回原始数据）
      result.positions = okxData.positions;

      result.success = result.errors.length === 0;

      this.logger.log(`完整状态获取完成: 交易 ${result.trades.length} 笔，挂单 ${result.pendingOrders.length} 笔，持仓 ${result.positions.length} 个`);

      return result;
    } catch (error: any) {
      this.logger.error('获取完整OKX状态失败:', error);
      result.errors.push(error.message);
      return result;
    }
  }

  /**
   * 快速同步最近的交易记录
   */
  async quickSync(limit: number = 20): Promise<SyncResult> {
    return this.syncHistoryTrades({ limit });
  }

  /**
   * 检查 OKX 配置和连接状态
   */
  async checkStatus(): Promise<{
    configured: boolean;
    connected: boolean;
    message: string;
  }> {
    const configured = this.okxApiService.isConfigured();
    
    if (!configured) {
      return {
        configured: false,
        connected: false,
        message: 'OKX API 配置不完整，请设置环境变量：OKX_API_KEY, OKX_SECRET_KEY, OKX_PASSPHRASE'
      };
    }

    try {
      const connectionTest = await this.okxApiService.testConnection();
      return {
        configured: true,
        connected: connectionTest.success,
        message: connectionTest.message
      };
    } catch (error: any) {
      return {
        configured: true,
        connected: false,
        message: `连接测试失败: ${error.message}`
      };
    }
  }

  /**
   * 保存交易记录到数据库
   */
  private async saveTradesToDatabase(trades: ProcessedTradeData[]): Promise<{
    created: number;
    updated: number;
    errors: string[];
  }> {
    let created = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const trade of trades) {
      try {
        // 验证数据完整性
        const validation = this.tradeProcessorService.validateTradeData(trade);
        if (!validation.valid) {
          this.logger.warn(`跳过无效交易 ${trade.tradeId}: ${validation.errors.join(', ')}`);
          errors.push(`跳过交易 ${trade.tradeId}: ${validation.errors.join(', ')}`);
          continue;
        }

        // 检查是否已存在
        let existingTrade;
        try {
          existingTrade = await this.tradingHistoryService.findByTradeId(trade.tradeId);
        } catch (error) {
          // 如果记录不存在，findByTradeId 会抛出异常，这是正常情况
          existingTrade = null;
        }

        if (existingTrade) {
          // 更新现有记录
          await this.tradingHistoryService.update(existingTrade.id, {
            ...trade,
            direction: trade.direction as TradeDirection,
            status: trade.status as TradeStatus,
            entryTime: trade.entryTime?.toISOString(),
            exitTime: trade.exitTime?.toISOString(),
            okxOrderIds: trade.okxOrderIds ? JSON.stringify(trade.okxOrderIds) : undefined,
            rawData: trade.rawData ? JSON.stringify(trade.rawData) : undefined,
            notes: `${existingTrade.notes || ''}\n${trade.notes}`.trim(),
          });
          updated++;
          this.logger.debug(`更新交易记录: ${trade.tradeId}`);
        } else {
          // 创建新记录
          await this.tradingHistoryService.create({
            ...trade,
            direction: trade.direction as TradeDirection,
            status: trade.status as TradeStatus,
            entryTime: trade.entryTime?.toISOString(),
            exitTime: trade.exitTime?.toISOString(),
            okxOrderIds: trade.okxOrderIds ? JSON.stringify(trade.okxOrderIds) : undefined,
            rawData: trade.rawData ? JSON.stringify(trade.rawData) : undefined,
          });
          created++;
          this.logger.debug(`创建交易记录: ${trade.tradeId}`);
        }
      } catch (error: any) {
        this.logger.error(`保存交易记录 ${trade.tradeId} 失败:`, error);
        errors.push(`保存交易 ${trade.tradeId} 失败: ${error.message}`);
      }
    }

    return { created, updated, errors };
  }

  /**
   * 获取同步统计信息
   */
  async getSyncStats(): Promise<{
    totalSynced: number;
    lastSyncTime: Date | null;
    okxLinkedTrades: number;
    pendingOrdersCount: number;
  }> {
    try {
      // 查询包含 OKX 订单ID 的交易记录
      const result = await this.tradingHistoryService.findAll({
        page: 1,
        limit: 1000, // 获取足够多的记录进行统计
      });

      const okxLinkedTrades = result.data.filter(trade => 
        trade.okxOrderIds && JSON.parse(trade.okxOrderIds as any).length > 0
      ).length;

      // 获取最近的同步时间（从 notes 中推断）
      const recentOkxTrades = result.data
        .filter(trade => trade.notes && trade.notes.includes('从 OKX 同步'))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const lastSyncTime = recentOkxTrades.length > 0 ? 
        new Date(recentOkxTrades[0].createdAt) : null;

      // 获取当前挂单数量
      let pendingOrdersCount = 0;
      try {
        const pendingOrdersResult = await this.syncPendingOrders({ limit: 100 });
        pendingOrdersCount = pendingOrdersResult.orders.length;
      } catch (error) {
        this.logger.warn('获取挂单数量失败:', error);
      }

      return {
        totalSynced: result.pagination.total,
        lastSyncTime,
        okxLinkedTrades,
        pendingOrdersCount,
      };
    } catch (error: any) {
      this.logger.error('获取同步统计失败:', error);
      return {
        totalSynced: 0,
        lastSyncTime: null,
        okxLinkedTrades: 0,
        pendingOrdersCount: 0,
      };
    }
  }

  /**
   * 简化的同步方法：直接获取已完成的交易记录
   */
  async syncCompletedTrades(params: SyncParams = {}): Promise<SyncResult> {
    this.logger.log('🔄 开始同步已完成的交易记录（简化模式）...');

    const errors: string[] = [];
    const processedTrades: ProcessedTradeData[] = [];

    try {
      // 检查配置和连接
      const status = await this.checkStatus();
      if (!status.configured || !status.connected) {
        throw new Error(`OKX 连接失败: ${status.message}`);
      }

      // 获取已完成的交易记录
      const result = await this.okxApiService.getCompletedTrades(params);
      if (!result.success) {
        throw new Error(result.message);
      }

      this.logger.log(`📦 获取到 ${result.data.length} 条已完成订单`);

      // 处理交易数据（简化模式）
      const trades = await this.tradeProcessorService.processCompletedOrders(result.data);
      
      if (trades.length === 0) {
        return {
          success: true,
          processedCount: 0,
          createdCount: 0,
          updatedCount: 0,
          errors: [],
          trades: [],
        };
      }

      // 保存到数据库
      let createdCount = 0;
      let updatedCount = 0;

      for (const trade of trades) {
        try {
          // 检查是否已存在
          let existing = null;
          try {
            existing = await this.tradingHistoryService.findByTradeId(trade.tradeId);
          } catch (error) {
            // 记录不存在，这是正常情况，继续创建新记录
            existing = null;
          }
          
          if (existing) {
            // 更新现有记录
            await this.tradingHistoryService.update(existing.id, {
              instrument: trade.instrument,
              direction: trade.direction as any,
              status: trade.status as any,
              actualEntryPrice: trade.actualEntryPrice,
              actualExitPrice: trade.actualExitPrice,
              positionSize: trade.positionSize,
              pnl: trade.pnl,
              fees: trade.fees,
              leverage: trade.leverage,
              entryTime: trade.entryTime?.toISOString(),
              exitTime: trade.exitTime?.toISOString(),
              rawData: JSON.stringify(trade.rawData),
              okxOrderIds: JSON.stringify(trade.okxOrderIds),
            });
            updatedCount++;
          } else {
            // 创建新记录
            await this.tradingHistoryService.create({
              tradeId: trade.tradeId,
              instrument: trade.instrument,
              direction: trade.direction as any,
              status: trade.status as any,
              actualEntryPrice: trade.actualEntryPrice,
              actualExitPrice: trade.actualExitPrice,
              positionSize: trade.positionSize,
              pnl: trade.pnl,
              fees: trade.fees,
              leverage: trade.leverage,
              entryTime: trade.entryTime?.toISOString(),
              exitTime: trade.exitTime?.toISOString(),
              rawData: JSON.stringify(trade.rawData),
              okxOrderIds: JSON.stringify(trade.okxOrderIds),
            });
            createdCount++;
          }
          processedTrades.push(trade);
        } catch (error) {
          const errorMsg = `保存交易记录 ${trade.tradeId} 失败: ${error.message}`;
          this.logger.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      const processedCount = createdCount + updatedCount;
      this.logger.log(`✅ 同步完成: 新增 ${createdCount}，更新 ${updatedCount}，错误 ${errors.length}`);

      return {
        success: true,
        processedCount,
        createdCount,
        updatedCount,
        errors,
        trades: processedTrades,
      };

    } catch (error) {
      this.logger.error('❌ 同步已完成交易记录失败:', error);
      return {
        success: false,
        processedCount: 0,
        createdCount: 0,
        updatedCount: 0,
        errors: [error.message],
        trades: [],
      };
    }
  }
} 