import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminLayout from '../AdminLayout';

function renderWithRouter() {
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <AdminLayout />
    </MemoryRouter>,
  );
}

describe('AdminLayout', () => {
  it('should render admin title', () => {
    renderWithRouter();
    expect(screen.getByText('后台管理')).toBeInTheDocument();
  });

  it('should render all admin menu items', () => {
    renderWithRouter();
    expect(screen.getByText('仪表盘')).toBeInTheDocument();
    expect(screen.getByText('用户管理')).toBeInTheDocument();
    expect(screen.getByText('博客管理')).toBeInTheDocument();
    expect(screen.getByText('帖子管理')).toBeInTheDocument();
    expect(screen.getByText('评论管理')).toBeInTheDocument();
    expect(screen.getByText('相册管理')).toBeInTheDocument();
    expect(screen.getByText('热点管理')).toBeInTheDocument();
    expect(screen.getByText('系统设置')).toBeInTheDocument();
  });
});
