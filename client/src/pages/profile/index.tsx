import { Card, Typography, Avatar, Descriptions, Button } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

const { Title } = Typography;

export default function ProfilePage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  if (!user) {
    navigate('/login');
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <Card>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Avatar size={80} src={user.avatar} icon={<UserOutlined />} />
          <Title level={3} style={{ marginTop: 12 }}>{user.nickname}</Title>
        </div>
        <Descriptions column={1} bordered>
          <Descriptions.Item label="邮箱">{user.email}</Descriptions.Item>
          <Descriptions.Item label="角色">{user.role === 'admin' ? '管理员' : '用户'}</Descriptions.Item>
          <Descriptions.Item label="个人简介">{user.bio || '未设置'}</Descriptions.Item>
          <Descriptions.Item label="注册时间">{user.created_at ? new Date(user.created_at).toLocaleDateString() : '未知'}</Descriptions.Item>
        </Descriptions>
        <Button danger onClick={handleLogout} style={{ marginTop: 16 }}>退出登录</Button>
      </Card>
    </div>
  );
}
