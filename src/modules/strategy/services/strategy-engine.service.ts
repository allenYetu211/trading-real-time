import { Injectable, Logger } from '@nestjs/common';
import { AnalysisService } from '../../analysis/analysis.service';
import { StrategyConfigService } from './strategy-config.service';
import { StrategySignalService } from './strategy-signal.service';
import { 
  StrategyConfig, 
  StrategyExecutionResult, 
  StrategySignal,
  RiskManagementConfig 
} from '../interfaces/strategy.interface';
import { StrategyType, StrategyStatus, OrderSide } from '../enums';
import { SignalType } from '../../../shared/enums';

@Injectable()
export class StrategyEngineService {
  private readonly logger = new Logger(StrategyEngineService.name);
  private readonly runningStrategies = new Map<number, NodeJS.Timeout>();

  constructor(
    private readonly analysisService: AnalysisService,
    private readonly strategyConfigService: StrategyConfigService,
    private readonly strategySignalService: StrategySignalService,
  ) {}

  /**
   * 启动策略引擎
   */
  async startEngine(): Promise<void> {
    this.logger.log('启动策略引擎');
    
    const activeStrategies = await this.strategyConfigService.getActiveStrategies();
    
    for (const strategy of activeStrategies) {
      await this.startStrategy(strategy.id);
    }
    
    this.logger.log(`策略引擎已启动，运行中策略: ${activeStrategies.length}`);
  }

  /**
   * 停止策略引擎
   */
  async stopEngine(): Promise<void> {
    this.logger.log('停止策略引擎');
    
    for (const [strategyId, timer] of this.runningStrategies) {
      clearInterval(timer);
      this.runningStrategies.delete(strategyId);
    }
    
    this.logger.log('策略引擎已停止');
  }

  /**
   * 启动单个策略
   */
  async startStrategy(strategyId: number): Promise<void> {
    const strategy = await this.strategyConfigService.getStrategy(strategyId);
    
    if (strategy.status !== StrategyStatus.ACTIVE) {
      this.logger.warn(`策略未激活，无法启动: ${strategyId}`);
      return;
    }

    // 停止已运行的策略
    if (this.runningStrategies.has(strategyId)) {
      clearInterval(this.runningStrategies.get(strategyId));
    }

    // 启动策略执行循环
    const interval = this.getExecutionInterval(strategy.interval);
    const timer = setInterval(async () => {
      try {
        await this.executeStrategy(strategy);
      } catch (error) {
        this.logger.error(`策略执行出错: ${strategyId}`, error);
      }
    }, interval);

    this.runningStrategies.set(strategyId, timer);
    this.logger.log(`策略已启动: ${strategyId} - ${strategy.name}`);
  }

  /**
   * 停止单个策略
   */
  async stopStrategy(strategyId: number): Promise<void> {
    if (this.runningStrategies.has(strategyId)) {
      clearInterval(this.runningStrategies.get(strategyId));
      this.runningStrategies.delete(strategyId);
      this.logger.log(`策略已停止: ${strategyId}`);
    }
  }

  /**
   * 执行策略
   */
  async executeStrategy(strategy: StrategyConfig): Promise<StrategyExecutionResult> {
    try {
      this.logger.debug(`执行策略: ${strategy.id} - ${strategy.name}`);

      // 获取最新的技术分析结果
      const analysisResult = await this.analysisService.performComprehensiveAnalysis(
        strategy.symbol,
        strategy.interval as any, // 类型转换
        50, // 默认分析50根K线
      );

      // 根据策略类型执行不同的逻辑
      const signal = await this.generateSignal(strategy, analysisResult);

      if (signal) {
        // 应用风险管理
        const adjustedSignal = await this.applyRiskManagement(signal, strategy.riskManagement);
        
        // 保存信号
        await this.strategySignalService.createSignal({
          strategyId: strategy.id,
          symbol: adjustedSignal.symbol,
          interval: adjustedSignal.interval,
          signal: adjustedSignal.signal,
          side: adjustedSignal.side,
          price: adjustedSignal.price,
          quantity: adjustedSignal.quantity,
          confidence: adjustedSignal.confidence,
          stopLoss: adjustedSignal.stopLoss,
          takeProfit: adjustedSignal.takeProfit,
          reason: adjustedSignal.reason,
          timestamp: adjustedSignal.timestamp,
        });

        this.logger.log(
          `策略信号生成: ${strategy.name} - ${adjustedSignal.signal} ${adjustedSignal.side} ${adjustedSignal.symbol} @${adjustedSignal.price}`
        );

        return { success: true, signal: adjustedSignal };
      }

      return { success: true };
    } catch (error) {
      this.logger.error(`策略执行失败: ${strategy.id}`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 生成交易信号
   */
  private async generateSignal(strategy: StrategyConfig, analysisResult: any): Promise<StrategySignal | null> {
    const { symbol, interval, type, parameters } = strategy;
    const { score, indicators, patterns, supportResistance } = analysisResult;

    switch (type) {
      case StrategyType.MA_CROSSOVER:
        return this.generateMACrossoverSignal(symbol, interval, indicators, parameters);
      
      case StrategyType.RSI_OVERSOLD:
        return this.generateRSISignal(symbol, interval, indicators, parameters, 'OVERSOLD');
      
      case StrategyType.RSI_OVERBOUGHT:
        return this.generateRSISignal(symbol, interval, indicators, parameters, 'OVERBOUGHT');
      
      case StrategyType.MACD_SIGNAL:
        return this.generateMACDSignal(symbol, interval, indicators, parameters);
      
      case StrategyType.BREAKOUT:
        return this.generateBreakoutSignal(symbol, interval, patterns, supportResistance, parameters);
      
      case StrategyType.TREND_FOLLOWING:
        return this.generateTrendFollowingSignal(symbol, interval, score, parameters);
      
      case StrategyType.MULTI_INDICATOR:
        return this.generateMultiIndicatorSignal(symbol, interval, score, parameters);
      
      default:
        this.logger.warn(`未支持的策略类型: ${type}`);
        return null;
    }
  }

  /**
   * 移动均线交叉信号
   */
  private generateMACrossoverSignal(
    symbol: string, 
    interval: string, 
    indicators: any, 
    parameters: any
  ): StrategySignal | null {
    const { fastMA = 12, slowMA = 26, minConfidence = 60 } = parameters;
    
    // 这里需要实际的MA指标数据，简化处理
    const confidence = Math.random() * 40 + 60; // 模拟置信度
    
    if (confidence < minConfidence) return null;

    return {
      strategyId: 0, // 临时值
      symbol,
      interval,
      signal: SignalType.BUY,
      side: OrderSide.BUY,
      price: 0, // 需要从市场数据获取
      confidence,
      reason: `MA交叉信号: ${fastMA}MA上穿${slowMA}MA`,
      timestamp: Date.now(),
    };
  }

  /**
   * RSI信号生成
   */
  private generateRSISignal(
    symbol: string,
    interval: string,
    indicators: any,
    parameters: any,
    type: 'OVERSOLD' | 'OVERBOUGHT'
  ): StrategySignal | null {
    const { rsiThreshold = type === 'OVERSOLD' ? 30 : 70, minConfidence = 60 } = parameters;
    
    // 简化处理，实际需要RSI指标数据
    const rsi = Math.random() * 100;
    const confidence = Math.random() * 40 + 60;
    
    if (confidence < minConfidence) return null;
    
    const isSignal = type === 'OVERSOLD' ? rsi < rsiThreshold : rsi > rsiThreshold;
    if (!isSignal) return null;

    return {
      strategyId: 0,
      symbol,
      interval,
      signal: type === 'OVERSOLD' ? SignalType.BUY : SignalType.SELL,
      side: type === 'OVERSOLD' ? OrderSide.BUY : OrderSide.SELL,
      price: 0,
      confidence,
      reason: `RSI${type === 'OVERSOLD' ? '超卖' : '超买'}信号: RSI=${rsi.toFixed(2)}`,
      timestamp: Date.now(),
    };
  }

  /**
   * MACD信号生成
   */
  private generateMACDSignal(
    symbol: string,
    interval: string,
    indicators: any,
    parameters: any
  ): StrategySignal | null {
    // 简化实现
    return null;
  }

  /**
   * 突破信号生成
   */
  private generateBreakoutSignal(
    symbol: string,
    interval: string,
    patterns: any[],
    supportResistance: any[],
    parameters: any
  ): StrategySignal | null {
    // 简化实现
    return null;
  }

  /**
   * 趋势跟随信号
   */
  private generateTrendFollowingSignal(
    symbol: string,
    interval: string,
    score: any,
    parameters: any
  ): StrategySignal | null {
    const { minTrendScore = 60, minConfidence = 70 } = parameters;
    
    if (score.trend < minTrendScore || score.confidence < minConfidence) {
      return null;
    }

    return {
      strategyId: 0,
      symbol,
      interval,
      signal: score.signal,
      side: score.signal === SignalType.BUY ? OrderSide.BUY : OrderSide.SELL,
      price: 0,
      confidence: score.confidence,
      reason: `趋势跟随: 趋势评分=${score.trend}, 总体信号=${score.signal}`,
      timestamp: Date.now(),
    };
  }

  /**
   * 多指标组合信号
   */
  private generateMultiIndicatorSignal(
    symbol: string,
    interval: string,
    score: any,
    parameters: any
  ): StrategySignal | null {
    const { minOverallScore = 65 } = parameters;
    
    const overallScore = (score.trend + score.momentum + score.volatility) / 3;
    
    if (overallScore < minOverallScore) return null;

    return {
      strategyId: 0,
      symbol,
      interval,
      signal: score.signal,
      side: score.signal === SignalType.BUY ? OrderSide.BUY : OrderSide.SELL,
      price: 0,
      confidence: score.confidence,
      reason: `多指标组合: 综合评分=${overallScore.toFixed(1)}`,
      timestamp: Date.now(),
    };
  }

  /**
   * 应用风险管理
   */
  private async applyRiskManagement(
    signal: StrategySignal,
    riskConfig: RiskManagementConfig
  ): Promise<StrategySignal> {
    // 计算止损止盈价格
    const { stopLossPercent, takeProfitPercent } = riskConfig;
    
    if (signal.side === OrderSide.BUY) {
      signal.stopLoss = signal.price * (1 - stopLossPercent / 100);
      signal.takeProfit = signal.price * (1 + takeProfitPercent / 100);
    } else {
      signal.stopLoss = signal.price * (1 + stopLossPercent / 100);
      signal.takeProfit = signal.price * (1 - takeProfitPercent / 100);
    }

    // 计算仓位大小
    signal.quantity = this.calculatePositionSize(signal, riskConfig);

    return signal;
  }

  /**
   * 计算仓位大小
   */
  private calculatePositionSize(signal: StrategySignal, riskConfig: RiskManagementConfig): number {
    const { maxPositionSize, positionSizing } = riskConfig;
    
    // 简化实现，实际需要考虑账户资金
    switch (positionSizing) {
      case 'FIXED':
        return 0.01; // 固定0.01个币
      case 'PERCENTAGE':
        return maxPositionSize / 100; // 按百分比
      case 'KELLY':
        return 0.005; // 凯利公式，简化为0.005
      default:
        return 0.01;
    }
  }

  /**
   * 获取执行间隔（毫秒）
   */
  private getExecutionInterval(interval: string): number {
    const intervalMap = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '30m': 30 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
    };

    return intervalMap[interval] || 60 * 1000; // 默认1分钟
  }

  /**
   * 获取运行状态
   */
  getRunningStatus() {
    return {
      runningStrategies: Array.from(this.runningStrategies.keys()),
      totalRunning: this.runningStrategies.size,
    };
  }
} 