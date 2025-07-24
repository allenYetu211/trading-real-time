import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { TradingRecord } from '@prisma/client';
import { 
  CreateTradingRecordDto, 
  UpdateTradingRecordDto, 
  TradingRecordQueryDto,
  TradingRecordStatsQueryDto 
} from './dto';
import { TradeStatus, TradeDirection } from './enums';

/**
 * 交易历史记录服务
 */
@Injectable()
export class TradingHistoryService {
  constructor(private readonly prisma: PrismaService) {}



  /**
   * 创建新的交易记录
   */
  async create(createDto: CreateTradingRecordDto): Promise<TradingRecord> {
    // 检查交易ID是否已存在
    const existingRecord = await this.prisma.tradingRecord.findUnique({
      where: { tradeId: createDto.tradeId },
    });

    if (existingRecord) {
      throw new ConflictException(`交易记录 ${createDto.tradeId} 已存在`);
    }

    // 验证数据一致性
    this.validateTradeData(createDto);

    // 转换日期字符串为Date对象
    const data = {
      ...createDto,
      entryTime: createDto.entryTime ? new Date(createDto.entryTime) : null,
      exitTime: createDto.exitTime ? new Date(createDto.exitTime) : null,
      hitTakeProfit: createDto.hitTakeProfit ?? false,
      hitStopLoss: createDto.hitStopLoss ?? false,
    };

    return this.prisma.tradingRecord.create({
      data,
    });
  }

  /**
   * 查询交易记录列表（支持分页和过滤）
   */
  async findAll(queryDto: TradingRecordQueryDto) {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'DESC', ...filters } = queryDto;
    const skip = (page - 1) * limit;

    // 构建查询条件
    const where = this.buildWhereCondition(filters);

    // 构建排序条件
    const orderBy = { [sortBy]: sortOrder.toLowerCase() };

    const [records, total] = await Promise.all([
      this.prisma.tradingRecord.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.tradingRecord.count({ where }),
    ]);

    return {
      data: records,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * 根据ID查询单个交易记录
   */
  async findOne(id: number): Promise<TradingRecord> {
    const record = await this.prisma.tradingRecord.findUnique({
      where: { id },
    });

    if (!record) {
      throw new NotFoundException(`交易记录 ID ${id} 不存在`);
    }

    return record;
  }

  /**
   * 根据交易ID查询单个交易记录
   */
  async findByTradeId(tradeId: string): Promise<TradingRecord> {
    const record = await this.prisma.tradingRecord.findUnique({
      where: { tradeId },
    });

    if (!record) {
      throw new NotFoundException(`交易记录 ${tradeId} 不存在`);
    }

    return record;
  }

  /**
   * 更新交易记录
   */
  async update(id: number, updateDto: UpdateTradingRecordDto): Promise<TradingRecord> {
    // 检查记录是否存在
    await this.findOne(id);

    // 验证数据一致性
    this.validateTradeData(updateDto);

    // 转换日期字符串为Date对象
    const data = {
      ...updateDto,
      entryTime: updateDto.entryTime ? new Date(updateDto.entryTime) : undefined,
      exitTime: updateDto.exitTime ? new Date(updateDto.exitTime) : undefined,
      syncedAt: updateDto.syncedAt ? new Date(updateDto.syncedAt) : undefined,
    };

    return this.prisma.tradingRecord.update({
      where: { id },
      data,
    });
  }

  /**
   * 删除交易记录
   */
  async remove(id: number): Promise<void> {
    // 检查记录是否存在
    await this.findOne(id);

    await this.prisma.tradingRecord.delete({
      where: { id },
    });
  }

  /**
   * 获取交易统计信息
   */
  async getStatistics(queryDto: TradingRecordStatsQueryDto) {
    const where = this.buildWhereCondition(queryDto);

    const [
      totalTrades,
      completedTrades,
      openTrades,
      profitableTrades,
      totalPnl,
      totalFees,
    ] = await Promise.all([
      this.prisma.tradingRecord.count({ where }),
      this.prisma.tradingRecord.count({ 
        where: { ...where, status: TradeStatus.CLOSED } 
      }),
      this.prisma.tradingRecord.count({ 
        where: { ...where, status: TradeStatus.OPEN } 
      }),
      this.prisma.tradingRecord.count({ 
        where: { 
          ...where, 
          status: TradeStatus.CLOSED,
          pnl: { gt: 0 }
        } 
      }),
      this.prisma.tradingRecord.aggregate({
        where: { ...where, status: TradeStatus.CLOSED },
        _sum: { pnl: true },
      }),
      this.prisma.tradingRecord.aggregate({
        where: { ...where, status: TradeStatus.CLOSED },
        _sum: { fees: true },
      }),
    ]);

    const winRate = completedTrades > 0 ? (profitableTrades / completedTrades) * 100 : 0;
    const totalPnlValue = totalPnl._sum.pnl ? Number(totalPnl._sum.pnl) : 0;
    const totalFeesValue = totalFees._sum.fees ? Number(totalFees._sum.fees) : 0;
    const netPnl = totalPnlValue - totalFeesValue;

    return {
      totalTrades,
      completedTrades,
      openTrades,
      profitableTrades,
      losingTrades: completedTrades - profitableTrades,
      winRate: Number(winRate.toFixed(2)),
      totalPnl: totalPnlValue,
      totalFees: totalFeesValue,
      netPnl,
      averagePnl: completedTrades > 0 ? totalPnlValue / completedTrades : 0,
    };
  }

  /**
   * 获取未同步到Notion的交易记录
   */
  async getUnsyncedRecords(): Promise<TradingRecord[]> {
    return this.prisma.tradingRecord.findMany({
      where: {
        notionSynced: false,
        status: TradeStatus.CLOSED, // 只同步已完成的交易
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 标记记录为已同步到Notion
   */
  async markAsSynced(id: number, notionPageId: string): Promise<TradingRecord> {
    return this.prisma.tradingRecord.update({
      where: { id },
      data: {
        notionSynced: true,
        notionPageId,
        syncedAt: new Date(),
      },
    });
  }

  /**
   * 构建查询条件
   */
  private buildWhereCondition(filters: any) {
    const where: any = {};

    if (filters.instrument) {
      where.instrument = filters.instrument;
    }

    if (filters.direction) {
      where.direction = filters.direction;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.notionSynced !== undefined) {
      where.notionSynced = filters.notionSynced;
    }

    if (filters.startTime || filters.endTime) {
      where.entryTime = {};
      if (filters.startTime) {
        where.entryTime.gte = new Date(filters.startTime);
      }
      if (filters.endTime) {
        where.entryTime.lte = new Date(filters.endTime);
      }
    }

    if (filters.minPnl !== undefined || filters.maxPnl !== undefined) {
      where.pnl = {};
      if (filters.minPnl !== undefined) {
        where.pnl.gte = filters.minPnl;
      }
      if (filters.maxPnl !== undefined) {
        where.pnl.lte = filters.maxPnl;
      }
    }

    if (filters.search) {
      where.OR = [
        { instrument: { contains: filters.search, mode: 'insensitive' } },
        { tradeId: { contains: filters.search, mode: 'insensitive' } },
        { notes: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  /**
   * 验证交易数据的一致性
   */
  private validateTradeData(data: Partial<CreateTradingRecordDto>) {
    // 验证时间逻辑
    if (data.entryTime && data.exitTime) {
      const entryTime = new Date(data.entryTime);
      const exitTime = new Date(data.exitTime);
      
      if (exitTime <= entryTime) {
        throw new BadRequestException('平仓时间必须晚于开仓时间');
      }
    }

    // 验证已完成交易必须有平仓信息
    if (data.status === TradeStatus.CLOSED) {
      if (!data.actualExitPrice && !data.exitTime) {
        throw new BadRequestException('已完成的交易必须有平仓价格和平仓时间');
      }
    }

    // 验证价格逻辑
    if (data.initialTakeProfit && data.initialStopLoss) {
      if (data.direction === TradeDirection.LONG) {
        if (data.initialTakeProfit <= data.initialStopLoss) {
          throw new BadRequestException('多头交易的止盈价格必须高于止损价格');
        }
      } else if (data.direction === TradeDirection.SHORT) {
        if (data.initialTakeProfit >= data.initialStopLoss) {
          throw new BadRequestException('空头交易的止盈价格必须低于止损价格');
        }
      }
    }
  }
} 