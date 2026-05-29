import http from './http';
import type { CommunityPost, Comment } from '../types';

export const communityApi = {
  posts: (page = 1, limit = 20, keyword?: string) =>
    http.get<{ data: CommunityPost[]; total: number }>('/community/posts', {
      params: { page, limit, ...(keyword ? { keyword } : {}) },
    }),

  postDetail: (id: string) =>
    http.get<CommunityPost>(`/community/posts/${id}`),

  createPost: (data: Partial<CommunityPost>) =>
    http.post<CommunityPost>('/community/posts', data),

  deletePost: (id: string) =>
    http.delete(`/community/posts/${id}`),

  comments: (postId: string) =>
    http.get<Comment[]>(`/community/posts/${postId}/comments`),

  createComment: (postId: string, data: Partial<Comment>) =>
    http.post<Comment>(`/community/posts/${postId}/comments`, data),

  deleteComment: (id: string) =>
    http.delete(`/community/comments/${id}`),

  likePost: (postId: string) =>
    http.post<{ liked: boolean }>(`/community/posts/${postId}/like`),

  likeComment: (commentId: string) =>
    http.post<{ liked: boolean }>(`/community/comments/${commentId}/like`),
};
