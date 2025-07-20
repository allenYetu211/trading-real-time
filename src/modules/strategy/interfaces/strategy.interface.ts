import { StrategyType, StrategyStatus, OrderSide } from '../enums';
import { SignalType } from '../../../shared/enums';

// 策略配置接口
export interface StrategyConfig {
  id?: number;
  name: string;
  type: StrategyType;
  status: StrategyStatus;
  symbol: string;
  interval: string;
  parameters: Record<string, any>;
  riskManagement: RiskManagementConfig;
  createdAt?: Date;
  updatedAt?: Date;
}

// 风险管理配置
export interface RiskManagementConfig {
  maxPositionSize: number;      // 最大仓位大小（%）
  stopLossPercent: number;      // 止损百分比
  takeProfitPercent: number;    // 止盈百分比
  maxDailyLoss: number;         // 最大日损失
  maxDrawdown: number;          // 最大回撤
  positionSizing: 'FIXED' | 'PERCENTAGE' | 'KELLY'; // 仓位计算方式
}

// 策略信号接口
export interface StrategySignal {
  id?: number;
  strategyId: number;
  symbol: string;
  interval: string;
  signal: SignalType;
  side: OrderSide;
  price: number;
  quantity?: number;
  confidence: number;
  stopLoss?: number;
  takeProfit?: number;
  reason: string;
  timestamp: number;
  executed?: boolean;
  executedAt?: Date;
  createdAt?: Date;
}

// 策略执行结果
export interface StrategyExecutionResult {
  success: boolean;
  signal?: StrategySignal;
  error?: string;
  metadata?: Record<string, any>;
}

// 策略回测结果
export interface BacktestResult {
  strategyId: number;
  symbol: string;
  interval: string;
  startTime: Date;
  endTime: Date;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
  trades: BacktestTrade[];
  summary: string;
}

// 回测交易记录
export interface BacktestTrade {
  entryTime: Date;
  exitTime: Date;
  side: OrderSide;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  pnl: number;
  pnlPercent: number;
  reason: string;
}

// 策略状态监控
export interface StrategyMonitor {
  strategyId: number;
  status: StrategyStatus;
  lastSignalTime?: Date;
  totalSignals: number;
  successfulSignals: number;
  failedSignals: number;
  currentDrawdown: number;
  dailyPnl: number;
  weeklyPnl: number;
  monthlyPnl: number;
  lastError?: string;
  lastUpdateTime: Date;
} 