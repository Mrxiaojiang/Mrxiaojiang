import { useState, useEffect } from 'react';
import { Typography, Spin, Button, List, Tag } from 'antd';
import {
  PlusOutlined, BulbOutlined, RightOutlined,
  EnvironmentOutlined, CompassOutlined, OrderedListOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { travelApi } from '../../api/travel';
import { useAuthStore } from '../../store/authStore';
import type { TravelSuggestion } from '../../types';

const { Paragraph } = Typography;

const sectionLinks = [
  {
    key: 'plans',
    label: '旅游计划',
    desc: '查看公开的旅行路线与行程计划',
    icon: <OrderedListOutlined />,
    path: '/travel/plans',
    color: '#0f766e',
  },
  {
    key: 'suggestions',
    label: '旅游建议',
    desc: '分享和发现旅行经验与推荐',
    icon: <BulbOutlined />,
    path: '/travel/suggestions',
    color: '#d97746',
  },
  {
    key: 'customize',
    label: '智能定制',
    desc: 'AI 规划你的专属旅行路线',
    icon: <CompassOutlined />,
    path: '/travel/customize',
    color: '#0ea5e9',
  },
];

export default function TravelPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [suggestions, setSuggestions] = useState<TravelSuggestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    travelApi.suggestions(1, 5).then((res) => {
      setSuggestions(res.data.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <Spin size="large" />
    </div>
  );

  return (
    <div>

      {/* ── Section Cards ────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 48 }}>
        {sectionLinks.map((item) => (
          <div
            key={item.key}
            onClick={() => navigate(item.path)}
            style={{
              background: '#fff', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border-light)',
              padding: '28px 24px', cursor: 'pointer',
              transition: 'all var(--transition-base)',
              boxShadow: 'var(--shadow-card)',
              position: 'relative', overflow: 'hidden',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = 'var(--shadow-md)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'var(--shadow-card)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: `${item.color}15`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, color: item.color, marginBottom: 16,
            }}>
              {item.icon}
            </div>
            <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 6 }}>{item.label}</div>
            <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)', lineHeight: 1.5 }}>
              {item.desc}
            </div>
          </div>
        ))}
      </div>

      {/* ── Latest Suggestions ───────────────── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 20,
      }}>
        <div>
          <div className="section-title" style={{ marginBottom: 4 }}>最新旅游建议</div>
          <div className="section-subtitle" style={{ marginTop: 0 }}>来自旅行者的真实分享</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {isAuthenticated && (
            <Button
              icon={<PlusOutlined />}
              onClick={() => navigate('/travel/suggestions/new')}
              style={{ borderRadius: 8, borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }}
            >
              发布建议
            </Button>
          )}
          <Button
            type="text"
            onClick={() => navigate('/travel/suggestions')}
            style={{ color: 'var(--color-text-tertiary)' }}
            icon={<RightOutlined />}
          >
            查看全部
          </Button>
        </div>
      </div>

      {suggestions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-tertiary)' }}>
          暂无旅游建议
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {suggestions.map((item) => (
            <div
              key={item.id}
              onClick={() => navigate(`/travel/suggestions/${item.id}`)}
              style={{
                background: '#fff', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border-light)',
                padding: '20px 24px', cursor: 'pointer',
                transition: 'all var(--transition-fast)',
                boxShadow: 'var(--shadow-card)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                e.currentTarget.style.borderColor = 'var(--color-accent)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'var(--shadow-card)';
                e.currentTarget.style.borderColor = 'var(--color-border-light)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <BulbOutlined style={{
                  fontSize: 20, color: '#d97746', marginTop: 2,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
                    {item.title}
                  </div>
                  <div style={{
                    fontSize: 13, color: 'var(--color-text-secondary)',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    overflow: 'hidden', lineHeight: 1.6,
                  }}>
                    <EnvironmentOutlined style={{ marginRight: 4 }} />
                    {item.destination}
                    <span style={{ margin: '0 8px', color: 'var(--color-border)' }}>·</span>
                    {item.content}
                  </div>
                  <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                    {item.user?.nickname}
                    <span style={{ margin: '0 6px' }}>·</span>
                    {new Date(item.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
