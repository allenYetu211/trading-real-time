# API快速参考手册

**版本**: v1.0  
**日期**: 2025/07/20  
**基础URL**: `http://localhost:3000`

## 🚀 核心接口速查

### 币种配置管理
```bash
# 添加配置
POST /api/coins/config
{"symbol":"BTCUSDT","interval":"1h","isActive":true}

# 获取列表  
GET /api/coins/list

# 获取活跃配置
GET /api/coins/active

# 更新配置
PATCH /api/coins/:id
{"isActive":false}

# 删除配置
DELETE /api/coins/:id
```

### 数据获取
```bash
# K线数据
GET /api/data/kline?symbol=BTCUSDT&interval=1h&limit=100

# 最新价格
GET /api/data/price/BTCUSDT

# 24小时统计
GET /api/data/ticker/BTCUSDT

# 健康检查
GET /api/data/health
```

### 技术分析
```bash
# 综合分析
POST /api/analysis/comprehensive/BTCUSDT/1h?limit=100

# 交易信号
GET /api/analysis/signal/BTCUSDT/1h

# 技术指标
GET /api/analysis/indicators/BTCUSDT/1h?indicators=sma20,rsi,macd

# 分析仪表板
GET /api/analysis/dashboard
```

### WebSocket实时数据
```bash
# 订阅K线
POST /api/websocket/subscribe/BTCUSDT/1h

# 取消订阅
DELETE /api/websocket/subscribe/BTCUSDT/1h

# 连接状态
GET /api/websocket/status
```

### 策略管理
```bash
# 创建策略
POST /api/strategy/config
{"name":"BTC策略","symbol":"BTCUSDT","type":"BREAKOUT"}

# 策略列表
GET /api/strategy/config/list

# 启动策略
POST /api/strategy/config/:id/start

# 策略仪表板
GET /api/strategy/dashboard
```

## 📦 响应格式

### 成功响应
```json
{
  "success": true,
  "data": { /* 数据内容 */ },
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
    "message": "参数验证失败"
  }
}
```

## ⚡ 快速示例

### JavaScript
```javascript
// 添加配置并获取信号
async function quickStart() {
  const API_BASE = 'http://localhost:3000';
  
  // 1. 添加配置
  await fetch(`${API_BASE}/api/coins/config`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      symbol: 'BTCUSDT',
      interval: '1h',
      isActive: true
    })
  });
  
  // 2. 获取交易信号
  const signal = await fetch(`${API_BASE}/api/analysis/signal/BTCUSDT/1h`);
  const result = await signal.json();
  
  console.log('交易信号:', result.data.signal);
  console.log('置信度:', result.data.confidence);
}
```

### Python
```python
import requests

# 快速获取交易信号
response = requests.get('http://localhost:3000/api/analysis/signal/BTCUSDT/1h')
data = response.json()

if data['success']:
    signal = data['data']
    print(f"信号: {signal['signal']}")
    print(f"置信度: {signal['confidence']}")
```

### cURL
```bash
# 一键测试流程
# 1. 添加配置
curl -X POST http://localhost:3000/api/coins/config \
  -H "Content-Type: application/json" \
  -d '{"symbol":"BTCUSDT","interval":"1h","isActive":true}'

# 2. 获取信号
curl http://localhost:3000/api/analysis/signal/BTCUSDT/1h

# 3. 查看仪表板
curl http://localhost:3000/api/analysis/dashboard
```

## 🔧 常用参数

### 时间间隔 (interval)
- `1m`, `5m`, `15m`, `30m`
- `1h`, `2h`, `4h`, `6h`, `8h`, `12h`  
- `1d`, `3d`, `1w`, `1M`

### 交易信号 (signal)
- `BUY` - 买入信号
- `SELL` - 卖出信号  
- `NEUTRAL` - 中性/观望

### 策略类型 (type)
- `BREAKOUT` - 突破策略
- `MA_CROSSOVER` - 均线交叉
- `RSI_OVERSOLD` - RSI超卖
- `MACD_SIGNAL` - MACD信号

## 🎯 开发建议

1. **错误处理**: 始终检查 `success` 字段
2. **数据验证**: 验证 `symbol` 格式和 `interval` 有效性
3. **速率限制**: 避免频繁请求，建议使用WebSocket获取实时数据
4. **缓存策略**: 技术分析结果可适当缓存
5. **监控告警**: 监控 `/api/data/health` 接口状态

## 📞 支持

- 文档版本: v1.0 (2025/07/20)
- 完整文档: `trading-system-api-2025-07-20-v1.md` 