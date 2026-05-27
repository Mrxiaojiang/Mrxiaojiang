import { useState, useEffect } from 'react';
import { Card, Row, Col, Typography, Spin, Button, List } from 'antd';
import { CompassOutlined, PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { travelApi } from '../../api/travel';
import { useAuthStore } from '../../store/authStore';
import type { TravelSuggestion } from '../../types';

const { Title } = Typography;

export default function TravelPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [suggestions, setSuggestions] = useState<TravelSuggestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    travelApi.suggestions(1, 10).then((res) => {
      setSuggestions(res.data.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>🧭 旅游</Title>
        <div>
          {isAuthenticated && (
            <>
              <Button icon={<PlusOutlined />} onClick={() => navigate('/travel/customize')} type="primary" style={{ marginRight: 8 }}>
                旅游定制
              </Button>
              <Button icon={<PlusOutlined />} onClick={() => navigate('/travel/suggestions/new')}>
                发布建议
              </Button>
            </>
          )}
        </div>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card
            hoverable
            onClick={() => navigate('/travel/plans')}
          >
            <CompassOutlined style={{ fontSize: 36, color: '#1890ff' }} />
            <Title level={4}>旅游计划</Title>
            <p style={{ color: '#666' }}>查看公开的旅游路线和计划</p>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card
            hoverable
            onClick={() => navigate('/travel/suggestions')}
          >
            <CompassOutlined style={{ fontSize: 36, color: '#52c41a' }} />
            <Title level={4}>旅游建议</Title>
            <p style={{ color: '#666' }}>分享和查看旅行经验与推荐</p>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card
            hoverable
            onClick={() => isAuthenticated ? navigate('/travel/customize') : navigate('/login')}
          >
            <CompassOutlined style={{ fontSize: 36, color: '#faad14' }} />
            <Title level={4}>智能定制</Title>
            <p style={{ color: '#666' }}>AI 规划你的专属旅行路线</p>
          </Card>
        </Col>
      </Row>

      <Title level={4} style={{ marginTop: 32 }}>最新旅游建议</Title>
      <List
        dataSource={suggestions}
        renderItem={(item) => (
          <List.Item>
            <List.Item.Meta
              title={item.title}
              description={`${item.destination} · ${item.user?.nickname} · ${new Date(item.created_at).toLocaleDateString()}`}
            />
          </List.Item>
        )}
      />
    </div>
  );
}
