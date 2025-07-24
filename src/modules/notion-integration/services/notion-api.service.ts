import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@notionhq/client';
import { NotionConfig } from 'src/config/notion.config';

export interface NotionPage {
  pageId: string;
  properties: Record<string, any>;
  url: string;
}

export interface CreatePageData {
  tradeId: string;
  instrument: string;
  direction: 'LONG' | 'SHORT';
  status: 'OPEN' | 'CLOSED';
  leverage?: number;
  entryTime?: string;
  exitTime?: string;
  duration?: number;
  actualEntryPrice?: number;
  actualExitPrice?: number;
  positionSize?: number;
  pnl?: number;
  fees?: number;
  netPnl?: number;
  rorPercentage?: number;
  initialTakeProfit?: number;
  initialStopLoss?: number;
  notes?: string;
}

@Injectable()
export class NotionApiService {
  private readonly logger = new Logger(NotionApiService.name);
  private readonly notion: Client | null = null;
  private readonly config: NotionConfig;

  constructor(private readonly configService: ConfigService) {
    this.config = this.configService.get<NotionConfig>('notion')!;
    
    if (this.isConfigured()) {
      this.notion = new Client({
        auth: this.config.apiToken,
      });
    }
  }

  /**
   * 验证 Notion 配置是否完整
   */
  isConfigured(): boolean {
    return !!(
      this.config.apiToken &&
      this.config.databaseId &&
      this.config.enabled
    );
  }

  /**
   * 测试 Notion 连接
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          message: 'Notion 配置不完整，请检查环境变量'
        };
      }

      if (!this.notion) {
        return {
          success: false,
          message: 'Notion 客户端未初始化'
        };
      }

      // 测试获取数据库信息
      const database = await this.notion.databases.retrieve({
        database_id: this.config.databaseId,
      });

      return {
        success: true,
        message: `成功连接到 Notion 数据库: ${(database as any).title?.[0]?.plain_text || 'Trading Records'}`
      };
    } catch (error: any) {
      this.logger.error('Notion 连接测试失败:', error);
      return {
        success: false,
        message: `连接失败: ${error.message}`
      };
    }
  }

  /**
   * 创建交易记录页面
   */
  async createTradePage(data: CreatePageData): Promise<NotionPage> {
    if (!this.isConfigured() || !this.notion) {
      throw new Error('Notion 未配置或未初始化');
    }

    try {
      const properties = this.buildPageProperties(data);
      
      const response = await this.notion.pages.create({
        parent: { database_id: this.config.databaseId },
        properties,
      });

      this.logger.log(`成功创建 Notion 页面: ${data.tradeId}`);

      return {
        pageId: response.id,
        properties: (response as any).properties,
        url: (response as any).url,
      };
    } catch (error: any) {
      this.logger.error(`创建 Notion 页面失败: ${data.tradeId}`, error);
      throw error;
    }
  }

  /**
   * 更新交易记录页面
   */
  async updateTradePage(pageId: string, data: CreatePageData): Promise<NotionPage> {
    if (!this.isConfigured() || !this.notion) {
      throw new Error('Notion 未配置或未初始化');
    }

    try {
      const properties = this.buildPageProperties(data);
      
      const response = await this.notion.pages.update({
        page_id: pageId,
        properties,
      });

      this.logger.log(`成功更新 Notion 页面: ${data.tradeId}`);

      return {
        pageId: response.id,
        properties: (response as any).properties,
        url: (response as any).url,
      };
    } catch (error: any) {
      this.logger.error(`更新 Notion 页面失败: ${data.tradeId}`, error);
      throw error;
    }
  }

  /**
   * 构建 Notion 页面属性
   */
  private buildPageProperties(data: CreatePageData): Record<string, any> {
    const properties: Record<string, any> = {
      // 标题（必需）- 使用现有的 Trade ID 字段
      'Trade ID': {
        title: [
          {
            text: {
              content: data.tradeId,
            },
          },
        ],
      },
      
      // 基础信息 - 适配现有字段
      '交易对': {
        select: {
          name: data.instrument,
        },
      },
      
      '方向': {
        select: {
          // 适配现有的选项：多头 (Long), 空头 (Short)
          name: data.direction === 'LONG' ? '多头 (Long)' : '空头 (Short)',
        },
      },
      
      '状态': {
        select: {
          // 适配现有的选项：进行中, 已完成
          name: data.status === 'OPEN' ? '进行中' : '已完成',
        },
      },
    };

    // 可选数字字段 - 使用现有字段名
    if (data.leverage) {
      properties['杠杆'] = { number: data.leverage };
    }
    
    if (data.actualEntryPrice) {
      properties['开仓均价'] = { number: data.actualEntryPrice };
    }
    
    if (data.actualExitPrice) {
      properties['平仓均价'] = { number: data.actualExitPrice };
    }
    
    if (data.positionSize) {
      properties['头寸规模'] = { number: data.positionSize };
    }
    
    if (data.pnl !== undefined) {
      properties['PNL'] = { number: data.pnl };
    }
    
    if (data.fees) {
      properties['手续费'] = { number: data.fees };
    }
    
    if (data.netPnl !== undefined) {
      // 使用 rich_text 类型的 净盈亏 字段
      properties['净盈亏'] = {
        rich_text: [
          {
            text: {
              content: data.netPnl.toString(),
            },
          },
        ],
      };
    }
    
    if (data.rorPercentage !== undefined) {
      properties['盈亏率'] = { number: data.rorPercentage };
    }
    
    if (data.duration) {
      // 使用 rich_text 类型的 持仓时长 字段
      properties['持仓时长'] = {
        rich_text: [
          {
            text: {
              content: `${data.duration} 分钟`,
            },
          },
        ],
      };
    }
    
    if (data.initialTakeProfit) {
      properties['止盈位'] = { number: data.initialTakeProfit };
    }
    
    if (data.initialStopLoss) {
      properties['止损位'] = { number: data.initialStopLoss };
    }

    // 时间字段
    if (data.entryTime) {
      properties['开仓时间'] = {
        date: {
          start: data.entryTime,
        },
      };
    }
    
    if (data.exitTime) {
      properties['平仓时间'] = {
        date: {
          start: data.exitTime,
        },
      };
    }

    return properties;
  }

  /**
   * 查询数据库中的页面
   */
  async queryPageByTradeId(tradeId: string): Promise<NotionPage | null> {
    if (!this.isConfigured() || !this.notion) {
      throw new Error('Notion 未配置或未初始化');
    }

    try {
      const response = await this.notion.databases.query({
        database_id: this.config.databaseId,
        filter: {
          property: 'Trade ID',
          title: {
            equals: tradeId,
          },
        },
      });

      if (response.results.length > 0) {
        const page = response.results[0];
        return {
          pageId: page.id,
          properties: (page as any).properties,
          url: (page as any).url,
        };
      }

      return null;
    } catch (error: any) {
      this.logger.error(`查询 Notion 页面失败: ${tradeId}`, error);
      throw error;
    }
  }
} 