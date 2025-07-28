import { Controller, Post, Body, Logger, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { EMAAnalysisService } from './services/ema-analysis.service';
import { CCXTDataService } from './services/ccxt-data.service';
import { 
  CCXTAnalysisRequestDto, 
  EMAAnalysisRequestDto,
  EMAAnalysisResponseDto,
  MarketDataResponseDto,
  DebugDataResponseDto 
} from './dto';

/**
 * CCXT分析控制器
 * 提供基于CCXT的市场数据分析API
 */
@ApiTags('CCXT Analysis')
@Controller('api/ccxt-analysis')
export class CCXTAnalysisController {
  private readonly logger = new Logger(CCXTAnalysisController.name);

  constructor(
    private readonly emaAnalysisService: EMAAnalysisService,
    private readonly ccxtDataService: CCXTDataService,
  ) {}

  /**
   * EMA指标分析
   */
  @Post('ema')
  @ApiOperation({ summary: 'EMA指标分析 (使用CCXT)' })
  @ApiResponse({
    status: 200,
    description: '返回EMA分析结果',
    type: EMAAnalysisResponseDto,
  })
  async analyzeEMA(@Body() body: EMAAnalysisRequestDto): Promise<EMAAnalysisResponseDto> {
    this.logger.log(`收到EMA分析请求: ${JSON.stringify(body)}`);

    const { symbol, timeframe = '1d', periods = [20, 60, 120] } = body;

    try {
      // 获取OHLCV数据并进行EMA分析
      const ohlcvData = await this.ccxtDataService.getOHLCVData(symbol, timeframe, 1000);
      const emaAnalysis = await this.emaAnalysisService.analyzeEMA(
        symbol, 
        timeframe, 
        periods,
      );

      const response: EMAAnalysisResponseDto = {
        symbol,
        timeframe,
        currentPrice: this.formatPrice(emaAnalysis.currentPrice),
        ema20: this.formatPrice(emaAnalysis.ema20),
        ema60: this.formatPrice(emaAnalysis.ema60),
        ema120: this.formatPrice(emaAnalysis.ema120),
        trend: emaAnalysis.trend,
        trendConfidence: parseFloat(emaAnalysis.trendConfidence.toFixed(2)),
        dataPoints: ohlcvData.length,
        timeRange: {
          start: ohlcvData[0]?.datetime || '',
          end: ohlcvData[ohlcvData.length - 1]?.datetime || '',
        },
      };

      this.logger.log(`EMA分析完成: ${symbol} - ${response.trend}`);
      return response;

    } catch (error) {
      this.logger.error(`EMA分析失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 调试接口：获取原始数据和计算详情
   */
  @Post('debug')
  @ApiOperation({ summary: '调试接口：获取详细计算数据' })
  @ApiResponse({
    status: 200,
    description: '返回详细的调试数据',
    type: DebugDataResponseDto,
  })
  async getDebugData(@Body() body: CCXTAnalysisRequestDto): Promise<DebugDataResponseDto> {
    this.logger.log(`收到调试数据请求: ${JSON.stringify(body)}`);

    const { 
      symbol, 
      timeframe = '1d', 
      limit = 1000, 
      exchange = 'binance' 
    } = body;

    try {
      const debugData = await this.emaAnalysisService.getDetailedEMAData(
        symbol, 
        timeframe, 
        [20, 60, 120], 
        limit, 
        exchange,
      );

      const response: DebugDataResponseDto = {
        symbol: debugData.symbol,
        timeframe: debugData.timeframe,
        dataSource: `ccxt-${debugData.exchange}`,
        totalCount: debugData.totalCount,
        latestPrice: this.formatPrice(debugData.latestPrice),
        recent10Prices: debugData.recent10Prices.map(price => this.formatPrice(price)),
        priceRange: {
          min: this.formatPrice(debugData.priceRange.min),
          max: this.formatPrice(debugData.priceRange.max),
        },
        emaResults: {
          ema20: this.formatPrice(debugData.emaResults.ema20),
          ema60: this.formatPrice(debugData.emaResults.ema60),
          ema120: this.formatPrice(debugData.emaResults.ema120),
        },
        firstDataPoint: {
          ...debugData.firstDataPoint,
          price: this.formatPrice(debugData.firstDataPoint.price),
        },
        lastDataPoint: {
          ...debugData.lastDataPoint,
          price: this.formatPrice(debugData.lastDataPoint.price),
        },
      };

      this.logger.log(`调试数据获取完成: ${symbol}`);
      return response;

    } catch (error) {
      this.logger.error(`获取调试数据失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 检查交易所连接状态
   */
  @Get('health/:exchange')
  @ApiOperation({ summary: '检查交易所连接状态' })
  @ApiParam({
    name: 'exchange',
    description: '交易所名称',
    example: 'binance',
  })
  @ApiResponse({
    status: 200,
    description: '返回交易所连接状态',
  })
  async checkExchangeHealth(@Param('exchange') exchange: string) {
    this.logger.log(`检查${exchange}连接状态`);

    try {
      const isHealthy = await this.ccxtDataService.checkExchangeHealth(exchange);
      
      return {
        exchange,
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      this.logger.error(`检查交易所状态失败: ${error.message}`);
      return {
        exchange,
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 格式化价格，确保小数位正确显示，避免科学计数法
   * @param price 价格数值
   */
  private formatPrice(price: number): number {
    // 如果价格小于0.0001，保留8位小数
    if (price < 0.0001) {
      return Number(price.toFixed(8));
    }
    // 如果价格小于0.01，保留6位小数
    if (price < 0.01) {
      return Number(price.toFixed(6));
    }
    // 如果价格小于1，保留5位小数
    if (price < 1) {
      return Number(price.toFixed(5));
    }
    // 否则保留5位小数
    return Number(price.toFixed(5));
  }
} 