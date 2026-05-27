import { useState, useEffect } from 'react';
import { List, Typography, Spin, Button, Tag, message } from 'antd';
import http from '../../api/http';
import type { Notification } from '../../types';

const { Title } = Typography;

export default function NotificationPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = () => {
    http.get('/notifications').then((res) => {
      setNotifications(res.data.data);
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

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>🔔 通知中心</Title>
        <Button onClick={markAllRead}>全部标记已读</Button>
      </div>
      <List
        dataSource={notifications}
        renderItem={(item) => (
          <List.Item style={{ background: item.is_read ? '#fff' : '#f0f5ff', padding: 12, borderRadius: 4, marginBottom: 4 }}>
            <List.Item.Meta
              title={
                <div>
                  {!item.is_read && <Tag color="blue">未读</Tag>}
                  {item.type === 'comment' && '评论了你的帖子'}
                  {item.type === 'reply' && '回复了你的评论'}
                  {item.type === 'like' && '赞了你的内容'}
                </div>
              }
              description={
                <div>
                  <div>{item.content}</div>
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
