import { IsString, IsEnum, IsOptional, IsObject, ValidateNested, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { StrategyType, StrategyStatus } from '../enums';

export class RiskManagementDto {
  @IsNumber({}, { message: '最大仓位大小必须是数字' })
  @Min(0.01, { message: '最大仓位大小不能小于0.01%' })
  @Max(100, { message: '最大仓位大小不能超过100%' })
  maxPositionSize: number;

  @IsNumber({}, { message: '止损百分比必须是数字' })
  @Min(0.1, { message: '止损百分比不能小于0.1%' })
  @Max(50, { message: '止损百分比不能超过50%' })
  stopLossPercent: number;

  @IsNumber({}, { message: '止盈百分比必须是数字' })
  @Min(0.1, { message: '止盈百分比不能小于0.1%' })
  @Max(100, { message: '止盈百分比不能超过100%' })
  takeProfitPercent: number;

  @IsNumber({}, { message: '最大日损失必须是数字' })
  @Min(1, { message: '最大日损失不能小于1' })
  maxDailyLoss: number;

  @IsNumber({}, { message: '最大回撤必须是数字' })
  @Min(1, { message: '最大回撤不能小于1%' })
  @Max(50, { message: '最大回撤不能超过50%' })
  maxDrawdown: number;

  @IsString({ message: '仓位计算方式必须是字符串' })
  @IsEnum(['FIXED', 'PERCENTAGE', 'KELLY'], { message: '仓位计算方式无效' })
  positionSizing: 'FIXED' | 'PERCENTAGE' | 'KELLY';
}

export class CreateStrategyDto {
  @IsString({ message: '策略名称必须是字符串' })
  name: string;

  @IsEnum(StrategyType, { message: '不支持的策略类型' })
  type: StrategyType;

  @IsString({ message: '交易对必须是字符串' })
  symbol: string;

  @IsString({ message: '时间间隔必须是字符串' })
  interval: string;

  @IsObject({ message: '策略参数必须是对象' })
  parameters: Record<string, any>;

  @ValidateNested()
  @Type(() => RiskManagementDto)
  riskManagement: RiskManagementDto;

  @IsOptional()
  @IsEnum(StrategyStatus, { message: '不支持的策略状态' })
  status?: StrategyStatus = StrategyStatus.INACTIVE;
} 