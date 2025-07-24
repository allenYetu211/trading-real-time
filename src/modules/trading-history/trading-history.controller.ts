import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  Query,
  ParseIntPipe,
  HttpStatus,
} from '@nestjs/common';
import { TradingHistoryService } from './trading-history.service';
import {
  CreateTradingRecordDto,
  UpdateTradingRecordDto,
  TradingRecordQueryDto,
  TradingRecordStatsQueryDto,
} from './dto';

/**
 * 交易历史记录控制器
 */
@Controller('trading-history')
export class TradingHistoryController {
  constructor(private readonly tradingHistoryService: TradingHistoryService) {}

  /**
   * 创建交易记录
   */
  @Post()
  async create(@Body() createDto: CreateTradingRecordDto) {
    return this.tradingHistoryService.create(createDto);
  }

  /**
   * 查询交易记录列表
   * 使用POST方法支持复杂查询条件
   */
  @Post('list')
  async findAll(@Body() queryDto: TradingRecordQueryDto) {
    return this.tradingHistoryService.findAll(queryDto);
  }

  /**
   * 根据ID获取单个交易记录
   */
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tradingHistoryService.findOne(id);
  }

  /**
   * 根据交易ID获取单个交易记录
   */
  @Get('trade/:tradeId')
  async findByTradeId(@Param('tradeId') tradeId: string) {
    return this.tradingHistoryService.findByTradeId(tradeId);
  }

  /**
   * 更新交易记录
   */
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateTradingRecordDto,
  ) {
    return this.tradingHistoryService.update(id, updateDto);
  }

  /**
   * 删除交易记录
   */
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.tradingHistoryService.remove(id);
    return { message: '交易记录删除成功' };
  }

  /**
   * 获取交易统计信息
   */
  @Post('statistics')
  async getStatistics(@Body() queryDto: TradingRecordStatsQueryDto) {
    return this.tradingHistoryService.getStatistics(queryDto);
  }

  /**
   * 获取未同步到Notion的交易记录
   */
  @Get('sync/unsynced')
  async getUnsyncedRecords() {
    return this.tradingHistoryService.getUnsyncedRecords();
  }

  /**
   * 标记记录为已同步到Notion
   */
  @Put(':id/sync')
  async markAsSynced(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: { notionPageId: string },
  ) {
    return this.tradingHistoryService.markAsSynced(id, data.notionPageId);
  }

  /**
   * 简单查询接口（GET方式）
   * 支持基础的查询参数
   */
  @Get()
  async simpleQuery(@Query() query: any) {
    // 转换查询参数为查询DTO
    const queryDto: TradingRecordQueryDto = {
      page: query.page ? parseInt(query.page) : 1,
      limit: query.limit ? parseInt(query.limit) : 10,
      instrument: query.instrument,
      direction: query.direction,
      status: query.status,
      notionSynced: query.notionSynced === 'true' ? true : 
                    query.notionSynced === 'false' ? false : undefined,
      startTime: query.startTime,
      endTime: query.endTime,
      sortBy: query.sortBy || 'createdAt',
      sortOrder: query.sortOrder || 'DESC',
      search: query.search,
    };

    return this.tradingHistoryService.findAll(queryDto);
  }
} 