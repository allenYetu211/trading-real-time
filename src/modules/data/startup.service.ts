import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { CoinConfigService } from '../coin-config/coin-config.service';
import { WebSocketService } from './websocket/websocket.service';
import { IntervalType } from 'src/shared/enums';

@Injectable()
export class StartupService implements OnApplicationBootstrap {
  private readonly logger = new Logger(StartupService.name);

  constructor(
    private readonly coinConfigService: CoinConfigService,
    private readonly webSocketService: WebSocketService,
  ) {}

  async onApplicationBootstrap() {
    // 延迟5秒后启动，确保数据库连接和其他服务已准备就绪
    setTimeout(async () => {
      await this.initializeSystem();
    }, 5000);
  }

  /**
   * 初始化系统
   */
  private async initializeSystem(): Promise<void> {
    try {
      this.displayWelcomeBanner();
      
      await this.ensureDefaultConfigs();
      await this.startAutoSubscription();
      
      this.displaySuccessBanner();
    } catch (error) {
      this.logger.error('❌ 系统初始化失败:', error);
    }
  }

  /**
   * 显示欢迎横幅
   */
  private displayWelcomeBanner(): void {
    const banner = `
╔══════════════════════════════════════════════════════════╗
║             🚀 实时交易数据监控系统                       ║
║                                                          ║
║  📊 多币种K线数据实时监控                                 ║
║  🔄 自动订阅活跃配置                                     ║
║  💾 自动数据存储                                         ║
║  📈 实时价格显示                                         ║
║                                                          ║
║  正在初始化系统...                                       ║
╚══════════════════════════════════════════════════════════╝
    `;
    
    this.logger.log(banner);
  }

  /**
   * 确保默认配置存在
   */
  private async ensureDefaultConfigs(): Promise<void> {
    this.logger.log('🔍 检查币种配置...');
    
    const activeConfigs = await this.coinConfigService.findActiveConfigs();
    
    if (activeConfigs.length === 0) {
      this.logger.log('📝 创建默认监控配置...');
      await this.createDefaultConfigs();
    } else {
      this.logger.log(`📋 发现 ${activeConfigs.length} 个活跃配置:`);
      activeConfigs.forEach(config => {
        this.logger.log(`   • ${config.symbol} - ${config.interval}`);
      });
    }
  }

  /**
   * 创建默认配置
   */
  private async createDefaultConfigs(): Promise<void> {
    const defaultConfigs = [
      { symbol: 'BTCUSDT', interval: IntervalType.ONE_HOUR, name: 'Bitcoin 1小时' },
      { symbol: 'ETHUSDT', interval: IntervalType.FOUR_HOURS, name: 'Ethereum 4小时' },
      { symbol: 'ADAUSDT', interval: IntervalType.FIFTEEN_MINUTES, name: 'Cardano 15分钟' },
    ];

    for (const config of defaultConfigs) {
      try {
        await this.coinConfigService.create({
          symbol: config.symbol,
          interval: config.interval,
          isActive: true,
        });
        this.logger.log(`   ✅ ${config.name} 配置已创建`);
      } catch (error) {
        if (error.message?.includes('已存在')) {
          this.logger.log(`   ⏭️  ${config.name} 配置已存在`);
        } else {
          this.logger.error(`   ❌ ${config.name} 配置创建失败:`, error.message);
        }
      }
    }
  }

  /**
   * 启动自动订阅
   */
  private async startAutoSubscription(): Promise<void> {
    this.logger.log('🚀 启动自动订阅服务...');
    
    const activeConfigs = await this.coinConfigService.findActiveConfigs();
    
    if (activeConfigs.length === 0) {
      this.logger.warn('⚠️  没有可订阅的活跃配置');
      return;
    }

    const configs = activeConfigs.map(config => ({
      symbol: config.symbol,
      interval: config.interval as IntervalType,
    }));

    try {
      await this.webSocketService.subscribeMultipleKlines(configs);
      this.logger.log(`✅ 成功订阅 ${configs.length} 个数据流`);
    } catch (error) {
      this.logger.error('❌ 自动订阅失败:', error);
    }
  }

  /**
   * 显示成功横幅
   */
  private displaySuccessBanner(): void {
    const banner = `
╔══════════════════════════════════════════════════════════╗
║             ✅ 系统启动完成！                             ║
║                                                          ║
║  🔄 实时数据监控已启动                                   ║
║  📊 数据将显示在控制台日志中                             ║
║  💾 完结的K线会自动保存到数据库                          ║
║                                                          ║
║  💡 管理命令:                                            ║
║     ./scripts/manage.sh ws-status    - 查看连接状态      ║
║     ./scripts/manage.sh test         - 测试API          ║
║     ./scripts/manage.sh add SYMBOL INTERVAL - 添加配置   ║
║                                                          ║
║  📈 实时价格更新即将开始...                              ║
╚══════════════════════════════════════════════════════════╝
    `;
    
    // 延迟3秒显示成功消息，让WebSocket有时间连接
    setTimeout(() => {
      this.logger.log(banner);
    }, 3000);
  }
} 