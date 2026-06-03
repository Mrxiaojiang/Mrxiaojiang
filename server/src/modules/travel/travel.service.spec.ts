import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TravelService } from './travel.service';
import { TravelPlan } from './travel-plan.entity';
import { TravelSuggestion } from './travel-suggestion.entity';
import { AmapService } from './amap.service';
import type { CustomizeResult } from './amap.service';

describe('TravelService', () => {
  let service: TravelService;
  let planRepository: jest.Mocked<Repository<TravelPlan>>;
  let suggestionRepository: jest.Mocked<Repository<TravelSuggestion>>;
  let amapService: jest.Mocked<AmapService>;

  const mockPlan: Partial<TravelPlan> = {
    id: 'plan-1',
    title: '北京之旅',
    destination: '北京',
    user_id: 'user-1',
    is_public: true,
    itinerary: {},
  };

  const mockSuggestion: Partial<TravelSuggestion> = {
    id: 'sug-1',
    title: '推荐景点',
    destination: '北京',
    content: '故宫很不错',
    category: 'scenic' as any,
    user_id: 'user-1',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TravelService,
        {
          provide: getRepositoryToken(TravelPlan),
          useValue: {
            findAndCount: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(TravelSuggestion),
          useValue: {
            findAndCount: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: AmapService,
          useValue: {
            customize: jest.fn(),
          },
        },
        {
          provide: 'REDIS_CLIENT',
          useValue: {
            sismember: jest.fn().mockResolvedValue(0),
            sadd: jest.fn().mockResolvedValue(1),
            srem: jest.fn().mockResolvedValue(1),
            smembers: jest.fn().mockResolvedValue([]),
          },
        },
      ],
    }).compile();

    service = module.get<TravelService>(TravelService);
    planRepository = module.get(getRepositoryToken(TravelPlan));
    suggestionRepository = module.get(getRepositoryToken(TravelSuggestion));
    amapService = module.get(AmapService);
  });

  // ─── Plans ─────────────────────────────────────────────
  describe('findAllPublicPlans', () => {
    it('should return public plans with pagination', async () => {
      planRepository.findAndCount.mockResolvedValue([[mockPlan as TravelPlan], 1]);

      const [plans, total] = await service.findAllPublicPlans();

      expect(planRepository.findAndCount).toHaveBeenCalledWith({
        where: { is_public: true },
        order: { created_at: 'DESC' },
        skip: 0,
        take: 20,
        relations: ['user'],
      });
      expect(plans).toHaveLength(1);
      expect(total).toBe(1);
    });

    it('should exclude private plans', async () => {
      planRepository.findAndCount.mockResolvedValue([[], 0]);

      const [plans, total] = await service.findAllPublicPlans();

      expect(plans).toHaveLength(0);
      expect(total).toBe(0);
    });
  });

  describe('findMyPlans', () => {
    it('should return own plans', async () => {
      planRepository.find.mockResolvedValue([mockPlan as TravelPlan]);

      const result = await service.findMyPlans('user-1');

      expect(planRepository.find).toHaveBeenCalledWith({
        where: { user_id: 'user-1' },
        order: { created_at: 'DESC' },
        relations: ['user'],
      });
      expect(result).toHaveLength(1);
    });

    it('should return empty array when user has no plans', async () => {
      planRepository.find.mockResolvedValue([]);

      const result = await service.findMyPlans('user-2');

      expect(result).toEqual([]);
    });
  });

  describe('createPlan', () => {
    it('should create a travel plan', async () => {
      const data = { title: '新计划', destination: '上海', user_id: 'user-1' };
      planRepository.create.mockReturnValue(data as TravelPlan);
      planRepository.save.mockResolvedValue({ id: 'new-plan', ...data } as TravelPlan);

      const result = await service.createPlan(data as any);

      expect(planRepository.create).toHaveBeenCalledWith(data);
      expect(planRepository.save).toHaveBeenCalledWith(data);
      expect(result).toHaveProperty('id', 'new-plan');
    });
  });

  describe('updatePlan', () => {
    it('should update plan fields', async () => {
      planRepository.update.mockResolvedValue({ affected: 1 } as any);

      await service.updatePlan('plan-1', { title: 'Updated Title' });

      expect(planRepository.update).toHaveBeenCalledWith('plan-1', {
        title: 'Updated Title',
      });
    });
  });

  describe('deletePlan', () => {
    it('should hard delete a plan', async () => {
      planRepository.delete.mockResolvedValue({ affected: 1 } as any);

      await service.deletePlan('plan-1');

      expect(planRepository.delete).toHaveBeenCalledWith('plan-1');
    });
  });

  // ─── Suggestions ───────────────────────────────────────
  describe('findAllSuggestions', () => {
    it('should return all suggestions without category filter', async () => {
      suggestionRepository.findAndCount.mockResolvedValue([[mockSuggestion as TravelSuggestion], 1]);

      const [items, total] = await service.findAllSuggestions();

      expect(suggestionRepository.findAndCount).toHaveBeenCalledWith({
        where: {},
        order: { created_at: 'DESC' },
        skip: 0,
        take: 20,
        relations: ['user'],
      });
      expect(items).toHaveLength(1);
      expect(total).toBe(1);
    });

    it('should filter by category', async () => {
      suggestionRepository.findAndCount.mockResolvedValue([[mockSuggestion as TravelSuggestion], 1]);

      const [items] = await service.findAllSuggestions(1, 20, 'food');

      expect(suggestionRepository.findAndCount).toHaveBeenCalledWith({
        where: { category: 'food' },
        order: { created_at: 'DESC' },
        skip: 0,
        take: 20,
        relations: ['user'],
      });
      expect(items).toHaveLength(1);
    });
  });

  describe('createSuggestion', () => {
    it('should create a suggestion', async () => {
      const data = { title: '推荐', content: '内容', category: 'food', destination: '北京', user_id: 'user-1' };
      suggestionRepository.create.mockReturnValue(data as TravelSuggestion);
      suggestionRepository.save.mockResolvedValue({ id: 'new-sug', ...data } as TravelSuggestion);

      const result = await service.createSuggestion(data as any);

      expect(suggestionRepository.create).toHaveBeenCalledWith(data);
      expect(suggestionRepository.save).toHaveBeenCalledWith(data);
      expect(result).toHaveProperty('id', 'new-sug');
    });
  });

  describe('deleteSuggestion', () => {
    it('should delete a suggestion', async () => {
      suggestionRepository.delete.mockResolvedValue({ affected: 1 } as any);

      await service.deleteSuggestion('sug-1');

      expect(suggestionRepository.delete).toHaveBeenCalledWith('sug-1');
    });
  });

  // ─── Customize ─────────────────────────────────────────
  describe('customize', () => {
    it('should delegate to AmapService', async () => {
      const params = {
        origin: '北京',
        stopovers: [{ name: '天津', duration: '2天' }],
        destination: '上海',
      };
      const mockResult: CustomizeResult = {
        origin: '北京',
        destination: '上海',
        stopovers: [{ name: '天津', duration: '2天' }],
        routes: [{ type: 'high_speed_rail', label: '🚄 高铁', detail: '北京 → 上海', duration: '4.5h', distance: '1200 km' }],
        attractions: [],
        restaurants: [],
        shopping: [],
        segments: [{ from: '北京', to: '上海', routes: [{ type: 'high_speed_rail', label: '🚄 高铁', detail: '北京 → 上海', duration: '4.5h', distance: '1200 km' }] }],
        cityPois: [{ city: '上海', attractions: [], restaurants: [], shopping: [] }],
      };
      amapService.customize.mockResolvedValue(mockResult);

      const result = await service.customize(params);

      expect(amapService.customize).toHaveBeenCalledWith(params);
      expect(result).toEqual(mockResult);
      expect(result.routes[0].type).toBe('high_speed_rail');
    });
  });
});
