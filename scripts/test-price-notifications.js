// 使用 Node.js 内置的 fetch (Node.js 18+)
// 如果使用旧版本 Node.js，请运行: npm install node-fetch
const fetch = globalThis.fetch || require('node-fetch');

// 配置
const BASE_URL = 'http://localhost:3000';
const TEST_SYMBOL = 'BTC/USDT';

// 颜色输出
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTitle(title) {
  log(`\n${colors.bold}=== ${title} ===${colors.reset}`, 'cyan');
}

function logStep(step) {
  log(`\n${step}`, 'yellow');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

async function makeRequest(endpoint, method = 'GET', body = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}: ${result.message || '请求失败'}`,
      );
    }

    return result;
  } catch (error) {
    logError(`请求失败: ${error.message}`);
    return null;
  }
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function testTelegramConnection() {
  logTitle('Telegram Bot 连接测试');

  logStep('发送测试通知...');
  const result = await makeRequest('/trading-debug/test-notification', 'POST');

  if (result && result.success) {
    logSuccess('Telegram 测试通知发送成功！');
    logInfo(
      `Bot 状态: ${result.data.telegramStatus.isReady ? '✅ 就绪' : '❌ 未就绪'}`,
    );
    logInfo(
      `通知发送: ${result.data.notificationSent ? '✅ 成功' : '❌ 失败'}`,
    );

    if (result.data.telegramStatus.telegramBotStatus) {
      const botStatus = result.data.telegramStatus.telegramBotStatus;
      logInfo(`连接状态: ${botStatus.isConnected ? '已连接' : '未连接'}`);
      logInfo(`启用状态: ${botStatus.isEnabled ? '已启用' : '未启用'}`);
    }
  } else {
    logError('Telegram 测试通知发送失败！');
  }

  return result;
}

async function testPriceTrigger(symbol, price, description) {
  logStep(`测试价格触发: ${symbol} @ $${price} (${description})`);

  const result = await makeRequest(
    '/trading-debug/test-price-trigger',
    'POST',
    {
      symbol,
      testPrice: price,
    },
  );

  if (result && result.success) {
    const testResults = result.data.testResults;
    logInfo(
      `Telegram 状态: ${result.data.telegramStatus.isReady ? '✅ 就绪' : '❌ 未就绪'}`,
    );

    if (testResults.priceTriggerTest) {
      const triggerTest = testResults.priceTriggerTest;
      logInfo(`买入触发: ${triggerTest.buyTriggered ? '✅ 是' : '❌ 否'}`);
      logInfo(`卖出触发: ${triggerTest.sellTriggered ? '✅ 是' : '❌ 否'}`);
      logInfo(`通知数量: ${triggerTest.notifications.length}`);

      if (triggerTest.notifications.length > 0) {
        logSuccess(`发现 ${triggerTest.notifications.length} 个价格触发事件！`);
      }
    }

    logInfo(
      `测试通知发送: ${testResults.testNotificationSent ? '✅ 成功' : '❌ 失败'}`,
    );
  } else {
    logError(`价格触发测试失败: ${symbol} @ ${price}`);
  }

  return result;
}

async function testManualPriceCheck(symbol, price, description) {
  logStep(`手动价格检查: ${symbol} @ $${price} (${description})`);

  const result = await makeRequest(
    '/trading-debug/manual-price-check',
    'POST',
    {
      symbol,
      currentPrice: price,
    },
  );

  if (result && result.success) {
    logSuccess(result.message);
  } else {
    logError(`手动价格检查失败: ${symbol} @ ${price}`);
  }

  return result;
}

async function testPriceCrossing(symbol) {
  logTitle('价格区间穿越测试');

  // 清理之前的触发记录
  logStep('清理之前的触发记录...');
  await makeRequest('/trading-debug/clear-triggers', 'POST', { symbol });

  // 模拟价格穿越买入区间 (假设区间在 $45,000 ± 2%)
  const priceSequence = [
    { price: 44000, description: '区间外（低于买入区间）' },
    { price: 45000, description: '进入买入区间中心' },
    { price: 45500, description: '区间内上方' },
    { price: 46000, description: '离开买入区间' },
    { price: 47000, description: '区间外（高于买入区间）' },
  ];

  for (let i = 0; i < priceSequence.length; i++) {
    const { price, description } = priceSequence[i];
    await testManualPriceCheck(symbol, price, description);

    // 在每次价格变动间等待，模拟真实情况
    if (i < priceSequence.length - 1) {
      await sleep(1500);
    }
  }
}

async function testQuickPriceJump(symbol) {
  logTitle('快速价格跳跃测试');

  // 清理之前的触发记录
  await makeRequest('/trading-debug/clear-triggers', 'POST', { symbol });

  logStep('模拟快速价格跳跃穿越区间...');

  // 快速从44000跳到46000，应该检测到穿越45000区间
  await testManualPriceCheck(symbol, 44000, '起始价格');
  await sleep(500);
  await testManualPriceCheck(symbol, 46000, '跳跃后价格（应检测到穿越）');
}

async function testCooldownMechanism(symbol) {
  logTitle('冷却机制测试');

  // 清理之前的触发记录
  await makeRequest('/trading-debug/clear-triggers', 'POST', { symbol });

  const testPrice = 45000;

  // 第一次触发
  logStep('第一次触发...');
  await testManualPriceCheck(symbol, testPrice, '第一次触发');

  // 立即第二次触发（应该被冷却机制阻止）
  logStep('立即第二次触发（应被冷却机制阻止）...');
  await testManualPriceCheck(symbol, testPrice, '冷却期内触发');

  // 等待冷却期
  logStep('等待冷却期（2秒）...');
  await sleep(2000);

  // 冷却期后再次触发
  logStep('冷却期后再次触发...');
  await testManualPriceCheck(symbol, testPrice, '冷却期后触发');
}

async function checkSystemStats() {
  logTitle('系统状态检查');

  const result = await makeRequest('/trading-debug/trigger-stats');

  if (result && result.success) {
    const { triggerStats, notificationStatus } = result.data;

    logInfo('触发统计:');
    logInfo(`  总触发次数: ${triggerStats.totalTriggers}`);
    logInfo(`  活跃冷却: ${triggerStats.activeCooldowns}`);
    logInfo(`  已触发区间: ${triggerStats.triggeredZonesCount}`);

    logInfo('通知状态:');
    logInfo(`  系统就绪: ${notificationStatus.isReady ? '✅ 是' : '❌ 否'}`);

    if (notificationStatus.telegramBotStatus) {
      const botStatus = notificationStatus.telegramBotStatus;
      logInfo(`  Bot 启用: ${botStatus.isEnabled ? '✅ 是' : '❌ 否'}`);
      logInfo(`  Bot 连接: ${botStatus.isConnected ? '✅ 是' : '❌ 否'}`);
      logInfo(`  运行时间: ${Math.round(botStatus.uptime / 1000)}秒`);

      if (botStatus.lastError) {
        logError(`  最后错误: ${botStatus.lastError}`);
      }
    }
  } else {
    logError('获取系统状态失败！');
  }
}

async function runAllTests() {
  log(
    `${colors.bold}${colors.cyan}🚀 价格通知系统完整测试开始${colors.reset}\n`,
  );
  log(`测试目标: ${BASE_URL}`);
  log(`测试交易对: ${TEST_SYMBOL}\n`);

  try {
    // 1. Telegram 连接测试
    await testTelegramConnection();
    await sleep(1000);

    // 2. 基础价格触发测试
    logTitle('基础价格触发测试');
    await testPriceTrigger(TEST_SYMBOL, 45000, '假设买入区间');
    await sleep(1000);
    await testPriceTrigger(TEST_SYMBOL, 55000, '假设卖出区间');
    await sleep(1000);

    // 3. 价格穿越测试
    await testPriceCrossing(TEST_SYMBOL);
    await sleep(1000);

    // 4. 快速跳跃测试
    await testQuickPriceJump(TEST_SYMBOL);
    await sleep(1000);

    // 5. 冷却机制测试
    await testCooldownMechanism(TEST_SYMBOL);
    await sleep(1000);

    // 6. 系统状态检查
    await checkSystemStats();

    logTitle('测试总结');
    logSuccess('所有测试完成！');
    logInfo('请检查您的 Telegram 聊天，确认是否收到了相应的通知消息。');
    logInfo('如果没有收到通知，请检查:');
    logInfo('1. 环境变量 TELEGRAM_BOT_TOKEN 和 TELEGRAM_CHAT_ID 是否正确设置');
    logInfo('2. 机器人是否被添加到对应的群组/频道');
    logInfo('3. 是否有相应的交易区间分析数据');
  } catch (error) {
    logError(`测试过程中发生错误: ${error.message}`);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  runAllTests,
  testTelegramConnection,
  testPriceTrigger,
  testManualPriceCheck,
  checkSystemStats,
};
