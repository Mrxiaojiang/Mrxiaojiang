import { useState, useEffect } from 'react';
import { Card, List, Tag, Typography, Spin, Button } from 'antd';
import { MessageOutlined, HeartOutlined, PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { communityApi } from '../../api/community';
import { useAuthStore } from '../../store/authStore';
import type { CommunityPost } from '../../types';

const { Title } = Typography;

export default function CommunityPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    communityApi.posts(1, 20).then((res) => {
      setPosts(res.data.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>💬 交流社区</Title>
        {isAuthenticated && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/community/new')}>
            发帖
          </Button>
        )}
      </div>
      <List
        dataSource={posts}
        renderItem={(post) => (
          <Card
            hoverable
            style={{ marginBottom: 12 }}
            onClick={() => navigate(`/community/${post.id}`)}
          >
            <Card.Meta
              title={
                <div>
                  {post.title}
                  {post.tags?.map((tag) => <Tag key={tag} style={{ marginLeft: 8 }}>{tag}</Tag>)}
                </div>
              }
              description={
                <div>
                  <div style={{ color: '#666', marginBottom: 8 }}>
                    {post.content.length > 150 ? post.content.slice(0, 150) + '...' : post.content}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#999', fontSize: 13 }}>
                    <span>{post.author?.nickname} · {new Date(post.created_at).toLocaleDateString()}</span>
                    <span>
                      <HeartOutlined style={{ marginRight: 4 }} />{post.like_count}
                      <MessageOutlined style={{ marginLeft: 16, marginRight: 4 }} />{post.comment_count}
                    </span>
                  </div>
                </div>
              }
            />
          </Card>
        )}
      />
    </div>
  );
}
