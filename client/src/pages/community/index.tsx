import { useState, useEffect } from 'react';
import { Card, List, Tag, Typography, Spin, Button, Input, Space, Popconfirm, message } from 'antd';
import {
  MessageOutlined, HeartOutlined, PlusOutlined,
  EditOutlined, DeleteOutlined,
} from '@ant-design/icons';
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
  const [keyword, setKeyword] = useState('');
  const [myPostIds, setMyPostIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setLoading(true);
    communityApi.posts(1, 20, keyword || undefined).then((res) => {
      setPosts(res.data.data);
    }).finally(() => setLoading(false));
  }, [keyword]);

  useEffect(() => {
    if (!isAuthenticated) return;
    communityApi.myPosts().then((res) => {
      if (res.data) setMyPostIds(new Set(res.data.map((p) => p.id)));
    }).catch(() => {});
  }, [isAuthenticated]);

  const handleSearch = (value: string) => {
    setKeyword(value);
  };

  const handleDelete = async (id: string) => {
    try {
      await communityApi.deletePost(id);
      message.success('帖子已删除');
      setPosts((prev) => prev.filter((p) => p.id !== id));
    } catch {
      message.error('删除失败');
    }
  };

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>💬 交流社区</Title>
        <div style={{ display: 'flex', gap: 12 }}>
          <Input.Search
            placeholder="搜索帖子标题..."
            allowClear
            onSearch={handleSearch}
            style={{ width: 250 }}
          />
          {isAuthenticated && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/community/new')}>
              发帖
            </Button>
          )}
        </div>
      </div>
      <List
        dataSource={posts}
        renderItem={(post) => {
          const isOwner = myPostIds.has(post.id);
          return (
          <Card
            hoverable
            style={{ marginBottom: 12 }}
            onClick={() => navigate(`/community/${post.id}`)}
            actions={isOwner ? [
              <EditOutlined key="edit" onClick={(e) => { e.stopPropagation(); navigate(`/community/${post.id}/edit`); }} />,
              <Popconfirm key="delete" title="确定删除此帖子？" onConfirm={() => handleDelete(post.id)}>
                <DeleteOutlined onClick={(e) => e.stopPropagation()} />
              </Popconfirm>,
            ] : undefined}
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
          );
        }}
      />
    </div>
  );
}
