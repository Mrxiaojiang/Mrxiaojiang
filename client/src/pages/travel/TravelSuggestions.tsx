import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, Typography, Spin, Tag, Empty, Select, Space, Button, Row, Col, message, Segmented } from 'antd';
import { BulbOutlined, EnvironmentOutlined, ArrowLeftOutlined, HeartFilled, HeartOutlined } from '@ant-design/icons';
import { travelApi } from '../../api/travel';
import { useAuthStore } from '../../store/authStore';
import type { TravelSuggestion } from '../../types';

const { Text } = Typography;

const categoryLabels: Record<string, string> = {
  scenic: '景点推荐',
  food: '美食推荐',
  transport: '交通建议',
  accommodation: '住宿推荐',
  tips: '避坑指南',
};

const stripMarkdown = (text: string) => {
  return text
    .replace(/!\[.*?\]\(.*?\)/g, '[图片]')
    .replace(/\[([^\]]*)\]\(.*?\)/g, '$1')
    .replace(/[#*`>~_\-|]/g, '')
    .replace(/\n{2,}/g, '\n')
    .trim();
};

export default function TravelSuggestionsPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [suggestions, setSuggestions] = useState<TravelSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [destinations, setDestinations] = useState<string[]>([]);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<string>('all');
  const category = searchParams.get('category') || undefined;
  const destination = searchParams.get('destination') || undefined;

  const fetchData = useCallback(() => {
    setLoading(true);
    const fetch = tab === 'liked' && isAuthenticated
      ? travelApi.getLikedSuggestions(category, destination)
      : travelApi.suggestions(1, 50, category, destination);

    fetch.then((res) => {
      setSuggestions(tab === 'liked' ? (res.data as any) : (res.data as any).data);
    }).finally(() => setLoading(false));
  }, [category, destination, tab, isAuthenticated]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    travelApi.suggestions(1, 200).then((res) => {
      const cities = [...new Set(res.data.data.map((s: TravelSuggestion) => s.destination).filter(Boolean))];
      setDestinations(cities);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      travelApi.getLikedSuggestionIds().then((res) => {
        setLikedIds(new Set(res.data || []));
      }).catch(() => {});
    }
  }, [isAuthenticated]);

  const toggleLike = async (e: React.MouseEvent, suggestionId: string) => {
    e.stopPropagation();
    if (!isAuthenticated) { message.warning('请先登录'); return; }
    try {
      const res = await travelApi.likeSuggestion(suggestionId);
      setSuggestions(prev => prev.map(s => s.id === suggestionId ? { ...s, like_count: res.data.like_count } : s));
      setLikedIds(prev => {
        const next = new Set(prev);
        if (res.data.liked) next.add(suggestionId);
        else next.delete(suggestionId);
        return next;
      });
    } catch {
      message.error('操作失败');
    }
  };

  const setFilter = (key: string, value: string | undefined) => {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setSearchParams(next);
  };

  const hasFilter = !!category || !!destination;

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Space>
          {hasFilter && (
            <Button icon={<ArrowLeftOutlined />} onClick={() => setSearchParams({})}>
              返回全部
            </Button>
          )}
          <span className="section-title" style={{ marginBottom: 0 }}>旅游建议</span>
        </Space>
        <Space>
          <Select
            placeholder="筛选目的地"
            allowClear
            style={{ width: 150 }}
            value={destination}
            onChange={(v) => setFilter('destination', v)}
            options={destinations.map((d) => ({ value: d, label: d }))}
          />
          <Select
            placeholder="筛选分类"
            allowClear
            style={{ width: 150 }}
            value={category}
            onChange={(v) => setFilter('category', v)}
            options={Object.entries(categoryLabels).map(([value, label]) => ({ value, label }))}
          />
        </Space>
      </div>

      {isAuthenticated && (
        <Segmented
          value={tab}
          onChange={(val) => setTab(val as string)}
          options={[
            { label: '全部', value: 'all' },
            { label: '收藏', value: 'liked' },
          ]}
          style={{ marginBottom: 16 }}
        />
      )}

      {suggestions.length === 0 ? (
        <Empty description={tab === 'liked' ? '你还没有收藏旅游建议' : '暂无旅游建议'} />
      ) : (
        <Row gutter={[20, 20]}>
          {suggestions.map((item) => (
            <Col xs={24} sm={12} lg={8} key={item.id} style={{ display: 'flex' }}>
              <Card
                hoverable
                style={{ width: '100%', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column' }}
                styles={{ body: { padding: 20, flex: 1, display: 'flex', flexDirection: 'column' } }}
                onClick={() => navigate(`/travel/suggestions/${item.id}`)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: '#d9774615', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, color: '#d97746', flexShrink: 0,
                  }}>
                    <BulbOutlined />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.title}
                    </div>
                  </div>
                </div>

                <Tag style={{ alignSelf: 'flex-start', marginBottom: 10 }}>
                  {categoryLabels[item.category] || item.category}
                </Tag>

                <div style={{
                  fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6,
                  display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
                  overflow: 'hidden', flex: 1, minHeight: 60,
                }}>
                  {stripMarkdown(item.content)}
                </div>

                <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid var(--color-border-light)', fontSize: 12, color: 'var(--color-text-tertiary)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>
                    <EnvironmentOutlined style={{ marginRight: 4 }} />
                    {item.destination}
                  </span>
                  <span>
                    {item.user?.nickname || '匿名'} · {new Date(item.created_at).toLocaleDateString()}
                  </span>
                </div>

                <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
                  <span
                    onClick={(e) => toggleLike(e, item.id)}
                    style={{
                      cursor: isAuthenticated ? 'pointer' : 'default',
                      fontSize: 16,
                      color: likedIds.has(item.id) ? '#ff4d4f' : 'var(--color-text-tertiary)',
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                    }}
                  >
                    {likedIds.has(item.id) ? <HeartFilled /> : <HeartOutlined />}
                    <span style={{ fontSize: 12 }}>{item.like_count || 0}</span>
                  </span>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
}
