import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import * as CryptoJS from 'crypto-js';
import { OkxConfig } from 'src/config/okx.config';
import { 
  OkxOrderData, 
  OkxApiResponse, 
  SyncParams,
  OkxFillData,
  OkxPendingOrderData,
  OkxPositionData,
  OkxDataResponse
} from '../interfaces/okx-trade.interface';

@Injectable()
export class OkxApiService {
  private readonly logger = new Logger(OkxApiService.name);
  private readonly httpClient: AxiosInstance;
  private readonly config: OkxConfig;

  constructor(private readonly configService: ConfigService) {
    this.config = this.configService.get<OkxConfig>('okx')!;
    
    this.httpClient = axios.create({
      baseURL: this.config.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 添加请求拦截器进行签名
    this.httpClient.interceptors.request.use((config) => {
      return this.signRequest(config);
    });
  }

  /**
   * 验证 API 配置是否完整
   */
  isConfigured(): boolean {
    return !!(
      this.config.apiKey &&
      this.config.secretKey &&
      this.config.passphrase
    );
  }

  /**
   * 测试 API 连接
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          message: 'OKX API 配置不完整，请检查环境变量'
        };
      }

      // 调用账户余额接口测试连接
      const response = await this.httpClient.get('/api/v5/account/balance');
      
      if (response.data.code === '0') {
        return {
          success: true,
          message: 'OKX API 连接成功'
        };
      } else {
        return {
          success: false,
          message: `OKX API 错误: ${response.data.msg}`
        };
      }
    } catch (error: any) {
      this.logger.error('OKX API 连接测试失败:', error.response?.data || error.message);
      return {
        success: false,
        message: `连接失败: ${error.response?.data?.msg || error.message}`
      };
    }
  }

  /**
   * 获取历史订单
   */
  async getOrderHistory(params: SyncParams = {}): Promise<OkxOrderData[]> {
    try {
      if (!this.isConfigured()) {
        throw new Error('OKX API 配置不完整');
      }

      const queryParams = {
        instType: params.instType || 'SWAP', // 默认获取永续合约
        limit: params.limit || 20,           // 默认获取20条
        ...(params.after && { after: params.after }),
        ...(params.before && { before: params.before }),
      };

      this.logger.log(`获取 OKX 历史订单，参数: ${JSON.stringify(queryParams)}`);

      const response = await this.httpClient.get<OkxApiResponse<OkxOrderData>>(
        '/api/v5/trade/orders-history-archive',
        { params: queryParams }
      );

      if (response.data.code === '0') {
        this.logger.log(`成功获取 ${response.data.data.length} 笔历史订单`);
        return response.data.data;
      } else {
        throw new Error(`OKX API 错误: ${response.data.msg}`);
      }
    } catch (error: any) {
      this.logger.error('获取 OKX 历史订单失败:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * 获取最近订单（包括未完成的）
   */
  async getRecentOrders(params: SyncParams = {}): Promise<OkxOrderData[]> {
    try {
      if (!this.isConfigured()) {
        throw new Error('OKX API 配置不完整');
      }

      const queryParams = {
        instType: params.instType || 'SWAP',
        limit: params.limit || 20,
        ...(params.after && { after: params.after }),
        ...(params.before && { before: params.before }),
      };

      this.logger.log(`获取 OKX 最近订单，参数: ${JSON.stringify(queryParams)}`);

      const response = await this.httpClient.get<OkxApiResponse<OkxOrderData>>(
        '/api/v5/trade/orders-history',
        { params: queryParams }
      );

      if (response.data.code === '0') {
        this.logger.log(`成功获取 ${response.data.data.length} 笔最近订单`);
        return response.data.data;
      } else {
        throw new Error(`OKX API 错误: ${response.data.msg}`);
      }
    } catch (error: any) {
      this.logger.error('获取 OKX 最近订单失败:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * 获取当前挂单（未成交订单）
   */
  async getPendingOrders(params: SyncParams = {}): Promise<OkxPendingOrderData[]> {
    try {
      if (!this.isConfigured()) {
        throw new Error('OKX API 配置不完整');
      }

      const queryParams = {
        instType: params.instType || 'SWAP',
        ...(params.after && { after: params.after }),
        ...(params.before && { before: params.before }),
      };

      this.logger.log(`获取 OKX 当前挂单，参数: ${JSON.stringify(queryParams)}`);

      const response = await this.httpClient.get<OkxApiResponse<OkxPendingOrderData>>(
        '/api/v5/trade/orders-pending',
        { params: queryParams }
      );

      if (response.data.code === '0') {
        this.logger.log(`成功获取 ${response.data.data.length} 笔当前挂单`);
        return response.data.data;
      } else {
        throw new Error(`OKX API 错误: ${response.data.msg}`);
      }
    } catch (error: any) {
      this.logger.error('获取 OKX 当前挂单失败:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * 获取成交明细（fills）- 这个API更准确地反映实际交易
   */
  async getTradeHistory(params: SyncParams = {}): Promise<OkxFillData[]> {
    try {
      if (!this.isConfigured()) {
        throw new Error('OKX API 配置不完整');
      }

      const queryParams = {
        instType: params.instType || 'SWAP',
        limit: params.limit || 100,
        ...(params.after && { after: params.after }),
        ...(params.before && { before: params.before }),
      };

      this.logger.log(`获取 OKX 成交明细，参数: ${JSON.stringify(queryParams)}`);

      const response = await this.httpClient.get<OkxApiResponse<OkxFillData>>(
        '/api/v5/trade/fills',
        { params: queryParams }
      );

      if (response.data.code === '0') {
        this.logger.log(`成功获取 ${response.data.data.length} 笔成交明细`);
        return response.data.data;
      } else {
        throw new Error(`OKX API 错误: ${response.data.msg}`);
      }
    } catch (error: any) {
      this.logger.error('获取 OKX 成交明细失败:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * 获取历史成交明细（超过3个月的数据）
   */
  async getTradeHistoryArchive(params: SyncParams = {}): Promise<OkxFillData[]> {
    try {
      if (!this.isConfigured()) {
        throw new Error('OKX API 配置不完整');
      }

      const queryParams = {
        instType: params.instType || 'SWAP',
        limit: params.limit || 100,
        ...(params.after && { after: params.after }),
        ...(params.before && { before: params.before }),
      };

      this.logger.log(`获取 OKX 历史成交明细，参数: ${JSON.stringify(queryParams)}`);

      const response = await this.httpClient.get<OkxApiResponse<OkxFillData>>(
        '/api/v5/trade/fills-history',
        { params: queryParams }
      );

      if (response.data.code === '0') {
        this.logger.log(`成功获取 ${response.data.data.length} 笔历史成交明细`);
        return response.data.data;
      } else {
        throw new Error(`OKX API 错误: ${response.data.msg}`);
      }
    } catch (error: any) {
      this.logger.error('获取 OKX 历史成交明细失败:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * 获取当前持仓
   */
  async getAccountPositions(params: SyncParams = {}): Promise<OkxPositionData[]> {
    try {
      if (!this.isConfigured()) {
        throw new Error('OKX API 配置不完整');
      }

      const queryParams = {
        instType: params.instType || 'SWAP',
      };

      this.logger.log(`获取 OKX 当前持仓，参数: ${JSON.stringify(queryParams)}`);

      const response = await this.httpClient.get<OkxApiResponse<OkxPositionData>>(
        '/api/v5/account/positions',
        { params: queryParams }
      );

      if (response.data.code === '0') {
        this.logger.log(`成功获取 ${response.data.data.length} 个当前持仓`);
        return response.data.data;
      } else {
        throw new Error(`OKX API 错误: ${response.data.msg}`);
      }
    } catch (error: any) {
      this.logger.error('获取 OKX 当前持仓失败:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * 获取完整的OKX数据（包括订单、成交明细、挂单、持仓）
   */
  async getCompleteOkxData(params: SyncParams = {}): Promise<OkxDataResponse> {
    try {
      this.logger.log('开始获取完整的OKX数据');

      // 并行获取所有数据
      const [orders, fills, pendingOrders, positions] = await Promise.all([
        this.getRecentOrders(params),
        this.getTradeHistory(params),
        this.getPendingOrders(params),
        this.getAccountPositions(params),
      ]);

      this.logger.log(`完整数据获取成功: 订单${orders.length}笔, 成交${fills.length}笔, 挂单${pendingOrders.length}笔, 持仓${positions.length}个`);

      return {
        orders,
        fills,
        pendingOrders,
        positions,
      };
    } catch (error: any) {
      this.logger.error('获取完整OKX数据失败:', error);
      throw error;
    }
  }

  /**
   * 获取已完成的交易记录（简化版本）
   * 直接获取已成交的订单，不进行复杂分组
   */
  async getCompletedTrades(params: SyncParams = {}): Promise<{ success: boolean; data: OkxOrderData[]; message: string }> {
    const { limit = 20, instType = 'SWAP' } = params;
    
    try {
      if (!this.isConfigured()) {
        throw new Error('OKX API 配置不完整');
      }

      this.logger.log(`获取已完成交易记录，限制：${limit} 条`);

      const queryParams = {
        instType,
        state: 'filled', // 只获取已完成的订单
        limit: limit.toString(),
      };

      // 只获取已完成的订单
      const response = await this.httpClient.get<OkxApiResponse<OkxOrderData>>(
        '/api/v5/trade/orders-history',
        { params: queryParams }
      );

      if (response.data.code === '0') {
        const orders = response.data.data;
        this.logger.log(`成功获取 ${orders.length} 条已完成订单`);

        return {
          success: true,
          data: orders,
          message: `获取到 ${orders.length} 条已完成交易记录`,
        };
      } else {
        throw new Error(`OKX API 错误: ${response.data.msg}`);
      }
    } catch (error: any) {
      this.logger.error('获取已完成交易记录失败:', error.response?.data || error.message);
      return {
        success: false,
        data: [],
        message: error.response?.data?.msg || error.message,
      };
    }
  }

  /**
   * 为请求添加签名
   */
  private signRequest(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
    if (!this.isConfigured()) {
      return config;
    }

    const timestamp = new Date().toISOString();
    const method = config.method?.toUpperCase() || 'GET';
    const path = config.url || '';
    
    // 构建查询参数字符串
    let queryString = '';
    if (config.params && Object.keys(config.params).length > 0) {
      queryString = '?' + new URLSearchParams(config.params).toString();
    }

    // 构建请求体字符串
    const body = config.data ? JSON.stringify(config.data) : '';

    // 构建签名字符串
    const signString = timestamp + method + path + queryString + body;

    // 使用 HMAC SHA256 签名
    const signature = CryptoJS.HmacSHA256(signString, this.config.secretKey).toString(CryptoJS.enc.Base64);

    // 添加必要的请求头
    config.headers['OK-ACCESS-KEY'] = this.config.apiKey;
    config.headers['OK-ACCESS-SIGN'] = signature;
    config.headers['OK-ACCESS-TIMESTAMP'] = timestamp;
    config.headers['OK-ACCESS-PASSPHRASE'] = this.config.passphrase;

    return config;
  }
} 