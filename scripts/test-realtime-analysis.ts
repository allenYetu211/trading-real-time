import axios from 'axios';

const BASE_URL = 'http://localhost:3000';

class RealtimeAnalysisTester {
  private baseUrl: string;

  constructor(baseUrl: string = BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * 测试手动触发定时分析
   */
  async testTriggerScheduledAnalysis(): Promise<void> {
    console.log('\n=== 测试手动触发定时分析 ===');

    try {
      const response = await axios.post(`${this.baseUrl}/api/analysis/scheduled/trigger`);
      
      console.log('✅ 定时分析触发成功');
      console.log('   响应:', response.data.message);
      console.log('   请等待约30-60秒查看 Telegram 通知');
      
      return response.data;
    } catch (error) {
      console.error('❌ 触发定时分析失败:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * 检查活跃配置
   */
  async checkActiveConfigs(): Promise<void> {
    console.log('\n=== 检查活跃交易对配置 ===');

    try {
      const response = await axios.get(`${this.baseUrl}/api/coins/active`);
      
      console.log('✅ 活跃配置:');
      response.data.forEach((config: any) => {
        console.log(`   📊 ${config.symbol} - ${config.interval} (ID: ${config.id})`);
      });
      
      if (response.data.length === 0) {
        console.log('⚠️  没有活跃配置，分析将无法执行');
      }
      
      return response.data;
    } catch (error) {
      console.error('❌ 获取活跃配置失败:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * 检查最新通知
   */
  async checkRecentNotifications(): Promise<void> {
    console.log('\n=== 检查最新通知记录 ===');

    try {
      const response = await axios.get(`${this.baseUrl}/api/notifications/latest?limit=5`);
      
      console.log('✅ 最新5条通知:');
      response.data.forEach((notification: any) => {
        const time = new Date(notification.timestamp).toLocaleTimeString('zh-CN');
        const symbol = notification.symbol ? `${notification.symbol}(${notification.interval})` : '';
        console.log(`   ${time} - ${notification.type} - ${notification.title} ${symbol}`);
      });
      
      return response.data;
    } catch (error) {
      console.error('❌ 获取最新通知失败:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * 获取分析仪表板
   */
  async getAnalysisDashboard(): Promise<void> {
    console.log('\n=== 分析仪表板概览 ===');

    try {
      const response = await axios.get(`${this.baseUrl}/api/analysis/dashboard`);
      
      console.log('✅ 分析概览:');
      console.log(`   总分析数: ${response.data.summary.totalAnalyzed}`);
      console.log(`   信号分布: BUY(${response.data.summary.signalDistribution.buy}) SELL(${response.data.summary.signalDistribution.sell}) NEUTRAL(${response.data.summary.signalDistribution.neutral})`);
      console.log(`   平均置信度: ${response.data.summary.averageConfidence}%`);
      
      if (response.data.summary.strongestSignal) {
        const signal = response.data.summary.strongestSignal;
        console.log(`   最强信号: ${signal.symbol}(${signal.interval}) ${signal.signal} 置信度:${signal.confidence}%`);
      }
      
      return response.data;
    } catch (error) {
      console.error('❌ 获取分析仪表板失败:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * 测试单个币种分析
   */
  async testSingleSymbolAnalysis(symbol: string = 'BTCUSDT', interval: string = '1h'): Promise<void> {
    console.log(`\n=== 测试单个币种分析: ${symbol}(${interval}) ===`);

    try {
      const response = await axios.post(
        `${this.baseUrl}/api/analysis/comprehensive/${symbol}/${interval}?limit=100`
      );
      
      console.log('✅ 分析完成:');
      console.log(`   交易对: ${response.data.symbol}(${response.data.interval})`);
      console.log(`   信号: ${response.data.score.signal}`);
      console.log(`   置信度: ${response.data.score.confidence}%`);
      console.log(`   趋势评分: ${response.data.score.trend}`);
      console.log(`   动量评分: ${response.data.score.momentum}`);
      console.log(`   波动性评分: ${response.data.score.volatility}`);
      console.log(`   总结: ${response.data.summary}`);
      
      return response.data;
    } catch (error) {
      console.error(`❌ 分析 ${symbol}(${interval}) 失败:`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * 监控实时通知
   */
  async monitorRealtimeNotifications(duration: number = 300): Promise<void> {
    console.log(`\n=== 监控实时通知 (${duration}秒) ===`);
    console.log('💡 提示: 系统会在以下情况发送 Telegram 通知:');
    console.log('   1. K线完结时的实时分析 (15m, 1h, 4h)');
    console.log('   2. 定时分析任务');
    console.log('   3. 手动触发的分析');
    
    let lastNotificationId = 0;
    
    try {
      // 获取当前最新通知ID
      const initialResponse = await axios.get(`${this.baseUrl}/api/notifications/latest?limit=1`);
      if (initialResponse.data.length > 0) {
        lastNotificationId = initialResponse.data[0].id;
      }
      
      console.log(`🔍 开始监控，当前最新通知ID: ${lastNotificationId}`);
      
      const startTime = Date.now();
      const endTime = startTime + (duration * 1000);
      
      while (Date.now() < endTime) {
        try {
          const response = await axios.get(`${this.baseUrl}/api/notifications/latest?limit=10`);
          const notifications = response.data;
          
          // 检查是否有新通知
          const newNotifications = notifications.filter((n: any) => n.id > lastNotificationId);
          
          if (newNotifications.length > 0) {
            newNotifications.reverse().forEach((notification: any) => {
              const time = new Date(notification.timestamp).toLocaleTimeString('zh-CN');
              const symbol = notification.symbol ? `${notification.symbol}(${notification.interval})` : '';
              console.log(`🆕 [${time}] ${notification.type.toUpperCase()} - ${notification.title} ${symbol}`);
              
              if (notification.signal) {
                console.log(`     信号: ${notification.signal} | 置信度: ${notification.confidence}%`);
              }
            });
            
            lastNotificationId = Math.max(...newNotifications.map((n: any) => n.id));
          }
          
          // 每5秒检查一次
          await new Promise(resolve => setTimeout(resolve, 5000));
          
        } catch (error) {
          console.error('检查通知时出错:', error.message);
        }
      }
      
      console.log('✅ 监控结束');
      
    } catch (error) {
      console.error('❌ 监控失败:', error.message);
    }
  }

  /**
   * 运行完整测试
   */
  async runFullTest(): Promise<void> {
    console.log('🧪 开始实时分析功能测试...\n');

    try {
      // 1. 检查系统状态
      await this.checkActiveConfigs();
      
      // 2. 获取分析仪表板
      await this.getAnalysisDashboard();
      
      // 3. 检查最新通知
      await this.checkRecentNotifications();
      
      // 4. 测试单个分析
      await this.testSingleSymbolAnalysis();
      
      // 5. 手动触发定时分析
      await this.testTriggerScheduledAnalysis();
      
      // 6. 监控实时通知
      console.log('\n⏰ 等待10秒后开始监控实时通知...');
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      await this.monitorRealtimeNotifications(60); // 监控1分钟
      
      console.log('\n✅ 完整测试完成！');
      console.log('\n📱 请检查你的 Telegram 以确认通知功能正常工作');
      console.log('📊 系统现在会在以下时机自动发送分析通知:');
      console.log('   • K线完结时 (实时分析)');
      console.log('   • 每15分钟 (15m周期定时分析)');
      console.log('   • 每小时 (1h周期定时分析)');
      console.log('   • 每4小时 (4h周期定时分析)');
      console.log('   • 每天早上8点 (日线分析)');
      
    } catch (error) {
      console.error('\n❌ 测试失败:', error.message);
    }
  }
}

// 运行测试
const tester = new RealtimeAnalysisTester();

// 检查命令行参数
const args = process.argv.slice(2);
if (args.includes('--monitor')) {
  // 仅监控模式
  tester.monitorRealtimeNotifications(300); // 监控5分钟
} else if (args.includes('--trigger')) {
  // 仅触发分析
  tester.testTriggerScheduledAnalysis();
} else {
  // 完整测试
  tester.runFullTest();
} 