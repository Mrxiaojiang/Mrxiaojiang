import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TravelPlan } from './travel-plan.entity';
import { TravelSuggestion } from './travel-suggestion.entity';
import { AmapService } from './amap.service';
import type { CustomizeResult } from './amap.service';

@Injectable()
export class TravelService {
  constructor(
    @InjectRepository(TravelPlan)
    private planRepository: Repository<TravelPlan>,
    @InjectRepository(TravelSuggestion)
    private suggestionRepository: Repository<TravelSuggestion>,
    private amapService: AmapService,
  ) {}

  // ─── 旅游计划 ─────────────────────────────────────────
  findAllPublicPlans(page = 1, limit = 20) {
    return this.planRepository.findAndCount({
      where: { is_public: true },
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['user'],
    });
  }

  findMyPlans(userId: string) {
    return this.planRepository.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
    });
  }

  createPlan(data: Partial<TravelPlan>) {
    const plan = this.planRepository.create(data);
    return this.planRepository.save(plan);
  }

  updatePlan(id: string, data: Partial<TravelPlan>) {
    return this.planRepository.update(id, data);
  }

  deletePlan(id: string) {
    return this.planRepository.delete(id);
  }

  // ─── 旅游建议 ─────────────────────────────────────────
  findAllSuggestions(page = 1, limit = 20, category?: string) {
    const where: any = {};
    if (category) where.category = category;
    return this.suggestionRepository.findAndCount({
      where,
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['user'],
    });
  }

  createSuggestion(data: Partial<TravelSuggestion>) {
    const item = this.suggestionRepository.create(data);
    return this.suggestionRepository.save(item);
  }

  deleteSuggestion(id: string) {
    return this.suggestionRepository.delete(id);
  }

  // ─── 旅游定制（高德地图集成） ─────────────────────────
  async customize(data: {
    origin: string;
    stopovers: { name: string; duration: string }[];
    destination: string;
  }): Promise<CustomizeResult> {
    return this.amapService.customize(data);
  }
}
