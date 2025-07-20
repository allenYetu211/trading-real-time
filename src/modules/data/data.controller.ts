import { 
  Controller, 
  Get, 
  Post, 
  Query, 
  Param, 
  Body,
  HttpException, 
  HttpStatus 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { DataService } from './data.service';
import { GetKlineDataDto, KlineDataResponseDto } from './dto';
import { IntervalType } from 'src/shared/enums';

@ApiTags('数据管理')
@Controller('api/data')
export class DataController {
  constructor(private readonly dataService: DataService) {}

  @Get('kline')
  @ApiOperation({ summary: '获取K线数据' })
  @ApiResponse({ 
    status: 200, 
    description: '成功获取K线数据',
    type: [KlineDataResponseDto]
  })
  @ApiQuery({ name: 'symbol', description: '交易对符号', example: 'BTCUSDT' })
  @ApiQuery({ name: 'interval', description: 'K线间隔', enum: IntervalType })
  @ApiQuery({ name: 'limit', description: '数据条数', required: false, example: 100 })
  @ApiQuery({ name: 'startTime', description: '开始时间戳', required: false })
  @ApiQuery({ name: 'endTime', description: '结束时间戳', required: false })
  async getKlineData(@Query() query: GetKlineDataDto) {
    try {
      // 确保数值参数类型正确
      const params = {
        ...query,
        limit: query.limit ? parseInt(query.limit.toString()) : 100,
        startTime: query.startTime ? parseInt(query.startTime.toString()) : undefined,
        endTime: query.endTime ? parseInt(query.endTime.toString()) : undefined,
      };
      return await this.dataService.getKlineData(params);
    } catch (error) {
      throw new HttpException(
        `获取K线数据失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('price/:symbol')
  @ApiOperation({ summary: '获取最新价格' })
  @ApiResponse({ 
    status: 200, 
    description: '成功获取最新价格',
    schema: {
      type: 'object',
      properties: {
        symbol: { type: 'string', example: 'BTCUSDT' },
        price: { type: 'number', example: 45000.5 },
        timestamp: { type: 'number', example: 1640995200000 }
      }
    }
  })
  @ApiParam({ name: 'symbol', description: '交易对符号', example: 'BTCUSDT' })
  async getLatestPrice(@Param('symbol') symbol: string) {
    try {
      const price = await this.dataService.getLatestPrice(symbol.toUpperCase());
      return {
        symbol: symbol.toUpperCase(),
        price,
        timestamp: Date.now(),
      };
    } catch (error) {
      throw new HttpException(
        `获取价格失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('ticker/:symbol')
  @ApiOperation({ summary: '获取24小时价格统计' })
  @ApiResponse({ 
    status: 200, 
    description: '成功获取24小时统计数据'
  })
  @ApiParam({ name: 'symbol', description: '交易对符号', example: 'BTCUSDT' })
  async get24hrTicker(@Param('symbol') symbol: string) {
    try {
      return await this.dataService.get24hrTicker(symbol.toUpperCase());
    } catch (error) {
      throw new HttpException(
        `获取24h统计失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('refresh/:symbol/:interval')
  @ApiOperation({ summary: '刷新指定币种数据' })
  @ApiResponse({ 
    status: 200, 
    description: '成功刷新数据',
    schema: {
      type: 'object',
      properties: {
        symbol: { type: 'string' },
        interval: { type: 'string' },
        klineCount: { type: 'number' },
        latestPrice: { type: 'number' },
        refreshTime: { type: 'number' }
      }
    }
  })
  @ApiParam({ name: 'symbol', description: '交易对符号', example: 'BTCUSDT' })
  @ApiParam({ name: 'interval', description: 'K线间隔', enum: IntervalType })
  @ApiQuery({ name: 'limit', description: '获取数据条数', required: false, example: 100 })
  async refreshSymbolData(
    @Param('symbol') symbol: string,
    @Param('interval') interval: IntervalType,
    @Query('limit') limit: number = 100
  ) {
    try {
      const result = await this.dataService.refreshSymbolData(
        symbol.toUpperCase(), 
        interval, 
        limit
      );
      
      return {
        symbol: symbol.toUpperCase(),
        interval,
        ...result,
        refreshTime: Date.now(),
      };
    } catch (error) {
      throw new HttpException(
        `刷新数据失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('refresh/all')
  @ApiOperation({ summary: '批量刷新活跃币种数据' })
  @ApiResponse({ 
    status: 200, 
    description: '成功批量刷新数据'
  })
  async refreshActiveSymbolsData() {
    try {
      const result = await this.dataService.refreshActiveSymbolsData();
      return {
        ...result,
        refreshTime: Date.now(),
      };
    } catch (error) {
      throw new HttpException(
        `批量刷新失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('validate/:symbol')
  @ApiOperation({ summary: '验证交易对有效性' })
  @ApiResponse({ 
    status: 200, 
    description: '验证结果',
    schema: {
      type: 'object',
      properties: {
        symbol: { type: 'string' },
        isValid: { type: 'boolean' },
        checkTime: { type: 'number' }
      }
    }
  })
  @ApiParam({ name: 'symbol', description: '交易对符号', example: 'BTCUSDT' })
  async validateSymbol(@Param('symbol') symbol: string) {
    try {
      const isValid = await this.dataService.validateSymbol(symbol.toUpperCase());
      return {
        symbol: symbol.toUpperCase(),
        isValid,
        checkTime: Date.now(),
      };
    } catch (error) {
      throw new HttpException(
        `验证交易对失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('stats')
  @ApiOperation({ summary: '获取数据统计信息' })
  @ApiResponse({ 
    status: 200, 
    description: '系统数据统计信息'
  })
  async getDataStats() {
    try {
      return await this.dataService.getDataStats();
    } catch (error) {
      throw new HttpException(
        `获取统计信息失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('cache/clear')
  @ApiOperation({ summary: '清理缓存' })
  @ApiResponse({ 
    status: 200, 
    description: '成功清理缓存'
  })
  @ApiQuery({ name: 'pattern', description: '缓存键模式', required: false })
  async clearCache(@Query('pattern') pattern?: string) {
    try {
      const deletedCount = await this.dataService.clearCache(pattern);
      return {
        message: pattern ? `清理了 ${deletedCount} 个匹配的缓存键` : '已清空所有缓存',
        deletedCount: pattern ? deletedCount : 'all',
        pattern: pattern || 'all',
        clearTime: Date.now(),
      };
    } catch (error) {
      throw new HttpException(
        `清理缓存失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('health')
  @ApiOperation({ summary: '数据服务健康检查' })
  @ApiResponse({ 
    status: 200, 
    description: '健康检查结果'
  })
  async healthCheck() {
    try {
      const health = await this.dataService.healthCheck();
      return {
        ...health,
        checkTime: Date.now(),
        status: health.overall ? 'healthy' : 'unhealthy',
      };
    } catch (error) {
      throw new HttpException(
        `健康检查失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('kline/latest/:symbol/:interval')
  @ApiOperation({ summary: '获取最新K线数据' })
  @ApiResponse({ 
    status: 200, 
    description: '最新K线数据',
    type: KlineDataResponseDto
  })
  @ApiParam({ name: 'symbol', description: '交易对符号', example: 'BTCUSDT' })
  @ApiParam({ name: 'interval', description: 'K线间隔', enum: IntervalType })
  async getLatestKline(
    @Param('symbol') symbol: string,
    @Param('interval') interval: IntervalType
  ) {
    try {
      const klineData = await this.dataService.getKlineData({
        symbol: symbol.toUpperCase(),
        interval,
        limit: 1,
      });
      
      if (klineData.length === 0) {
        throw new HttpException(
          `未找到 ${symbol} ${interval} 的K线数据`,
          HttpStatus.NOT_FOUND
        );
      }
      
      return klineData[0];
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `获取最新K线失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
} 