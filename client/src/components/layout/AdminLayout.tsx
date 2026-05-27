import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Layout, Menu } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  FileTextOutlined,
  MessageOutlined,
  PictureOutlined,
  FireOutlined,
  SettingOutlined,
} from '@ant-design/icons';

const { Sider, Content } = Layout;

const adminMenuItems = [
  { key: '/admin', icon: <DashboardOutlined />, label: '仪表盘' },
  { key: '/admin/users', icon: <UserOutlined />, label: '用户管理' },
  { key: '/admin/blogs', icon: <FileTextOutlined />, label: '博客管理' },
  { key: '/admin/posts', icon: <MessageOutlined />, label: '帖子管理' },
  { key: '/admin/comments', icon: <MessageOutlined />, label: '评论管理' },
  { key: '/admin/albums', icon: <PictureOutlined />, label: '相册管理' },
  { key: '/admin/hot-events', icon: <FireOutlined />, label: '热点管理' },
  { key: '/admin/settings', icon: <SettingOutlined />, label: '系统设置' },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed}>
        <div style={{ color: '#fff', textAlign: 'center', padding: 16, fontWeight: 'bold', fontSize: collapsed ? 14 : 18 }}>
          {collapsed ? '后台' : '后台管理'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          defaultSelectedKeys={['/admin']}
          items={adminMenuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Content style={{ padding: 24, background: '#f5f5f5' }}>
        <Outlet />
      </Content>
    </Layout>
  );
}
