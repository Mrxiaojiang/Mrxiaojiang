import http from './http';
import type { TravelPlan, TravelSuggestion } from '../types';

export const travelApi = {
  // 计划
  plans: (page = 1, limit = 20) =>
    http.get<{ data: TravelPlan[]; total: number }>('/travel/plans', {
      params: { page, limit },
    }),

  myPlans: () =>
    http.get<TravelPlan[]>('/travel/plans/my'),

  createPlan: (data: Partial<TravelPlan>) =>
    http.post<TravelPlan>('/travel/plans', data),

  updatePlan: (id: string, data: Partial<TravelPlan>) =>
    http.put(`/travel/plans/${id}`, data),

  deletePlan: (id: string) =>
    http.delete(`/travel/plans/${id}`),

  // 建议
  suggestions: (page = 1, limit = 20, category?: string, destination?: string) =>
    http.get<{ data: TravelSuggestion[]; total: number }>('/travel/suggestions', {
      params: { page, limit, category, destination },
    }),

  getSuggestion: (id: string) =>
    http.get<TravelSuggestion>(`/travel/suggestions/${id}`),

  createSuggestion: (data: Partial<TravelSuggestion>) =>
    http.post<TravelSuggestion>('/travel/suggestions', data),

  deleteSuggestion: (id: string) =>
    http.delete(`/travel/suggestions/${id}`),

  // 建议点赞
  likeSuggestion: (id: string) =>
    http.post<{ liked: boolean; like_count: number }>(`/travel/suggestions/${id}/like`),

  getLikedSuggestionIds: () =>
    http.get<string[]>('/travel/suggestions/liked-ids'),

  // 定制
  customize: (data: { origin: string; stopovers: { name: string; duration: string }[]; destination: string }) =>
    http.post('/travel/customize', data),
};
