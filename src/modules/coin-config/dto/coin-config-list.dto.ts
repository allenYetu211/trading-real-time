import { IsOptional, IsEnum, IsBoolean, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IntervalType } from 'src/shared/enums';

export class CoinConfigListDto {
  @ApiProperty({ 
    description: '交易对符号过滤', 
    required: false,
    example: 'BTCUSDT'
  })
  @IsOptional()
  @IsString({ message: '交易对符号必须是字符串' })
  symbol?: string;

  @ApiProperty({ 
    description: 'K线时间间隔过滤', 
    enum: IntervalType,
    required: false,
    example: IntervalType.ONE_HOUR
  })
  @IsOptional()
  @IsEnum(IntervalType, { message: '不支持的时间间隔类型' })
  interval?: IntervalType;

  @ApiProperty({ 
    description: '启用状态过滤', 
    required: false,
    example: true
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean({ message: '启用状态必须是布尔值' })
  isActive?: boolean;
} 