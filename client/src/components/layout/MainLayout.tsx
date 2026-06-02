import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Button, Badge, Dropdown, Avatar, Space, Input } from 'antd';
import {
  HomeOutlined, TeamOutlined, PictureOutlined,
  CompassOutlined, BellOutlined, UserOutlined,
  LoginOutlined, LogoutOutlined, SearchOutlined,
  MenuOutlined, CloseOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { connectSocket, disconnectSocket } from '../../socket';

const { Content, Footer } = Layout;

const navItems = [
  { key: '/', label: '首页', icon: <HomeOutlined /> },
  { key: '/community', label: '社区', icon: <TeamOutlined /> },
  { key: '/albums', label: '相册', icon: <PictureOutlined /> },
  { key: '/travel', label: '旅行', icon: <CompassOutlined /> },
];

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, logout } = useAuthStore();
  const { unreadCount } = useAppStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (isAuthenticated) connectSocket();
    else disconnectSocket();
  }, [isAuthenticated]);

  useEffect(() => { setMobileMenuOpen(false); }, [location.pathname]);

  const handleLogout = () => { logout(); navigate('/login'); };

  const userMenu = {
    items: [
      { key: 'profile', icon: <UserOutlined />, label: '个人中心', onClick: () => navigate('/profile') },
      { key: 'notifications', icon: <BellOutlined />, label: '通知中心', onClick: () => navigate('/notifications') },
      ...(user?.role === 'admin' ? [{ key: 'admin', icon: <UserOutlined />, label: '后台管理', onClick: () => navigate('/admin') }] : []),
      { type: 'divider' as const },
      { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: handleLogout },
    ],
  };

  return (
    <Layout style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      {/* ── Header ─────────────────────────────── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--color-border-light)',
      }}>
        <div style={{
          maxWidth: 1200, margin: '0 auto',
          display: 'flex', alignItems: 'center',
          height: 64, padding: '0 24px',
        }}>
          {/* Logo */}
          <div
            onClick={() => navigate('/')}
            style={{
              fontSize: 20, fontWeight: 700,
              color: 'var(--color-accent)', cursor: 'pointer',
              letterSpacing: '0.04em', marginRight: 40,
              whiteSpace: 'nowrap', userSelect: 'none',
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            <span style={{
              display: 'inline-flex', width: 32, height: 32,
              background: 'var(--color-accent)', borderRadius: 8,
              alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 16,
            }}>旅</span>
            途博客
          </div>

          {/* Desktop Nav */}
          <nav style={{ flex: 1, display: 'flex', gap: 4 }}>
            {navItems.map((item) => {
              const isActive = location.pathname === item.key ||
                (item.key !== '/' && location.pathname.startsWith(item.key));
              return (
                <div
                  key={item.key}
                  onClick={() => navigate(item.key)}
                  style={{
                    padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
                    fontSize: 14, fontWeight: isActive ? 600 : 400,
                    color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                    background: isActive ? 'var(--color-accent-bg)' : 'transparent',
                    transition: 'all var(--transition-fast)',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'var(--color-bg-alt)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {item.icon}
                  <span className="nav-label">{item.label}</span>
                </div>
              );
            })}
          </nav>

          {/* Right side */}
          <Space size="middle">
            {isAuthenticated ? (
              <Dropdown menu={userMenu} placement="bottomRight" trigger={['click']}>
                <Space style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: 8, transition: 'background var(--transition-fast)' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-bg-alt)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <Badge count={unreadCount} size="small">
                    <Avatar src={user?.avatar} icon={<UserOutlined />}
                      style={{ background: 'var(--color-accent)', verticalAlign: 'middle' }} />
                  </Badge>
                  <span style={{ fontSize: 14, color: 'var(--color-text)' }}>{user?.nickname}</span>
                </Space>
              </Dropdown>
            ) : (
              <Button type="primary" size="small" ghost
                icon={<LoginOutlined />}
                onClick={() => navigate('/login')}
                style={{
                  borderColor: 'var(--color-accent)', color: 'var(--color-accent)',
                  borderRadius: 8, fontSize: 13,
                }}
              >
                登录
              </Button>
            )}

            {/* Mobile menu toggle */}
            <div
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{ display: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--color-text)' }}
              className="mobile-menu-toggle"
            >
              {mobileMenuOpen ? <CloseOutlined /> : <MenuOutlined />}
            </div>
          </Space>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div style={{
            borderTop: '1px solid var(--color-border-light)',
            background: '#fff', padding: '8px 16px',
          }}>
            {navItems.map((item) => (
              <div
                key={item.key}
                onClick={() => navigate(item.key)}
                style={{
                  padding: '12px 16px', borderRadius: 8, cursor: 'pointer',
                  fontSize: 15, fontWeight: location.pathname === item.key ? 600 : 400,
                  color: location.pathname === item.key ? 'var(--color-accent)' : 'var(--color-text)',
                  background: location.pathname === item.key ? 'var(--color-accent-bg)' : 'transparent',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}
              >
                {item.icon} {item.label}
              </div>
            ))}
          </div>
        )}
      </header>

      {/* ── Content ─────────────────────────────── */}
      <Content style={{
        padding: '32px 24px',
        maxWidth: 1200, margin: '0 auto', width: '100%',
        minHeight: 'calc(100vh - 64px - 200px)',
        animation: 'fadeIn 0.4s ease',
      }}>
        <Outlet />
      </Content>

      {/* ── Footer ─────────────────────────────── */}
      <Footer style={{
        background: 'var(--color-bg-alt)',
        padding: '48px 24px 32px',
        color: 'var(--color-text-tertiary)',
        fontSize: 13,
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 8 }}>
            旅途博客
          </div>
          <div>记录每一次旅行，分享每一段风景</div>
          <div style={{ marginTop: 12 }}>© {new Date().getFullYear()} TravelBlog</div>
        </div>
      </Footer>

      {/* Mobile nav responsive */}
      <style>{`
        @media (max-width: 640px) {
          nav { display: none !important; }
          .mobile-menu-toggle { display: inline-flex !important; }
          .ant-layout-content { padding: 16px !important; }
        }
        @media (min-width: 641px) {
          .mobile-menu-toggle { display: none !important; }
        }
      `}</style>
    </Layout>
  );
}
