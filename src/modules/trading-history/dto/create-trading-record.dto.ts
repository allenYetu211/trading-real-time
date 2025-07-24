import { 
  IsString, 
  IsOptional, 
  IsEnum, 
  IsNumber, 
  IsBoolean, 
  IsDateString,
  IsDecimal,
  Min,
  Max,
  Length 
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { TradeStatus, TradeDirection } from '../enums';

/**
 * 创建交易记录DTO
 */
export class CreateTradingRecordDto {
  @IsString({ message: '交易ID必须是字符串' })
  @Length(1, 100, { message: '交易ID长度必须在1-100个字符之间' })
  tradeId: string;

  @IsString({ message: '交易对必须是字符串' })
  @Length(1, 20, { message: '交易对长度必须在1-20个字符之间' })
  instrument: string;

  @IsEnum(TradeDirection, { message: '不支持的交易方向' })
  direction: TradeDirection;

  @IsEnum(TradeStatus, { message: '不支持的交易状态' })
  status: TradeStatus;

  @IsOptional()
  @IsNumber({}, { message: '杠杆必须是数字' })
  @Min(1, { message: '杠杆倍数不能小于1' })
  @Max(125, { message: '杠杆倍数不能大于125' })
  leverage?: number;

  // 时间信息
  @IsOptional()
  @IsDateString({}, { message: '开仓时间格式错误' })
  entryTime?: string;

  @IsOptional()
  @IsDateString({}, { message: '平仓时间格式错误' })
  exitTime?: string;

  @IsOptional()
  @IsNumber({}, { message: '持仓时长必须是数字' })
  @Min(0, { message: '持仓时长不能为负数' })
  duration?: number;

  // 价格信息
  @IsOptional()
  @IsNumber({}, { message: '计划价格必须是数字' })
  @Min(0, { message: '计划价格不能为负数' })
  plannedPrice?: number;

  @IsOptional()
  @IsNumber({}, { message: '实际开仓价格必须是数字' })
  @Min(0, { message: '实际开仓价格不能为负数' })
  actualEntryPrice?: number;

  @IsOptional()
  @IsNumber({}, { message: '实际平仓价格必须是数字' })
  @Min(0, { message: '实际平仓价格不能为负数' })
  actualExitPrice?: number;

  @IsOptional()
  @IsNumber({}, { message: '头寸规模必须是数字' })
  @Min(0, { message: '头寸规模不能为负数' })
  positionSize?: number;

  @IsOptional()
  @IsNumber({}, { message: '保证金必须是数字' })
  @Min(0, { message: '保证金不能为负数' })
  margin?: number;

  // 盈亏信息
  @IsOptional()
  @IsNumber({}, { message: 'PNL必须是数字' })
  pnl?: number;

  @IsOptional()
  @IsNumber({}, { message: '盈亏率必须是数字' })
  rorPercentage?: number;

  @IsOptional()
  @IsNumber({}, { message: '手续费必须是数字' })
  @Min(0, { message: '手续费不能为负数' })
  fees?: number;

  @IsOptional()
  @IsNumber({}, { message: '净盈亏必须是数字' })
  netPnl?: number;

  @IsOptional()
  @IsNumber({}, { message: '滑点必须是数字' })
  slippage?: number;

  // 风控信息
  @IsOptional()
  @IsNumber({}, { message: '止盈价格必须是数字' })
  @Min(0, { message: '止盈价格不能为负数' })
  initialTakeProfit?: number;

  @IsOptional()
  @IsNumber({}, { message: '止损价格必须是数字' })
  @Min(0, { message: '止损价格不能为负数' })
  initialStopLoss?: number;

  @IsOptional()
  @IsBoolean({ message: '是否触及止盈必须是布尔值' })
  hitTakeProfit?: boolean;

  @IsOptional()
  @IsBoolean({ message: '是否触及止损必须是布尔值' })
  hitStopLoss?: boolean;

  // 高级指标
  @IsOptional()
  @IsNumber({}, { message: '最大有利偏移必须是数字' })
  maxFavorableExcursion?: number;

  @IsOptional()
  @IsNumber({}, { message: '最大不利偏移必须是数字' })
  maxAdverseExcursion?: number;

  // 元数据
  @IsOptional()
  @IsString({ message: 'OKX订单ID必须是字符串' })
  okxOrderIds?: string;

  @IsOptional()
  @IsString({ message: '原始数据必须是字符串' })
  rawData?: string;

  @IsOptional()
  @IsString({ message: '备注必须是字符串' })
  notes?: string;
} 