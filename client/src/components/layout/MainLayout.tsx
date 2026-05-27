import { useState, useEffect } from 'react';
import { Outlet, useNavigate, Link } from 'react-router-dom';
import { Layout, Menu, Button, Badge, Dropdown, Avatar, Space } from 'antd';
import {
  HomeOutlined,
  TeamOutlined,
  PictureOutlined,
  CompassOutlined,
  BellOutlined,
  UserOutlined,
  LoginOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { connectSocket, disconnectSocket } from '../../socket';

const { Header, Content, Footer } = Layout;

export default function MainLayout() {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuthStore();
  const { unreadCount } = useAppStore();
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    if (isAuthenticated) {
      connectSocket();
    } else {
      disconnectSocket();
    }
  }, [isAuthenticated]);

  const menuItems = [
    { key: '/', icon: <HomeOutlined />, label: '首页' },
    { key: '/community', icon: <TeamOutlined />, label: '交流社区' },
    { key: '/albums', icon: <PictureOutlined />, label: '风景记录' },
    { key: '/travel', icon: <CompassOutlined />, label: '旅游' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

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
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', padding: '0 24px' }}>
        <Link to="/" style={{ color: '#fff', fontSize: 20, fontWeight: 'bold', marginRight: 40, whiteSpace: 'nowrap' }}>
          🚀 旅途博客
        </Link>
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[currentPath]}
          items={menuItems}
          onClick={({ key }) => {
            setCurrentPath(key);
            navigate(key);
          }}
          style={{ flex: 1, minWidth: 0 }}
        />
        <Space>
          {isAuthenticated ? (
            <Dropdown menu={userMenu} placement="bottomRight">
              <Space style={{ cursor: 'pointer', color: '#fff' }}>
                <Badge count={unreadCount} size="small">
                  <Avatar src={user?.avatar} icon={<UserOutlined />} />
                </Badge>
                <span>{user?.nickname}</span>
              </Space>
            </Dropdown>
          ) : (
            <Button type="link" icon={<LoginOutlined />} onClick={() => navigate('/login')} style={{ color: '#fff' }}>
              登录
            </Button>
          )}
        </Space>
      </Header>
      <Content style={{ padding: '24px', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        <Outlet />
      </Content>
      <Footer style={{ textAlign: 'center', color: '#999' }}>
        旅途博客 ©2026 — 记录每一次旅行
      </Footer>
    </Layout>
  );
}
