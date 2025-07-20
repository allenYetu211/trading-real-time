import { IsString, IsEnum, IsNumber, IsOptional, Min, Max } from 'class-validator';
import { OrderSide } from '../enums';
import { SignalType } from '../../../shared/enums';

export class CreateSignalDto {
  @IsNumber({}, { message: '策略ID必须是数字' })
  strategyId: number;

  @IsString({ message: '交易对必须是字符串' })
  symbol: string;

  @IsString({ message: '时间间隔必须是字符串' })
  interval: string;

  @IsEnum(SignalType, { message: '不支持的信号类型' })
  signal: SignalType;

  @IsEnum(OrderSide, { message: '不支持的订单方向' })
  side: OrderSide;

  @IsNumber({}, { message: '价格必须是数字' })
  @Min(0, { message: '价格不能为负数' })
  price: number;

  @IsOptional()
  @IsNumber({}, { message: '数量必须是数字' })
  @Min(0, { message: '数量不能为负数' })
  quantity?: number;

  @IsNumber({}, { message: '置信度必须是数字' })
  @Min(0, { message: '置信度不能小于0' })
  @Max(100, { message: '置信度不能超过100' })
  confidence: number;

  @IsOptional()
  @IsNumber({}, { message: '止损价格必须是数字' })
  @Min(0, { message: '止损价格不能为负数' })
  stopLoss?: number;

  @IsOptional()
  @IsNumber({}, { message: '止盈价格必须是数字' })
  @Min(0, { message: '止盈价格不能为负数' })
  takeProfit?: number;

  @IsString({ message: '信号原因必须是字符串' })
  reason: string;

  @IsNumber({}, { message: '时间戳必须是数字' })
  timestamp: number;
}

export class SignalQueryDto {
  @IsOptional()
  @IsString({ message: '交易对必须是字符串' })
  symbol?: string;

  @IsOptional()
  @IsString({ message: '时间间隔必须是字符串' })
  interval?: string;

  @IsOptional()
  @IsEnum(SignalType, { message: '不支持的信号类型' })
  signal?: SignalType;

  @IsOptional()
  @IsNumber({}, { message: '策略ID必须是数字' })
  strategyId?: number;

  @IsOptional()
  @IsNumber({}, { message: '开始时间必须是数字' })
  startTime?: number;

  @IsOptional()
  @IsNumber({}, { message: '结束时间必须是数字' })
  endTime?: number;

  @IsOptional()
  @IsNumber({}, { message: '限制数量必须是数字' })
  @Min(1, { message: '限制数量不能小于1' })
  @Max(1000, { message: '限制数量不能超过1000' })
  limit?: number = 50;
} 