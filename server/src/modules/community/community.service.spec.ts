import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { CommunityService } from './community.service';
import { CommunityPost } from './community-post.entity';
import { Comment } from './comment.entity';
import { LikeRecord, LikeTargetType } from './like-record.entity';
import { NotificationService } from '../notification/notification.service';
import { NotificationType, NotificationTargetType } from '../notification/notification.entity';

describe('CommunityService', () => {
  let service: CommunityService;
  let postRepository: jest.Mocked<Repository<CommunityPost>>;
  let commentRepository: jest.Mocked<Repository<Comment>>;
  let likeRepository: jest.Mocked<Repository<LikeRecord>>;
  let notificationService: jest.Mocked<NotificationService>;

  const mockUser = { id: 'user-1', nickname: 'Alice' };
  const mockPost = {
    id: 'post-1',
    title: 'Test Post',
    content: 'Content',
    author_id: 'user-2',
    like_count: 0,
    comment_count: 0,
    author: mockUser,
  } as CommunityPost;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommunityService,
        {
          provide: getRepositoryToken(CommunityPost),
          useValue: {
            findAndCount: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            save: jest.fn(),
            softDelete: jest.fn(),
            increment: jest.fn(),
            decrement: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Comment),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            softDelete: jest.fn(),
            increment: jest.fn(),
            decrement: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(LikeRecord),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: NotificationService,
          useValue: {
            notify: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CommunityService>(CommunityService);
    postRepository = module.get(getRepositoryToken(CommunityPost));
    commentRepository = module.get(getRepositoryToken(Comment));
    likeRepository = module.get(getRepositoryToken(LikeRecord));
    notificationService = module.get(NotificationService);
  });

  // ─── Posts ─────────────────────────────────────────────
  describe('findAllPosts', () => {
    it('should return non-deleted posts with pagination', async () => {
      postRepository.findAndCount.mockResolvedValue([[mockPost as CommunityPost], 1]);

      const [posts, total] = await service.findAllPosts();

      expect(postRepository.findAndCount).toHaveBeenCalledWith({
        where: { deleted_at: IsNull() },
        order: { created_at: 'DESC' },
        skip: 0,
        take: 20,
        relations: ['author'],
      });
      expect(posts).toHaveLength(1);
      expect(total).toBe(1);
    });
  });

  describe('findPostById', () => {
    it('should return post with comments', async () => {
      postRepository.findOne.mockResolvedValue(mockPost as CommunityPost);

      const result = await service.findPostById('post-1');

      expect(postRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'post-1', deleted_at: IsNull() },
        relations: ['author', 'comments', 'comments.author'],
      });
      expect(result).toEqual(mockPost);
    });
  });

  describe('createPost', () => {
    it('should create and return post with author relation', async () => {
      postRepository.save.mockResolvedValue({ id: 'new-post' } as CommunityPost);
      postRepository.findOne.mockResolvedValue(mockPost as CommunityPost);

      const result = await service.createPost({
        title: 'New Post',
        author_id: 'user-1',
      });

      expect(postRepository.save).toHaveBeenCalledWith({
        title: 'New Post',
        author_id: 'user-1',
      });
      expect(result).toEqual(mockPost);
    });
  });

  describe('softDeletePost', () => {
    it('should soft delete post and its comments', async () => {
      postRepository.findOne.mockResolvedValue(mockPost as CommunityPost);

      await service.softDeletePost('post-1');

      expect(commentRepository.softDelete).toHaveBeenCalledWith({ post_id: 'post-1' });
      expect(postRepository.softDelete).toHaveBeenCalledWith('post-1');
    });

    it('should do nothing if post not found', async () => {
      postRepository.findOne.mockResolvedValue(null);

      await service.softDeletePost('post-1');

      expect(commentRepository.softDelete).not.toHaveBeenCalled();
      expect(postRepository.softDelete).not.toHaveBeenCalled();
    });
  });

  // ─── Comments ──────────────────────────────────────────
  describe('findCommentsByPost', () => {
    it('should return non-deleted comments for a post', async () => {
      const mockComment = { id: 'c1', content: 'Nice!', deleted_at: null, author: mockUser } as any;
      commentRepository.find.mockResolvedValue([mockComment]);

      const result = await service.findCommentsByPost('post-1');

      expect(commentRepository.find).toHaveBeenCalledWith({
        where: { post_id: 'post-1', deleted_at: IsNull() },
        order: { created_at: 'ASC' },
        relations: ['author'],
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('createComment', () => {
    const commentData = {
      content: 'Great post!',
      author_id: 'user-1',
      post_id: 'post-1',
    };

    it('should create a comment and notify post author', async () => {
      commentRepository.save.mockResolvedValue({ id: 'c1' } as Comment);
      commentRepository.findOne
        .mockResolvedValueOnce({ id: 'c1', ...commentData, author: { id: 'user-1' } } as any);

      const postWithAuthor = {
        ...mockPost,
        author: { id: 'user-2', nickname: 'Bob' },
      };
      postRepository.findOne.mockResolvedValue(postWithAuthor as CommunityPost);

      const result = await service.createComment(commentData as any);

      expect(postRepository.increment).toHaveBeenCalledWith(
        { id: 'post-1' },
        'comment_count',
        1,
      );
      expect(notificationService.notify).toHaveBeenCalledWith({
        user_id: 'user-2',
        actor_id: 'user-1',
        type: NotificationType.COMMENT,
        target_type: NotificationTargetType.POST,
        target_id: 'post-1',
        content: expect.stringContaining('评论了你的帖子'),
      });
      expect(result).toBeDefined();
    });

    it('should notify comment author on reply (not self)', async () => {
      const replyData = {
        content: 'Thanks!',
        author_id: 'user-3',
        post_id: 'post-1',
        parent_id: 'c1',
      };

      commentRepository.save.mockResolvedValue({ id: 'c2' } as Comment);
      commentRepository.findOne
        // First call: parent comment lookup
        .mockResolvedValueOnce({
          id: 'c1',
          author_id: 'user-2',
          author: { id: 'user-2' },
        } as any)
        // Second call: return new comment
        .mockResolvedValueOnce({ id: 'c2', ...replyData } as any);

      const postWithAuthor = {
        ...mockPost,
        author: { id: 'user-2' },
      };
      postRepository.findOne.mockResolvedValue(postWithAuthor as CommunityPost);

      await service.createComment(replyData as any);

      expect(notificationService.notify).toHaveBeenCalledWith({
        user_id: 'user-2',
        actor_id: 'user-3',
        type: NotificationType.REPLY,
        target_type: NotificationTargetType.POST,
        target_id: 'post-1',
        content: expect.stringContaining('回复了你的评论'),
      });
    });

    it('should not notify if user comments on own post', async () => {
      commentRepository.save.mockResolvedValue({ id: 'c1' } as Comment);
      commentRepository.findOne
        .mockResolvedValueOnce({ id: 'c1', ...commentData } as any);

      const postWithAuthor = {
        ...mockPost,
        author_id: 'user-1',
        author: { id: 'user-1' },
      };
      postRepository.findOne.mockResolvedValue(postWithAuthor as CommunityPost);

      await service.createComment(commentData as any);

      expect(notificationService.notify).not.toHaveBeenCalled();
    });
  });

  describe('softDeleteComment', () => {
    it('should soft delete a comment', async () => {
      commentRepository.softDelete.mockResolvedValue({ affected: 1 } as any);

      const result = await service.softDeleteComment('comment-1');

      expect(commentRepository.softDelete).toHaveBeenCalledWith('comment-1');
    });
  });

  // ─── Likes ─────────────────────────────────────────────
  describe('toggleLike', () => {
    it('should like a post and notify author', async () => {
      likeRepository.findOne.mockResolvedValue(null);
      likeRepository.save.mockResolvedValue({} as any);
      postRepository.findOne.mockResolvedValue(mockPost as CommunityPost);

      const result = await service.toggleLike('user-1', LikeTargetType.POST, 'post-1');

      expect(likeRepository.save).toHaveBeenCalledWith({
        user_id: 'user-1',
        target_type: LikeTargetType.POST,
        target_id: 'post-1',
      });
      expect(postRepository.increment).toHaveBeenCalledWith(
        { id: 'post-1' },
        'like_count',
        1,
      );
      expect(notificationService.notify).toHaveBeenCalled();
      expect(result).toEqual({ liked: true });
    });

    it('should unlike a post', async () => {
      likeRepository.findOne.mockResolvedValue({ id: 'like-1' } as LikeRecord);

      const result = await service.toggleLike('user-1', LikeTargetType.POST, 'post-1');

      expect(likeRepository.remove).toHaveBeenCalledWith({ id: 'like-1' });
      expect(postRepository.decrement).toHaveBeenCalledWith(
        { id: 'post-1' },
        'like_count',
        1,
      );
      expect(result).toEqual({ liked: false });
    });

    it('should not notify if liking own content', async () => {
      likeRepository.findOne.mockResolvedValue(null);
      likeRepository.save.mockResolvedValue({} as any);
      postRepository.findOne.mockResolvedValue({
        ...mockPost,
        author_id: 'user-1',
      } as CommunityPost);

      await service.toggleLike('user-1', LikeTargetType.POST, 'post-1');

      expect(notificationService.notify).not.toHaveBeenCalled();
    });

    it('should like a comment and notify comment author', async () => {
      likeRepository.findOne.mockResolvedValue(null);
      likeRepository.save.mockResolvedValue({} as any);
      const mockComment = { id: 'c1', author_id: 'user-2' };
      commentRepository.findOne.mockResolvedValue(mockComment as Comment);

      await service.toggleLike('user-1', LikeTargetType.COMMENT, 'c1');

      expect(commentRepository.increment).toHaveBeenCalledWith(
        { id: 'c1' },
        'like_count',
        1,
      );
      expect(notificationService.notify).toHaveBeenCalled();
    });
  });
});
