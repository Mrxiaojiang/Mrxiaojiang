import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './notification.entity';
import { NotificationGateway } from './notification.gateway';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    private notificationGateway: NotificationGateway,
  ) {}

  async notify(data: Partial<Notification>) {
    const notification = await this.notificationRepository.save(data);

    // 实时推送
    this.notificationGateway.sendToUser(data.user_id!, 'notification', notification);
    const unread = await this.getUnreadCount(data.user_id!);
    this.notificationGateway.sendToUser(data.user_id!, 'unread_count', {
      count: unread,
    });

    return notification;
  }

  findByUser(userId: string, page = 1, limit = 20) {
    return this.notificationRepository.findAndCount({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  markAsRead(id: string, userId: string) {
    return this.notificationRepository.update(
      { id, user_id: userId },
      { is_read: true },
    );
  }

  markAllAsRead(userId: string) {
    return this.notificationRepository.update(
      { user_id: userId, is_read: false },
      { is_read: true },
    );
  }

  async getUnreadCount(userId: string) {
    return this.notificationRepository.count({
      where: { user_id: userId, is_read: false },
    });
  }
}
