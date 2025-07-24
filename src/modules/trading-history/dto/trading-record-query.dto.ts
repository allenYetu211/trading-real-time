import { 
  IsOptional, 
  IsEnum, 
  IsString, 
  IsNumber, 
  IsBoolean,
  IsDateString,
  Min,
  Max,
  Length
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { TradeStatus, TradeDirection } from '../enums';

/**
 * 交易记录查询DTO
 * 支持分页和过滤条件
 */
export class TradingRecordQueryDto {
  // 分页参数
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: '页码必须是数字' })
  @Min(1, { message: '页码不能小于1' })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: '每页数量必须是数字' })
  @Min(1, { message: '每页数量不能小于1' })
  @Max(100, { message: '每页数量不能大于100' })
  limit?: number = 10;

  // 过滤条件
  @IsOptional()
  @IsString({ message: '交易对必须是字符串' })
  @Length(1, 20, { message: '交易对长度必须在1-20个字符之间' })
  instrument?: string;

  @IsOptional()
  @IsEnum(TradeDirection, { message: '不支持的交易方向' })
  direction?: TradeDirection;

  @IsOptional()
  @IsEnum(TradeStatus, { message: '不支持的交易状态' })
  status?: TradeStatus;

  @IsOptional()
  @IsBoolean({ message: '是否已同步到Notion必须是布尔值' })
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  notionSynced?: boolean;

  // 时间范围过滤
  @IsOptional()
  @IsDateString({}, { message: '开始时间格式错误' })
  startTime?: string;

  @IsOptional()
  @IsDateString({}, { message: '结束时间格式错误' })
  endTime?: string;

  // 盈亏范围过滤
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: '最小PNL必须是数字' })
  minPnl?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: '最大PNL必须是数字' })
  maxPnl?: number;

  // 排序参数
  @IsOptional()
  @IsString({ message: '排序字段必须是字符串' })
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsEnum(['ASC', 'DESC'], { message: '排序方向必须是ASC或DESC' })
  sortOrder?: 'ASC' | 'DESC' = 'DESC';

  // 搜索关键词
  @IsOptional()
  @IsString({ message: '搜索关键词必须是字符串' })
  search?: string;
}

/**
 * 交易记录统计查询DTO
 */
export class TradingRecordStatsQueryDto {
  @IsOptional()
  @IsDateString({}, { message: '开始时间格式错误' })
  startTime?: string;

  @IsOptional()
  @IsDateString({}, { message: '结束时间格式错误' })
  endTime?: string;

  @IsOptional()
  @IsString({ message: '交易对必须是字符串' })
  instrument?: string;

  @IsOptional()
  @IsEnum(TradeDirection, { message: '不支持的交易方向' })
  direction?: TradeDirection;
} 