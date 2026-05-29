import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Blog } from './blog.entity';

@Injectable()
export class BlogService {
  constructor(
    @InjectRepository(Blog)
    private blogRepository: Repository<Blog>,
  ) {}

  findAll(page = 1, limit = 10) {
    return this.blogRepository.findAndCount({
      where: { is_published: true, deleted_at: IsNull() },
      order: { published_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['author'],
    });
  }

  findFeatured() {
    return this.blogRepository.find({
      where: { is_featured: true, is_published: true, deleted_at: IsNull() },
      order: { published_at: 'DESC' },
      take: 5,
      relations: ['author'],
    });
  }

  async findById(id: string) {
    const blog = await this.blogRepository.findOne({
      where: { id, deleted_at: IsNull() },
      relations: ['author'],
    });
    if (blog) {
      await this.blogRepository.increment({ id }, 'view_count', 1);
      blog.view_count += 1;
    }
    return blog;
  }

  create(data: Partial<Blog>) {
    if (data.is_published && !data.published_at) {
      data.published_at = new Date();
    }
    return this.blogRepository.save(data);
  }

  async update(id: string, data: Partial<Blog>) {
    if (data.is_published) {
      const existing = await this.blogRepository.findOne({ where: { id } });
      if (existing && !existing.published_at) {
        data.published_at = new Date();
      }
    }
    return this.blogRepository.update(id, data);
  }

  softDelete(id: string) {
    return this.blogRepository.softDelete(id);
  }
}
