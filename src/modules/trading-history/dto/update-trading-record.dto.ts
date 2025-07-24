import { PartialType } from '@nestjs/mapped-types';
import { CreateTradingRecordDto } from './create-trading-record.dto';
import { IsOptional, IsBoolean, IsDateString } from 'class-validator';

/**
 * 更新交易记录DTO
 * 继承自CreateTradingRecordDto，所有字段都是可选的
 */
export class UpdateTradingRecordDto extends PartialType(CreateTradingRecordDto) {
  // 添加Notion同步相关字段
  @IsOptional()
  @IsBoolean({ message: '是否已同步到Notion必须是布尔值' })
  notionSynced?: boolean;

  @IsOptional()
  @IsDateString({}, { message: '同步时间格式错误' })
  syncedAt?: string;
} 