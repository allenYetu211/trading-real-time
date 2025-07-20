import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { CoinConfigService } from '../coin-config/coin-config.service';
import { WebSocketService } from './websocket/websocket.service';
import { DataService } from './data.service';
import { AnalysisService } from '../analysis/analysis.service';
import { NotificationService } from '../notification/notification.service';
import { IntervalType } from 'src/shared/enums';
import { ComprehensiveAnalysis } from 'src/shared/interfaces/analysis.interface';

@Injectable()
export class StartupService implements OnApplicationBootstrap {
  private readonly logger = new Logger(StartupService.name);

  constructor(
    private readonly coinConfigService: CoinConfigService,
    private readonly webSocketService: WebSocketService,
    private readonly dataService: DataService,
    private readonly analysisService: AnalysisService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * 系统启动时执行
   */
  async onApplicationBootstrap(): Promise<void> {
    await this.initializeSystem();
  }

  /**
   * 初始化系统
   */
  private async initializeSystem(): Promise<void> {
    try {
      // this.displayWelcomeBanner();
      
      await this.ensureDefaultConfigs();
      await this.fetchInitialKlineData(); // 获取初始K线数据
      // 注释掉WebSocket自动订阅功能
      // await this.startAutoSubscription();
      await this.performInitialAnalysis(); // 执行初始分析
      
      // this.displaySuccessBanner();
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
   * 获取初始K线数据
   */
  private async fetchInitialKlineData(): Promise<void> {
    this.logger.log('📊 获取初始K线数据...');
    
    const activeConfigs = await this.coinConfigService.findActiveConfigs();
    
    if (activeConfigs.length === 0) {
      this.logger.warn('⚠️  没有活跃配置，跳过数据获取');
      return;
    }

    // 定义需要获取的时间周期
    const intervals = [
      IntervalType.FIFTEEN_MINUTES,
      IntervalType.ONE_HOUR,
      IntervalType.FOUR_HOURS,
      IntervalType.ONE_DAY
    ];

    // 获取每个时间周期的最大K线数量（根据Binance API限制）
    const maxLimits = {
      [IntervalType.FIFTEEN_MINUTES]: 1000, // 15分钟：约10.4天
      [IntervalType.ONE_HOUR]: 1000,        // 1小时：约41.7天
      [IntervalType.FOUR_HOURS]: 1000,      // 4小时：约166.7天
      [IntervalType.ONE_DAY]: 1000          // 1日：约2.7年
    };

    const totalSymbols = activeConfigs.length;
    let completedSymbols = 0;
    let totalKlineCount = 0;

    for (const config of activeConfigs) {
      const symbol = config.symbol;
      
      this.logger.log(`🔄 正在获取 ${symbol} 的多周期数据... (${completedSymbols + 1}/${totalSymbols})`);
      
      // 并行获取所有时间周期的数据，但添加错误处理
      const fetchPromises = intervals.map(async (interval) => {
        try {
          const limit = maxLimits[interval];
          const data = await this.dataService.getKlineData({
            symbol,
            interval,
            limit
          });
          
          // this.logger.log(`   ✅ ${symbol} ${interval}: ${data.length}条K线数据`);
          return { symbol, interval, count: data.length, success: true };
        } catch (error) {
          this.logger.error(`   ❌ ${symbol} ${interval} 获取失败，不进行重试:`, error.message);
          return { symbol, interval, count: 0, error: error.message, success: false };
        }
      });

      try {
        const results = await Promise.all(fetchPromises);
        const successfulResults = results.filter(result => result.success);
        const failedResults = results.filter(result => !result.success);
        
        const symbolKlineCount = successfulResults.reduce((sum, result) => sum + result.count, 0);
        totalKlineCount += symbolKlineCount;
        
        if (failedResults.length === 0) {
          // this.logger.log(`🎯 ${symbol} 数据获取完成，总计 ${symbolKlineCount} 条K线`);
        } else {
          // this.logger.warn(`⚠️  ${symbol} 部分数据获取失败 (${failedResults.length}/${intervals.length}个周期失败)`);
          
          // 发送错误通知
          await this.notificationService.sendNotification({
            title: `⚠️ ${symbol} 数据获取部分失败`,
            message: `${failedResults.length}个时间周期的数据获取失败`,
            type: 'warning',
            timestamp: new Date().toLocaleString('zh-CN'),
            data: { symbol, failedIntervals: failedResults.map(r => r.interval) }
          });
        }
      } catch (error) {
        this.logger.error(`❌ ${symbol} 数据获取整体失败:`, error);
        
        // 发送错误通知
        await this.notificationService.sendNotification({
          title: `❌ ${symbol} 数据获取失败`,
          message: `无法获取任何时间周期的数据: ${error.message}`,
          type: 'error',
          timestamp: new Date().toLocaleString('zh-CN'),
          data: { symbol, error: error.message }
        });
      }
      
      completedSymbols++;
    }
    
    this.logger.log(`📈 初始K线数据获取完成，总计 ${totalKlineCount} 条K线数据，覆盖 ${completedSymbols} 个币种`);
  }

  /**
   * 执行初始分析
   */
  private async performInitialAnalysis(): Promise<void> {
    this.logger.log('🔍 执行初始图像结构分析...');
    
    const activeConfigs = await this.coinConfigService.findActiveConfigs();
    
    if (activeConfigs.length === 0) {
      this.logger.warn('⚠️  没有活跃配置，跳过分析');
      return;
    }

    // 主要分析周期
    const analysisIntervals = [
      IntervalType.ONE_HOUR,
      IntervalType.FOUR_HOURS,
      IntervalType.ONE_DAY
    ];

    let totalAnalysisCount = 0;
    let successfulAnalysisCount = 0;

    for (const config of activeConfigs) {
      const symbol = config.symbol;
      
      // this.logger.log(`🎯 分析 ${symbol} 的图像结构...`);
      
      for (const interval of analysisIntervals) {
        totalAnalysisCount++;
        
        try {
          const analysis = await this.analysisService.performComprehensiveAnalysis(
            symbol,
            interval,
            100 // 分析最近100根K线
          );

          // 发送通知
          await this.sendAnalysisNotification(symbol, interval, analysis);
          successfulAnalysisCount++;
          
          // 在分析间添加小延迟，避免过度负载
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (error) {
          this.logger.error(`❌ ${symbol} ${interval} 分析失败:`, error.message);
          
          // 发送分析失败通知
          await this.notificationService.sendNotification({
            title: `❌ ${symbol}(${interval}) 分析失败`,
            message: `图像结构分析出现错误: ${error.message}`,
            type: 'error',
            timestamp: new Date().toLocaleString('zh-CN'),
            data: { symbol, interval, error: error.message }
          });
        }
      }
    }
    
    const successRate = ((successfulAnalysisCount / totalAnalysisCount) * 100).toFixed(1);
    // this.logger.log(`✅ 初始分析完成: ${successfulAnalysisCount}/${totalAnalysisCount} 成功 (${successRate}%)`);
    
    // 发送分析完成总结通知
    await this.notificationService.sendNotification({
      title: '📊 启动分析完成',
      message: `初始图像结构分析已完成，成功率: ${successRate}%`,
      type: successfulAnalysisCount === totalAnalysisCount ? 'success' : 'warning',
      timestamp: new Date().toLocaleString('zh-CN'),
      data: {
        total: totalAnalysisCount,
        successful: successfulAnalysisCount,
        successRate: parseFloat(successRate)
      }
    });
  }

  /**
   * 发送分析通知
   */
  private async sendAnalysisNotification(
    symbol: string, 
    interval: IntervalType, 
    analysis: ComprehensiveAnalysis
  ): Promise<void> {
    try {
      await this.notificationService.sendAnalysisNotification(symbol, interval, analysis);
    } catch (error) {
      this.logger.error('发送通知失败:', error);
    }
  }

  /**
   * 显示成功横幅
   */
  private displaySuccessBanner(): void {
    const banner = `
╔══════════════════════════════════════════════════════════╗
║             ✅ 系统启动完成！                              ║
║                                                          ║
║  🔄 实时数据监控已启动                                      ║
║  📊 数据将显示在控制台日志中                                 ║
║  💾 完结的K线会自动保存到数据库                              ║
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