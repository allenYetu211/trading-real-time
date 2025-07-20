import { PartialType } from '@nestjs/mapped-types';
import { CreateStrategyDto } from './create-strategy.dto';
import { IsOptional, IsEnum } from 'class-validator';
import { StrategyStatus } from '../enums';

export class UpdateStrategyDto extends PartialType(CreateStrategyDto) {
  @IsOptional()
  @IsEnum(StrategyStatus, { message: '不支持的策略状态' })
  status?: StrategyStatus;
} 