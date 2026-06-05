import { useState, useEffect } from 'react';
import { List, Typography, Spin, Button, Tag, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import http from '../../api/http';
import type { Notification } from '../../types';

const { Title } = Typography;

const targetRoutes: Record<string, string> = {
  post: '/community/',
  album: '/albums/',
  plan: '/travel/plans/',
  suggestion: '/travel/suggestions/',
};

const typeLabels: Record<string, string> = {
  comment: '评论了',
  reply: '回复了',
  like: '赞了',
};

const targetLabels: Record<string, string> = {
  post: '你的帖子',
  comment: '你的评论',
  album: '你的相册',
  plan: '你的旅游计划',
  suggestion: '你的旅游建议',
};

export default function NotificationPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = () => {
    http.get('/notifications').then((res) => {
      setNotifications(res.data.data || []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAllRead = async () => {
    await http.put('/notifications/read-all');
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    message.success('已全部标记已读');
  };

  const handleClick = async (item: Notification) => {
    if (!item.is_read) {
      await http.put(`/notifications/${item.id}/read`).catch(() => {});
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n)),
      );
    }
    const route = targetRoutes[item.target_type];
    if (route) navigate(route + item.target_id);
  };

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>通知中心</Title>
        <Button onClick={markAllRead}>全部标记已读</Button>
      </div>
      <List
        dataSource={notifications}
        renderItem={(item) => (
          <List.Item
            onClick={() => handleClick(item)}
            style={{
              background: item.is_read ? '#fff' : '#f0f5ff',
              padding: '12px 16px',
              borderRadius: 8,
              marginBottom: 4,
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = item.is_read ? '#f5f5f5' : '#e6f0ff'}
            onMouseLeave={(e) => e.currentTarget.style.background = item.is_read ? '#fff' : '#f0f5ff'}
          >
            <List.Item.Meta
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {!item.is_read && <Tag color="blue">未读</Tag>}
                  <span>{typeLabels[item.type] || item.type}</span>
                  <span style={{ color: 'var(--color-text-tertiary)', fontSize: 13 }}>
                    {targetLabels[item.target_type] || item.target_type}
                  </span>
                </div>
              }
              description={
                <div>
                  <div style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>{item.content}</div>
                  <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>{new Date(item.created_at).toLocaleString()}</div>
                </div>
              }
            />
          </List.Item>
        )}
      />
    </div>
  );
}
