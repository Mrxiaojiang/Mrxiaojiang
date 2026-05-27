import http from './http';
import type { Blog } from '../types';

export const blogApi = {
  list: (page = 1, limit = 10) =>
    http.get<{ data: Blog[]; total: number }>('/blogs', { params: { page, limit } }),

  featured: () =>
    http.get<Blog[]>('/blogs/featured'),

  detail: (id: string) =>
    http.get<Blog>(`/blogs/${id}`),

  create: (data: Partial<Blog>) =>
    http.post<Blog>('/blogs', data),

  update: (id: string, data: Partial<Blog>) =>
    http.put(`/blogs/${id}`, data),

  remove: (id: string) =>
    http.delete(`/blogs/${id}`),
};
