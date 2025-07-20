import { IsOptional, IsString, IsEnum, IsDateString, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class NotificationListDto {
  @ApiPropertyOptional({ description: '通知类型', enum: ['info', 'success', 'warning', 'error'] })
  @IsOptional()
  @IsEnum(['info', 'success', 'warning', 'error'], { message: '不支持的通知类型' })
  type?: 'info' | 'success' | 'warning' | 'error';

  @ApiPropertyOptional({ description: '交易对', example: 'BTCUSDT' })
  @IsOptional()
  @IsString({ message: '交易对必须是字符串' })
  symbol?: string;

  @ApiPropertyOptional({ description: '时间周期', example: '1h' })
  @IsOptional()
  @IsString({ message: '时间周期必须是字符串' })
  interval?: string;

  @ApiPropertyOptional({ description: '信号类型', example: 'BUY' })
  @IsOptional()
  @IsString({ message: '信号类型必须是字符串' })
  signal?: string;

  @ApiPropertyOptional({ description: '开始日期', example: '2025-01-20T00:00:00.000Z' })
  @IsOptional()
  @IsDateString({}, { message: '开始日期格式不正确' })
  startDate?: string;

  @ApiPropertyOptional({ description: '结束日期', example: '2025-01-21T00:00:00.000Z' })
  @IsOptional()
  @IsDateString({}, { message: '结束日期格式不正确' })
  endDate?: string;

  @ApiPropertyOptional({ description: '页码', example: 1, default: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt({ message: '页码必须是整数' })
  @Min(1, { message: '页码最小为1' })
  page: number = 1;

  @ApiPropertyOptional({ description: '每页数量', example: 20, default: 20 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt({ message: '每页数量必须是整数' })
  @Min(1, { message: '每页数量最小为1' })
  @Max(100, { message: '每页数量最大为100' })
  limit: number = 20;
} 