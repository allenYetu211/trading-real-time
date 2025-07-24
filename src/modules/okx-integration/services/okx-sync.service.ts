import { Injectable, Logger } from '@nestjs/common';
import { TradingHistoryService } from 'src/modules/trading-history/trading-history.service';
import { TradeDirection, TradeStatus } from 'src/modules/trading-history/enums';
import { OkxApiService } from './okx-api.service';
import { TradeProcessorService } from './trade-processor.service';
import { SyncParams, SyncResult, ProcessedTradeData } from '../interfaces/okx-trade.interface';

@Injectable()
export class OkxSyncService {
  private readonly logger = new Logger(OkxSyncService.name);

  constructor(
    private readonly okxApiService: OkxApiService,
    private readonly tradeProcessorService: TradeProcessorService,
    private readonly tradingHistoryService: TradingHistoryService,
  ) {}

  /**
   * 同步 OKX 历史交易记录
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

      // 3. 获取历史订单数据
      const orders = await this.okxApiService.getOrderHistory(params);
      if (orders.length === 0) {
        this.logger.log('未获取到新的历史订单数据');
        result.success = true;
        return result;
      }

      // 4. 处理订单数据
      const processedTrades = await this.tradeProcessorService.processOrders(orders);
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

      return {
        totalSynced: result.pagination.total,
        lastSyncTime,
        okxLinkedTrades,
      };
    } catch (error: any) {
      this.logger.error('获取同步统计失败:', error);
      return {
        totalSynced: 0,
        lastSyncTime: null,
        okxLinkedTrades: 0,
      };
    }
  }
} 