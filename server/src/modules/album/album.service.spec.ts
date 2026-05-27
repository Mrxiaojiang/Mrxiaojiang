import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, IsNull, In, Like } from 'typeorm';
import Redis from 'ioredis';
import { AlbumService } from './album.service';
import { Album, AlbumVisibility } from './album.entity';
import { REDIS_CLIENT } from '../../config/redis.config';

describe('AlbumService', () => {
  let service: AlbumService;
  let repository: jest.Mocked<Repository<Album>>;
  let redis: jest.Mocked<Redis>;

  const mockAlbum = {
    id: 'album-1',
    name: 'My Trip',
    user_id: 'user-1',
    visibility: AlbumVisibility.PUBLIC,
    like_count: 5,
    images: ['photo1.jpg'],
    user: { id: 'user-1', nickname: 'Alice' },
  } as Album;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlbumService,
        {
          provide: getRepositoryToken(Album),
          useValue: {
            findAndCount: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            softDelete: jest.fn(),
            increment: jest.fn(),
            decrement: jest.fn(),
          },
        },
        {
          provide: REDIS_CLIENT,
          useValue: {
            zrevrange: jest.fn(),
            zscore: jest.fn(),
            zrange: jest.fn(),
            zincrby: jest.fn(),
            sismember: jest.fn(),
            sadd: jest.fn(),
            srem: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AlbumService>(AlbumService);
    repository = module.get(getRepositoryToken(Album));
    redis = module.get(REDIS_CLIENT);
  });

  // ─── findAllPublic ─────────────────────────────────────
  describe('findAllPublic', () => {
    it('should return public non-deleted albums', async () => {
      repository.findAndCount.mockResolvedValue([[mockAlbum as Album], 1]);

      const [albums, total] = await service.findAllPublic();

      expect(repository.findAndCount).toHaveBeenCalledWith({
        where: { visibility: AlbumVisibility.PUBLIC, deleted_at: IsNull() },
        order: { created_at: 'DESC' },
        skip: 0,
        take: 20,
        relations: ['user'],
      });
      expect(albums).toHaveLength(1);
      expect(total).toBe(1);
    });
  });

  // ─── findTopLiked ──────────────────────────────────────
  describe('findTopLiked', () => {
    it('should return albums from Redis ZSET ranking', async () => {
      redis.zrevrange.mockResolvedValue(['album-1', 'album-2']);
      repository.find.mockResolvedValue([
        { ...mockAlbum, id: 'album-1' } as Album,
        { id: 'album-2', name: 'Album 2', user_id: 'user-2', visibility: AlbumVisibility.PUBLIC, like_count: 3, images: [] } as unknown as Album,
      ]);
      redis.zscore.mockResolvedValueOnce('10').mockResolvedValueOnce('7');

      const result = await service.findTopLiked(2);

      expect(redis.zrevrange).toHaveBeenCalledWith('album:like_rank', 0, 1);
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ id: 'album-1', like_count: 10 });
      expect(result[1]).toMatchObject({ id: 'album-2', like_count: 7 });
    });

    it('should fall back to DB when Redis ranking is empty', async () => {
      redis.zrevrange.mockResolvedValue([]);
      repository.find.mockResolvedValue([mockAlbum as Album]);

      const result = await service.findTopLiked();

      expect(repository.find).toHaveBeenCalledWith({
        where: { visibility: AlbumVisibility.PUBLIC, deleted_at: IsNull() },
        order: { like_count: 'DESC' },
        take: 10,
        relations: ['user'],
      });
      expect(result).toHaveLength(1);
    });
  });

  // ─── findMyAlbums ──────────────────────────────────────
  describe('findMyAlbums', () => {
    it('should return own non-deleted albums', async () => {
      repository.find.mockResolvedValue([mockAlbum as Album]);

      const result = await service.findMyAlbums('user-1');

      expect(repository.find).toHaveBeenCalledWith({
        where: { user_id: 'user-1', deleted_at: IsNull() },
        order: { created_at: 'DESC' },
      });
      expect(result).toHaveLength(1);
    });
  });

  // ─── findById ──────────────────────────────────────────
  describe('findById', () => {
    it('should return public album', async () => {
      repository.findOne.mockResolvedValue(mockAlbum as Album);

      const result = await service.findById('album-1');

      expect(result).toEqual(mockAlbum);
    });

    it('should return private album if owner', async () => {
      repository.findOne.mockResolvedValue({
        ...mockAlbum,
        visibility: AlbumVisibility.PRIVATE,
      } as Album);

      const result = await service.findById('album-1', 'user-1');

      expect(result).toBeDefined();
    });

    it('should throw if album not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw if private and not owner', async () => {
      repository.findOne.mockResolvedValue({
        ...mockAlbum,
        visibility: AlbumVisibility.PRIVATE,
      } as Album);

      await expect(service.findById('album-1', 'other-user')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ─── create / update / softDelete / search ─────────────
  describe('CRUD', () => {
    it('should create album', async () => {
      const data = { name: 'New Album', user_id: 'user-1' };
      repository.save.mockResolvedValue({ id: 'new-id', ...data } as Album);
      repository.findOne.mockResolvedValue({ ...mockAlbum, id: 'new-id' } as Album);

      const result = await service.create(data as any);

      expect(repository.save).toHaveBeenCalledWith(data);
      expect(result).toBeDefined();
    });

    it('should update album', async () => {
      repository.update.mockResolvedValue({ affected: 1 } as any);
      repository.findOne.mockResolvedValue(mockAlbum as Album);

      const result = await service.update('album-1', { name: 'Updated' });

      expect(repository.update).toHaveBeenCalledWith('album-1', { name: 'Updated' });
      expect(result).toEqual(mockAlbum);
    });

    it('should soft delete album', async () => {
      repository.softDelete.mockResolvedValue({ affected: 1 } as any);

      await service.softDelete('album-1');

      expect(repository.softDelete).toHaveBeenCalledWith('album-1');
    });

    it('should search albums by keyword', async () => {
      repository.findAndCount.mockResolvedValue([[mockAlbum as Album], 1]);

      const [albums, total] = await service.search('trip');

      expect(repository.findAndCount).toHaveBeenCalledWith({
        where: {
          visibility: AlbumVisibility.PUBLIC,
          deleted_at: IsNull(),
          name: Like('%trip%'),
        },
        skip: 0,
        take: 20,
        relations: ['user'],
      });
      expect(albums).toHaveLength(1);
      expect(total).toBe(1);
    });
  });

  // ─── toggleLike ────────────────────────────────────────
  describe('toggleLike', () => {
    it('should like a public album', async () => {
      repository.findOne.mockResolvedValue(mockAlbum as Album);
      redis.sismember.mockResolvedValue(0 as any);

      const result = await service.toggleLike('album-1', 'user-2');

      expect(redis.sadd).toHaveBeenCalledWith('album:like:album-1', 'user-2');
      expect(redis.zincrby).toHaveBeenCalledWith('album:like_rank', 1, 'album-1');
      expect(repository.increment).toHaveBeenCalledWith(
        { id: 'album-1' },
        'like_count',
        1,
      );
      expect(result).toEqual({ liked: true, like_count: 6 });
    });

    it('should unlike an album', async () => {
      repository.findOne.mockResolvedValue(mockAlbum as Album);
      redis.sismember.mockResolvedValue(1 as any);

      const result = await service.toggleLike('album-1', 'user-1');

      expect(redis.srem).toHaveBeenCalledWith('album:like:album-1', 'user-1');
      expect(redis.zincrby).toHaveBeenCalledWith('album:like_rank', -1, 'album-1');
      expect(repository.decrement).toHaveBeenCalledWith(
        { id: 'album-1' },
        'like_count',
        1,
      );
      expect(result).toEqual({ liked: false, like_count: 4 });
    });

    it('should throw if album not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.toggleLike('nonexistent', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw if album is private', async () => {
      repository.findOne.mockResolvedValue({
        ...mockAlbum,
        visibility: AlbumVisibility.PRIVATE,
      } as Album);

      await expect(service.toggleLike('album-1', 'user-2')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ─── getLikeStatus ─────────────────────────────────────
  describe('getLikeStatus', () => {
    it('should return true if user liked', async () => {
      redis.sismember.mockResolvedValue(1 as any);

      const result = await service.getLikeStatus('album-1', 'user-1');

      expect(result).toBe(true);
    });

    it('should return false if user not liked', async () => {
      redis.sismember.mockResolvedValue(0 as any);

      const result = await service.getLikeStatus('album-1', 'user-2');

      expect(result).toBe(false);
    });
  });

  // ─── syncLikeCounts ────────────────────────────────────
  describe('syncLikeCounts', () => {
    it('should sync all ZSET scores to DB', async () => {
      redis.zrange.mockResolvedValue(['album-1', 'album-2']);
      redis.zscore
        .mockResolvedValueOnce('10')
        .mockResolvedValueOnce('7');

      await service.syncLikeCounts();

      expect(repository.update).toHaveBeenCalledWith('album-1', { like_count: 10 });
      expect(repository.update).toHaveBeenCalledWith('album-2', { like_count: 7 });
    });

    it('should handle empty ranking', async () => {
      redis.zrange.mockResolvedValue([]);

      await service.syncLikeCounts();

      expect(repository.update).not.toHaveBeenCalled();
    });
  });
});
