import axios from 'axios';

class ComprehensiveAnalysisTester {
  private readonly baseURL = 'http://localhost:3000';

  /**
   * 测试手动触发综合多周期分析
   */
  async testTriggerComprehensiveAnalysis(): Promise<void> {
    console.log('🧪 测试手动触发综合多周期分析...');
    
    try {
      const response = await axios.post(`${this.baseURL}/api/analysis/scheduled/comprehensive`);
      
      if (response.data.message) {
        console.log('✅ 综合多周期分析触发成功:');
        console.log(`   📝 ${response.data.message}`);
      } else {
        console.error('❌ 响应格式异常:', response.data);
      }
    } catch (error) {
      console.error('❌ 触发综合多周期分析失败:', error.response?.data || error.message);
    }
  }

  /**
   * 获取分析仪表板
   */
  async getAnalysisDashboard(): Promise<void> {
    console.log('📊 获取分析仪表板...');
    
    try {
      const response = await axios.get(`${this.baseURL}/api/analysis/dashboard`);
      
      if (response.data) {
        console.log('✅ 分析仪表板数据:');
        console.log(`   💰 总活跃币种: ${response.data.totalActiveCoins || 0}`);
        console.log(`   📈 最近分析: ${response.data.recentAnalysisCount || 0} 条`);
        console.log(`   ⚡ 系统状态: ${response.data.systemStatus || '未知'}`);
        
        if (response.data.recentAnalyses && response.data.recentAnalyses.length > 0) {
          console.log('   🎯 最近分析结果:');
          response.data.recentAnalyses.slice(0, 3).forEach((analysis: any, index: number) => {
            console.log(`      ${index + 1}. ${analysis.symbol}(${analysis.interval}) - ${analysis.signal} (${analysis.confidence}%)`);
          });
        }
      }
    } catch (error) {
      console.error('❌ 获取分析仪表板失败:', error.response?.data || error.message);
    }
  }

  /**
   * 检查币种配置
   */
  async checkCoinConfigs(): Promise<void> {
    console.log('⚙️ 检查币种配置...');
    
    try {
      const response = await axios.get(`${this.baseURL}/api/coins/active`);
      
      if (response.data && response.data.length > 0) {
        console.log(`✅ 发现 ${response.data.length} 个活跃配置:`);
        response.data.forEach((config: any) => {
          console.log(`   📊 ${config.symbol} (${config.interval}) - ${config.isActive ? '启用' : '禁用'}`);
        });
      } else {
        console.log('⚠️  没有发现活跃的币种配置');
      }
    } catch (error) {
      console.error('❌ 检查币种配置失败:', error.response?.data || error.message);
    }
  }

  /**
   * 检查最近的通知记录
   */
  async checkRecentNotifications(): Promise<void> {
    console.log('📬 检查最近的通知记录...');
    
    try {
      const response = await axios.post(`${this.baseURL}/api/notifications/list`, {
        page: 1,
        limit: 5
      });
      
      if (response.data && response.data.data) {
        const notifications = response.data.data;
        console.log(`✅ 发现 ${notifications.length} 条最近通知:`);
        
        notifications.forEach((notification: any, index: number) => {
          const time = new Date(notification.timestamp).toLocaleString('zh-CN');
          const typeEmoji = {
            info: 'ℹ️',
            success: '✅',
            warning: '⚠️',
            error: '❌'
          };
          
          console.log(`   ${typeEmoji[notification.type] || '📝'} [${time}] ${notification.title}`);
          if (notification.symbol) {
            console.log(`      💰 ${notification.symbol}(${notification.interval}) - ${notification.signal} (${notification.confidence}%)`);
          }
        });
      } else {
        console.log('📭 暂无通知记录');
      }
    } catch (error) {
      console.error('❌ 检查通知记录失败:', error.response?.data || error.message);
    }
  }

  /**
   * 等待并监控分析结果
   */
  async waitAndMonitorResults(durationMinutes: number = 2): Promise<void> {
    console.log(`⏰ 等待 ${durationMinutes} 分钟并监控分析结果...`);
    
    const endTime = Date.now() + (durationMinutes * 60 * 1000);
    let checkCount = 0;
    
    while (Date.now() < endTime) {
      checkCount++;
      console.log(`\n🔍 第 ${checkCount} 次检查 (${new Date().toLocaleTimeString()}):`);
      
      await this.checkRecentNotifications();
      
      // 等待30秒后再次检查
      await new Promise(resolve => setTimeout(resolve, 30000));
    }
    
    console.log('\n✅ 监控完成');
  }

  /**
   * 运行完整测试
   */
  async runFullTest(): Promise<void> {
    console.log('🧪 开始综合多周期分析功能测试...\n');

    try {
      // 1. 检查币种配置
      await this.checkCoinConfigs();
      console.log('');
      
      // 2. 获取分析仪表板
      await this.getAnalysisDashboard();
      console.log('');
      
      // 3. 检查最近通知
      await this.checkRecentNotifications();
      console.log('');
      
      // 4. 手动触发综合多周期分析
      await this.testTriggerComprehensiveAnalysis();
      console.log('');
      
      // 5. 等待并监控结果
      await this.waitAndMonitorResults(2);
      
      console.log('\n✅ 完整测试完成！');
      console.log('\n📱 请检查你的 Telegram 以确认通知功能正常工作');
      console.log('📊 新的综合多周期分析系统功能:');
      console.log('   • 每5分钟自动获取5m、15m、1h、4h周期数据');
      console.log('   • 综合分析多个时间周期');
      console.log('   • 统一发送分析结果通知');
      console.log('   • 取消了实时WebSocket K线订阅');
      console.log('   • 可手动触发综合分析测试');
      
    } catch (error) {
      console.error('\n❌ 测试失败:', error.message);
    }
  }
}

// 运行测试
const tester = new ComprehensiveAnalysisTester();
tester.runFullTest().catch(console.error); 