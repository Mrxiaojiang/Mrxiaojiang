import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { CommunityPost } from './community-post.entity';
import { Comment } from './comment.entity';
import { LikeRecord, LikeTargetType } from './like-record.entity';
import { NotificationService } from '../notification/notification.service';
import { NotificationType, NotificationTargetType } from '../notification/notification.entity';

@Injectable()
export class CommunityService {
  constructor(
    @InjectRepository(CommunityPost)
    private postRepository: Repository<CommunityPost>,
    @InjectRepository(Comment)
    private commentRepository: Repository<Comment>,
    @InjectRepository(LikeRecord)
    private likeRepository: Repository<LikeRecord>,
    private notificationService: NotificationService,
  ) {}

  // ─── 帖子 ─────────────────────────────────────────────
  findAllPosts(page = 1, limit = 20) {
    return this.postRepository.findAndCount({
      where: { deleted_at: IsNull() },
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['author'],
    });
  }

  findPostById(id: string) {
    return this.postRepository.findOne({
      where: { id, deleted_at: IsNull() },
      relations: ['author', 'comments', 'comments.author'],
    });
  }

  async createPost(data: Partial<CommunityPost>) {
    const post = await this.postRepository.save(data);
    return this.postRepository.findOne({
      where: { id: post.id },
      relations: ['author'],
    });
  }

  async softDeletePost(id: string) {
    const post = await this.postRepository.findOne({ where: { id } });
    if (post) {
      await this.commentRepository.softDelete({ post_id: id });
      await this.postRepository.softDelete(id);
    }
  }

  // ─── 评论 ─────────────────────────────────────────────
  findCommentsByPost(postId: string) {
    return this.commentRepository.find({
      where: { post_id: postId, deleted_at: IsNull() },
      order: { created_at: 'ASC' },
      relations: ['author'],
    });
  }

  async createComment(data: Partial<Comment>) {
    const comment = await this.commentRepository.save(data);

    // 更新帖子评论数
    await this.postRepository.increment({ id: data.post_id! }, 'comment_count', 1);

    // ─── 通知逻辑 ──────────────────────────────────────
    const post = await this.postRepository.findOne({
      where: { id: data.post_id },
      relations: ['author'],
    });

    if (post && post.author_id !== data.author_id) {
      if (data.parent_id) {
        // 回复评论 → 通知被回复的评论作者
        const parentComment = await this.commentRepository.findOne({
          where: { id: data.parent_id },
          relations: ['author'],
        });
        if (parentComment && parentComment.author_id !== data.author_id) {
          await this.notificationService.notify({
            user_id: parentComment.author_id,
            actor_id: data.author_id!,
            type: NotificationType.REPLY,
            target_type: NotificationTargetType.POST,
            target_id: data.post_id!,
            content: `回复了你的评论：「${(data.content || '').slice(0, 100)}」`,
          });
        }
      } else {
        // 评论帖子 → 通知帖子作者
        await this.notificationService.notify({
          user_id: post.author_id,
          actor_id: data.author_id!,
          type: NotificationType.COMMENT,
          target_type: NotificationTargetType.POST,
          target_id: data.post_id!,
          content: `评论了你的帖子：「${(data.content || '').slice(0, 100)}」`,
        });
      }
    }

    return this.commentRepository.findOne({
      where: { id: comment.id },
      relations: ['author'],
    });
  }

  softDeleteComment(id: string) {
    return this.commentRepository.softDelete(id);
  }

  // ─── 点赞 ─────────────────────────────────────────────
  async toggleLike(userId: string, targetType: LikeTargetType, targetId: string) {
    const existing = await this.likeRepository.findOne({
      where: { user_id: userId, target_type: targetType, target_id: targetId },
    });

    if (existing) {
      await this.likeRepository.remove(existing);
      // 递减对应内容的点赞数
      await this.decrementLikeCount(targetType, targetId);
      return { liked: false };
    }

    await this.likeRepository.save({
      user_id: userId,
      target_type: targetType,
      target_id: targetId,
    });

    // 递增对应内容的点赞数
    await this.incrementLikeCount(targetType, targetId);

    // ─── 点赞通知 ─────────────────────────────────────
    // 查找内容作者并通知
    let authorId: string | null = null;
    if (targetType === LikeTargetType.POST) {
      const post = await this.postRepository.findOne({ where: { id: targetId } });
      authorId = post?.author_id || null;
    } else if (targetType === LikeTargetType.COMMENT) {
      const comment = await this.commentRepository.findOne({ where: { id: targetId } });
      authorId = comment?.author_id || null;
    }

    if (authorId && authorId !== userId) {
      await this.notificationService.notify({
        user_id: authorId,
        actor_id: userId,
        type: NotificationType.LIKE,
        target_type: targetType === LikeTargetType.ALBUM
          ? NotificationTargetType.ALBUM
          : targetType === LikeTargetType.COMMENT
            ? NotificationTargetType.COMMENT
            : NotificationTargetType.POST,
        target_id: targetId,
        content: `赞了你的${targetType === LikeTargetType.POST ? '帖子' : targetType === LikeTargetType.COMMENT ? '评论' : '相册'}`,
      });
    }

    return { liked: true };
  }

  // ─── 点赞数操作 ─────────────────────────────────────
  private async incrementLikeCount(targetType: LikeTargetType, targetId: string) {
    if (targetType === LikeTargetType.POST) {
      await this.postRepository.increment({ id: targetId }, 'like_count', 1);
    } else if (targetType === LikeTargetType.COMMENT) {
      await this.commentRepository.increment({ id: targetId }, 'like_count', 1);
    }
  }

  private async decrementLikeCount(targetType: LikeTargetType, targetId: string) {
    if (targetType === LikeTargetType.POST) {
      await this.postRepository.decrement({ id: targetId }, 'like_count', 1);
    } else if (targetType === LikeTargetType.COMMENT) {
      await this.commentRepository.decrement({ id: targetId }, 'like_count', 1);
    }
  }
}
