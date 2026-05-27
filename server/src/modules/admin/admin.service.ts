import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { User } from '../user/user.entity';
import { Blog } from '../blog/blog.entity';
import { CommunityPost } from '../community/community-post.entity';
import { Comment } from '../community/comment.entity';
import { Album } from '../album/album.entity';
import { HotEvent } from './hot-event.entity';
import { SiteSetting } from './site-setting.entity';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Blog) private blogRepo: Repository<Blog>,
    @InjectRepository(CommunityPost) private postRepo: Repository<CommunityPost>,
    @InjectRepository(Comment) private commentRepo: Repository<Comment>,
    @InjectRepository(Album) private albumRepo: Repository<Album>,
    @InjectRepository(HotEvent) private hotEventRepo: Repository<HotEvent>,
    @InjectRepository(SiteSetting) private settingRepo: Repository<SiteSetting>,
  ) {}

  // ─── 仪表盘 ─────────────────────────────────────────
  async getDashboard() {
    const [userCount, blogCount, postCount, commentCount, albumCount] =
      await Promise.all([
        this.userRepo.count(),
        this.blogRepo.count({ where: { deleted_at: IsNull() } }),
        this.postRepo.count({ where: { deleted_at: IsNull() } }),
        this.commentRepo.count({ where: { deleted_at: IsNull() } }),
        this.albumRepo.count({ where: { deleted_at: IsNull() } }),
      ]);
    return { userCount, blogCount, postCount, commentCount, albumCount };
  }

  // ─── 用户管理 ─────────────────────────────────────────
  findAllUsers(page = 1, limit = 20) {
    return this.userRepo.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { created_at: 'DESC' },
    });
  }

  async toggleUserStatus(id: string) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (user) {
      await this.userRepo.update(id, { is_active: !user.is_active });
    }
  }

  // ─── 博客管理 ─────────────────────────────────────────
  findAllBlogs(page = 1, limit = 20) {
    return this.blogRepo.findAndCount({
      where: { deleted_at: IsNull() },
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['author'],
    });
  }

  async toggleBlogPin(id: string) {
    const blog = await this.blogRepo.findOne({ where: { id } });
    if (blog) await this.blogRepo.update(id, { is_pinned: !blog.is_pinned });
  }

  async toggleBlogFeatured(id: string) {
    const blog = await this.blogRepo.findOne({ where: { id } });
    if (blog) await this.blogRepo.update(id, { is_featured: !blog.is_featured });
  }

  deleteBlog(id: string) {
    return this.blogRepo.softDelete(id);
  }

  // ─── 帖子管理 ─────────────────────────────────────────
  findAllPosts(page = 1, limit = 20) {
    return this.postRepo.findAndCount({
      where: { deleted_at: IsNull() },
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['author'],
    });
  }

  deletePost(id: string) {
    return this.postRepo.softDelete(id);
  }

  // ─── 评论管理 ─────────────────────────────────────────
  findAllComments(page = 1, limit = 20) {
    return this.commentRepo.findAndCount({
      where: { deleted_at: IsNull() },
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['author'],
    });
  }

  deleteComment(id: string) {
    return this.commentRepo.softDelete(id);
  }

  // ─── 相册管理 ─────────────────────────────────────────
  findAllAlbums(page = 1, limit = 20) {
    return this.albumRepo.findAndCount({
      where: { deleted_at: IsNull() },
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['user'],
    });
  }

  deleteAlbum(id: string) {
    return this.albumRepo.softDelete(id);
  }

  // ─── 热点事件 ─────────────────────────────────────────
  findAllHotEvents() {
    return this.hotEventRepo.find({ order: { sort_weight: 'DESC' } });
  }

  createHotEvent(data: Partial<HotEvent>) {
    return this.hotEventRepo.save(data);
  }

  updateHotEvent(id: string, data: Partial<HotEvent>) {
    return this.hotEventRepo.update(id, data);
  }

  deleteHotEvent(id: string) {
    return this.hotEventRepo.delete(id);
  }

  // ─── 系统设置 ─────────────────────────────────────────
  async getSettings() {
    const settings = await this.settingRepo.find();
    const result: Record<string, string> = {};
    settings.forEach((s) => { result[s.key] = s.value; });
    return result;
  }

  async updateSettings(data: Record<string, string>) {
    for (const [key, value] of Object.entries(data)) {
      await this.settingRepo.upsert(
        { key, value },
        { conflictPaths: ['key'] },
      );
    }
    return this.getSettings();
  }
}
