// OKX API 原始订单数据接口
export interface OkxOrderData {
  instType: string;    // 产品类型
  instId: string;      // 产品ID，如 BTC-USDT-SWAP
  ordId: string;       // 订单ID
  clOrdId: string;     // 客户自定义订单ID
  tag: string;         // 订单标签
  px: string;          // 委托价格
  sz: string;          // 委托数量
  pnl?: string;        // 收益
  ordType: string;     // 订单类型
  side: string;        // 订单方向，buy sell
  posSide: string;     // 持仓方向
  tdMode: string;      // 交易模式
  accFillSz: string;   // 累计成交数量
  fillPx: string;      // 最新成交价格
  tradeId: string;     // 最新成交ID
  fillSz: string;      // 最新成交数量
  fillTime: string;    // 最新成交时间
  state: string;       // 订单状态
  avgPx: string;       // 成交均价
  lever: string;       // 杠杆倍数
  tpTriggerPx?: string; // 止盈触发价
  tpOrdPx?: string;    // 止盈委托价
  slTriggerPx?: string; // 止损触发价
  slOrdPx?: string;    // 止损委托价
  feeCcy: string;      // 手续费币种
  fee: string;         // 手续费
  rebateCcy: string;   // 返佣币种
  rebate: string;      // 返佣金额
  tgtCcy: string;      // 计价币种
  category: string;    // 订单种类
  uTime: string;       // 订单状态更新时间
  cTime: string;       // 订单创建时间
}

// OKX 成交明细接口
export interface OkxFillData {
  instType: string;    // 产品类型
  instId: string;      // 产品ID
  tradeId: string;     // 成交ID
  ordId: string;       // 订单ID
  clOrdId: string;     // 客户自定义订单ID
  billId: string;      // 账单ID
  tag: string;         // 订单标签
  fillPx: string;      // 成交价格
  fillSz: string;      // 成交数量
  side: string;        // 订单方向
  posSide: string;     // 持仓方向
  execType: string;    // 流动性方向
  feeCcy: string;      // 手续费币种
  fee: string;         // 手续费
  ts: string;          // 成交时间
}

// OKX 挂单数据接口
export interface OkxPendingOrderData {
  instType: string;    // 产品类型
  instId: string;      // 产品ID
  ordId: string;       // 订单ID
  clOrdId: string;     // 客户自定义订单ID
  tag: string;         // 订单标签
  px: string;          // 委托价格
  sz: string;          // 委托数量
  ordType: string;     // 订单类型
  side: string;        // 订单方向
  posSide: string;     // 持仓方向
  tdMode: string;      // 交易模式
  accFillSz: string;   // 累计成交数量
  fillPx: string;      // 最新成交价格
  fillSz: string;      // 最新成交数量
  fillTime: string;    // 最新成交时间
  state: string;       // 订单状态 (live, partially_filled)
  avgPx: string;       // 成交均价
  lever: string;       // 杠杆倍数
  tpTriggerPx?: string; // 止盈触发价
  tpOrdPx?: string;    // 止盈委托价
  slTriggerPx?: string; // 止损触发价
  slOrdPx?: string;    // 止损委托价
  feeCcy: string;      // 手续费币种
  fee: string;         // 手续费
  rebateCcy: string;   // 返佣币种
  rebate: string;      // 返佣金额
  tgtCcy: string;      // 计价币种
  category: string;    // 订单种类
  uTime: string;       // 订单状态更新时间
  cTime: string;       // 订单创建时间
  pnl?: string;        // 收益
}

// OKX 持仓数据接口
export interface OkxPositionData {
  instType: string;    // 产品类型
  instId: string;      // 产品ID
  posId: string;       // 持仓ID
  posSide: string;     // 持仓方向
  pos: string;         // 持仓数量
  availPos: string;    // 可用持仓数量
  avgPx: string;       // 开仓均价
  upl: string;         // 未实现收益
  uplRatio: string;    // 未实现收益率
  realizedPnl: string; // 已实现收益
  lever: string;       // 杠杆倍数
  mgnRatio: string;    // 保证金率
  margin: string;      // 保证金余额
  uTime: string;       // 最近一次持仓更新时间
  cTime: string;       // 持仓创建时间
}

// 处理后的交易数据
export interface ProcessedTradeData {
  tradeId: string;
  instrument: string;
  direction: 'LONG' | 'SHORT';
  status: 'OPEN' | 'CLOSED';
  leverage?: number;
  entryTime?: Date;
  exitTime?: Date;
  duration?: number;
  plannedPrice?: number;
  actualEntryPrice?: number;
  actualExitPrice?: number;
  positionSize?: number;
  margin?: number;
  pnl?: number;
  rorPercentage?: number;
  fees?: number;
  netPnl?: number;
  slippage?: number;
  initialTakeProfit?: number;
  initialStopLoss?: number;
  hitTakeProfit?: boolean;
  hitStopLoss?: boolean;
  maxFavorableExcursion?: number;
  maxAdverseExcursion?: number;
  okxOrderIds?: string[];
  rawData?: any;
  notes?: string;
}

// 处理后的挂单数据
export interface ProcessedPendingOrderData {
  orderId: string;
  instrument: string;
  direction: 'LONG' | 'SHORT';
  orderType: string;
  side: string;
  size: number;
  price: number;
  filledSize: number;
  remainingSize: number;
  leverage?: number;
  takeProfit?: number;
  stopLoss?: number;
  createTime: Date;
  updateTime: Date;
  status: 'live' | 'partially_filled';
  fees: number;
  rawData?: OkxPendingOrderData;
}

// OKX API 响应接口
export interface OkxApiResponse<T> {
  code: string;
  msg: string;
  data: T[];
}

// 同步参数接口
export interface SyncParams {
  limit?: number;        // 获取数量，默认20
  instType?: string;     // 产品类型，SWAP永续合约
  after?: string;        // 请求此时间戳之前的数据
  before?: string;       // 请求此时间戳之后的数据
}

// 同步结果接口
export interface SyncResult {
  success: boolean;
  processedCount: number;
  createdCount: number;
  updatedCount: number;
  errors: string[];
  trades: ProcessedTradeData[];
  pendingOrders?: ProcessedPendingOrderData[];
}

// 完整的OKX数据响应
export interface OkxDataResponse {
  orders: OkxOrderData[];
  fills: OkxFillData[];
  pendingOrders: OkxPendingOrderData[];
  positions: OkxPositionData[];
} 