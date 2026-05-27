import http from './http';
import type { AuthResponse } from '../types';

export const authApi = {
  sendCode: (email: string) =>
    http.post('/auth/send-code', { email }),

  register: (data: { email: string; code: string; nickname: string; password: string }) =>
    http.post<AuthResponse>('/auth/register', data),

  loginWithPassword: (data: { email: string; password: string }) =>
    http.post<AuthResponse>('/auth/login/password', data),

  loginWithCode: (data: { email: string; code: string }) =>
    http.post<AuthResponse>('/auth/login/code', data),

  refresh: (refreshToken: string) =>
    http.post<AuthResponse>('/auth/refresh', { refreshToken }),
};
