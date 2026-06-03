import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { BlogService } from './blog.service';
import { Blog } from './blog.entity';

describe('BlogService', () => {
  let service: BlogService;
  let repository: jest.Mocked<Repository<Blog>>;

  const mockBlog = {
    id: 'blog-uuid-1',
    title: 'Test Blog',
    content: 'Blog content here',
    author_id: 'user-uuid-1',
    is_published: true,
    is_featured: false,
  } as Blog;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlogService,
        {
          provide: getRepositoryToken(Blog),
          useValue: {
            findAndCount: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            increment: jest.fn().mockResolvedValue({}),
            save: jest.fn(),
            update: jest.fn(),
            softDelete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<BlogService>(BlogService);
    repository = module.get(getRepositoryToken(Blog));
  });

  describe('findAll', () => {
    it('should return published blogs excluding soft-deleted', async () => {
      repository.findAndCount.mockResolvedValue([[mockBlog as Blog], 1]);

      const [blogs, total] = await service.findAll();

      expect(repository.findAndCount).toHaveBeenCalledWith({
        where: { is_published: true, deleted_at: IsNull() },
        order: { published_at: 'DESC' },
        skip: 0,
        take: 10,
        relations: ['author'],
      });
      expect(blogs).toHaveLength(1);
      expect(total).toBe(1);
    });

    it('should paginate correctly', async () => {
      repository.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll(2, 5);

      expect(repository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 5, take: 5 }),
      );
    });
  });

  describe('findFeatured', () => {
    it('should return featured published blogs', async () => {
      repository.find.mockResolvedValue([mockBlog as Blog]);

      const result = await service.findFeatured();

      expect(repository.find).toHaveBeenCalledWith({
        where: { is_featured: true, is_published: true, deleted_at: IsNull() },
        order: { published_at: 'DESC' },
        take: 5,
        relations: ['author'],
      });
      expect(result).toHaveLength(1);
    });

    it('should return empty array when none featured', async () => {
      repository.find.mockResolvedValue([]);

      const result = await service.findFeatured();

      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return blog by id', async () => {
      repository.findOne.mockResolvedValue(mockBlog as Blog);

      const result = await service.findById('blog-uuid-1');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 'blog-uuid-1', deleted_at: IsNull() },
        relations: ['author'],
      });
      expect(result).toEqual(mockBlog);
    });

    it('should return null for non-existent blog', async () => {
      repository.findOne.mockResolvedValue(null);

      const result = await service.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a new blog', async () => {
      const data = { title: 'New Blog', content: 'Content' };
      repository.save.mockResolvedValue({ id: 'new-uuid', ...data } as Blog);

      const result = await service.create(data);

      expect(repository.save).toHaveBeenCalledWith(data);
      expect(result).toHaveProperty('id', 'new-uuid');
    });
  });

  describe('update', () => {
    it('should update blog fields', async () => {
      repository.update.mockResolvedValue({ affected: 1 } as any);

      await service.update('blog-uuid-1', { title: 'Updated Title' });

      expect(repository.update).toHaveBeenCalledWith('blog-uuid-1', {
        title: 'Updated Title',
      });
    });
  });

  describe('softDelete', () => {
    it('should soft delete a blog', async () => {
      repository.softDelete.mockResolvedValue({ affected: 1 } as any);

      await service.softDelete('blog-uuid-1');

      expect(repository.softDelete).toHaveBeenCalledWith('blog-uuid-1');
    });
  });
});
