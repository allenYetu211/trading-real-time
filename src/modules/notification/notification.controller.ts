import { Controller, Get, Post, Query, Body, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBody } from '@nestjs/swagger';
import { NotificationService, NotificationData } from './notification.service';
import { CreateNotificationDto, NotificationListDto } from './dto';
import { NotificationRecord } from './entities/notification-record.entity';
import { TelegramService } from './services/telegram.service';

@ApiTags('通知管理')
@Controller('api/notifications')
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly telegramService: TelegramService,
  ) {}

  @Get('history')
  @ApiOperation({ summary: '获取通知历史' })
  @ApiResponse({ 
    status: 200, 
    description: '成功获取通知历史',
    type: [Object]
  })
  @ApiQuery({ 
    name: 'date', 
    description: '日期 (YYYY-MM-DD)', 
    required: false, 
    example: '2025-01-20' 
  })
  async getNotificationHistory(
    @Query('date') date?: string
  ): Promise<NotificationData[]> {
    try {
      return await this.notificationService.getNotificationHistory(date);
    } catch (error) {
      throw new HttpException(
        `获取通知历史失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('latest')
  @ApiOperation({ summary: '获取今日最新通知' })
  @ApiResponse({ 
    status: 200, 
    description: '成功获取最新通知',
    type: [Object]
  })
  @ApiQuery({ 
    name: 'limit', 
    description: '限制数量', 
    required: false, 
    example: 10 
  })
  async getLatestNotifications(
    @Query('limit') limit: number = 10
  ): Promise<NotificationData[]> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const notifications = await this.notificationService.getNotificationHistory(today);
      
      // 按时间戳降序排序并限制数量
      return notifications
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);
        
    } catch (error) {
      throw new HttpException(
        `获取最新通知失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('create')
  @ApiOperation({ summary: '创建通知记录' })
  @ApiResponse({ 
    status: 201, 
    description: '成功创建通知记录',
    type: Object
  })
  @ApiBody({ type: CreateNotificationDto })
  async createNotification(@Body() dto: CreateNotificationDto): Promise<NotificationRecord> {
    try {
      return await this.notificationService.createNotification(dto);
    } catch (error) {
      throw new HttpException(
        `创建通知记录失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('list')
  @ApiOperation({ summary: '查询通知记录列表' })
  @ApiResponse({ 
    status: 200, 
    description: '成功获取通知记录列表',
    type: Object
  })
  @ApiBody({ type: NotificationListDto })
  async getNotificationList(@Body() dto: NotificationListDto): Promise<{
    data: NotificationRecord[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      return await this.notificationService.getNotificationList(dto);
    } catch (error) {
      throw new HttpException(
        `获取通知记录列表失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('stats')
  @ApiOperation({ summary: '获取通知统计' })
  @ApiResponse({ 
    status: 200, 
    description: '成功获取通知统计',
    type: Object
  })
  @ApiQuery({ 
    name: 'date', 
    description: '日期 (YYYY-MM-DD)', 
    required: false, 
    example: '2025-01-20' 
  })
  async getNotificationStats(
    @Query('date') date?: string
  ): Promise<{
    today: number;
    byType: Record<string, number>;
    bySignal?: Record<string, number>;
  }> {
    try {
      return await this.notificationService.getNotificationStats(date);
    } catch (error) {
      throw new HttpException(
        `获取通知统计失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('telegram/test')
  @ApiOperation({ summary: '测试 Telegram 连接' })
  @ApiResponse({ 
    status: 200, 
    description: 'Telegram 连接测试结果',
    type: Object
  })
  async testTelegramConnection(): Promise<{
    success: boolean;
    message: string;
    botInfo?: any;
  }> {
    try {
      const isConnected = await this.telegramService.testConnection();
      const botInfo = await this.telegramService.getBotInfo();
      
      return {
        success: isConnected,
        message: isConnected ? 'Telegram 连接测试成功' : 'Telegram 连接测试失败',
        botInfo: botInfo ? {
          id: botInfo.id,
          username: botInfo.username,
          firstName: botInfo.first_name,
        } : null,
      };
    } catch (error) {
      throw new HttpException(
        `Telegram 连接测试失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('telegram/send')
  @ApiOperation({ summary: '发送自定义 Telegram 消息' })
  @ApiResponse({ 
    status: 200, 
    description: '消息发送结果',
    type: Object
  })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: '要发送的消息内容',
          example: '🧪 这是一条测试消息'
        }
      },
      required: ['message']
    }
  })
  async sendTelegramMessage(@Body('message') message: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      if (!message) {
        throw new HttpException('消息内容不能为空', HttpStatus.BAD_REQUEST);
      }

      const success = await this.telegramService.sendCustomMessage(message);
      
      return {
        success,
        message: success ? 'Telegram 消息发送成功' : 'Telegram 消息发送失败'
      };
    } catch (error) {
      throw new HttpException(
        `发送 Telegram 消息失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('telegram/status')
  @ApiOperation({ summary: '获取 Telegram 服务状态' })
  @ApiResponse({ 
    status: 200, 
    description: 'Telegram 服务状态',
    type: Object
  })
  async getTelegramStatus(): Promise<{
    enabled: boolean;
    connected: boolean;
    botInfo?: any;
  }> {
    try {
      const enabled = this.telegramService.isEnabled();
      const botInfo = enabled ? await this.telegramService.getBotInfo() : null;
      
      return {
        enabled,
        connected: !!botInfo,
        botInfo: botInfo ? {
          id: botInfo.id,
          username: botInfo.username,
          firstName: botInfo.first_name,
        } : null,
      };
    } catch (error) {
      throw new HttpException(
        `获取 Telegram 状态失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * 重新初始化 Telegram 菜单
   */
  @Post('telegram/reinit-menu')
  async reinitializeTelegramMenu() {
    try {
      const result = await this.telegramService.reinitializeMenus();
      return {
        success: true,
        message: '菜单重新初始化完成',
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: `菜单重新初始化失败: ${error.message}`,
      };
    }
  }
} 