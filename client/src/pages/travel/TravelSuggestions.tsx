import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, Typography, Spin, Tag, Empty, Select, Space, Button, Row, Col } from 'antd';
import { BulbOutlined, EnvironmentOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { travelApi } from '../../api/travel';
import type { TravelSuggestion } from '../../types';

const { Text } = Typography;

const categoryLabels: Record<string, string> = {
  scenic: '景点推荐',
  food: '美食推荐',
  transport: '交通建议',
  accommodation: '住宿推荐',
  tips: '避坑指南',
};

export default function TravelSuggestionsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [suggestions, setSuggestions] = useState<TravelSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [destinations, setDestinations] = useState<string[]>([]);
  const category = searchParams.get('category') || undefined;
  const destination = searchParams.get('destination') || undefined;

  const stripMarkdown = (text: string) => {
    return text
      .replace(/!\[.*?\]\(.*?\)/g, '[图片]')
      .replace(/\[([^\]]*)\]\(.*?\)/g, '$1')
      .replace(/[#*`>~_\-|]/g, '')
      .replace(/\n{2,}/g, '\n')
      .trim();
  };

  const fetchData = () => {
    setLoading(true);
    travelApi.suggestions(1, 50, category, destination).then((res) => {
      setSuggestions(res.data.data);
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, [category, destination]);

  useEffect(() => {
    travelApi.suggestions(1, 200).then((res) => {
      const cities = [...new Set(res.data.data.map((s) => s.destination).filter(Boolean))];
      setDestinations(cities);
    }).catch(() => {});
  }, []);

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

      {suggestions.length === 0 ? (
        <Empty description="暂无旅游建议" />
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
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
}
