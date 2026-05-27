import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MainLayout from '../MainLayout';
import { useAuthStore } from '../../../store/authStore';
import { useAppStore } from '../../../store/appStore';

vi.mock('../../../socket', () => ({
  connectSocket: vi.fn(),
  disconnectSocket: vi.fn(),
}));

function renderWithRouter(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <MainLayout />
    </MemoryRouter>,
  );
}

describe('MainLayout', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
    useAppStore.setState({ unreadCount: 0, carouselDisabled: false });
  });

  it('should render footer copyright', () => {
    renderWithRouter();
    expect(screen.getByText(/记录每一次旅行/)).toBeInTheDocument();
  });

  it('should render navigation menu items', () => {
    renderWithRouter();
    expect(screen.getByText('首页')).toBeInTheDocument();
    expect(screen.getByText('交流社区')).toBeInTheDocument();
    expect(screen.getByText('风景记录')).toBeInTheDocument();
    expect(screen.getByText('旅游')).toBeInTheDocument();
  });

  it('should show login link when not authenticated', () => {
    renderWithRouter();
    expect(screen.getByText(/登录/)).toBeInTheDocument();
  });

  it('should show user nickname when authenticated', () => {
    useAuthStore.setState({
      user: {
        id: '1',
        email: 'test@test.com',
        nickname: 'TestUser',
        avatar: null,
        bio: null,
        role: 'user',
        is_active: true,
        last_login_at: null,
        created_at: '2026-01-01',
      },
      accessToken: 'mock-token',
      refreshToken: 'mock-refresh',
      isAuthenticated: true,
    });

    renderWithRouter();
    expect(screen.getByText('TestUser')).toBeInTheDocument();
    expect(screen.queryByText('登录')).not.toBeInTheDocument();
  });
});
