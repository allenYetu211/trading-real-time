import axios from 'axios';

/**
 * 交易自动化功能集成测试脚本
 * 测试定时分析、实时监控、价格触发检测和通知功能
 */
class TradingAutomationTester {
  private readonly baseUrl = 'http://localhost:3000/api';
  
  constructor() {
    console.log('🚀 交易自动化功能测试器初始化');
  }

  /**
   * 运行完整测试套件
   */
  async runFullTest(): Promise<void> {
    console.log('\n' + '='.repeat(60));
    console.log('🔄 开始交易自动化功能完整测试');
    console.log('='.repeat(60));

    try {
      // 1. 测试系统状态
      await this.testSystemStatus();
      
      // 2. 测试手动触发分析
      await this.testManualAnalysis();
      
      // 3. 测试实时价格监控
      await this.testPriceMonitoring();
      
      // 4. 测试价格触发检测
      await this.testPriceTrigger();
      
      // 5. 测试通知功能
      await this.testNotifications();
      
      // 6. 综合测试
      await this.testIntegrationScenario();

      console.log('\n' + '='.repeat(60));
      console.log('✅ 所有测试完成！');
      console.log('='.repeat(60));

    } catch (error) {
      console.error('\n❌ 测试过程中发生错误:', error.message);
      throw error;
    }
  }

  /**
   * 测试系统状态
   */
  async testSystemStatus(): Promise<void> {
    console.log('\n📊 测试系统状态...');
    
    try {
      const response = await axios.get(`${this.baseUrl}/trading-automation/status`);
      
      if (response.data.success) {
        const status = response.data.data;
        console.log('✅ 系统状态获取成功:');
        console.log(`   • 分析服务运行中: ${status.analysis.isRunning ? '是' : '否'}`);
        console.log(`   • 价格监控连接: ${status.priceMonitor.isConnected ? '已连接' : '未连接'}`);
        console.log(`   • 监控交易对数量: ${status.priceMonitor.monitoredSymbolsCount}`);
        console.log(`   • 总触发次数: ${status.triggerDetection.totalTriggers}`);
        console.log(`   • 通知服务启用: ${status.notification.enabled ? '是' : '否'}`);
      } else {
        console.log('❌ 系统状态获取失败:', response.data.message);
      }
    } catch (error) {
      console.log('❌ 系统状态测试失败:', error.message);
    }
  }

  /**
   * 测试手动触发分析
   */
  async testManualAnalysis(): Promise<void> {
    console.log('\n🔍 测试手动触发技术分析...');
    
    try {
      // 测试单个交易对分析
      console.log('   测试SOLUSDT分析...');
      const response = await axios.post(`${this.baseUrl}/trading-automation/analysis/trigger?symbol=SOLUSDT`);
      
      if (response.data.success) {
        console.log('✅ SOLUSDT分析触发成功');
      } else {
        console.log('❌ SOLUSDT分析触发失败:', response.data.message);
      }

      // 等待分析完成
      console.log('   等待分析完成...');
      await this.sleep(10000); // 等待10秒

    } catch (error) {
      console.log('❌ 手动分析测试失败:', error.message);
    }
  }

  /**
   * 测试实时价格监控
   */
  async testPriceMonitoring(): Promise<void> {
    console.log('\n💰 测试实时价格监控...');
    
    try {
      // 添加监控
      console.log('   添加BTCUSDT到监控...');
      const addResponse = await axios.post(`${this.baseUrl}/trading-automation/monitor/BTCUSDT`);
      
      if (addResponse.data.success) {
        console.log('✅ BTCUSDT监控添加成功');
      }

      // 等待一段时间获取价格
      await this.sleep(5000);

      // 获取实时价格
      console.log('   获取实时价格...');
      const pricesResponse = await axios.get(`${this.baseUrl}/trading-automation/prices`);
      
      if (pricesResponse.data.success) {
        const prices = pricesResponse.data.data.prices;
        console.log('✅ 实时价格获取成功:');
        Object.entries(prices).forEach(([symbol, price]) => {
          console.log(`   • ${symbol}: $${price}`);
        });
      }

      // 获取单个交易对价格
      const solusdt = await axios.get(`${this.baseUrl}/trading-automation/prices/SOLUSDT`);
      if (solusdt.data.success) {
        console.log(`✅ SOLUSDT当前价格: $${solusdt.data.data.price}`);
      }

    } catch (error) {
      console.log('❌ 价格监控测试失败:', error.message);
    }
  }

  /**
   * 测试价格触发检测
   */
  async testPriceTrigger(): Promise<void> {
    console.log('\n⚡ 测试价格触发检测...');
    
    try {
      // 先获取SOLUSDT当前价格
      const priceResponse = await axios.get(`${this.baseUrl}/trading-automation/prices/SOLUSDT`);
      
      if (!priceResponse.data.success) {
        console.log('⚠️ 无法获取SOLUSDT价格，跳过触发测试');
        return;
      }

      const currentPrice = priceResponse.data.data.price;
      console.log(`   SOLUSDT当前价格: $${currentPrice}`);

      // 测试买入触发（价格降低5%）
      const buyTestPrice = currentPrice * 0.95;
      console.log(`   测试买入触发价格: $${buyTestPrice}`);
      
      const buyTest = await axios.post(`${this.baseUrl}/trading-automation/trigger/test`, {
        symbol: 'SOLUSDT',
        testPrice: buyTestPrice,
        sendNotification: false // 测试模式不发送实际通知
      });

      if (buyTest.data.success) {
        const result = buyTest.data.data;
        console.log(`✅ 买入触发测试: ${result.buyTriggered ? '会触发' : '不会触发'}`);
        if (result.notifications.length > 0) {
          console.log(`   发现 ${result.notifications.length} 个触发事件`);
        }
      }

      // 测试卖出触发（价格提高5%）
      const sellTestPrice = currentPrice * 1.05;
      console.log(`   测试卖出触发价格: $${sellTestPrice}`);
      
      const sellTest = await axios.post(`${this.baseUrl}/trading-automation/trigger/test`, {
        symbol: 'SOLUSDT',
        testPrice: sellTestPrice,
        sendNotification: false
      });

      if (sellTest.data.success) {
        const result = sellTest.data.data;
        console.log(`✅ 卖出触发测试: ${result.sellTriggered ? '会触发' : '不会触发'}`);
        if (result.notifications.length > 0) {
          console.log(`   发现 ${result.notifications.length} 个触发事件`);
        }
      }

    } catch (error) {
      console.log('❌ 价格触发测试失败:', error.message);
    }
  }

  /**
   * 测试通知功能
   */
  async testNotifications(): Promise<void> {
    console.log('\n📢 测试通知功能...');
    
    try {
      // 发送系统状态测试通知
      console.log('   发送系统状态测试通知...');
      const statusNotification = await axios.post(`${this.baseUrl}/trading-automation/notification/test`, {
        type: 'SYSTEM_STATUS',
        message: '交易自动化系统测试通知'
      });

      if (statusNotification.data.success) {
        console.log('✅ 系统状态通知发送成功');
      } else {
        console.log('❌ 系统状态通知发送失败');
      }

      // 等待一秒避免频繁发送
      await this.sleep(2000);

      // 发送价格触发测试通知
      console.log('   发送价格触发测试通知...');
      const triggerNotification = await axios.post(`${this.baseUrl}/trading-automation/notification/test`, {
        type: 'PRICE_TRIGGER',
        message: '价格触发测试通知'
      });

      if (triggerNotification.data.success) {
        console.log('✅ 价格触发通知发送成功');
      } else {
        console.log('❌ 价格触发通知发送失败');
      }

    } catch (error) {
      console.log('❌ 通知功能测试失败:', error.message);
    }
  }

  /**
   * 综合集成测试场景
   */
  async testIntegrationScenario(): Promise<void> {
    console.log('\n🔄 综合集成测试场景...');
    
    try {
      console.log('   场景: 完整的价格监控和触发流程');
      
      // 1. 刷新监控列表
      console.log('   1. 刷新监控列表...');
      const refreshResponse = await axios.post(`${this.baseUrl}/trading-automation/monitor/refresh`);
      if (refreshResponse.data.success) {
        console.log('✅ 监控列表刷新成功');
      }

      // 2. 等待监控数据
      console.log('   2. 等待监控数据收集...');
      await this.sleep(5000);

      // 3. 检查系统状态
      console.log('   3. 检查最终系统状态...');
      const finalStatus = await axios.get(`${this.baseUrl}/trading-automation/status`);
      
      if (finalStatus.data.success) {
        const status = finalStatus.data.data;
        console.log('✅ 最终系统状态:');
        console.log(`   • 价格监控活跃: ${status.priceMonitor.isConnected ? '是' : '否'}`);
        console.log(`   • 监控交易对: ${status.priceMonitor.monitoredSymbolsCount} 个`);
        console.log(`   • 累计触发: ${status.triggerDetection.totalTriggers} 次`);
        console.log(`   • 活跃冷却: ${status.triggerDetection.activeCooldowns} 个`);
      }

      console.log('✅ 综合集成测试完成');

    } catch (error) {
      console.log('❌ 综合集成测试失败:', error.message);
    }
  }

  /**
   * 监控实时价格变化
   */
  async monitorRealTimePrices(duration: number = 60): Promise<void> {
    console.log(`\n👀 监控实时价格变化 (${duration}秒)...`);
    
    const startTime = Date.now();
    const priceHistory = new Map<string, number[]>();
    
    while (Date.now() - startTime < duration * 1000) {
      try {
        const response = await axios.get(`${this.baseUrl}/trading-automation/prices`);
        
        if (response.data.success) {
          const prices = response.data.data.prices;
          const timestamp = new Date().toLocaleTimeString();
          
          console.log(`[${timestamp}] 价格更新:`);
          Object.entries(prices).forEach(([symbol, price]) => {
            // 记录价格历史
            if (!priceHistory.has(symbol)) {
              priceHistory.set(symbol, []);
            }
            priceHistory.get(symbol)!.push(price as number);
            
            // 显示价格和变化
            const history = priceHistory.get(symbol)!;
            const change = history.length > 1 ? 
              ((price as number) - history[history.length - 2]) / history[history.length - 2] * 100 : 0;
            
            const changeStr = change !== 0 ? 
              `(${change > 0 ? '+' : ''}${change.toFixed(4)}%)` : '';
            
            console.log(`   • ${symbol}: $${price} ${changeStr}`);
          });
        }
        
        await this.sleep(5000); // 每5秒检查一次
        
      } catch (error) {
        console.log(`❌ 价格监控错误: ${error.message}`);
      }
    }
    
    console.log('✅ 实时价格监控完成');
  }

  /**
   * 等待指定时间
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 运行测试
async function main() {
  const tester = new TradingAutomationTester();
  
  try {
    // 检查命令行参数
    const args = process.argv.slice(2);
    
    if (args.includes('--monitor')) {
      // 只运行实时监控
      const duration = parseInt(args[args.indexOf('--monitor') + 1]) || 60;
      await tester.monitorRealTimePrices(duration);
    } else {
      // 运行完整测试
      await tester.runFullTest();
      
      // 如果有 --continuous 参数，则继续监控
      if (args.includes('--continuous')) {
        console.log('\n🔄 进入持续监控模式...');
        await tester.monitorRealTimePrices(300); // 监控5分钟
      }
    }
    
  } catch (error) {
    console.error('❌ 测试执行失败:', error.message);
    process.exit(1);
  }
}

// 处理退出信号
process.on('SIGINT', () => {
  console.log('\n👋 测试被用户中断');
  process.exit(0);
});

// 启动测试
main().catch(console.error);