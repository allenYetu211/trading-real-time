import { IsString, IsEnum, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IntervalType } from 'src/shared/enums';

export class GetKlineDataDto {
  @ApiProperty({ 
    description: '交易对符号', 
    example: 'BTCUSDT' 
  })
  @IsString({ message: '交易对符号必须是字符串' })
  symbol: string;

  @ApiProperty({ 
    description: 'K线时间间隔', 
    enum: IntervalType,
    example: IntervalType.ONE_HOUR
  })
  @IsEnum(IntervalType, { message: '不支持的时间间隔类型' })
  interval: IntervalType;

  @ApiProperty({ 
    description: '获取K线数量', 
    example: 100,
    required: false,
    default: 100
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber({}, { message: '数量必须是数字' })
  @Min(1, { message: '数量必须大于0' })
  @Max(1000, { message: '数量不能超过1000' })
  limit?: number = 100;

  @ApiProperty({ 
    description: '开始时间戳', 
    example: 1640995200000,
    required: false
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber({}, { message: '开始时间必须是数字' })
  startTime?: number;

  @ApiProperty({ 
    description: '结束时间戳', 
    example: 1640995200000,
    required: false
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber({}, { message: '结束时间必须是数字' })
  endTime?: number;
}

export class KlineDataResponseDto {
  @ApiProperty({ description: '交易对符号' })
  symbol: string;

  @ApiProperty({ description: '时间间隔' })
  interval: string;

  @ApiProperty({ description: '开盘时间' })
  openTime: number;

  @ApiProperty({ description: '收盘时间' })
  closeTime: number;

  @ApiProperty({ description: '开盘价' })
  openPrice: number;

  @ApiProperty({ description: '最高价' })
  highPrice: number;

  @ApiProperty({ description: '最低价' })
  lowPrice: number;

  @ApiProperty({ description: '收盘价' })
  closePrice: number;

  @ApiProperty({ description: '成交量' })
  volume: number;

  @ApiProperty({ description: '成交额' })
  quoteAssetVolume: number;

  @ApiProperty({ description: '成交笔数' })
  numberOfTrades: number;

  @ApiProperty({ description: '主动买入成交量' })
  takerBuyBaseAssetVolume: number;

  @ApiProperty({ description: '主动买入成交额' })
  takerBuyQuoteAssetVolume: number;
} 