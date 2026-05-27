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

  findById(id: string) {
    return this.blogRepository.findOne({
      where: { id, deleted_at: IsNull() },
      relations: ['author'],
    });
  }

  create(data: Partial<Blog>) {
    return this.blogRepository.save(data);
  }

  update(id: string, data: Partial<Blog>) {
    return this.blogRepository.update(id, data);
  }

  softDelete(id: string) {
    return this.blogRepository.softDelete(id);
  }
}
