import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  Query, 
  ParseIntPipe 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { CoinConfigService } from './coin-config.service';
import { CreateCoinConfigDto, UpdateCoinConfigDto, CoinConfigListDto } from './dto';

@ApiTags('币种配置管理')
@Controller('api/coins')
export class CoinConfigController {
  constructor(private readonly coinConfigService: CoinConfigService) {}

  @Post('config')
  @ApiOperation({ summary: '添加监控币种配置' })
  @ApiResponse({ 
    status: 201, 
    description: '配置创建成功'
  })
  @ApiResponse({ 
    status: 409, 
    description: '配置已存在' 
  })
  async create(@Body() createCoinConfigDto: CreateCoinConfigDto) {
    return await this.coinConfigService.create(createCoinConfigDto);
  }

  @Get('list')
  @ApiOperation({ summary: '获取监控币种列表' })
  @ApiResponse({ 
    status: 200, 
    description: '获取成功'
  })
  async findAll(@Query() query: CoinConfigListDto) {
    return await this.coinConfigService.findAll(query);
  }

  @Get('active')
  @ApiOperation({ summary: '获取所有活跃的监控配置' })
  @ApiResponse({ 
    status: 200, 
    description: '获取成功'
  })
  async findActiveConfigs() {
    return await this.coinConfigService.findActiveConfigs();
  }

  @Get('stats')
  @ApiOperation({ summary: '获取配置统计信息' })
  @ApiResponse({ 
    status: 200, 
    description: '获取成功'
  })
  async getStats() {
    return await this.coinConfigService.getStats();
  }

  @Get(':id')
  @ApiOperation({ summary: '根据ID获取币种配置' })
  @ApiParam({ name: 'id', description: '配置ID' })
  @ApiResponse({ 
    status: 200, 
    description: '获取成功'
  })
  @ApiResponse({ 
    status: 404, 
    description: '配置不存在' 
  })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.coinConfigService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新币种配置' })
  @ApiParam({ name: 'id', description: '配置ID' })
  @ApiResponse({ 
    status: 200, 
    description: '更新成功'
  })
  @ApiResponse({ 
    status: 404, 
    description: '配置不存在' 
  })
  @ApiResponse({ 
    status: 409, 
    description: '配置冲突' 
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCoinConfigDto: UpdateCoinConfigDto
  ) {
    return await this.coinConfigService.update(id, updateCoinConfigDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除币种配置' })
  @ApiParam({ name: 'id', description: '配置ID' })
  @ApiResponse({ 
    status: 200, 
    description: '删除成功' 
  })
  @ApiResponse({ 
    status: 404, 
    description: '配置不存在' 
  })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<{ message: string }> {
    await this.coinConfigService.remove(id);
    return { message: '配置删除成功' };
  }

  @Post('batch-active')
  @ApiOperation({ summary: '批量启用/禁用配置' })
  @ApiResponse({ 
    status: 200, 
    description: '操作成功' 
  })
  async updateActiveStatus(
    @Body() body: { ids: number[]; isActive: boolean }
  ): Promise<{ message: string }> {
    const { ids, isActive } = body;
    await this.coinConfigService.updateActiveStatus(ids, isActive);
    return { 
      message: `已${isActive ? '启用' : '禁用'} ${ids.length} 个配置` 
    };
  }
} 