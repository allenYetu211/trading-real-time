import { ApiProperty } from '@nestjs/swagger';

/**
 * EMA分析响应DTO
 */
export class EMAAnalysisResponseDto {
  @ApiProperty({
    description: '交易对符号',
    example: 'SOLUSDT',
  })
  symbol: string;

  @ApiProperty({
    description: '时间周期',
    example: '1d',
  })
  timeframe: string;

  @ApiProperty({
    description: '当前价格',
    example: 192.35,
  })
  currentPrice: number;

  @ApiProperty({
    description: 'EMA20值',
    example: 177.83,
  })
  ema20: number;

  @ApiProperty({
    description: 'EMA60值',
    example: 164.52,
  })
  ema60: number;

  @ApiProperty({
    description: 'EMA120值',
    example: 161.0,
  })
  ema120: number;

  @ApiProperty({
    description: '市场趋势',
    example: 'UPTREND',
    enum: ['UPTREND', 'DOWNTREND', 'RANGING'],
  })
  trend: 'UPTREND' | 'DOWNTREND' | 'RANGING';

  @ApiProperty({
    description: '趋势置信度(0-100)',
    example: 85.5,
  })
  trendConfidence: number;

  @ApiProperty({
    description: '数据点数量',
    example: 1000,
  })
  dataPoints: number;

  @ApiProperty({
    description: '数据时间范围',
    example: {
      start: '2024-01-01T00:00:00Z',
      end: '2024-07-28T00:00:00Z',
    },
  })
  timeRange: {
    start: string;
    end: string;
  };
}

/**
 * 市场数据响应DTO
 */
export class MarketDataResponseDto {
  @ApiProperty({
    description: '交易对符号',
    example: 'SOLUSDT',
  })
  symbol: string;

  @ApiProperty({
    description: '最新价格信息',
  })
  currentPrice: {
    price: number;
    timestamp: number;
    datetime: string;
  };

  @ApiProperty({
    description: '24小时价格统计',
  })
  price24h: {
    high: number;
    low: number;
    change: number;
    changePercent: number;
  };

  @ApiProperty({
    description: 'EMA分析结果',
  })
  emaAnalysis: EMAAnalysisResponseDto;

  @ApiProperty({
    description: '最近10根K线收盘价',
    example: [180.5, 182.3, 185.1, 188.2, 190.1, 192.35],
  })
  recentPrices: number[];
}

/**
 * 调试数据响应DTO
 */
export class DebugDataResponseDto {
  @ApiProperty({
    description: '交易对符号',
    example: 'SOLUSDT',
  })
  symbol: string;

  @ApiProperty({
    description: '时间周期',
    example: '1d',
  })
  timeframe: string;

  @ApiProperty({
    description: '数据来源',
    example: 'binance',
  })
  dataSource: string;

  @ApiProperty({
    description: '总数据量',
    example: 1000,
  })
  totalCount: number;

  @ApiProperty({
    description: '最新价格',
    example: 192.35,
  })
  latestPrice: number;

  @ApiProperty({
    description: '最近10个收盘价',
    example: [180.5, 182.3, 185.1, 188.2, 190.1, 192.35],
  })
  recent10Prices: number[];

  @ApiProperty({
    description: '价格范围',
  })
  priceRange: {
    min: number;
    max: number;
  };

  @ApiProperty({
    description: 'EMA计算结果',
  })
  emaResults: {
    ema20: number;
    ema60: number;
    ema120: number;
  };

  @ApiProperty({
    description: '第一条数据',
  })
  firstDataPoint: {
    timestamp: number;
    datetime: string;
    price: number;
  };

  @ApiProperty({
    description: '最后一条数据',
  })
  lastDataPoint: {
    timestamp: number;
    datetime: string;
    price: number;
  };
} 