import { TradeStatus, TradeDirection } from '../enums';

/**
 * 交易记录实体
 * 对应数据库中的 trading_records 表
 */
export class TradingRecord {
  id: number;
  tradeId: string;
  
  // 基础信息
  instrument: string;
  direction: string;
  status: string;
  leverage: any; // Prisma Decimal 类型
  
  // 时间信息
  entryTime: Date | null;
  exitTime: Date | null;
  duration: number | null;
  
  // 价格信息
  plannedPrice: any | null; // Prisma Decimal 类型
  actualEntryPrice: any | null;
  actualExitPrice: any | null;
  positionSize: any | null;
  margin: any | null;
  
  // 盈亏信息
  pnl: any | null;
  rorPercentage: any | null;
  fees: any | null;
  netPnl: any | null;
  slippage: any | null;
  
  // 风控信息
  initialTakeProfit: any | null;
  initialStopLoss: any | null;
  hitTakeProfit: boolean;
  hitStopLoss: boolean;
  
  // 高级指标
  maxFavorableExcursion: any | null;
  maxAdverseExcursion: any | null;
  
  // 同步状态
  notionSynced: boolean;
  notionPageId: string | null;
  syncedAt: Date | null;
  
  // 元数据
  okxOrderIds: string | null;
  rawData: string | null;
  notes: string | null;
  
  createdAt: Date;
  updatedAt: Date;

  /**
   * 获取交易状态枚举值
   */
  getTradeStatus(): TradeStatus {
    return this.status as TradeStatus;
  }

  /**
   * 获取交易方向枚举值
   */
  getTradeDirection(): TradeDirection {
    return this.direction as TradeDirection;
  }

  /**
   * 检查交易是否已完成
   */
  isCompleted(): boolean {
    return this.status === TradeStatus.CLOSED;
  }

  /**
   * 检查交易是否进行中
   */
  isOpen(): boolean {
    return this.status === TradeStatus.OPEN;
  }

  /**
   * 检查是否已同步到Notion
   */
  isSyncedToNotion(): boolean {
    return this.notionSynced;
  }

  /**
   * 获取持仓时长（小时）
   */
  getDurationInHours(): number | null {
    if (!this.duration) return null;
    return this.duration / 60;
  }

  /**
   * 获取持仓时长（天）
   */
  getDurationInDays(): number | null {
    if (!this.duration) return null;
    return this.duration / (60 * 24);
  }
} 