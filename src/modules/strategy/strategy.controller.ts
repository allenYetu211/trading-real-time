import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Logger,
  ParseIntPipe,
} from '@nestjs/common';
import { StrategyConfigService } from './services/strategy-config.service';
import { StrategySignalService } from './services/strategy-signal.service';
import { StrategyEngineService } from './services/strategy-engine.service';
import { CreateStrategyDto, UpdateStrategyDto, SignalQueryDto } from './dto';
import { StrategyStatus } from './enums';

@Controller('api/strategy')
export class StrategyController {
  private readonly logger = new Logger(StrategyController.name);

  constructor(
    private readonly strategyConfigService: StrategyConfigService,
    private readonly strategySignalService: StrategySignalService,
    private readonly strategyEngineService: StrategyEngineService,
  ) {}

  /**
   * 创建策略配置
   */
  @Post('config')
  async createStrategy(@Body() dto: CreateStrategyDto) {
    this.logger.log(`创建策略配置: ${dto.name}`);
    return this.strategyConfigService.createStrategy(dto);
  }

  /**
   * 获取策略配置列表
   */
  @Get('config/list')
  async getStrategies(
    @Query('symbol') symbol?: string,
    @Query('interval') interval?: string,
    @Query('status') status?: StrategyStatus,
    @Query('type') type?: string,
  ) {
    return this.strategyConfigService.getStrategies({
      symbol,
      interval,
      status,
      type,
    });
  }

  /**
   * 获取单个策略配置
   */
  @Get('config/:id')
  async getStrategy(@Param('id', ParseIntPipe) id: number) {
    return this.strategyConfigService.getStrategy(id);
  }

  /**
   * 更新策略配置
   */
  @Put('config/:id')
  async updateStrategy(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStrategyDto,
  ) {
    return this.strategyConfigService.updateStrategy(id, dto);
  }

  /**
   * 删除策略配置
   */
  @Delete('config/:id')
  async deleteStrategy(@Param('id', ParseIntPipe) id: number) {
    await this.strategyConfigService.deleteStrategy(id);
    return { success: true, message: '策略配置已删除' };
  }

  /**
   * 启动策略
   */
  @Post('config/:id/start')
  async startStrategy(@Param('id', ParseIntPipe) id: number) {
    const strategy = await this.strategyConfigService.startStrategy(id);
    await this.strategyEngineService.startStrategy(id);
    
    return {
      success: true,
      message: '策略已启动',
      strategy,
    };
  }

  /**
   * 停止策略
   */
  @Post('config/:id/stop')
  async stopStrategy(@Param('id', ParseIntPipe) id: number) {
    const strategy = await this.strategyConfigService.stopStrategy(id);
    await this.strategyEngineService.stopStrategy(id);
    
    return {
      success: true,
      message: '策略已停止',
      strategy,
    };
  }

  /**
   * 暂停策略
   */
  @Post('config/:id/pause')
  async pauseStrategy(@Param('id', ParseIntPipe) id: number) {
    const strategy = await this.strategyConfigService.pauseStrategy(id);
    await this.strategyEngineService.stopStrategy(id);
    
    return {
      success: true,
      message: '策略已暂停',
      strategy,
    };
  }

  /**
   * 获取活跃策略
   */
  @Get('config/active')
  async getActiveStrategies() {
    return this.strategyConfigService.getActiveStrategies();
  }

  /**
   * 获取策略统计
   */
  @Get('config/stats')
  async getStrategyStats() {
    return this.strategyConfigService.getStrategyStats();
  }

  /**
   * 查询策略信号
   */
  @Post('signals/query')
  async getSignals(@Body() query: SignalQueryDto) {
    return this.strategySignalService.getSignals(query);
  }

  /**
   * 获取最新信号
   */
  @Get('signals/latest')
  async getLatestSignals(@Query('limit') limit?: number) {
    return this.strategySignalService.getLatestSignals(limit || 10);
  }

  /**
   * 获取指定策略的信号
   */
  @Get('signals/strategy/:id')
  async getStrategySignals(
    @Param('id', ParseIntPipe) id: number,
    @Query('limit') limit?: number,
  ) {
    return this.strategySignalService.getStrategySignals(id, limit || 50);
  }

  /**
   * 获取信号统计
   */
  @Get('signals/stats')
  async getSignalStats(
    @Query('strategyId') strategyId?: number,
    @Query('symbol') symbol?: string,
    @Query('interval') interval?: string,
    @Query('timeRange') timeRange?: '1d' | '7d' | '30d',
  ) {
    return this.strategySignalService.getSignalStats({
      strategyId,
      symbol,
      interval,
      timeRange,
    });
  }

  /**
   * 标记信号为已执行
   */
  @Post('signals/:id/execute')
  async markSignalExecuted(@Param('id', ParseIntPipe) id: number) {
    const signal = await this.strategySignalService.markSignalExecuted(id);
    return {
      success: true,
      message: '信号已标记为执行',
      signal,
    };
  }

  /**
   * 手动执行策略
   */
  @Post('execute/:id')
  async executeStrategy(@Param('id', ParseIntPipe) id: number) {
    const strategy = await this.strategyConfigService.getStrategy(id);
    const result = await this.strategyEngineService.executeStrategy(strategy);
    
    return {
      success: result.success,
      message: result.success ? '策略执行成功' : '策略执行失败',
      result,
    };
  }

  /**
   * 获取引擎运行状态
   */
  @Get('engine/status')
  async getEngineStatus() {
    const engineStatus = this.strategyEngineService.getRunningStatus();
    const strategyStats = await this.strategyConfigService.getStrategyStats();
    
    return {
      engine: engineStatus,
      strategies: strategyStats,
      timestamp: Date.now(),
    };
  }

  /**
   * 启动策略引擎
   */
  @Post('engine/start')
  async startEngine() {
    await this.strategyEngineService.startEngine();
    return {
      success: true,
      message: '策略引擎已启动',
    };
  }

  /**
   * 停止策略引擎
   */
  @Post('engine/stop')
  async stopEngine() {
    await this.strategyEngineService.stopEngine();
    return {
      success: true,
      message: '策略引擎已停止',
    };
  }

  /**
   * 策略仪表板
   */
  @Get('dashboard')
  async getStrategyDashboard() {
    const [
      strategyStats,
      signalStats,
      engineStatus,
      latestSignals,
      activeStrategies,
    ] = await Promise.all([
      this.strategyConfigService.getStrategyStats(),
      this.strategySignalService.getSignalStats({ timeRange: '7d' }),
      this.strategyEngineService.getRunningStatus(),
      this.strategySignalService.getLatestSignals(5),
      this.strategyConfigService.getActiveStrategies(),
    ]);

    return {
      summary: {
        totalStrategies: strategyStats.total,
        activeStrategies: strategyStats.statusDistribution.active,
        runningStrategies: engineStatus.totalRunning,
        totalSignals: signalStats.totalSignals,
        averageConfidence: signalStats.averageConfidence,
        executionRate: signalStats.executionRate,
      },
      engine: engineStatus,
      strategies: {
        active: activeStrategies,
        stats: strategyStats,
      },
      signals: {
        latest: latestSignals,
        stats: signalStats,
      },
      timestamp: Date.now(),
    };
  }
} 