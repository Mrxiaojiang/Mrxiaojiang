import http from './http';
import type { Album } from '../types';

export const albumApi = {
  list: (page = 1, limit = 20) =>
    http.get<{ data: Album[]; total: number }>('/albums', { params: { page, limit } }),

  topLiked: () =>
    http.get<Album[]>('/albums/top-liked'),

  myAlbums: () =>
    http.get<Album[]>('/albums/my'),

  detail: (id: string) =>
    http.get<Album>(`/albums/${id}`),

  search: (keyword: string, page = 1, limit = 20) =>
    http.get<{ data: Album[]; total: number }>('/albums/search', {
      params: { keyword, page, limit },
    }),

  create: (data: Partial<Album>) =>
    http.post<Album>('/albums', data),

  update: (id: string, data: Partial<Album>) =>
    http.put(`/albums/${id}`, data),

  remove: (id: string) =>
    http.delete(`/albums/${id}`),

  like: (id: string) =>
    http.post<{ liked: boolean, like_count: number }>(`/albums/${id}/like`),

  getLikeStatus: (id: string) =>
    http.get<boolean>(`/albums/${id}/like-status`),

  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return http.post<{ url: string }>('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
