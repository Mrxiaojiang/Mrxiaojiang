import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, Typography, Spin, Tag, Button, Space, message } from 'antd';
import { ArrowLeftOutlined, HeartFilled, HeartOutlined, EnvironmentOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import { travelApi } from '../../api/travel';
import { useAuthStore } from '../../store/authStore';
import type { TravelSuggestion } from '../../types';

const { Title, Text } = Typography;

const categoryLabels: Record<string, string> = {
  scenic: '景点推荐',
  food: '美食推荐',
  transport: '交通建议',
  accommodation: '住宿推荐',
  tips: '避坑指南',
};

export default function TravelSuggestionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [suggestion, setSuggestion] = useState<TravelSuggestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  useEffect(() => {
    if (!id) return;
    travelApi.getSuggestion(id).then((res) => {
      setSuggestion(res.data);
      setLikeCount(res.data.like_count);
    }).catch(() => {
      message.error('加载失败');
      navigate('/travel/suggestions');
    }).finally(() => setLoading(false));

    if (isAuthenticated) {
      travelApi.getLikedSuggestionIds().then((res) => {
        const ids = res.data || [];
        setLiked(ids.includes(id));
      }).catch(() => {});
    }
  }, [id, isAuthenticated]);

  const toggleLike = async () => {
    if (!isAuthenticated) { message.warning('请先登录'); return; }
    if (!id) return;
    try {
      const res = await travelApi.likeSuggestion(id);
      setLiked(res.data.liked);
      setLikeCount(res.data.like_count);
    } catch {
      message.error('操作失败');
    }
  };

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (!suggestion) return null;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <Space style={{ marginBottom: 16, cursor: 'pointer' }} onClick={() => navigate(-1)}>
        <ArrowLeftOutlined /> 返回
      </Space>

      <Card>
        <Title level={3}>{suggestion.title}</Title>
        <div style={{ marginBottom: 16 }}>
          <Tag color="blue">{categoryLabels[suggestion.category] || suggestion.category}</Tag>
          <Text type="secondary" style={{ marginLeft: 8 }}>
            <EnvironmentOutlined /> {suggestion.destination}
          </Text>
        </div>

        <div className="markdown-body" style={{ lineHeight: 1.8, color: '#333' }}>
          <ReactMarkdown>{suggestion.content}</ReactMarkdown>
        </div>

        <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <Text type="secondary">{suggestion.user?.nickname}</Text>
            <Text type="secondary">·</Text>
            <Text type="secondary">{new Date(suggestion.created_at).toLocaleDateString()}</Text>
          </Space>
          <span
            onClick={toggleLike}
            style={{ cursor: isAuthenticated ? 'pointer' : 'default', fontSize: 18, color: liked ? '#ff4d4f' : 'var(--color-text-tertiary)', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            {liked ? <HeartFilled /> : <HeartOutlined />}
            <span style={{ fontSize: 14 }}>{likeCount}</span>
          </span>
        </div>
      </Card>
    </div>
  );
}
