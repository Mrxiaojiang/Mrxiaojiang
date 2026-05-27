import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../authStore';

describe('authStore', () => {
  beforeEach(() => {
    localStorage.clear();
    // Reset store to initial state
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
  });

  it('should start unauthenticated when no token in localStorage', () => {
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
  });

  it('should set auth state on setAuth', () => {
    const mockUser = {
      id: '1',
      email: 'test@test.com',
      nickname: 'Test',
      avatar: null,
      bio: null,
      role: 'user' as const,
      is_active: true,
      last_login_at: null,
      created_at: '2026-01-01',
    };

    useAuthStore.getState().setAuth(mockUser, 'access-token', 'refresh-token');

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toEqual(mockUser);
    expect(state.accessToken).toBe('access-token');
    expect(state.refreshToken).toBe('refresh-token');
    expect(localStorage.getItem('accessToken')).toBe('access-token');
    expect(localStorage.getItem('refreshToken')).toBe('refresh-token');
  });

  it('should clear auth state on logout', () => {
    // First set auth
    const mockUser = {
      id: '1',
      email: 'test@test.com',
      nickname: 'Test',
      avatar: null,
      bio: null,
      role: 'user' as const,
      is_active: true,
      last_login_at: null,
      created_at: '2026-01-01',
    };
    useAuthStore.getState().setAuth(mockUser, 'at', 'rt');

    // Then logout
    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
  });

  it('should update user partially', () => {
    const mockUser = {
      id: '1',
      email: 'test@test.com',
      nickname: 'Test',
      avatar: null,
      bio: null,
      role: 'user' as const,
      is_active: true,
      last_login_at: null,
      created_at: '2026-01-01',
    };
    useAuthStore.getState().setAuth(mockUser, 'at', 'rt');
    useAuthStore.getState().updateUser({ nickname: 'NewName' });

    const state = useAuthStore.getState();
    expect(state.user?.nickname).toBe('NewName');
    expect(state.user?.email).toBe('test@test.com');
  });

  it('should not crash updateUser when user is null', () => {
    expect(() => {
      useAuthStore.getState().updateUser({ nickname: 'Test' });
    }).not.toThrow();
  });
});
