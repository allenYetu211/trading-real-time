import axios from 'axios';

const BASE_URL = 'http://localhost:3000';

class TelegramTester {
  private baseUrl: string;

  constructor(baseUrl: string = BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * 测试 Telegram 服务状态
   */
  async testTelegramStatus(): Promise<void> {
    console.log('\n=== 测试 Telegram 服务状态 ===');

    try {
      const response = await axios.get(`${this.baseUrl}/api/notifications/telegram/status`);
      
      console.log('✅ Telegram 服务状态:');
      console.log(`   启用状态: ${response.data.enabled ? '已启用' : '未启用'}`);
      console.log(`   连接状态: ${response.data.connected ? '已连接' : '未连接'}`);
      
      if (response.data.botInfo) {
        console.log('   Bot 信息:');
        console.log(`     ID: ${response.data.botInfo.id}`);
        console.log(`     用户名: @${response.data.botInfo.username}`);
        console.log(`     名称: ${response.data.botInfo.firstName}`);
      }

      return response.data;
    } catch (error) {
      console.error('❌ 获取 Telegram 服务状态失败:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * 测试 Telegram 连接
   */
  async testTelegramConnection(): Promise<void> {
    console.log('\n=== 测试 Telegram 连接 ===');

    try {
      const response = await axios.post(`${this.baseUrl}/api/notifications/telegram/test`);
      
      console.log(`${response.data.success ? '✅' : '❌'} ${response.data.message}`);
      
      if (response.data.botInfo) {
        console.log('   Bot 信息:');
        console.log(`     ID: ${response.data.botInfo.id}`);
        console.log(`     用户名: @${response.data.botInfo.username}`);
        console.log(`     名称: ${response.data.botInfo.firstName}`);
      }

      return response.data;
    } catch (error) {
      console.error('❌ Telegram 连接测试失败:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * 测试发送自定义消息
   */
  async testSendCustomMessage(): Promise<void> {
    console.log('\n=== 测试发送自定义消息 ===');

    const testMessage = `🧪 Telegram 测试消息

这是一条来自交易系统的测试消息。

⏰ 发送时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}
🔧 测试功能: 自定义消息发送
✨ 状态: 正常`;

    try {
      const response = await axios.post(
        `${this.baseUrl}/api/notifications/telegram/send`,
        { message: testMessage },
        { headers: { 'Content-Type': 'application/json' } }
      );
      
      console.log(`${response.data.success ? '✅' : '❌'} ${response.data.message}`);
      
      return response.data;
    } catch (error) {
      console.error('❌ 发送自定义消息失败:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * 测试创建带 Telegram 通知的系统通知
   */
  async testSystemNotificationWithTelegram(): Promise<void> {
    console.log('\n=== 测试系统通知（含 Telegram） ===');

    const testData = {
      title: '🔔 系统通知测试',
      message: '这是一条系统通知测试消息，将同时发送到数据库和 Telegram',
      type: 'info',
      timestamp: new Date().toISOString(),
    };

    try {
      const response = await axios.post(
        `${this.baseUrl}/api/notifications/create`,
        testData,
        { headers: { 'Content-Type': 'application/json' } }
      );
      
      console.log('✅ 系统通知创建成功（已同步到 Telegram）');
      console.log('   通知 ID:', response.data.id);
      console.log('   标题:', response.data.title);
      
      return response.data;
    } catch (error) {
      console.error('❌ 创建系统通知失败:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * 测试创建带 Telegram 通知的分析通知
   */
  async testAnalysisNotificationWithTelegram(): Promise<void> {
    console.log('\n=== 测试分析通知（含 Telegram） ===');

    const testData = {
      title: '🚀 BTCUSDT(1h) 技术分析测试',
      message: 'BUY 信号 (测试置信度)',
      type: 'success',
      symbol: 'BTCUSDT',
      interval: '1h',
      signal: 'BUY',
      confidence: 88.5,
      summary: '这是一条测试分析通知，用于验证 Telegram 集成功能。技术指标显示上涨信号。',
      patterns: '测试形态: 金叉形态, 上升三角形',
      supportResistance: '测试关键位: 3个关键支撑位',
      data: JSON.stringify({
        test: true,
        price: 42500,
        volume: 1234567,
        indicators: ['RSI', 'MACD', 'MA'],
      }),
      timestamp: new Date().toISOString(),
    };

    try {
      const response = await axios.post(
        `${this.baseUrl}/api/notifications/create`,
        testData,
        { headers: { 'Content-Type': 'application/json' } }
      );
      
      console.log('✅ 分析通知创建成功（已同步到 Telegram）');
      console.log('   通知 ID:', response.data.id);
      console.log('   交易对:', response.data.symbol);
      console.log('   信号:', response.data.signal);
      console.log('   置信度:', response.data.confidence);
      
      return response.data;
    } catch (error) {
      console.error('❌ 创建分析通知失败:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * 测试多种类型的通知
   */
  async testMultipleNotificationTypes(): Promise<void> {
    console.log('\n=== 测试多种类型通知 ===');

    const notifications = [
      {
        title: '✅ 成功通知测试',
        message: '系统操作执行成功',
        type: 'success',
      },
      {
        title: '⚠️ 警告通知测试',
        message: '检测到潜在风险，请注意',
        type: 'warning',
      },
      {
        title: '❌ 错误通知测试',
        message: '系统遇到错误，需要处理',
        type: 'error',
      },
    ];

    for (const notification of notifications) {
      try {
        const response = await axios.post(
          `${this.baseUrl}/api/notifications/create`,
          {
            ...notification,
            timestamp: new Date().toISOString(),
          },
          { headers: { 'Content-Type': 'application/json' } }
        );
        
        console.log(`✅ ${notification.type} 类型通知发送成功`);
        
        // 间隔 1 秒避免过于频繁
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`❌ ${notification.type} 类型通知发送失败:`, error.response?.data || error.message);
      }
    }
  }

  /**
   * 运行所有测试
   */
  async runAllTests(): Promise<void> {
    console.log('🧪 开始测试 Telegram 通知功能...\n');

    try {
      // 1. 检查服务状态
      await this.testTelegramStatus();

      // 2. 测试连接
      await this.testTelegramConnection();

      // 3. 测试自定义消息
      await this.testSendCustomMessage();

      // 等待一秒
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 4. 测试系统通知
      await this.testSystemNotificationWithTelegram();

      // 等待一秒
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 5. 测试分析通知
      await this.testAnalysisNotificationWithTelegram();

      // 等待一秒
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 6. 测试多种类型通知
      await this.testMultipleNotificationTypes();

      console.log('\n✅ 所有 Telegram 测试完成！');
      console.log('\n📱 请检查你的 Telegram 以确认消息已正确接收。');
    } catch (error) {
      console.error('\n❌ Telegram 测试失败:', error.message);
      console.log('\n💡 提示:');
      console.log('   1. 确保已正确配置 TELEGRAM_BOT_TOKEN 和 TELEGRAM_CHAT_ID');
      console.log('   2. 确保 TELEGRAM_ENABLED=true');
      console.log('   3. 检查 Bot 是否有发送消息权限');
      console.log('   4. 参考 src/modules/notification/TELEGRAM_SETUP.md 获取配置帮助');
    }
  }
}

// 运行测试
const tester = new TelegramTester();
tester.runAllTests(); 