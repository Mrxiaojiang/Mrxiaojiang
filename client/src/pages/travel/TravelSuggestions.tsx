import { useState, useEffect } from 'react';
import { Card, List, Typography, Spin, Tag, Empty, Select, Space } from 'antd';
import { BulbOutlined, HeartOutlined } from '@ant-design/icons';
import { travelApi } from '../../api/travel';
import type { TravelSuggestion } from '../../types';

const { Title, Text } = Typography;

const categoryLabels: Record<string, string> = {
  scenic: '景点推荐',
  food: '美食推荐',
  transport: '交通建议',
  accommodation: '住宿推荐',
  tips: '避坑指南',
};

export default function TravelSuggestionsPage() {
  const [suggestions, setSuggestions] = useState<TravelSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string | undefined>();

  const fetchData = () => {
    setLoading(true);
    travelApi.suggestions(1, 20, category).then((res) => {
      setSuggestions(res.data.data);
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, [category]);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>💡 旅游建议</Title>
        <Select
          placeholder="筛选分类"
          allowClear
          style={{ width: 150 }}
          value={category}
          onChange={setCategory}
          options={Object.entries(categoryLabels).map(([value, label]) => ({ value, label }))}
        />
      </div>
      {suggestions.length === 0 ? (
        <Empty description="暂无旅游建议" />
      ) : (
        <List
          dataSource={suggestions}
          renderItem={(item) => (
            <Card style={{ marginBottom: 12 }}>
              <List.Item>
                <List.Item.Meta
                  avatar={<BulbOutlined style={{ fontSize: 24, color: '#faad14' }} />}
                  title={
                    <div>
                      {item.title}
                      <Tag style={{ marginLeft: 8 }}>{categoryLabels[item.category] || item.category}</Tag>
                    </div>
                  }
                  description={
                    <div>
                      <Text type="secondary">📍 {item.destination}</Text>
                      <div style={{ marginTop: 8 }}>{item.content}</div>
                      <div style={{ marginTop: 8, color: '#999', fontSize: 13 }}>
                        {item.user?.nickname} · {new Date(item.created_at).toLocaleDateString()}
                        <HeartOutlined style={{ marginLeft: 16 }} /> {item.like_count}
                      </div>
                    </div>
                  }
                />
              </List.Item>
            </Card>
          )}
        />
      )}
    </div>
  );
}
