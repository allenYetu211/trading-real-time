import { 
  Controller, 
  Get, 
  Post, 
  Query, 
  Param,
  HttpException, 
  HttpStatus 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { AnalysisService, ComprehensiveAnalysis } from './analysis.service';
import { ScheduledAnalysisService } from './services/scheduled-analysis.service';
import { IndicatorService } from './indicators/indicator.service';
import { PatternRecognitionService } from './patterns/pattern-recognition.service';
import { IntervalType } from 'src/shared/enums';

@ApiTags('技术分析')
@Controller('api/analysis')
export class AnalysisController {
  constructor(
    private readonly analysisService: AnalysisService,
    private readonly scheduledAnalysisService: ScheduledAnalysisService,
    private readonly indicatorService: IndicatorService,
    private readonly patternService: PatternRecognitionService,
  ) {}

  @Post('comprehensive/:symbol/:interval')
  @ApiOperation({ summary: '执行综合技术分析' })
  @ApiResponse({ 
    status: 200, 
    description: '综合分析结果',
    schema: {
      type: 'object',
      properties: {
        symbol: { type: 'string' },
        interval: { type: 'string' },
        timestamp: { type: 'number' },
        score: {
          type: 'object',
          properties: {
            trend: { type: 'number' },
            momentum: { type: 'number' },
            volatility: { type: 'number' },
            signal: { type: 'string' },
            confidence: { type: 'number' }
          }
        },
        summary: { type: 'string' }
      }
    }
  })
  @ApiParam({ name: 'symbol', description: '交易对符号', example: 'BTCUSDT' })
  @ApiParam({ name: 'interval', description: 'K线间隔', enum: IntervalType })
  @ApiQuery({ name: 'limit', description: 'K线数量', required: false, example: 100 })
  async performComprehensiveAnalysis(
    @Param('symbol') symbol: string,
    @Param('interval') interval: IntervalType,
    @Query('limit') limit: number = 100
  ): Promise<ComprehensiveAnalysis> {
    try {
      const limitNum = parseInt(limit.toString());
      if (limitNum < 20 || limitNum > 500) {
        throw new HttpException(
          '数据量必须在20-500之间',
          HttpStatus.BAD_REQUEST
        );
      }

      return await this.analysisService.performComprehensiveAnalysis(
        symbol.toUpperCase(), 
        interval, 
        limitNum
      );
    } catch (error) {
      throw new HttpException(
        `综合分析失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('batch')
  @ApiOperation({ summary: '批量分析活跃配置' })
  @ApiResponse({ 
    status: 200, 
    description: '批量分析结果',
    type: [Object]
  })
  async performBatchAnalysis() {
    try {
      const results = await this.analysisService.performBatchAnalysis();
      return {
        count: results.length,
        results,
        timestamp: Date.now(),
      };
    } catch (error) {
      throw new HttpException(
        `批量分析失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('indicators/:symbol/:interval')
  @ApiOperation({ summary: '计算技术指标' })
  @ApiResponse({ 
    status: 200, 
    description: '技术指标计算结果'
  })
  @ApiParam({ name: 'symbol', description: '交易对符号', example: 'BTCUSDT' })
  @ApiParam({ name: 'interval', description: 'K线间隔', enum: IntervalType })
  @ApiQuery({ name: 'indicators', description: '指标列表(逗号分隔)', example: 'sma20,rsi,macd' })
  @ApiQuery({ name: 'limit', description: 'K线数量', required: false, example: 100 })
  async calculateIndicators(
    @Param('symbol') symbol: string,
    @Param('interval') interval: IntervalType,
    @Query('indicators') indicators: string = 'sma20,rsi,macd',
    @Query('limit') limit: number = 100
  ) {
    try {
      // 这里需要先获取K线数据，简化处理
      const indicatorList = indicators.split(',').map(i => i.trim());
      
      return {
        symbol: symbol.toUpperCase(),
        interval,
        indicators: indicatorList,
        message: '指标计算功能需要结合数据服务实现',
        timestamp: Date.now(),
      };
    } catch (error) {
      throw new HttpException(
        `指标计算失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('patterns/:symbol/:interval')
  @ApiOperation({ summary: '识别图形形态' })
  @ApiResponse({ 
    status: 200, 
    description: '图形形态识别结果'
  })
  @ApiParam({ name: 'symbol', description: '交易对符号', example: 'BTCUSDT' })
  @ApiParam({ name: 'interval', description: 'K线间隔', enum: IntervalType })
  @ApiQuery({ name: 'limit', description: 'K线数量', required: false, example: 100 })
  async recognizePatterns(
    @Param('symbol') symbol: string,
    @Param('interval') interval: IntervalType,
    @Query('limit') limit: number = 100
  ) {
    try {
      return {
        symbol: symbol.toUpperCase(),
        interval,
        limit: parseInt(limit.toString()),
        message: '形态识别功能需要结合数据服务实现',
        timestamp: Date.now(),
      };
    } catch (error) {
      throw new HttpException(
        `形态识别失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('support-resistance/:symbol/:interval')
  @ApiOperation({ summary: '识别支撑阻力位' })
  @ApiResponse({ 
    status: 200, 
    description: '支撑阻力位识别结果'
  })
  @ApiParam({ name: 'symbol', description: '交易对符号', example: 'BTCUSDT' })
  @ApiParam({ name: 'interval', description: 'K线间隔', enum: IntervalType })
  @ApiQuery({ name: 'lookback', description: '回看周期', required: false, example: 50 })
  async identifySupportResistance(
    @Param('symbol') symbol: string,
    @Param('interval') interval: IntervalType,
    @Query('lookback') lookback: number = 50
  ) {
    try {
      return {
        symbol: symbol.toUpperCase(),
        interval,
        lookback: parseInt(lookback.toString()),
        message: '支撑阻力位识别功能需要结合数据服务实现',
        timestamp: Date.now(),
      };
    } catch (error) {
      throw new HttpException(
        `支撑阻力位识别失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('history/:symbol/:interval')
  @ApiOperation({ summary: '获取历史分析结果' })
  @ApiResponse({ 
    status: 200, 
    description: '历史分析结果列表'
  })
  @ApiParam({ name: 'symbol', description: '交易对符号', example: 'BTCUSDT' })
  @ApiParam({ name: 'interval', description: 'K线间隔', enum: IntervalType })
  @ApiQuery({ name: 'limit', description: '结果数量', required: false, example: 10 })
  async getHistoricalAnalysis(
    @Param('symbol') symbol: string,
    @Param('interval') interval: IntervalType,
    @Query('limit') limit: number = 10
  ) {
    try {
      const results = await this.analysisService.getHistoricalAnalysis(
        symbol.toUpperCase(),
        interval,
        parseInt(limit.toString())
      );
      
      return {
        symbol: symbol.toUpperCase(),
        interval,
        count: results.length,
        results,
        timestamp: Date.now(),
      };
    } catch (error) {
      throw new HttpException(
        `获取历史分析失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('signal/:symbol/:interval')
  @ApiOperation({ summary: '获取交易信号' })
  @ApiResponse({ 
    status: 200, 
    description: '交易信号结果',
    schema: {
      type: 'object',
      properties: {
        symbol: { type: 'string' },
        interval: { type: 'string' },
        signal: { type: 'string', enum: ['BUY', 'SELL', 'NEUTRAL'] },
        confidence: { type: 'number' },
        price: { type: 'number' },
        timestamp: { type: 'number' }
      }
    }
  })
  @ApiParam({ name: 'symbol', description: '交易对符号', example: 'BTCUSDT' })
  @ApiParam({ name: 'interval', description: 'K线间隔', enum: IntervalType })
  async getTradingSignal(
    @Param('symbol') symbol: string,
    @Param('interval') interval: IntervalType
  ) {
    try {
      const analysis = await this.analysisService.performComprehensiveAnalysis(
        symbol.toUpperCase(), 
        interval, 
        100
      );
      
      return {
        symbol: analysis.symbol,
        interval: analysis.interval,
        signal: analysis.score.signal,
        confidence: analysis.score.confidence,
        trend: analysis.score.trend,
        momentum: analysis.score.momentum,
        volatility: analysis.score.volatility,
        summary: analysis.summary,
        timestamp: analysis.timestamp,
      };
    } catch (error) {
      throw new HttpException(
        `获取交易信号失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('dashboard')
  @ApiOperation({ summary: '分析仪表板' })
  @ApiResponse({ 
    status: 200, 
    description: '分析仪表板数据'
  })
  async getAnalysisDashboard() {
    try {
      const batchResults = await this.analysisService.performBatchAnalysis();
      
      // 统计信号分布
      const signals = {
        buy: batchResults.filter(r => r.score.signal === 'BUY').length,
        sell: batchResults.filter(r => r.score.signal === 'SELL').length,
        neutral: batchResults.filter(r => r.score.signal === 'NEUTRAL').length,
      };
      
      // 平均置信度
      const avgConfidence = batchResults.length > 0
        ? batchResults.reduce((sum, r) => sum + r.score.confidence, 0) / batchResults.length
        : 0;
      
      // 最强信号
      const strongestSignal = batchResults
        .filter(r => r.score.signal !== 'NEUTRAL')
        .sort((a, b) => b.score.confidence - a.score.confidence)[0];
      
      return {
        summary: {
          totalAnalyzed: batchResults.length,
          signalDistribution: signals,
          averageConfidence: Math.round(avgConfidence),
          strongestSignal: strongestSignal ? {
            symbol: strongestSignal.symbol,
            interval: strongestSignal.interval,
            signal: strongestSignal.score.signal,
            confidence: strongestSignal.score.confidence,
          } : null,
        },
        details: batchResults.map(r => ({
          symbol: r.symbol,
          interval: r.interval,
          signal: r.score.signal,
          confidence: r.score.confidence,
          trend: r.score.trend,
          momentum: r.score.momentum,
          volatility: r.score.volatility,
          patterns: r.patterns.length,
          summary: r.summary,
        })),
        timestamp: Date.now(),
      };
    } catch (error) {
      throw new HttpException(
        `获取仪表板数据失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('scheduled/trigger')
  @ApiOperation({ summary: '手动触发定时分析' })
  @ApiResponse({ 
    status: 200, 
    description: '成功触发定时分析'
  })
  async triggerScheduledAnalysis(): Promise<{ message: string }> {
    try {
      // 异步执行，不阻塞响应
      setImmediate(() => {
        this.scheduledAnalysisService.triggerManualAnalysis();
      });
      
      return {
        message: '定时分析已触发，请稍后查看 Telegram 通知结果'
      };
    } catch (error) {
      throw new HttpException(
        `触发定时分析失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('scheduled/comprehensive')
  @ApiOperation({ summary: '手动触发综合多周期分析' })
  @ApiResponse({ 
    status: 200, 
    description: '成功触发综合多周期分析'
  })
  async triggerComprehensiveAnalysis(): Promise<{ message: string }> {
    try {
      // 异步执行，不阻塞响应
      setImmediate(() => {
        this.scheduledAnalysisService.triggerComprehensiveAnalysis();
      });
      
      return {
        message: '综合多周期分析已触发，将在5分钟内获取5m、15m、1h、4h周期数据并进行综合分析，请稍后查看 Telegram 通知结果'
      };
    } catch (error) {
      throw new HttpException(
        `触发综合多周期分析失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
} 