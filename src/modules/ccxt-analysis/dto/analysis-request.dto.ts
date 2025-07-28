import { IsString, IsOptional, IsIn, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * CCXT市场分析请求DTO
 */
export class CCXTAnalysisRequestDto {
  @ApiProperty({
    description: '交易对符号',
    example: 'SOLUSDT',
  })
  @IsString({ message: '交易对符号必须是字符串' })
  symbol: string;

  @ApiPropertyOptional({
    description: '时间周期',
    example: '1d',
    enum: ['1m', '5m', '15m', '1h', '4h', '1d', '1w'],
    default: '1d',
  })
  @IsOptional()
  @IsIn(['1m', '5m', '15m', '1h', '4h', '1d', '1w'], {
    message: '时间周期必须是支持的值',
  })
  timeframe?: string;

  @ApiPropertyOptional({
    description: '获取数据条数',
    example: 1000,
    default: 1000,
  })
  @IsOptional()
  @IsNumber({}, { message: '数据条数必须是数字' })
  @Min(100, { message: '数据条数至少100条' })
  @Max(5000, { message: '数据条数最多5000条' })
  limit?: number;

  @ApiPropertyOptional({
    description: '交易所名称',
    example: 'binance',
    default: 'binance',
  })
  @IsOptional()
  @IsString({ message: '交易所名称必须是字符串' })
  exchange?: string;
}

/**
 * EMA分析请求DTO
 */
export class EMAAnalysisRequestDto {
  @ApiProperty({
    description: '交易对符号',
    example: 'SOLUSDT',
  })
  @IsString({ message: '交易对符号必须是字符串' })
  symbol: string;

  @ApiPropertyOptional({
    description: '时间周期',
    example: '1d',
    default: '1d',
  })
  @IsOptional()
  @IsIn(['1m', '5m', '15m', '1h', '4h', '1d', '1w'], {
    message: '时间周期必须是支持的值',
  })
  timeframe?: string;

  @ApiPropertyOptional({
    description: 'EMA周期数组',
    example: [20, 60, 120],
    default: [20, 60, 120],
  })
  @IsOptional()
  periods?: number[];
} 