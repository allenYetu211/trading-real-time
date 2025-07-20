import * as WebSocket from 'ws';

const testBinanceWebSocket = () => {
  console.log('🔍 测试币安WebSocket连接...');
  
  // 测试单个流连接
  const singleStreamUrl = 'wss://stream.binance.com:9443/ws/btcusdt@kline_1h';
  console.log(`📡 连接单个流: ${singleStreamUrl}`);
  
  const singleWs = new WebSocket(singleStreamUrl);
  
  singleWs.on('open', () => {
    console.log('✅ 单个流连接成功');
  });
  
  singleWs.on('message', (data) => {
    const message = JSON.parse(data.toString());
    if (message.e === 'kline') {
      console.log(`📊 单流数据: ${message.s} 价格: $${message.k.c} 完结: ${message.k.x}`);
    }
  });
  
  singleWs.on('error', (error) => {
    console.error('❌ 单流连接错误:', error.message);
  });
  
  // 测试多流连接
  setTimeout(() => {
    const multiStreamUrl = 'wss://stream.binance.com:9443/stream?streams=btcusdt@kline_1h/ethusdt@kline_4h/adausdt@kline_15m';
    console.log(`📡 连接多个流: ${multiStreamUrl}`);
    
    const multiWs = new WebSocket(multiStreamUrl);
    
    multiWs.on('open', () => {
      console.log('✅ 多流连接成功');
    });
    
    multiWs.on('message', (data) => {
      const message = JSON.parse(data.toString());
      if (message.data && message.data.e === 'kline') {
        console.log(`📊 多流数据: ${message.stream} ${message.data.s} 价格: $${message.data.k.c} 完结: ${message.data.k.x}`);
      }
    });
    
    multiWs.on('error', (error) => {
      console.error('❌ 多流连接错误:', error.message);
    });
  }, 5000);
  
  // 10秒后关闭连接
  setTimeout(() => {
    console.log('🔌 关闭测试连接');
    singleWs.close();
    process.exit(0);
  }, 15000);
};

testBinanceWebSocket(); 