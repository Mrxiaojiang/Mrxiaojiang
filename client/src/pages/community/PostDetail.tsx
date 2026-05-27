import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Typography, Spin, Button, Input, List, Avatar, message, Space } from 'antd';
import { HeartOutlined, HeartFilled, ArrowLeftOutlined } from '@ant-design/icons';
import { communityApi } from '../../api/community';
import { useAuthStore } from '../../store/authStore';
import type { CommunityPost, Comment } from '../../types';

const { Title, Paragraph } = Typography;
const { TextArea } = Input;

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const [post, setPost] = useState<CommunityPost | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      communityApi.postDetail(id),
      communityApi.comments(id),
    ]).then(([postRes, commentRes]) => {
      setPost(postRes.data);
      setComments(commentRes.data);
    }).finally(() => setLoading(false));
  }, [id]);

  const submitComment = async () => {
    if (!commentText.trim() || !id) return;
    setSubmitting(true);
    try {
      const res = await communityApi.createComment(id, { content: commentText } as any);
      setComments((prev) => [...prev, res.data]);
      setCommentText('');
      message.success('评论成功');
    } catch {
      message.error('评论失败');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleLike = async () => {
    if (!id) return;
    try {
      const res = await communityApi.likePost(id);
      if (post) {
        setPost({ ...post, like_count: post.like_count + (res.data.liked ? 1 : -1) });
      }
    } catch {
      message.error('操作失败');
    }
  };

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (!post) return <div>帖子不存在</div>;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <Button type="link" icon={<ArrowLeftOutlined />} onClick={() => navigate('/community')} style={{ padding: 0, marginBottom: 16 }}>
        返回社区
      </Button>

      <Card>
        <Title level={3}>{post.title}</Title>
        <Paragraph>{post.content}</Paragraph>
        <div style={{ color: '#999', fontSize: 13, marginBottom: 16 }}>
          {post.author?.nickname} · {new Date(post.created_at).toLocaleString()}
        </div>
        <Space>
          <Button
            icon={post.like_count > 0 ? <HeartFilled /> : <HeartOutlined />}
            onClick={toggleLike}
            disabled={!isAuthenticated}
          >
            {post.like_count}
          </Button>
        </Space>
      </Card>

      <Card title={`评论 (${comments.length})`} style={{ marginTop: 16 }}>
        {isAuthenticated ? (
          <div style={{ marginBottom: 16 }}>
            <TextArea rows={3} value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="写下你的评论..." />
            <Button type="primary" onClick={submitComment} loading={submitting} style={{ marginTop: 8 }}>发表评论</Button>
          </div>
        ) : (
          <div style={{ color: '#999', marginBottom: 16 }}>请登录后评论</div>
        )}
        <List
          dataSource={comments}
          renderItem={(comment) => (
            <List.Item>
              <List.Item.Meta
                avatar={<Avatar>{comment.author?.nickname?.[0]}</Avatar>}
                title={comment.author?.nickname}
                description={comment.content}
              />
            </List.Item>
          )}
        />
      </Card>
    </div>
  );
}
