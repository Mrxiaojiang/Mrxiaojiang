import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Inject } from '@nestjs/common';
import { Repository } from 'typeorm';
import Redis from 'ioredis';
import { TravelPlan } from './travel-plan.entity';
import { TravelSuggestion } from './travel-suggestion.entity';
import { AmapService } from './amap.service';
import { REDIS_CLIENT } from '../../config/redis.config';
import type { CustomizeResult } from './amap.service';

const SUGGESTION_LIKE_PREFIX = 'suggestion:like:';
const USER_SUGGESTION_LIKED_PREFIX = 'user:suggestion_liked:';
const PLAN_LIKE_PREFIX = 'plan:like:';
const USER_PLAN_LIKED_PREFIX = 'user:plan_liked:';

@Injectable()
export class TravelService {
  constructor(
    @InjectRepository(TravelPlan)
    private planRepository: Repository<TravelPlan>,
    @InjectRepository(TravelSuggestion)
    private suggestionRepository: Repository<TravelSuggestion>,
    @Inject(REDIS_CLIENT)
    private redis: Redis,
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
      relations: ['user'],
    });
  }

  findPlanById(id: string) {
    return this.planRepository.findOne({
      where: { id },
      relations: ['user'],
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
  findAllSuggestions(page = 1, limit = 20, category?: string, destination?: string) {
    const where: any = {};
    if (category) where.category = category;
    if (destination) where.destination = destination;
    return this.suggestionRepository.findAndCount({
      where,
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['user'],
    });
  }

  findSuggestionById(id: string) {
    return this.suggestionRepository.findOne({
      where: { id },
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

  // ─── 点赞 ─────────────────────────────────────────────
  async toggleSuggestionLike(suggestionId: string, userId: string) {
    const suggestion = await this.suggestionRepository.findOne({
      where: { id: suggestionId },
    });
    if (!suggestion) throw new NotFoundException('建议不存在');

    const likeKey = `${SUGGESTION_LIKE_PREFIX}${suggestionId}`;
    const isLiked = await this.redis.sismember(likeKey, userId);

    if (isLiked) {
      await this.redis.srem(likeKey, userId);
      await this.redis.srem(`${USER_SUGGESTION_LIKED_PREFIX}${userId}`, suggestionId);
      await this.suggestionRepository.decrement({ id: suggestionId }, 'like_count', 1);
      return { liked: false, like_count: Math.max(0, suggestion.like_count - 1) };
    } else {
      await this.redis.sadd(likeKey, userId);
      await this.redis.sadd(`${USER_SUGGESTION_LIKED_PREFIX}${userId}`, suggestionId);
      await this.suggestionRepository.increment({ id: suggestionId }, 'like_count', 1);
      return { liked: true, like_count: suggestion.like_count + 1 };
    }
  }

  async findLikedSuggestionIds(userId: string): Promise<string[]> {
    return this.redis.smembers(`${USER_SUGGESTION_LIKED_PREFIX}${userId}`);
  }

  // ─── 计划点赞 ─────────────────────────────────────────
  async togglePlanLike(planId: string, userId: string) {
    const plan = await this.planRepository.findOne({
      where: { id: planId },
    });
    if (!plan) throw new NotFoundException('计划不存在');

    const likeKey = `${PLAN_LIKE_PREFIX}${planId}`;
    const isLiked = await this.redis.sismember(likeKey, userId);

    if (isLiked) {
      await this.redis.srem(likeKey, userId);
      await this.redis.srem(`${USER_PLAN_LIKED_PREFIX}${userId}`, planId);
      await this.planRepository.decrement({ id: planId }, 'like_count', 1);
      return { liked: false, like_count: Math.max(0, plan.like_count - 1) };
    } else {
      await this.redis.sadd(likeKey, userId);
      await this.redis.sadd(`${USER_PLAN_LIKED_PREFIX}${userId}`, planId);
      await this.planRepository.increment({ id: planId }, 'like_count', 1);
      return { liked: true, like_count: plan.like_count + 1 };
    }
  }

  async findLikedPlanIds(userId: string): Promise<string[]> {
    return this.redis.smembers(`${USER_PLAN_LIKED_PREFIX}${userId}`);
  }

  async findLikedPlans(userId: string): Promise<TravelPlan[]> {
    const ids = await this.findLikedPlanIds(userId);
    if (ids.length === 0) return [];
    return this.planRepository
      .createQueryBuilder('plan')
      .leftJoinAndSelect('plan.user', 'user')
      .where('plan.id IN (:...ids)', { ids })
      .orderBy('plan.created_at', 'DESC')
      .getMany();
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
