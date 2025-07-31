import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCoinConfigDto, UpdateCoinConfigDto, CoinConfigListDto } from './dto';

@Injectable()
export class CoinConfigService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建币种配置
   */
  async create(createCoinConfigDto: CreateCoinConfigDto) {
    const { symbol, interval } = createCoinConfigDto;

    try {
      return await this.prisma.coinConfig.create({
        data: createCoinConfigDto,
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException(`交易对 ${symbol} 的 ${interval} 配置已存在`);
      }
      throw error;
    }
  }

  /**
   * 查询币种配置列表
   */
  async findAll(query: CoinConfigListDto) {
    const where: any = {};

    if (query.symbol) {
      where.symbol = query.symbol;
    }

    if (query.interval) {
      where.interval = query.interval;
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    return await this.prisma.coinConfig.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 根据ID查询币种配置
   */
  async findOne(id: number) {
    const coinConfig = await this.prisma.coinConfig.findUnique({
      where: { id },
    });

    if (!coinConfig) {
      throw new NotFoundException(`ID为 ${id} 的币种配置不存在`);
    }

    return coinConfig;
  }

  /**
   * 根据交易对查询配置（返回第一个匹配的）
   */
  async findBySymbol(symbol: string) {
    return await this.prisma.coinConfig.findFirst({
      where: { symbol },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 根据交易对和时间间隔查询配置
   */
  async findBySymbolAndInterval(symbol: string, interval: string) {
    return await this.prisma.coinConfig.findFirst({
      where: {
        symbol,
        interval,
      },
    });
  }

  /**
   * 获取所有活跃的配置
   */
  async findActiveConfigs() {
    return await this.prisma.coinConfig.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 更新币种配置
   */
  async update(id: number, updateCoinConfigDto: UpdateCoinConfigDto) {
    // 先检查配置是否存在
    await this.findOne(id);

    try {
      return await this.prisma.coinConfig.update({
        where: { id },
        data: updateCoinConfigDto,
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        const symbol = updateCoinConfigDto.symbol;
        const interval = updateCoinConfigDto.interval;
        throw new ConflictException(
          `交易对 ${symbol || '未知'} 的 ${interval || '未知'} 配置已存在`
        );
      }
      throw error;
    }
  }

  /**
   * 删除币种配置
   */
  async remove(id: number): Promise<void> {
    // 先检查配置是否存在
    await this.findOne(id);

    await this.prisma.coinConfig.delete({
      where: { id },
    });
  }

  /**
   * 批量启用/禁用配置
   */
  async updateActiveStatus(ids: number[], isActive: boolean): Promise<void> {
    await this.prisma.coinConfig.updateMany({
      where: {
        id: {
          in: ids,
        },
      },
      data: {
        isActive,
      },
    });
  }

  /**
   * 获取配置统计信息
   */
  async getStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    byInterval: Record<string, number>;
  }> {
    const [totalCount, activeCount] = await Promise.all([
      this.prisma.coinConfig.count(),
      this.prisma.coinConfig.count({ where: { isActive: true } }),
    ]);

    // 按时间间隔分组统计
    const intervalStats = await this.prisma.coinConfig.groupBy({
      by: ['interval'],
      _count: {
        interval: true,
      },
    });

    const byInterval = intervalStats.reduce((acc, item) => {
      acc[item.interval] = item._count.interval;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: totalCount,
      active: activeCount,
      inactive: totalCount - activeCount,
      byInterval,
    };
  }

  /**
   * 批量创建配置（避免重复）
   */
  async createMany(configs: CreateCoinConfigDto[]): Promise<{ count: number }> {
    return await this.prisma.coinConfig.createMany({
      data: configs,
      skipDuplicates: true,
    });
  }

  /**
   * 检查配置是否存在
   */
  async exists(symbol: string, interval: string): Promise<boolean> {
    const count = await this.prisma.coinConfig.count({
      where: {
        symbol,
        interval,
      },
    });
    return count > 0;
  }
} 