/**
 * 交易自动化相关接口定义
 */

export interface TradingZone {
  price: number;
  tolerance: number;
  confidence: number;
}

export interface TriggerEvent {
  symbol: string;
  triggerType: 'BUY' | 'SELL';
  currentPrice: number;
  targetPrice: number;
  tolerance: number;
  confidence: number;
  timestamp: number;
}

export interface AnalysisStatus {
  isRunning: boolean;
  lastExecutionTime?: number;
}

export interface PriceMonitorStatus {
  isConnected: boolean;
  monitoredSymbolsCount: number;
  reconnectAttempts: number;
}

export interface TriggerStatistics {
  totalTriggers: number;
  activeCooldowns: number;
  triggeredZonesCount: number;
}

export interface NotificationStatus {
  enabled: boolean;
  botInitialized: boolean;
  chatId: number;
}

export interface SystemStatus {
  analysis: AnalysisStatus;
  priceMonitor: PriceMonitorStatus;
  triggerDetection: TriggerStatistics;
  notification: NotificationStatus;
  timestamp: number;
}

export interface TriggerTestResult {
  buyTriggered: boolean;
  sellTriggered: boolean;
  notifications: TriggerEvent[];
  testPrice: number;
  timestamp: number;
}