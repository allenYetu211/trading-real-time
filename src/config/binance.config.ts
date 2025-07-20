import { registerAs } from '@nestjs/config';

export default registerAs('binance', () => ({
  apiBaseUrl: process.env.BINANCE_API_BASE_URL || 'https://api.binance.com',
  wsBaseUrl: process.env.BINANCE_WS_BASE_URL || 'wss://stream.binance.com:9443/ws',
  apiKey: process.env.BINANCE_API_KEY || '',
  secretKey: process.env.BINANCE_SECRET_KEY || '',
  requestTimeout: 10000,
  maxRetries: 3,
  retryDelay: 1000,
})); 