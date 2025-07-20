import axios from 'axios';

const BASE_URL = 'http://localhost:3000';

interface NotificationTestData {
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  symbol?: string;
  interval?: string;
  signal?: string;
  confidence?: number;
  summary?: string;
  patterns?: string;
  supportResistance?: string;
  data?: string;
  timestamp: string;
}

class NotificationTester {
  private baseUrl: string;

  constructor(baseUrl: string = BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * 测试创建通知记录
   */
  async testCreateNotification(): Promise<void> {
    console.log('\n=== 测试创建通知记录 ===');

    const testData: NotificationTestData = {
      title: '🚀 BTCUSDT(1h) 图像结构分析',
      message: 'BUY 信号 (高置信度)',
      type: 'success',
      symbol: 'BTCUSDT',
      interval: '1h',
      signal: 'BUY',
      confidence: 85.5,
      summary: '技术指标显示强烈上涨信号，多项指标共振',
      patterns: '金叉形态, 上升楔形',
      supportResistance: '3个关键位',
      data: JSON.stringify({
        price: 42500,
        volume: 1234567,
        indicators: ['RSI', 'MACD', 'MA']
      }),
      timestamp: new Date().toISOString(),
    };

    try {
      const response = await axios.post(
        `${this.baseUrl}/api/notifications/create`,
        testData,
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );

      console.log('✅ 创建通知记录成功:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ 创建通知记录失败:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * 测试查询通知记录列表
   */
  async testGetNotificationList(): Promise<void> {
    console.log('\n=== 测试查询通知记录列表 ===');

    const queryData = {
      type: 'success',
      symbol: 'BTCUSDT',
      page: 1,
      limit: 10,
    };

    try {
      const response = await axios.post(
        `${this.baseUrl}/api/notifications/list`,
        queryData,
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );

      console.log('✅ 查询通知记录列表成功:');
      console.log(`   总数: ${response.data.total}`);
      console.log(`   页码: ${response.data.page}/${Math.ceil(response.data.total / response.data.limit)}`);
      console.log(`   记录数: ${response.data.data.length}`);
      
      if (response.data.data.length > 0) {
        console.log('   最新记录:', response.data.data[0]);
      }

      return response.data;
    } catch (error) {
      console.error('❌ 查询通知记录列表失败:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * 测试获取通知统计
   */
  async testGetNotificationStats(): Promise<void> {
    console.log('\n=== 测试获取通知统计 ===');

    try {
      const response = await axios.get(
        `${this.baseUrl}/api/notifications/stats`
      );

      console.log('✅ 获取通知统计成功:');
      console.log('   统计数据:', response.data);

      return response.data;
    } catch (error) {
      console.error('❌ 获取通知统计失败:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * 测试获取通知历史（兼容性接口）
   */
  async testGetNotificationHistory(): Promise<void> {
    console.log('\n=== 测试获取通知历史 ===');

    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await axios.get(
        `${this.baseUrl}/api/notifications/history?date=${today}`
      );

      console.log('✅ 获取通知历史成功:');
      console.log(`   记录数: ${response.data.length}`);
      
      if (response.data.length > 0) {
        console.log('   最新记录:', response.data[0]);
      }

      return response.data;
    } catch (error) {
      console.error('❌ 获取通知历史失败:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * 批量创建测试数据
   */
  async createTestData(): Promise<void> {
    console.log('\n=== 创建批量测试数据 ===');

    const testNotifications: NotificationTestData[] = [
      {
        title: '🚀 ETHUSDT(15m) 技术分析',
        message: 'BUY 信号 (中等置信度)',
        type: 'success',
        symbol: 'ETHUSDT',
        interval: '15m',
        signal: 'BUY',
        confidence: 72.3,
        summary: 'RSI超卖反弹，MACD即将金叉',
        patterns: 'RSI背离',
        supportResistance: '2个关键位',
        timestamp: new Date(Date.now() - 3600000).toISOString(), // 1小时前
      },
      {
        title: '📉 BNBUSDT(1h) 风险提醒',
        message: 'SELL 信号 (高置信度)',
        type: 'warning',
        symbol: 'BNBUSDT',
        interval: '1h',
        signal: 'SELL',
        confidence: 88.7,
        summary: '价格突破关键支撑位，量能放大',
        patterns: '头肩顶形态',
        supportResistance: '4个关键位',
        timestamp: new Date(Date.now() - 1800000).toISOString(), // 30分钟前
      },
      {
        title: 'ℹ️ 系统启动通知',
        message: '交易系统已成功启动',
        type: 'info',
        timestamp: new Date(Date.now() - 7200000).toISOString(), // 2小时前
      },
    ];

    for (const notification of testNotifications) {
      try {
        await axios.post(
          `${this.baseUrl}/api/notifications/create`,
          notification,
          {
            headers: { 'Content-Type': 'application/json' },
          }
        );
        console.log(`✅ 创建测试通知: ${notification.title}`);
      } catch (error) {
        console.error(`❌ 创建测试通知失败: ${notification.title}`, error.response?.data || error.message);
      }
    }
  }

  /**
   * 运行所有测试
   */
  async runAllTests(): Promise<void> {
    console.log('🧪 开始测试通知功能...\n');

    try {
      // 创建测试数据
      await this.createTestData();

      // 测试各个接口
      await this.testCreateNotification();
      await this.testGetNotificationList();
      await this.testGetNotificationStats();
      await this.testGetNotificationHistory();

      console.log('\n✅ 所有测试完成！');
    } catch (error) {
      console.error('\n❌ 测试失败:', error.message);
      process.exit(1);
    }
  }
}

// 运行测试
const tester = new NotificationTester();
tester.runAllTests(); 