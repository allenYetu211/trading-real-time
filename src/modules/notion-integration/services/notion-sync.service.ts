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
   * 智能增量同步：对比数据库和 Notion，只同步差异记录
   */
  async syncUnsyncedTrades(): Promise<SyncToNotionResult> {
    this.logger.log('开始智能增量同步交易记录到 Notion');

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

      // 3. 获取所有数据库交易记录
      const allDbTradesResult = await this.tradingHistoryService.findAll({ limit: 1000 }); // 最多获取1000条
      const allDbTrades = allDbTradesResult.data;
      if (allDbTrades.length === 0) {
        this.logger.log('数据库中没有交易记录');
        result.success = true;
        return result;
      }

      this.logger.log(`数据库中找到 ${allDbTrades.length} 笔交易记录`);

      // 4. 获取 Notion 中现有的交易记录
      const existingNotionTrades = await this.getAllNotionTrades();
      this.logger.log(`Notion 中找到 ${existingNotionTrades.length} 笔交易记录`);

      // 5. 对比差异，找出需要同步的记录
      const tradesToSync = allDbTrades.filter(dbTrade => 
        !existingNotionTrades.includes(dbTrade.tradeId)
      );

      if (tradesToSync.length === 0) {
        this.logger.log('所有交易记录都已同步到 Notion');
        result.success = true;
        return result;
      }

      this.logger.log(`需要同步 ${tradesToSync.length} 笔新交易记录到 Notion`);

      // 6. 批量同步差异记录
      for (const trade of tradesToSync) {
        try {
          const pageData = this.convertTradeToNotionData(trade);
          
          // 创建新页面（因为已确认不存在）
          const notionPage = await this.notionApiService.createTradePage(pageData);
          result.syncedCount++;
          this.logger.debug(`创建 Notion 页面: ${trade.tradeId}`);

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

      result.success = result.errors.length === 0 || result.syncedCount > 0;

      this.logger.log(
        `增量同步完成: 新建 ${result.syncedCount} 页面，跳过 ${existingNotionTrades.length} 个已存在记录`
      );

      return result;
    } catch (error: any) {
      this.logger.error('增量同步到 Notion 失败:', error);
      result.errors.push(error.message);
      return result;
    }
  }

  /**
   * 获取 Notion 中所有现有的交易ID
   */
  private async getAllNotionTrades(): Promise<string[]> {
    const tradeIds: string[] = [];
    
    try {
      const notion = (this.notionApiService as any).notion;
      if (!notion) {
        throw new Error('Notion 客户端未初始化');
      }

      const config = (this.notionApiService as any).config;
      let cursor: string | undefined;
      let hasMore = true;

      // 分页获取所有记录
      while (hasMore) {
        const response = await notion.databases.query({
          database_id: config.databaseId,
          start_cursor: cursor,
          page_size: 100, // 每页最多100条
        });

        for (const page of response.results) {
          const properties = (page as any).properties;
          const tradeIdProperty = properties['Trade ID'];
          
          if (tradeIdProperty && tradeIdProperty.title && tradeIdProperty.title[0]) {
            const tradeId = tradeIdProperty.title[0].text.content;
            tradeIds.push(tradeId);
          }
        }

        hasMore = response.has_more;
        cursor = response.next_cursor || undefined;
      }

      this.logger.debug(`从 Notion 获取到 ${tradeIds.length} 个交易ID`);
      return tradeIds;

    } catch (error: any) {
      this.logger.error('获取 Notion 交易记录失败:', error);
      return []; // 返回空数组，会导致全量同步
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