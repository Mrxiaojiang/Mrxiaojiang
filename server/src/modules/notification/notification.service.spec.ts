import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationService } from './notification.service';
import { NotificationGateway } from './notification.gateway';
import { Notification, NotificationType, NotificationTargetType } from './notification.entity';

describe('NotificationService', () => {
  let service: NotificationService;
  let repository: jest.Mocked<Repository<Notification>>;
  let gateway: jest.Mocked<NotificationGateway>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: getRepositoryToken(Notification),
          useValue: {
            save: jest.fn(),
            findAndCount: jest.fn(),
            update: jest.fn(),
            count: jest.fn(),
          },
        },
        {
          provide: NotificationGateway,
          useValue: {
            sendToUser: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    repository = module.get(getRepositoryToken(Notification));
    gateway = module.get(NotificationGateway);
  });

  // ─── notify ────────────────────────────────────────────
  describe('notify', () => {
    it('should save notification and push via gateway', async () => {
      const savedNotif = {
        id: 'notif-1',
        user_id: 'user-2',
        actor_id: 'user-1',
        type: NotificationType.COMMENT,
        target_type: NotificationTargetType.POST,
        target_id: 'post-1',
        content: '评论了你的帖子',
      };
      repository.save.mockResolvedValue(savedNotif as Notification);

      const result = await service.notify({
        user_id: 'user-2',
        actor_id: 'user-1',
        type: NotificationType.COMMENT,
        target_type: NotificationTargetType.POST,
        target_id: 'post-1',
        content: '评论了你的帖子',
      });

      expect(repository.save).toHaveBeenCalledWith({
        user_id: 'user-2',
        actor_id: 'user-1',
        type: NotificationType.COMMENT,
        target_type: NotificationTargetType.POST,
        target_id: 'post-1',
        content: '评论了你的帖子',
      });
      expect(gateway.sendToUser).toHaveBeenCalledWith(
        'user-2',
        'notification',
        savedNotif,
      );
      expect(gateway.sendToUser).toHaveBeenCalledWith('user-2', 'unread_count', {
        count: 1,
      });
      expect(result).toEqual(savedNotif);
    });
  });

  // ─── findByUser ────────────────────────────────────────
  describe('findByUser', () => {
    it('should return paginated notifications for user', async () => {
      const mockNotifs = [{ id: 'n1', user_id: 'user-1' }] as Notification[];
      repository.findAndCount.mockResolvedValue([mockNotifs, 1]);

      const [notifs, total] = await service.findByUser('user-1');

      expect(repository.findAndCount).toHaveBeenCalledWith({
        where: { user_id: 'user-1' },
        order: { created_at: 'DESC' },
        skip: 0,
        take: 20,
      });
      expect(notifs).toHaveLength(1);
      expect(total).toBe(1);
    });
  });

  // ─── markAsRead ────────────────────────────────────────
  describe('markAsRead', () => {
    it('should mark single notification as read', async () => {
      repository.update.mockResolvedValue({ affected: 1 } as any);

      await service.markAsRead('notif-1', 'user-1');

      expect(repository.update).toHaveBeenCalledWith(
        { id: 'notif-1', user_id: 'user-1' },
        { is_read: true },
      );
    });
  });

  // ─── markAllAsRead ─────────────────────────────────────
  describe('markAllAsRead', () => {
    it('should mark all unread as read for user', async () => {
      repository.update.mockResolvedValue({ affected: 5 } as any);

      await service.markAllAsRead('user-1');

      expect(repository.update).toHaveBeenCalledWith(
        { user_id: 'user-1', is_read: false },
        { is_read: true },
      );
    });
  });

  // ─── getUnreadCount ────────────────────────────────────
  describe('getUnreadCount', () => {
    it('should return unread notification count', async () => {
      repository.count.mockResolvedValue(3);

      const result = await service.getUnreadCount('user-1');

      expect(repository.count).toHaveBeenCalledWith({
        where: { user_id: 'user-1', is_read: false },
      });
      expect(result).toBe(3);
    });

    it('should return zero when all read', async () => {
      repository.count.mockResolvedValue(0);

      const result = await service.getUnreadCount('user-1');

      expect(result).toBe(0);
    });
  });
});
