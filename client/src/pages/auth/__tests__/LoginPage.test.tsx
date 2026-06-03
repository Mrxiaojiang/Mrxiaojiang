import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from '../LoginPage';
import { useAuthStore } from '../../../store/authStore';

vi.mock('../../../api/auth', () => ({
  authApi: {
    sendCode: vi.fn().mockResolvedValue({}),
    loginWithPassword: vi.fn().mockResolvedValue({}),
    loginWithCode: vi.fn().mockResolvedValue({}),
  },
}));

function renderWithRouter() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
  });

  it('should render welcome title', () => {
    renderWithRouter();
    expect(screen.getByText('欢迎回来')).toBeInTheDocument();
  });

  it('should render both login tabs', () => {
    renderWithRouter();
    expect(screen.getByText('密码登录')).toBeInTheDocument();
    expect(screen.getByText('验证码登录')).toBeInTheDocument();
  });

  it('should render register link', () => {
    renderWithRouter();
    expect(screen.getByText('还没有账号？')).toBeInTheDocument();
  });

  it('should show email and password fields on password tab', () => {
    renderWithRouter();
    expect(screen.getByPlaceholderText('your@email.com')).toBeInTheDocument();
  });
});
