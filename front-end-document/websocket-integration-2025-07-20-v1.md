# WebSocket实时数据集成指南

**版本**: v1.0  
**日期**: 2025/07/20  
**WebSocket URL**: `ws://localhost:3000`

## 📡 概述

本系统支持通过WebSocket接收实时K线数据、价格更新和分析结果。前端可以通过订阅相应的数据流来获取实时更新。

## 🔗 连接管理

### 基础连接
```javascript
// 建立WebSocket连接
const ws = new WebSocket('ws://localhost:3000');

ws.onopen = function(event) {
    console.log('WebSocket连接已建立');
};

ws.onmessage = function(event) {
    const data = JSON.parse(event.data);
    console.log('收到数据:', data);
};

ws.onerror = function(error) {
    console.error('WebSocket错误:', error);
};

ws.onclose = function(event) {
    console.log('WebSocket连接已关闭');
    // 实现重连逻辑
    setTimeout(reconnect, 5000);
};
```

### 高级连接管理
```javascript
class TradingWebSocket {
    constructor(url = 'ws://localhost:3000') {
        this.url = url;
        this.ws = null;
        this.subscriptions = new Set();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.handlers = new Map();
    }
    
    connect() {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(this.url);
            
            this.ws.onopen = (event) => {
                console.log('WebSocket连接成功');
                this.reconnectAttempts = 0;
                this.resubscribeAll();
                resolve(event);
            };
            
            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleMessage(data);
                } catch (error) {
                    console.error('解析消息失败:', error);
                }
            };
            
            this.ws.onerror = (error) => {
                console.error('WebSocket错误:', error);
                reject(error);
            };
            
            this.ws.onclose = (event) => {
                console.log('WebSocket连接关闭');
                this.attemptReconnect();
            };
        });
    }
    
    attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            
            setTimeout(() => {
                this.connect();
            }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1));
        } else {
            console.error('重连失败，已达到最大重试次数');
        }
    }
    
    subscribe(type, symbol, interval, handler) {
        const subscription = `${type}:${symbol}:${interval}`;
        this.subscriptions.add(subscription);
        this.handlers.set(subscription, handler);
        
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.sendSubscription(type, symbol, interval);
        }
    }
    
    unsubscribe(type, symbol, interval) {
        const subscription = `${type}:${symbol}:${interval}`;
        this.subscriptions.delete(subscription);
        this.handlers.delete(subscription);
        
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.sendUnsubscription(type, symbol, interval);
        }
    }
    
    sendSubscription(type, symbol, interval) {
        const message = {
            action: 'subscribe',
            type: type,
            symbol: symbol,
            interval: interval
        };
        this.send(message);
    }
    
    sendUnsubscription(type, symbol, interval) {
        const message = {
            action: 'unsubscribe',
            type: type,
            symbol: symbol,
            interval: interval
        };
        this.send(message);
    }
    
    resubscribeAll() {
        for (const subscription of this.subscriptions) {
            const [type, symbol, interval] = subscription.split(':');
            this.sendSubscription(type, symbol, interval);
        }
    }
    
    handleMessage(data) {
        if (data.type && data.symbol && data.interval) {
            const subscription = `${data.type}:${data.symbol}:${data.interval}`;
            const handler = this.handlers.get(subscription);
            
            if (handler) {
                handler(data);
            }
        }
    }
    
    send(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
    }
    
    close() {
        if (this.ws) {
            this.ws.close();
        }
    }
}
```

## 📊 数据类型

### K线数据流
```javascript
// 订阅K线数据
ws.subscribe('kline', 'BTCUSDT', '1h', (data) => {
    console.log('K线更新:', data);
    /*
    {
        type: 'kline',
        symbol: 'BTCUSDT',
        interval: '1h',
        data: {
            openTime: 1640995200000,
            closeTime: 1640998799999,
            open: '46000.00',
            high: '46500.00',
            low: '45800.00',
            close: '46200.00',
            volume: '125.25',
            isFinal: false  // 是否是完成的K线
        }
    }
    */
});
```

### 价格更新流
```javascript
// 订阅价格更新
ws.subscribe('ticker', 'BTCUSDT', '', (data) => {
    console.log('价格更新:', data);
    /*
    {
        type: 'ticker',
        symbol: 'BTCUSDT',
        data: {
            price: 46250.75,
            change: 250.75,
            changePercent: 0.55,
            timestamp: 1640995200000
        }
    }
    */
});
```

### 分析结果流
```javascript
// 订阅分析结果
ws.subscribe('analysis', 'BTCUSDT', '1h', (data) => {
    console.log('分析更新:', data);
    /*
    {
        type: 'analysis',
        symbol: 'BTCUSDT',
        interval: '1h',
        data: {
            signal: 'BUY',
            confidence: 0.72,
            trend: 0.65,
            momentum: 0.78,
            patterns: ['BREAKOUT'],
            timestamp: 1640995200000
        }
    }
    */
});
```

## 🎯 实际应用示例

### React组件示例
```jsx
import React, { useState, useEffect, useRef } from 'react';

function TradingDashboard() {
    const [prices, setPrices] = useState(new Map());
    const [signals, setSignals] = useState(new Map());
    const [klineData, setKlineData] = useState(new Map());
    const wsRef = useRef(null);
    
    useEffect(() => {
        // 初始化WebSocket连接
        wsRef.current = new TradingWebSocket();
        
        wsRef.current.connect().then(() => {
            // 订阅价格数据
            wsRef.current.subscribe('ticker', 'BTCUSDT', '', (data) => {
                setPrices(prev => new Map(prev.set(data.symbol, data.data)));
            });
            
            // 订阅分析信号
            wsRef.current.subscribe('analysis', 'BTCUSDT', '1h', (data) => {
                setSignals(prev => new Map(prev.set(`${data.symbol}_${data.interval}`, data.data)));
            });
            
            // 订阅K线数据
            wsRef.current.subscribe('kline', 'BTCUSDT', '1h', (data) => {
                if (data.data.isFinal) {
                    setKlineData(prev => {
                        const key = `${data.symbol}_${data.interval}`;
                        const existing = prev.get(key) || [];
                        return new Map(prev.set(key, [...existing.slice(-99), data.data]));
                    });
                }
            });
        });
        
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, []);
    
    const btcPrice = prices.get('BTCUSDT');
    const btcSignal = signals.get('BTCUSDT_1h');
    
    return (
        <div className="trading-dashboard">
            <div className="price-section">
                <h3>BTC价格</h3>
                {btcPrice && (
                    <div>
                        <div className="price">${btcPrice.price}</div>
                        <div className={`change ${btcPrice.change >= 0 ? 'positive' : 'negative'}`}>
                            {btcPrice.change >= 0 ? '+' : ''}{btcPrice.change} ({btcPrice.changePercent}%)
                        </div>
                    </div>
                )}
            </div>
            
            <div className="signal-section">
                <h3>交易信号</h3>
                {btcSignal && (
                    <div>
                        <div className={`signal ${btcSignal.signal.toLowerCase()}`}>
                            {btcSignal.signal}
                        </div>
                        <div className="confidence">
                            置信度: {(btcSignal.confidence * 100).toFixed(1)}%
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
```

### Vue组件示例
```vue
<template>
  <div class="trading-dashboard">
    <div class="price-section">
      <h3>{{ symbol }}价格</h3>
      <div v-if="priceData" class="price-info">
        <div class="price">${{ priceData.price }}</div>
        <div :class="['change', priceData.change >= 0 ? 'positive' : 'negative']">
          {{ priceData.change >= 0 ? '+' : '' }}{{ priceData.change }} 
          ({{ priceData.changePercent }}%)
        </div>
      </div>
    </div>
    
    <div class="signal-section">
      <h3>交易信号</h3>
      <div v-if="signalData" class="signal-info">
        <div :class="['signal', signalData.signal.toLowerCase()]">
          {{ signalData.signal }}
        </div>
        <div class="confidence">
          置信度: {{ (signalData.confidence * 100).toFixed(1) }}%
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'TradingDashboard',
  data() {
    return {
      symbol: 'BTCUSDT',
      interval: '1h',
      priceData: null,
      signalData: null,
      ws: null
    };
  },
  
  async mounted() {
    await this.initWebSocket();
  },
  
  beforeUnmount() {
    if (this.ws) {
      this.ws.close();
    }
  },
  
  methods: {
    async initWebSocket() {
      this.ws = new TradingWebSocket();
      
      try {
        await this.ws.connect();
        
        // 订阅价格数据
        this.ws.subscribe('ticker', this.symbol, '', (data) => {
          this.priceData = data.data;
        });
        
        // 订阅分析信号
        this.ws.subscribe('analysis', this.symbol, this.interval, (data) => {
          this.signalData = data.data;
        });
        
      } catch (error) {
        console.error('WebSocket连接失败:', error);
      }
    }
  }
};
</script>
```

## 🔧 最佳实践

### 1. 连接管理
```javascript
// 实现心跳机制
class TradingWebSocketWithHeartbeat extends TradingWebSocket {
    constructor(url) {
        super(url);
        this.heartbeatInterval = null;
        this.heartbeatTimeout = null;
    }
    
    connect() {
        return super.connect().then(() => {
            this.startHeartbeat();
        });
    }
    
    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({action: 'ping'}));
                
                this.heartbeatTimeout = setTimeout(() => {
                    console.warn('心跳超时，重连...');
                    this.ws.close();
                }, 10000);
            }
        }, 30000);
    }
    
    handleMessage(data) {
        if (data.action === 'pong') {
            clearTimeout(this.heartbeatTimeout);
            return;
        }
        
        super.handleMessage(data);
    }
    
    close() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
        if (this.heartbeatTimeout) {
            clearTimeout(this.heartbeatTimeout);
        }
        super.close();
    }
}
```

### 2. 数据处理优化
```javascript
// 防抖处理高频数据
function createThrottledHandler(handler, delay = 100) {
    let lastCall = 0;
    let timeout = null;
    
    return function(data) {
        const now = Date.now();
        
        if (now - lastCall >= delay) {
            lastCall = now;
            handler(data);
        } else {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                lastCall = Date.now();
                handler(data);
            }, delay - (now - lastCall));
        }
    };
}

// 使用示例
const throttledPriceHandler = createThrottledHandler((data) => {
    updatePriceDisplay(data);
}, 200);

ws.subscribe('ticker', 'BTCUSDT', '', throttledPriceHandler);
```

### 3. 错误处理
```javascript
// 统一错误处理
class ErrorHandler {
    static handleWebSocketError(error, symbol, interval) {
        console.error(`WebSocket错误 [${symbol}/${interval}]:`, error);
        
        // 记录错误
        this.logError({
            type: 'websocket_error',
            symbol,
            interval,
            error: error.message,
            timestamp: Date.now()
        });
        
        // 通知用户
        this.notifyUser(`${symbol} 数据连接异常，正在重试...`);
    }
    
    static logError(errorInfo) {
        // 发送错误日志到服务器
        fetch('/api/logs/error', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(errorInfo)
        });
    }
    
    static notifyUser(message) {
        // 显示用户通知
        console.warn(message);
        // 或使用你的通知组件
    }
}
```

## 📋 调试技巧

### 1. 连接状态监控
```javascript
function monitorWebSocketStatus(ws) {
    const statusDiv = document.getElementById('ws-status');
    
    function updateStatus(status, color) {
        statusDiv.textContent = status;
        statusDiv.style.color = color;
    }
    
    ws.addEventListener('open', () => updateStatus('已连接', 'green'));
    ws.addEventListener('close', () => updateStatus('已断开', 'red'));
    ws.addEventListener('error', () => updateStatus('连接错误', 'orange'));
}
```

### 2. 消息日志
```javascript
function logWebSocketMessages(ws) {
    const originalSend = ws.send;
    
    ws.send = function(data) {
        console.log('发送消息:', data);
        return originalSend.call(this, data);
    };
    
    ws.addEventListener('message', (event) => {
        console.log('接收消息:', event.data);
    });
}
```

### 3. 性能监控
```javascript
class PerformanceMonitor {
    constructor() {
        this.messageCount = 0;
        this.startTime = Date.now();
        this.lastMessageTime = 0;
    }
    
    onMessage(data) {
        this.messageCount++;
        const now = Date.now();
        const latency = now - this.lastMessageTime;
        this.lastMessageTime = now;
        
        if (this.messageCount % 100 === 0) {
            const duration = (now - this.startTime) / 1000;
            const rate = this.messageCount / duration;
            
            console.log(`消息统计: ${this.messageCount}条, 速率: ${rate.toFixed(2)}/秒, 延迟: ${latency}ms`);
        }
    }
}
```

## 🚀 快速开始

1. **基础集成**
```javascript
// 最简单的集成方式
const ws = new TradingWebSocket();
await ws.connect();

// 订阅BTC价格
ws.subscribe('ticker', 'BTCUSDT', '', (data) => {
    console.log('BTC价格:', data.data.price);
});

// 订阅交易信号
ws.subscribe('analysis', 'BTCUSDT', '1h', (data) => {
    console.log('交易信号:', data.data.signal);
});
```

2. **测试连接**
```bash
# 使用wscat测试WebSocket连接
npm install -g wscat
wscat -c ws://localhost:3000

# 发送订阅消息
{"action":"subscribe","type":"ticker","symbol":"BTCUSDT","interval":""}
```

---

**注意**: WebSocket连接需要后端服务支持，确保服务端已启动并正确配置WebSocket功能。 