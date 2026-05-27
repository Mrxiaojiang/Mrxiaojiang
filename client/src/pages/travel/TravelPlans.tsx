import { useState, useEffect } from 'react';
import { Card, List, Typography, Spin, Tag, Empty } from 'antd';
import { CompassOutlined, CalendarOutlined, LockOutlined, GlobalOutlined } from '@ant-design/icons';
import { travelApi } from '../../api/travel';
import type { TravelPlan } from '../../types';

const { Title, Text } = Typography;

export default function TravelPlansPage() {
  const [plans, setPlans] = useState<TravelPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    travelApi.plans(1, 20).then((res) => {
      setPlans(res.data.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <Title level={3}>🗺️ 旅游计划广场</Title>
      {plans.length === 0 ? (
        <Empty description="暂无公开的旅游计划" />
      ) : (
        <List
          dataSource={plans}
          renderItem={(plan) => (
            <Card style={{ marginBottom: 12 }}>
              <List.Item>
                <List.Item.Meta
                  avatar={<CompassOutlined style={{ fontSize: 32, color: '#1890ff' }} />}
                  title={
                    <div>
                      {plan.title}
                      <Tag style={{ marginLeft: 8 }} color={plan.is_public ? 'green' : 'default'}>
                        {plan.is_public ? <GlobalOutlined /> : <LockOutlined />} {plan.is_public ? '公开' : '私有'}
                      </Tag>
                    </div>
                  }
                  description={
                    <div>
                      <Text>📍 {plan.destination}</Text>
                      {plan.start_date && (
                        <Text style={{ marginLeft: 16 }}>
                          <CalendarOutlined /> {plan.start_date} ~ {plan.end_date || '待定'}
                        </Text>
                      )}
                      {plan.budget && <Text style={{ marginLeft: 16 }}>💰 预算 ¥{plan.budget}</Text>}
                      {plan.notes && <div style={{ marginTop: 8, color: '#666' }}>{plan.notes}</div>}
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
