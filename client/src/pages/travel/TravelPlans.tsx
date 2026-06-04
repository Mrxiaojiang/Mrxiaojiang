import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Card, Typography, Spin, Tag, Empty, Button, Segmented, message } from 'antd';
import { CompassOutlined, EnvironmentOutlined, PlusOutlined, GlobalOutlined, LockOutlined, HeartFilled, HeartOutlined } from '@ant-design/icons';
import { travelApi } from '../../api/travel';
import { useAuthStore } from '../../store/authStore';
import type { TravelPlan } from '../../types';

const { Title, Text } = Typography;

const stripMarkdown = (text: string) => {
  if (!text) return '';
  return text
    .replace(/!\[.*?\]\(.*?\)/g, '[图片]')
    .replace(/\[([^\]]*)\]\(.*?\)/g, '$1')
    .replace(/[#*`>~_\-|]/g, '')
    .replace(/\n{2,}/g, '\n')
    .trim();
};

export default function TravelPlansPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [plans, setPlans] = useState<TravelPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<string>('all');
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'public') {
        const res = await travelApi.plans(1, 100);
        setPlans(res.data.data);
      } else if (tab === 'my' && isAuthenticated) {
        const res = await travelApi.myPlans();
        setPlans(res.data);
      } else if (tab === 'liked' && isAuthenticated) {
        const res = await travelApi.getLikedPlans();
        setPlans(res.data);
      } else {
        const [publicRes, myRes] = await Promise.all([
          travelApi.plans(1, 100),
          isAuthenticated ? travelApi.myPlans().catch(() => ({ data: [] } as any)) : Promise.resolve([] as any),
        ]);
        const myPlans: TravelPlan[] = isAuthenticated ? (myRes.data || myRes || []) : [];
        const merged = [...(publicRes.data.data || [])];
        const publicIds = new Set(merged.map(p => p.id));
        for (const p of myPlans) {
          if (!publicIds.has(p.id)) merged.push(p);
        }
        merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setPlans(merged);
      }
    } finally {
      setLoading(false);
    }
  }, [tab, isAuthenticated]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  useEffect(() => {
    if (isAuthenticated) {
      travelApi.getLikedPlanIds().then((res) => {
        setLikedIds(new Set(res.data || []));
      }).catch(() => {});
    }
  }, [isAuthenticated, tab]);

  const toggleLike = async (e: React.MouseEvent, planId: string) => {
    e.stopPropagation();
    if (!isAuthenticated) { message.warning('请先登录'); return; }
    try {
      const res = await travelApi.likePlan(planId);
      setPlans(prev => prev.map(p => p.id === planId ? { ...p, like_count: res.data.like_count } : p));
      setLikedIds(prev => {
        const next = new Set(prev);
        if (res.data.liked) next.add(planId);
        else next.delete(planId);
        return next;
      });
    } catch {
      message.error('操作失败');
    }
  };

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  const showTabs = isAuthenticated;

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>旅游计划</Title>
        {isAuthenticated && (
          <Button icon={<PlusOutlined />} type="primary" onClick={() => navigate('/travel/plans/new')}>
            新建计划
          </Button>
        )}
      </div>

      {showTabs && (
        <Segmented
          value={tab}
          onChange={(val) => setTab(val as string)}
          options={[
            { label: '全部', value: 'all' },
            { label: '公开', value: 'public' },
            { label: '我的', value: 'my' },
            { label: '收藏', value: 'liked' },
          ]}
          style={{ marginBottom: 16 }}
        />
      )}

      {plans.length === 0 ? (
        <Empty description={
          tab === 'my' ? '你还没有创建旅游计划' :
          tab === 'liked' ? '你还没有收藏旅游计划' :
          tab === 'public' ? '暂无公开的旅游计划' : '暂无旅游计划'
        } />
      ) : (
        <Row gutter={[20, 20]}>
          {plans.map((plan) => (
            <Col xs={24} sm={12} lg={8} key={plan.id} style={{ display: 'flex' }}>
              <Card
                hoverable
                style={{ width: '100%', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column' }}
                styles={{ body: { padding: 20, flex: 1, display: 'flex', flexDirection: 'column' } }}
                onClick={() => navigate(`/travel/plans/${plan.id}`)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: '#0f766615', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <CompassOutlined style={{ fontSize: 18, color: '#0f7666' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {plan.title}
                    </div>
                  </div>
                </div>

                <Tag style={{ alignSelf: 'flex-start', marginBottom: 8 }} color={plan.is_public ? 'green' : 'default'}>
                  {plan.is_public ? <><GlobalOutlined /> 公开</> : <><LockOutlined /> 私有</>}
                </Tag>

                <div style={{
                  fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6,
                  display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
                  overflow: 'hidden', flex: 1, minHeight: 60,
                }}>
                  {stripMarkdown(plan.notes)}
                </div>

                <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid var(--color-border-light)', fontSize: 12, color: 'var(--color-text-tertiary)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>
                    <EnvironmentOutlined style={{ marginRight: 4 }} />
                    {plan.destination}
                  </span>
                  <span>
                    {plan.user?.nickname || '匿名'} · {new Date(plan.created_at).toLocaleDateString()}
                  </span>
                </div>

                <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
                  <span
                    onClick={(e) => toggleLike(e, plan.id)}
                    style={{
                      cursor: isAuthenticated ? 'pointer' : 'default',
                      fontSize: 16,
                      color: likedIds.has(plan.id) ? '#ff4d4f' : 'var(--color-text-tertiary)',
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                    }}
                  >
                    {likedIds.has(plan.id) ? <HeartFilled /> : <HeartOutlined />}
                    <span style={{ fontSize: 12 }}>{plan.like_count || 0}</span>
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
