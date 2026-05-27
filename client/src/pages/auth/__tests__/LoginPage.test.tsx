import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
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

  it('should render login title', () => {
    renderWithRouter();
    expect(screen.getByText('登录')).toBeInTheDocument();
  });

  it('should render both login tabs', () => {
    renderWithRouter();
    expect(screen.getByText('密码登录')).toBeInTheDocument();
    expect(screen.getByText('验证码登录')).toBeInTheDocument();
  });

  it('should render register link', () => {
    renderWithRouter();
    const link = screen.getByText('没有账号？去注册');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/register');
  });

  it('should show email and password fields on password tab', () => {
    renderWithRouter();
    const emailInputs = screen.getAllByPlaceholderText('邮箱');
    expect(emailInputs.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByPlaceholderText('密码')).toBeInTheDocument();
  });

  it('should switch to code login tab and show send code button', async () => {
    renderWithRouter();
    const user = userEvent.setup();

    await user.click(screen.getByText('验证码登录'));

    expect(screen.getByText('获取验证码')).toBeInTheDocument();
  });
});
