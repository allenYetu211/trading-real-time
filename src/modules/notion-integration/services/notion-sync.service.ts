import { Injectable, Logger } from '@nestjs/common';
import { TradingHistoryService } from 'src/modules/trading-history/trading-history.service';
import { NotionApiService, CreatePageData } from './notion-api.service';

export interface SyncToNotionResult {
  success: boolean;
  syncedCount: number;
  updatedCount: number;
  errors: string[];
  notionPages: Array<{
    tradeId: string;
    pageId: string;
    url: string;
  }>;
}

@Injectable()
export class NotionSyncService {
  private readonly logger = new Logger(NotionSyncService.name);

  constructor(
    private readonly notionApiService: NotionApiService,
    private readonly tradingHistoryService: TradingHistoryService,
  ) {}

  /**
   * 同步未同步的交易记录到 Notion
   */
  async syncUnsyncedTrades(): Promise<SyncToNotionResult> {
    this.logger.log('开始同步未同步的交易记录到 Notion');

    const result: SyncToNotionResult = {
      success: false,
      syncedCount: 0,
      updatedCount: 0,
      errors: [],
      notionPages: [],
    };

    try {
      // 1. 检查 Notion 配置
      if (!this.notionApiService.isConfigured()) {
        result.errors.push('Notion 配置不完整，请检查环境变量');
        return result;
      }

      // 2. 测试 Notion 连接
      const connectionTest = await this.notionApiService.testConnection();
      if (!connectionTest.success) {
        result.errors.push(`Notion 连接失败: ${connectionTest.message}`);
        return result;
      }

      // 3. 获取未同步的交易记录
      const unsyncedTrades = await this.tradingHistoryService.getUnsyncedRecords();
      if (unsyncedTrades.length === 0) {
        this.logger.log('没有需要同步的交易记录');
        result.success = true;
        return result;
      }

      this.logger.log(`找到 ${unsyncedTrades.length} 笔未同步的交易记录`);

      // 4. 逐一同步到 Notion
      for (const trade of unsyncedTrades) {
        try {
          const pageData = this.convertTradeToNotionData(trade);
          
          // 检查是否已存在页面
          const existingPage = await this.notionApiService.queryPageByTradeId(trade.tradeId);
          
          let notionPage;
          if (existingPage) {
            // 更新现有页面
            notionPage = await this.notionApiService.updateTradePage(existingPage.pageId, pageData);
            result.updatedCount++;
            this.logger.debug(`更新 Notion 页面: ${trade.tradeId}`);
          } else {
            // 创建新页面
            notionPage = await this.notionApiService.createTradePage(pageData);
            result.syncedCount++;
            this.logger.debug(`创建 Notion 页面: ${trade.tradeId}`);
          }

          // 标记为已同步
          await this.tradingHistoryService.markAsSynced(trade.id, notionPage.pageId);

          result.notionPages.push({
            tradeId: trade.tradeId,
            pageId: notionPage.pageId,
            url: notionPage.url,
          });

        } catch (error: any) {
          this.logger.error(`同步交易记录 ${trade.tradeId} 到 Notion 失败:`, error);
          result.errors.push(`同步交易 ${trade.tradeId} 失败: ${error.message}`);
        }
      }

      result.success = result.errors.length === 0 || (result.syncedCount + result.updatedCount) > 0;

      this.logger.log(
        `Notion 同步完成: 新建 ${result.syncedCount} 页面，更新 ${result.updatedCount} 页面`
      );

      return result;
    } catch (error: any) {
      this.logger.error('同步到 Notion 失败:', error);
      result.errors.push(error.message);
      return result;
    }
  }

  /**
   * 同步指定的交易记录到 Notion
   */
  async syncSpecificTrades(tradeIds: string[]): Promise<SyncToNotionResult> {
    this.logger.log(`开始同步指定的 ${tradeIds.length} 笔交易记录到 Notion`);

    const result: SyncToNotionResult = {
      success: false,
      syncedCount: 0,
      updatedCount: 0,
      errors: [],
      notionPages: [],
    };

    try {
      // 检查配置和连接
      if (!this.notionApiService.isConfigured()) {
        result.errors.push('Notion 配置不完整');
        return result;
      }

      const connectionTest = await this.notionApiService.testConnection();
      if (!connectionTest.success) {
        result.errors.push(`Notion 连接失败: ${connectionTest.message}`);
        return result;
      }

      // 获取指定的交易记录
      for (const tradeId of tradeIds) {
        try {
          const trade = await this.tradingHistoryService.findByTradeId(tradeId);
          
          const pageData = this.convertTradeToNotionData(trade);
          
          // 检查是否已存在页面
          const existingPage = await this.notionApiService.queryPageByTradeId(trade.tradeId);
          
          let notionPage;
          if (existingPage) {
            notionPage = await this.notionApiService.updateTradePage(existingPage.pageId, pageData);
            result.updatedCount++;
          } else {
            notionPage = await this.notionApiService.createTradePage(pageData);
            result.syncedCount++;
          }

          // 标记为已同步
          await this.tradingHistoryService.markAsSynced(trade.id, notionPage.pageId);

          result.notionPages.push({
            tradeId: trade.tradeId,
            pageId: notionPage.pageId,
            url: notionPage.url,
          });

        } catch (error: any) {
          this.logger.error(`同步交易记录 ${tradeId} 失败:`, error);
          result.errors.push(`同步交易 ${tradeId} 失败: ${error.message}`);
        }
      }

      result.success = result.syncedCount + result.updatedCount > 0;
      return result;

    } catch (error: any) {
      this.logger.error('同步指定交易记录失败:', error);
      result.errors.push(error.message);
      return result;
    }
  }

  /**
   * 检查 Notion 配置和连接状态
   */
  async checkStatus(): Promise<{
    configured: boolean;
    connected: boolean;
    message: string;
  }> {
    const configured = this.notionApiService.isConfigured();
    
    if (!configured) {
      return {
        configured: false,
        connected: false,
        message: 'Notion 配置不完整，请设置环境变量：NOTION_API_TOKEN, NOTION_DATABASE_ID, NOTION_ENABLED'
      };
    }

    try {
      const connectionTest = await this.notionApiService.testConnection();
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
   * 转换交易记录为 Notion 数据格式
   */
  private convertTradeToNotionData(trade: any): CreatePageData {
    return {
      tradeId: trade.tradeId,
      instrument: trade.instrument,
      direction: trade.direction,
      status: trade.status,
      leverage: trade.leverage ? Number(trade.leverage) : undefined,
      entryTime: trade.entryTime,
      exitTime: trade.exitTime,
      duration: trade.duration,
      actualEntryPrice: trade.actualEntryPrice ? Number(trade.actualEntryPrice) : undefined,
      actualExitPrice: trade.actualExitPrice ? Number(trade.actualExitPrice) : undefined,
      positionSize: trade.positionSize ? Number(trade.positionSize) : undefined,
      pnl: trade.pnl ? Number(trade.pnl) : undefined,
      fees: trade.fees ? Number(trade.fees) : undefined,
      netPnl: trade.netPnl ? Number(trade.netPnl) : undefined,
      rorPercentage: trade.rorPercentage ? Number(trade.rorPercentage) : undefined,
      initialTakeProfit: trade.initialTakeProfit ? Number(trade.initialTakeProfit) : undefined,
      initialStopLoss: trade.initialStopLoss ? Number(trade.initialStopLoss) : undefined,
      notes: trade.notes || '从 OKX 同步的交易记录',
    };
  }
} 