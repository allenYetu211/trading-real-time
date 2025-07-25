import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  environment: process.env.NODE_ENV || 'development',
  name: process.env.APP_NAME || 'Trading System',
  logLevel: process.env.LOG_LEVEL || 'debug',
})); 