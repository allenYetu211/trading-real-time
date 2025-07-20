# 多币种图像结构识别与辅助交易策略系统 - 前端接入文档

**版本**: v1.0  
**日期**: 2025/07/20  
**API基础URL**: `http://localhost:3000`

---

## 📋 目录

1. [系统概述](#系统概述)
2. [API认证](#api认证)
3. [通用响应格式](#通用响应格式)
4. [币种配置管理API](#币种配置管理api)
5. [数据获取API](#数据获取api)
6. [WebSocket实时数据API](#websocket实时数据api)
7. [技术分析API](#技术分析api)
8. [策略管理API](#策略管理api)
9. [错误处理](#错误处理)
10. [示例代码](#示例代码)

---

## 🔍 系统概述

本系统提供实时的加密货币技术分析和交易策略建议，支持多币种监控、图形结构识别、技术指标计算等功能。系统仅提供分析建议，不执行自动交易。

### 核心功能
- 🔧 **币种配置管理** - 添加/删除/管理监控币种
- 📊 **实时数据获取** - K线数据、价格信息、市场统计
- 🎯 **技术分析** - 图形识别、技术指标、支撑阻力位
- 📈 **策略信号** - 交易策略执行和信号生成
- 🔗 **WebSocket** - 实时数据推送

---

## 🔐 API认证

当前版本暂未实现认证机制，所有API均可直接访问。后续版本将支持API Key认证。

---

## 📨 通用响应格式

### 成功响应
```json
{
  "success": true,
  "data": { /* 实际数据 */ },
  "message": "操作成功",
  "timestamp": 1640995200000
}
```

### 错误响应
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "参数验证失败",
    "details": ["symbol必须是字符串"]
  },
  "timestamp": 1640995200000
}
```

---

## 🔧 币种配置管理API

### 1. 添加监控币种配置

**接口**: `POST /api/coins/config`

**请求参数**:
```json
{
  "symbol": "BTCUSDT",        // 交易对符号
  "interval": "1h",           // K线间隔 (1m,5m,15m,30m,1h,2h,4h,6h,8h,12h,1d,3d,1w,1M)
  "isActive": true            // 是否激活监控
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "symbol": "BTCUSDT",
    "interval": "1h",
    "isActive": true,
    "createdAt": "2025-07-20T08:00:00.000Z",
    "updatedAt": "2025-07-20T08:00:00.000Z"
  }
}
```

### 2. 获取监控币种列表

**接口**: `GET /api/coins/list`

**查询参数**:
- `symbol` (可选): 过滤特定交易对
- `interval` (可选): 过滤特定时间间隔
- `isActive` (可选): 过滤激活状态

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "symbol": "BTCUSDT",
      "interval": "1h",
      "isActive": true,
      "createdAt": "2025-07-20T08:00:00.000Z",
      "updatedAt": "2025-07-20T08:00:00.000Z"
    }
  ]
}
```

### 3. 获取活跃配置

**接口**: `GET /api/coins/active`

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "symbol": "BTCUSDT",
      "interval": "1h",
      "isActive": true
    }
  ]
}
```

### 4. 获取配置统计

**接口**: `GET /api/coins/stats`

**响应示例**:
```json
{
  "success": true,
  "data": {
    "total": 10,
    "active": 8,
    "inactive": 2,
    "byInterval": {
      "1h": 3,
      "4h": 2,
      "1d": 3
    }
  }
}
```

### 5. 更新配置

**接口**: `PATCH /api/coins/:id`

**请求参数**:
```json
{
  "isActive": false          // 需要更新的字段
}
```

### 6. 删除配置

**接口**: `DELETE /api/coins/:id`

### 7. 批量激活/禁用

**接口**: `POST /api/coins/batch-active`

**请求参数**:
```json
{
  "ids": [1, 2, 3],
  "isActive": true
}
```

---

## 📊 数据获取API

### 1. 获取K线数据

**接口**: `GET /api/data/kline`

**查询参数**:
- `symbol` (必填): 交易对符号，如 "BTCUSDT"
- `interval` (必填): K线间隔
- `limit` (可选): 数据条数，默认100，最大1000
- `startTime` (可选): 开始时间戳
- `endTime` (可选): 结束时间戳

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "openTime": 1640995200000,
      "closeTime": 1640998799999,
      "open": "46000.00",
      "high": "46500.00",
      "low": "45800.00", 
      "close": "46200.00",
      "volume": "125.25",
      "quoteVolume": "5785000.00",
      "trades": 1250,
      "baseAssetVolume": "62.50",
      "quoteAssetVolume": "2890000.00"
    }
  ]
}
```

### 2. 获取最新价格

**接口**: `GET /api/data/price/:symbol`

**路径参数**:
- `symbol`: 交易对符号

**响应示例**:
```json
{
  "success": true,
  "data": {
    "symbol": "BTCUSDT",
    "price": 46250.75,
    "timestamp": 1640995200000
  }
}
```

### 3. 获取24小时统计

**接口**: `GET /api/data/ticker/:symbol`

**响应示例**:
```json
{
  "success": true,
  "data": {
    "symbol": "BTCUSDT",
    "priceChange": "1250.00",
    "priceChangePercent": "2.78",
    "weightedAvgPrice": "45875.50",
    "prevClosePrice": "45000.00",
    "lastPrice": "46250.00",
    "lastQty": "0.1",
    "bidPrice": "46249.00",
    "askPrice": "46251.00",
    "openPrice": "45000.00",
    "highPrice": "46500.00",
    "lowPrice": "44800.00",
    "volume": "15420.50",
    "quoteVolume": "707458950.00",
    "openTime": 1640908800000,
    "closeTime": 1640995200000,
    "count": 125850
  }
}
```

### 4. 刷新数据

**接口**: `POST /api/data/refresh/:symbol/:interval`

**查询参数**:
- `limit` (可选): 刷新的数据条数，默认100

### 5. 系统健康检查

**接口**: `GET /api/data/health`

**响应示例**:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "database": "connected",
    "cache": "connected",
    "binanceApi": "connected",
    "uptime": 3600000
  }
}
```

---

## 🔗 WebSocket实时数据API

### 1. 订阅K线数据流

**接口**: `POST /api/websocket/subscribe/:symbol/:interval`

**路径参数**:
- `symbol`: 交易对符号
- `interval`: K线间隔

**响应示例**:
```json
{
  "success": true,
  "data": {
    "message": "成功订阅 BTCUSDT 1h K线数据流",
    "symbol": "BTCUSDT",
    "interval": "1h",
    "timestamp": 1640995200000
  }
}
```

### 2. 取消订阅

**接口**: `DELETE /api/websocket/subscribe/:symbol/:interval`

### 3. 批量订阅

**接口**: `POST /api/websocket/subscribe/multiple`

**请求参数**:
```json
{
  "configs": [
    { "symbol": "BTCUSDT", "interval": "1h" },
    { "symbol": "ETHUSDT", "interval": "4h" }
  ]
}
```

### 4. 订阅活跃配置

**接口**: `POST /api/websocket/subscribe/active-configs`

自动订阅所有已激活的监控配置。

### 5. WebSocket连接状态

**接口**: `GET /api/websocket/status`

**响应示例**:
```json
{
  "success": true,
  "data": {
    "connected": true,
    "subscriptions": [
      {
        "symbol": "BTCUSDT",
        "interval": "1h",
        "status": "active"
      }
    ],
    "totalSubscriptions": 5
  }
}
```

---

## 🎯 技术分析API

### 1. 综合技术分析

**接口**: `POST /api/analysis/comprehensive/:symbol/:interval`

**路径参数**:
- `symbol`: 交易对符号
- `interval`: K线间隔

**查询参数**:
- `limit` (可选): K线数量，默认100，范围20-500

**响应示例**:
```json
{
  "success": true,
  "data": {
    "symbol": "BTCUSDT",
    "interval": "1h",
    "timestamp": 1640995200000,
    "score": {
      "trend": 0.65,          // 趋势评分 (0-1)
      "momentum": 0.72,       // 动量评分 (0-1)
      "volatility": 0.45,     // 波动率评分 (0-1)
      "signal": "BUY",        // 信号: BUY/SELL/NEUTRAL
      "confidence": 0.68      // 置信度 (0-1)
    },
    "summary": "技术指标显示上涨趋势，建议关注突破机会"
  }
}
```

### 2. 批量分析

**接口**: `POST /api/analysis/batch`

对所有活跃配置执行批量分析。

**响应示例**:
```json
{
  "success": true,
  "data": {
    "count": 5,
    "results": [
      {
        "symbol": "BTCUSDT",
        "interval": "1h",
        "score": { /* 分析结果 */ }
      }
    ],
    "timestamp": 1640995200000
  }
}
```

### 3. 计算技术指标

**接口**: `GET /api/analysis/indicators/:symbol/:interval`

**查询参数**:
- `indicators`: 指标列表(逗号分隔)，如 "sma20,rsi,macd"
- `limit` (可选): K线数量，默认100

**响应示例**:
```json
{
  "success": true,
  "data": {
    "symbol": "BTCUSDT",
    "interval": "1h",
    "indicators": ["sma20", "rsi", "macd"],
    "values": {
      "sma20": 45850.25,
      "rsi": 65.5,
      "macd": {
        "macd": 125.5,
        "signal": 118.2,
        "histogram": 7.3
      }
    },
    "timestamp": 1640995200000
  }
}
```

### 4. 图形形态识别

**接口**: `GET /api/analysis/patterns/:symbol/:interval`

**查询参数**:
- `limit` (可选): K线数量，默认100

**响应示例**:
```json
{
  "success": true,
  "data": {
    "symbol": "BTCUSDT",
    "interval": "1h",
    "patterns": [
      {
        "type": "ASCENDING_TRIANGLE",
        "confidence": 0.75,
        "startTime": 1640900000000,
        "endTime": 1640995200000,
        "breakoutLevel": 46500,
        "target": 48000
      }
    ],
    "timestamp": 1640995200000
  }
}
```

### 5. 支撑阻力位识别

**接口**: `GET /api/analysis/support-resistance/:symbol/:interval`

**查询参数**:
- `lookback` (可选): 回看周期，默认50

**响应示例**:
```json
{
  "success": true,
  "data": {
    "symbol": "BTCUSDT",
    "interval": "1h",
    "levels": {
      "resistance": [46500, 47000, 47500],
      "support": [45500, 45000, 44500]
    },
    "current_price": 46250,
    "nearest_resistance": 46500,
    "nearest_support": 45500,
    "timestamp": 1640995200000
  }
}
```

### 6. 获取交易信号

**接口**: `GET /api/analysis/signal/:symbol/:interval`

**响应示例**:
```json
{
  "success": true,
  "data": {
    "symbol": "BTCUSDT",
    "interval": "1h",
    "signal": "BUY",
    "confidence": 0.72,
    "trend": 0.65,
    "momentum": 0.78,
    "volatility": 0.45,
    "summary": "多项技术指标显示买入信号",
    "key_levels": {
      "entry": 46250,
      "stop_loss": 45500,
      "take_profit": 47500
    },
    "timestamp": 1640995200000
  }
}
```

### 7. 分析仪表板

**接口**: `GET /api/analysis/dashboard`

**响应示例**:
```json
{
  "success": true,
  "data": {
    "overview": {
      "total_symbols": 10,
      "signals": {
        "buy": 4,
        "sell": 2,
        "neutral": 4
      },
      "avg_confidence": 0.68
    },
    "top_signals": [
      {
        "symbol": "BTCUSDT",
        "signal": "BUY",
        "confidence": 0.85
      }
    ],
    "market_sentiment": "BULLISH",
    "timestamp": 1640995200000
  }
}
```

---

## 📈 策略管理API

### 1. 创建策略配置

**接口**: `POST /api/strategy/config`

**请求参数**:
```json
{
  "name": "BTC突破策略",
  "symbol": "BTCUSDT",
  "interval": "1h",
  "type": "BREAKOUT",
  "parameters": {
    "lookback_period": 20,
    "breakout_threshold": 0.02,
    "volume_confirm": true
  },
  "isActive": true
}
```

### 2. 获取策略列表

**接口**: `GET /api/strategy/config/list`

**查询参数**:
- `symbol` (可选): 过滤交易对
- `interval` (可选): 过滤时间间隔
- `status` (可选): 过滤状态 (ACTIVE/INACTIVE/PAUSED)
- `type` (可选): 过滤策略类型

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "BTC突破策略",
      "symbol": "BTCUSDT",
      "interval": "1h",
      "type": "BREAKOUT",
      "status": "ACTIVE",
      "performance": {
        "total_signals": 25,
        "success_rate": 0.68,
        "profit_loss": 0.125
      }
    }
  ]
}
```

### 3. 启动策略

**接口**: `POST /api/strategy/config/:id/start`

### 4. 停止策略

**接口**: `POST /api/strategy/config/:id/stop`

### 5. 查询策略信号

**接口**: `POST /api/strategy/signals/query`

**请求参数**:
```json
{
  "symbol": "BTCUSDT",
  "startTime": 1640900000000,
  "endTime": 1640995200000,
  "signal_type": "BUY"
}
```

### 6. 获取最新信号

**接口**: `GET /api/strategy/signals/latest`

**查询参数**:
- `limit` (可选): 信号数量，默认10

### 7. 策略引擎状态

**接口**: `GET /api/strategy/engine/status`

**响应示例**:
```json
{
  "success": true,
  "data": {
    "status": "RUNNING",
    "active_strategies": 5,
    "total_signals_today": 23,
    "system_performance": {
      "cpu_usage": 25.5,
      "memory_usage": 512,
      "uptime": 3600000
    }
  }
}
```

### 8. 策略仪表板

**接口**: `GET /api/strategy/dashboard`

**响应示例**:
```json
{
  "success": true,
  "data": {
    "summary": {
      "total_strategies": 8,
      "active": 5,
      "paused": 2,
      "inactive": 1
    },
    "performance": {
      "total_signals": 156,
      "success_rate": 0.72,
      "best_performer": "BTC突破策略",
      "worst_performer": "ETH反转策略"
    },
    "recent_signals": [
      {
        "strategy": "BTC突破策略",
        "symbol": "BTCUSDT",
        "signal": "BUY",
        "timestamp": 1640995200000
      }
    ]
  }
}
```

---

## ❌ 错误处理

### 常见错误码

| 错误码 | HTTP状态码 | 描述 |
|--------|------------|------|
| VALIDATION_ERROR | 400 | 请求参数验证失败 |
| NOT_FOUND | 404 | 资源不存在 |
| CONFLICT | 409 | 资源冲突（如重复创建） |
| INTERNAL_ERROR | 500 | 服务器内部错误 |
| SERVICE_UNAVAILABLE | 503 | 外部服务不可用 |

### 错误响应示例

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "参数验证失败",
    "details": [
      "symbol不能为空",
      "interval必须是有效的时间间隔"
    ]
  },
  "timestamp": 1640995200000
}
```

---

## 💻 示例代码

### JavaScript/TypeScript 示例

```javascript
// 基础配置
const API_BASE_URL = 'http://localhost:3000';

// 请求工具函数
async function apiRequest(endpoint, options = {}) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error?.message || '请求失败');
  }
  
  return data;
}

// 添加监控配置
async function addCoinConfig(symbol, interval) {
  return await apiRequest('/api/coins/config', {
    method: 'POST',
    body: JSON.stringify({
      symbol,
      interval,
      isActive: true
    })
  });
}

// 获取K线数据
async function getKlineData(symbol, interval, limit = 100) {
  const params = new URLSearchParams({
    symbol,
    interval,
    limit: limit.toString()
  });
  
  return await apiRequest(`/api/data/kline?${params}`);
}

// 获取交易信号
async function getTradingSignal(symbol, interval) {
  return await apiRequest(`/api/analysis/signal/${symbol}/${interval}`);
}

// 执行综合分析
async function performAnalysis(symbol, interval, limit = 100) {
  return await apiRequest(`/api/analysis/comprehensive/${symbol}/${interval}?limit=${limit}`, {
    method: 'POST'
  });
}

// 使用示例
async function main() {
  try {
    // 1. 添加BTC配置
    const config = await addCoinConfig('BTCUSDT', '1h');
    console.log('配置创建成功:', config);
    
    // 2. 获取K线数据
    const klineData = await getKlineData('BTCUSDT', '1h', 50);
    console.log('K线数据:', klineData.data.slice(0, 5)); // 显示前5条
    
    // 3. 执行技术分析
    const analysis = await performAnalysis('BTCUSDT', '1h', 100);
    console.log('分析结果:', analysis.data);
    
    // 4. 获取交易信号
    const signal = await getTradingSignal('BTCUSDT', '1h');
    console.log('交易信号:', signal.data);
    
  } catch (error) {
    console.error('错误:', error.message);
  }
}
```

### Python 示例

```python
import requests
import json

class TradingAPI:
    def __init__(self, base_url='http://localhost:3000'):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json'
        })
    
    def _request(self, method, endpoint, **kwargs):
        url = f"{self.base_url}{endpoint}"
        response = self.session.request(method, url, **kwargs)
        
        if not response.ok:
            error_data = response.json()
            raise Exception(f"API错误: {error_data.get('error', {}).get('message', '未知错误')}")
        
        return response.json()
    
    def add_coin_config(self, symbol, interval, is_active=True):
        """添加监控配置"""
        data = {
            'symbol': symbol,
            'interval': interval,
            'isActive': is_active
        }
        return self._request('POST', '/api/coins/config', json=data)
    
    def get_kline_data(self, symbol, interval, limit=100):
        """获取K线数据"""
        params = {
            'symbol': symbol,
            'interval': interval,
            'limit': limit
        }
        return self._request('GET', '/api/data/kline', params=params)
    
    def get_trading_signal(self, symbol, interval):
        """获取交易信号"""
        return self._request('GET', f'/api/analysis/signal/{symbol}/{interval}')
    
    def perform_analysis(self, symbol, interval, limit=100):
        """执行综合分析"""
        return self._request('POST', f'/api/analysis/comprehensive/{symbol}/{interval}?limit={limit}')

# 使用示例
def main():
    api = TradingAPI()
    
    try:
        # 1. 添加配置
        config = api.add_coin_config('BTCUSDT', '1h')
        print('配置创建成功:', config)
        
        # 2. 获取K线数据
        kline_data = api.get_kline_data('BTCUSDT', '1h', 50)
        print('K线数据条数:', len(kline_data['data']))
        
        # 3. 执行分析
        analysis = api.perform_analysis('BTCUSDT', '1h', 100)
        print('分析结果:', analysis['data']['score'])
        
        # 4. 获取信号
        signal = api.get_trading_signal('BTCUSDT', '1h')
        print('交易信号:', signal['data']['signal'])
        
    except Exception as e:
        print('错误:', str(e))

if __name__ == '__main__':
    main()
```

---

## 📞 技术支持

- **项目仓库**: [GitHub链接]
- **文档版本**: v1.0
- **最后更新**: 2025/07/20
- **联系方式**: [开发团队联系方式]

---

## 📝 更新日志

### v1.0 (2025/07/20)
- ✅ 初始版本发布
- ✅ 币种配置管理API
- ✅ 数据获取API  
- ✅ WebSocket实时数据API
- ✅ 技术分析API
- ✅ 策略管理API
- ✅ 完整示例代码

---

## 🚀 快速开始

1. **启动服务**
   ```bash
   # 使用管理脚本启动
   ./scripts/manage.sh dev
   
   # 或手动启动
   docker-compose up -d
   pnpm start:dev
   ```

2. **测试API**
   ```bash
   # 健康检查
   curl http://localhost:3000/api/data/health
   
   # 添加配置
   curl -X POST http://localhost:3000/api/coins/config \
     -H "Content-Type: application/json" \
     -d '{"symbol":"BTCUSDT","interval":"1h","isActive":true}'
   
   # 获取信号
   curl http://localhost:3000/api/analysis/signal/BTCUSDT/1h
   ```

3. **集成到前端**
   - 参考上述示例代码
   - 注意错误处理
   - 实现WebSocket连接以获取实时数据
   - 根据业务需求调整参数

---

**注意**: 本系统仅提供技术分析和策略建议，不构成投资建议。所有交易决策应由用户独立做出。 