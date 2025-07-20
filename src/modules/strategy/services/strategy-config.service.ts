import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateStrategyDto, UpdateStrategyDto } from '../dto';
import { StrategyConfig } from '../interfaces/strategy.interface';
import { StrategyStatus } from '../enums';

@Injectable()
export class StrategyConfigService {
  private readonly logger = new Logger(StrategyConfigService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建策略配置
   */
  async createStrategy(dto: CreateStrategyDto): Promise<StrategyConfig> {
    this.logger.log(`创建策略: ${dto.name} - ${dto.symbol}/${dto.interval}`);

    const strategy = await this.prisma.strategyConfig.create({
      data: {
        name: dto.name,
        type: dto.type,
        status: dto.status || StrategyStatus.INACTIVE,
        symbol: dto.symbol,
        interval: dto.interval,
        parameters: JSON.stringify(dto.parameters),
        riskManagement: JSON.stringify(dto.riskManagement),
      },
    });

    return this.mapToInterface(strategy);
  }

  /**
   * 获取策略配置列表
   */
  async getStrategies(params?: {
    symbol?: string;
    interval?: string;
    status?: StrategyStatus;
    type?: string;
  }): Promise<StrategyConfig[]> {
    const where: any = {};
    
    if (params?.symbol) where.symbol = params.symbol;
    if (params?.interval) where.interval = params.interval;
    if (params?.status) where.status = params.status;
    if (params?.type) where.type = params.type;

    const strategies = await this.prisma.strategyConfig.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return strategies.map(this.mapToInterface);
  }

  /**
   * 获取单个策略配置
   */
  async getStrategy(id: number): Promise<StrategyConfig> {
    const strategy = await this.prisma.strategyConfig.findUnique({
      where: { id },
    });

    if (!strategy) {
      throw new NotFoundException(`策略配置不存在: ${id}`);
    }

    return this.mapToInterface(strategy);
  }

  /**
   * 更新策略配置
   */
  async updateStrategy(id: number, dto: UpdateStrategyDto): Promise<StrategyConfig> {
    this.logger.log(`更新策略: ${id}`);

    const updateData: any = {};
    
    if (dto.name) updateData.name = dto.name;
    if (dto.type) updateData.type = dto.type;
    if (dto.status) updateData.status = dto.status;
    if (dto.symbol) updateData.symbol = dto.symbol;
    if (dto.interval) updateData.interval = dto.interval;
    if (dto.parameters) updateData.parameters = JSON.stringify(dto.parameters);
    if (dto.riskManagement) updateData.riskManagement = JSON.stringify(dto.riskManagement);

    try {
      const strategy = await this.prisma.strategyConfig.update({
        where: { id },
        data: updateData,
      });

      return this.mapToInterface(strategy);
    } catch (error) {
      throw new NotFoundException(`策略配置不存在: ${id}`);
    }
  }

  /**
   * 删除策略配置
   */
  async deleteStrategy(id: number): Promise<void> {
    this.logger.log(`删除策略: ${id}`);

    try {
      await this.prisma.strategyConfig.delete({
        where: { id },
      });
    } catch (error) {
      throw new NotFoundException(`策略配置不存在: ${id}`);
    }
  }

  /**
   * 启动策略
   */
  async startStrategy(id: number): Promise<StrategyConfig> {
    this.logger.log(`启动策略: ${id}`);
    
    return this.updateStrategy(id, { status: StrategyStatus.ACTIVE });
  }

  /**
   * 停止策略
   */
  async stopStrategy(id: number): Promise<StrategyConfig> {
    this.logger.log(`停止策略: ${id}`);
    
    return this.updateStrategy(id, { status: StrategyStatus.STOPPED });
  }

  /**
   * 暂停策略
   */
  async pauseStrategy(id: number): Promise<StrategyConfig> {
    this.logger.log(`暂停策略: ${id}`);
    
    return this.updateStrategy(id, { status: StrategyStatus.PAUSED });
  }

  /**
   * 获取活跃策略
   */
  async getActiveStrategies(): Promise<StrategyConfig[]> {
    return this.getStrategies({ status: StrategyStatus.ACTIVE });
  }

  /**
   * 获取策略统计
   */
  async getStrategyStats() {
    const [total, active, inactive, paused, stopped] = await Promise.all([
      this.prisma.strategyConfig.count(),
      this.prisma.strategyConfig.count({ where: { status: StrategyStatus.ACTIVE } }),
      this.prisma.strategyConfig.count({ where: { status: StrategyStatus.INACTIVE } }),
      this.prisma.strategyConfig.count({ where: { status: StrategyStatus.PAUSED } }),
      this.prisma.strategyConfig.count({ where: { status: StrategyStatus.STOPPED } }),
    ]);

    return {
      total,
      statusDistribution: {
        active,
        inactive,
        paused,
        stopped,
      },
      timestamp: Date.now(),
    };
  }

  /**
   * 数据库模型转换为接口
   */
  private mapToInterface(strategy: any): StrategyConfig {
    return {
      id: strategy.id,
      name: strategy.name,
      type: strategy.type,
      status: strategy.status,
      symbol: strategy.symbol,
      interval: strategy.interval,
      parameters: JSON.parse(strategy.parameters),
      riskManagement: JSON.parse(strategy.riskManagement),
      createdAt: strategy.createdAt,
      updatedAt: strategy.updatedAt,
    };
  }
} 