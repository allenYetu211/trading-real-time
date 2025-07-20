import { 
  Controller, 
  Post, 
  Delete, 
  Get, 
  Param, 
  Body,
  HttpException, 
  HttpStatus 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { WebSocketService } from './websocket.service';
import { IntervalType } from 'src/shared/enums';

class SubscribeKlineDto {
  symbol: string;
  interval: IntervalType;
}

class SubscribeMultipleDto {
  configs: Array<{ symbol: string; interval: IntervalType }>;
}

@ApiTags('WebSocket管理')
@Controller('api/websocket')
export class WebSocketController {
  constructor(private readonly webSocketService: WebSocketService) {}

  @Post('subscribe/:symbol/:interval')
  @ApiOperation({ summary: '订阅K线数据流' })
  @ApiResponse({ 
    status: 200, 
    description: '成功订阅数据流'
  })
  @ApiParam({ name: 'symbol', description: '交易对符号', example: 'BTCUSDT' })
  @ApiParam({ name: 'interval', description: 'K线间隔', enum: IntervalType })
  async subscribeKline(
    @Param('symbol') symbol: string,
    @Param('interval') interval: IntervalType
  ) {
    try {
      await this.webSocketService.subscribeKline(symbol.toUpperCase(), interval);
      return {
        message: `成功订阅 ${symbol.toUpperCase()} ${interval} K线数据流`,
        symbol: symbol.toUpperCase(),
        interval,
        timestamp: Date.now(),
      };
    } catch (error) {
      throw new HttpException(
        `订阅失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete('subscribe/:symbol/:interval')
  @ApiOperation({ summary: '取消订阅K线数据流' })
  @ApiResponse({ 
    status: 200, 
    description: '成功取消订阅'
  })
  @ApiParam({ name: 'symbol', description: '交易对符号', example: 'BTCUSDT' })
  @ApiParam({ name: 'interval', description: 'K线间隔', enum: IntervalType })
  async unsubscribeKline(
    @Param('symbol') symbol: string,
    @Param('interval') interval: IntervalType
  ) {
    try {
      await this.webSocketService.unsubscribeKline(symbol.toUpperCase(), interval);
      return {
        message: `成功取消订阅 ${symbol.toUpperCase()} ${interval} K线数据流`,
        symbol: symbol.toUpperCase(),
        interval,
        timestamp: Date.now(),
      };
    } catch (error) {
      throw new HttpException(
        `取消订阅失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('subscribe/multiple')
  @ApiOperation({ summary: '批量订阅K线数据流' })
  @ApiResponse({ 
    status: 200, 
    description: '成功批量订阅数据流'
  })
  @ApiBody({
    type: SubscribeMultipleDto,
    description: '批量订阅配置',
    examples: {
      example1: {
        summary: '订阅多个币种',
        value: {
          configs: [
            { symbol: 'BTCUSDT', interval: '1h' },
            { symbol: 'ETHUSDT', interval: '4h' },
            { symbol: 'ADAUSDT', interval: '15m' }
          ]
        }
      }
    }
  })
  async subscribeMultiple(@Body() dto: SubscribeMultipleDto) {
    try {
      if (!dto.configs || dto.configs.length === 0) {
        throw new HttpException(
          '配置列表不能为空',
          HttpStatus.BAD_REQUEST
        );
      }

      // 验证和标准化配置
      const normalizedConfigs = dto.configs.map(config => ({
        symbol: config.symbol.toUpperCase(),
        interval: config.interval,
      }));

      await this.webSocketService.subscribeMultipleKlines(normalizedConfigs);
      
      return {
        message: `成功批量订阅 ${normalizedConfigs.length} 个数据流`,
        configs: normalizedConfigs,
        timestamp: Date.now(),
      };
    } catch (error) {
      throw new HttpException(
        `批量订阅失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('status')
  @ApiOperation({ summary: '获取WebSocket连接状态' })
  @ApiResponse({ 
    status: 200, 
    description: 'WebSocket连接状态信息'
  })
  async getConnectionStatus() {
    try {
      const connections = this.webSocketService.getConnectionStatus();
      const health = this.webSocketService.healthCheck();
      
      return {
        health,
        connections,
        timestamp: Date.now(),
      };
    } catch (error) {
      throw new HttpException(
        `获取状态失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('health')
  @ApiOperation({ summary: 'WebSocket服务健康检查' })
  @ApiResponse({ 
    status: 200, 
    description: 'WebSocket健康检查结果'
  })
  async healthCheck() {
    try {
      const health = this.webSocketService.healthCheck();
      return {
        ...health,
        timestamp: Date.now(),
        message: `WebSocket服务状态: ${health.status}`,
      };
    } catch (error) {
      throw new HttpException(
        `健康检查失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('subscribe/active-configs')
  @ApiOperation({ summary: '订阅所有活跃配置的数据流' })
  @ApiResponse({ 
    status: 200, 
    description: '成功订阅活跃配置的数据流'
  })
  async subscribeActiveConfigs() {
    try {
      // 这里需要获取活跃的币种配置
      // 暂时使用硬编码的配置作为示例
      const activeConfigs = [
        { symbol: 'BTCUSDT', interval: IntervalType.ONE_HOUR },
        { symbol: 'ETHUSDT', interval: IntervalType.FOUR_HOURS },
        { symbol: 'ADAUSDT', interval: IntervalType.FIFTEEN_MINUTES },
      ];

      if (activeConfigs.length === 0) {
        return {
          message: '没有活跃的配置需要订阅',
          count: 0,
          timestamp: Date.now(),
        };
      }

      await this.webSocketService.subscribeMultipleKlines(activeConfigs);
      
      return {
        message: `成功订阅 ${activeConfigs.length} 个活跃配置的数据流`,
        configs: activeConfigs,
        count: activeConfigs.length,
        timestamp: Date.now(),
      };
    } catch (error) {
      throw new HttpException(
        `订阅活跃配置失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete('subscribe/all')
  @ApiOperation({ summary: '取消所有订阅' })
  @ApiResponse({ 
    status: 200, 
    description: '成功取消所有订阅'
  })
  async unsubscribeAll() {
    try {
      const statusBefore = this.webSocketService.getConnectionStatus();
      const connectionCount = statusBefore.length;
      
      // 取消所有现有订阅
      for (const connection of statusBefore) {
        for (const stream of connection.streams) {
          // 解析流名称以获取symbol和interval
          const [symbolInterval] = stream.split('@');
          const parts = symbolInterval.split('_');
          if (parts.length >= 2) {
            const symbol = parts[0].toUpperCase();
            const interval = parts[1] as IntervalType;
            await this.webSocketService.unsubscribeKline(symbol, interval);
          }
        }
      }
      
      return {
        message: `成功取消 ${connectionCount} 个WebSocket连接`,
        canceledConnections: connectionCount,
        timestamp: Date.now(),
      };
    } catch (error) {
      throw new HttpException(
        `取消所有订阅失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
} 