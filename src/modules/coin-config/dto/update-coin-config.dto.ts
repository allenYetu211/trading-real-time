import { PartialType } from '@nestjs/swagger';
import { CreateCoinConfigDto } from './create-coin-config.dto';

export class UpdateCoinConfigDto extends PartialType(CreateCoinConfigDto) {} 