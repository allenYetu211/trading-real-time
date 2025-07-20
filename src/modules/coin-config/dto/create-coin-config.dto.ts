import { IsString, IsEnum, IsOptional, IsBoolean, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IntervalType } from 'src/shared/enums';

export class CreateCoinConfigDto {
  @ApiProperty({ 
    description: '交易对符号', 
    example: 'BTCUSDT',
    maxLength: 20
  })
  @IsString({ message: '交易对符号必须是字符串' })
  @Length(1, 20, { message: '交易对符号长度必须在1-20个字符之间' })
  symbol: string;

  @ApiProperty({ 
    description: 'K线时间间隔', 
    enum: IntervalType,
    example: IntervalType.ONE_HOUR
  })
  @IsEnum(IntervalType, { message: '不支持的时间间隔类型' })
  interval: IntervalType;

  @ApiProperty({ 
    description: '是否启用监控', 
    example: true,
    required: false,
    default: true
  })
  @IsOptional()
  @IsBoolean({ message: '启用状态必须是布尔值' })
  isActive?: boolean = true;
} 