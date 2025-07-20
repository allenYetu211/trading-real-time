import { SignalType, StrategyType } from '../enums';

export interface StrategySignal {
  symbol: string;
  interval: string;
  strategyType: StrategyType;
  signalType: SignalType;
  price: number;
  confidence: number;
  recommendation: string;
  keyLevels?: {
    upper?: number;
    lower?: number;
    stopLoss?: number;
    takeProfit?: number;
  };
  timestamp: number;
  note?: string;
}

export interface StrategyConfig {
  strategyType: StrategyType;
  enabled: boolean;
  parameters: Record<string, any>;
  priority: number;
}

export interface TradingSignal {
  symbol: string;
  interval: string;
  detectedPattern: string;
  recommendation: string;
  keyLevels: {
    upper?: number;
    lower?: number;
    stopLoss?: number;
    takeProfit?: number;
  };
  confidence: number;
  note?: string;
  timestamp: number;
} 