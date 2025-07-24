import { Controller, Get, Post, Query, Body } from '@nestjs/common';
import { OkxSyncService } from './services/okx-sync.service';
import { OkxApiService } from './services/okx-api.service';
import { SyncParams } from './interfaces/okx-trade.interface';

@Controller('okx')
export class OkxIntegrationController {
  constructor(
    private readonly okxSyncService: OkxSyncService,
    private readonly okxApiService: OkxApiService,
  ) {}

  /**
   * 测试OKX API连接状态
   */
  @Get('status')
  async getStatus() {
    return this.okxSyncService.checkStatus();
  }

  /**
   * 同步历史交易记录（使用成交明细）
   */
  @Post('sync/history')
  async syncHistory(@Body() params: SyncParams = {}) {
    return this.okxSyncService.syncHistoryTrades(params);
  }

  /**
   * 同步已完成的交易记录（简化版本）
   */
  @Post('sync/completed-trades')
  async syncCompletedTrades(@Body() params: SyncParams = {}) {
    return this.okxSyncService.syncCompletedTrades(params);
  }

  /**
   * 获取当前挂单信息
   */
  @Get('pending-orders')
  async getPendingOrders(@Query() params: SyncParams) {
    return this.okxSyncService.syncPendingOrders(params);
  }

  /**
   * 获取完整的OKX状态（交易记录 + 挂单 + 持仓）
   */
  @Get('complete-status')
  async getCompleteStatus(@Query() params: SyncParams) {
    return this.okxSyncService.getCompleteStatus(params);
  }

  /**
   * 快速同步最近交易
   */
  @Post('sync/quick')
  async quickSync(@Body() body: { limit?: number } = {}) {
    return this.okxSyncService.quickSync(body.limit || 20);
  }

  /**
   * 获取同步统计信息
   */
  @Get('sync/stats')
  async getSyncStats() {
    return this.okxSyncService.getSyncStats();
  }

  /**
   * 获取原始OKX数据（用于调试）
   */
  @Get('raw-data')
  async getRawData(@Query() params: SyncParams) {
    if (!this.okxApiService.isConfigured()) {
      return { error: 'OKX API 配置不完整' };
    }

    try {
      const data = await this.okxApiService.getCompleteOkxData(params);
      return {
        success: true,
        data: {
          ordersCount: data.orders.length,
          fillsCount: data.fills.length,
          pendingOrdersCount: data.pendingOrders.length,
          positionsCount: data.positions.length,
          orders: data.orders.slice(0, 5), // 只返回前5条，避免数据太大
          fills: data.fills.slice(0, 5),
          pendingOrders: data.pendingOrders,
          positions: data.positions,
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
} 