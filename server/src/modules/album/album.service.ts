import {
  Injectable, Inject, ForbiddenException,
  NotFoundException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Like, In } from 'typeorm';
import Redis from 'ioredis';
import { Album, AlbumVisibility } from './album.entity';
import { REDIS_CLIENT } from '../../config/redis.config';
import { NotificationService } from '../notification/notification.service';
import { NotificationType, NotificationTargetType } from '../notification/notification.entity';

const ALBUM_LIKE_RANK_KEY = 'album:like_rank';
const ALBUM_LIKE_PREFIX = 'album:like:';
const USER_LIKED_PREFIX = 'user:liked:';

@Injectable()
export class AlbumService {
  private readonly logger = new Logger(AlbumService.name);

  constructor(
    @InjectRepository(Album)
    private albumRepository: Repository<Album>,
    @Inject(REDIS_CLIENT)
    private redis: Redis,
    private notificationService: NotificationService,
  ) {}

  findAllPublic(page = 1, limit = 20) {
    return this.albumRepository.findAndCount({
      where: { visibility: AlbumVisibility.PUBLIC, deleted_at: IsNull() },
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['user'],
    });
  }

  async findTopLiked(limit = 10) {
    // 从 Redis ZSET 获取 TOP N
    const ranked = await this.redis.zrevrange(ALBUM_LIKE_RANK_KEY, 0, limit - 1);
    if (ranked.length > 0) {
      const albums = await this.albumRepository.find({
        where: { id: In(ranked), visibility: AlbumVisibility.PUBLIC, deleted_at: IsNull() },
        relations: ['user'],
      });
      // 按 Redis 排序
      const albumMap = new Map(albums.map((a) => [a.id, a]));
      const scores = await Promise.all(
        ranked.map((id) => this.redis.zscore(ALBUM_LIKE_RANK_KEY, id)),
      );
      return ranked
        .map((id, i) => ({ album: albumMap.get(id), score: Number(scores[i] || 0) }))
        .filter((item) => item.album)
        .map((item) => ({ ...item.album, like_count: item.score }));
    }

    // 降级：从数据库查询
    return this.albumRepository.find({
      where: { visibility: AlbumVisibility.PUBLIC, deleted_at: IsNull() },
      order: { like_count: 'DESC' },
      take: limit,
      relations: ['user'],
    });
  }

  findMyAlbums(userId: string) {
    return this.albumRepository.find({
      where: { user_id: userId, deleted_at: IsNull() },
      order: { created_at: 'DESC' },
    });
  }

  async findById(id: string, userId?: string) {
    const album = await this.albumRepository.findOne({
      where: { id, deleted_at: IsNull() },
      relations: ['user'],
    });
    if (!album) throw new NotFoundException('相册不存在');
    if (album.visibility === AlbumVisibility.PRIVATE && album.user_id !== userId) {
      throw new ForbiddenException('无权查看此相册');
    }
    await this.albumRepository.increment({ id }, 'view_count', 1);
    album.view_count += 1;
    return album;
  }

  async create(data: Partial<Album>) {
    if (!data.cover_url && data.images && data.images.length > 0) {
      data.cover_url = data.images[0];
    }
    const album = await this.albumRepository.save(data);
    return this.albumRepository.findOne({
      where: { id: album.id },
      relations: ['user'],
    });
  }

  async update(id: string, data: Partial<Album>) {
    if (!data.cover_url && data.images && data.images.length > 0) {
      const existing = await this.albumRepository.findOne({ where: { id } });
      if (existing && !existing.cover_url) {
        data.cover_url = data.images[0];
      }
    }
    await this.albumRepository.update(id, data);
    return this.findById(id);
  }

  softDelete(id: string) {
    return this.albumRepository.softDelete(id);
  }

  search(keyword: string, page = 1, limit = 20) {
    return this.albumRepository.findAndCount({
      where: {
        visibility: AlbumVisibility.PUBLIC,
        deleted_at: IsNull(),
        name: Like(`%${keyword}%`),
      },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['user'],
    });
  }

  // ─── 点赞 / 取消 ─────────────────────────────────────
  async toggleLike(albumId: string, userId: string) {
    const album = await this.albumRepository.findOne({
      where: { id: albumId, deleted_at: IsNull() },
    });
    if (!album) throw new NotFoundException('相册不存在');
    if (album.visibility !== AlbumVisibility.PUBLIC) {
      throw new ForbiddenException('只能点赞公开相册');
    }

    const likeKey = `${ALBUM_LIKE_PREFIX}${albumId}`;
    const isLiked = await this.redis.sismember(likeKey, userId);

    if (isLiked) {
      // 取消点赞
      await this.redis.srem(likeKey, userId);
      await this.redis.srem(`${USER_LIKED_PREFIX}${userId}`, albumId);
      await this.redis.zincrby(ALBUM_LIKE_RANK_KEY, -1, albumId);
      await this.albumRepository.decrement({ id: albumId }, 'like_count', 1);
      return { liked: false, like_count: Math.max(0, album.like_count - 1) };
    } else {
      // 点赞
      await this.redis.sadd(likeKey, userId);
      await this.redis.sadd(`${USER_LIKED_PREFIX}${userId}`, albumId);
      await this.redis.zincrby(ALBUM_LIKE_RANK_KEY, 1, albumId);
      await this.albumRepository.increment({ id: albumId }, 'like_count', 1);

      // 通知相册作者
      if (album.user_id !== userId) {
        this.notificationService.notify({
          user_id: album.user_id,
          actor_id: userId,
          type: NotificationType.LIKE,
          target_type: NotificationTargetType.ALBUM,
          target_id: albumId,
          content: `赞了你的相册「${album.name}」`,
        }).catch(() => {});
      }

      return { liked: true, like_count: album.like_count + 1 };
    }
  }

  async getLikeStatus(albumId: string, userId: string): Promise<boolean> {
    const likeKey = `${ALBUM_LIKE_PREFIX}${albumId}`;
    const result = await this.redis.sismember(likeKey, userId);
    return result === 1;
  }

  async findLikedAlbumIds(userId: string): Promise<string[]> {
    return this.redis.smembers(`${USER_LIKED_PREFIX}${userId}`);
  }

  // 同步 Redis 点赞数到数据库（可定时调用）
  async syncLikeCounts() {
    const albums = await this.redis.zrange(ALBUM_LIKE_RANK_KEY, 0, -1);
    for (const albumId of albums) {
      const score = await this.redis.zscore(ALBUM_LIKE_RANK_KEY, albumId);
      if (score) {
        await this.albumRepository.update(albumId, { like_count: Number(score) });
      }
    }
    this.logger.log(`已同步 ${albums.length} 个相册点赞数`);
  }
}
