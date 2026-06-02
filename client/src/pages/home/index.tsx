import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Row, Col, Typography, List, Tag, Spin } from 'antd';
import { ClockCircleOutlined, EyeOutlined, RightOutlined } from '@ant-design/icons';
import type { Blog, HotEvent } from '../../types';
import { blogApi } from '../../api/blog';
import http from '../../api/http';

const { Paragraph } = Typography;

export default function HomePage() {
  const navigate = useNavigate();
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [featured, setFeatured] = useState<Blog[]>([]);
  const [hotEvents, setHotEvents] = useState<HotEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      blogApi.list(1, 10),
      blogApi.featured(),
      http.get('/admin/hot-events'),
    ]).then(([blogRes, featuredRes, eventsRes]) => {
      setBlogs(blogRes.data.data);
      setFeatured(featuredRes.data);
      setHotEvents(eventsRes.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <Spin size="large" />
    </div>
  );

  return (
    <div>

      {/* ── Hero / Latest Blog ───────────────── */}
      {featured.length > 0 && (
        <section style={{ marginBottom: 56 }}>
          <div className="section-title">精选文章</div>
          <Row gutter={[20, 20]}>
            {/* Hero card */}
            <Col xs={24} md={16}>
              <div
                onClick={() => navigate(`/blogs/${featured[0].id}`)}
                style={{
                  position: 'relative', borderRadius: 'var(--radius-lg)',
                  overflow: 'hidden', cursor: 'pointer', height: 380,
                  background: featured[0].cover_image
                    ? `url(${featured[0].cover_image}) center/cover`
                    : 'linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)',
                }}
              >
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  padding: '32px 24px 24px',
                  background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                  color: '#fff',
                }}>
                  <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, lineHeight: 1.4 }}>
                    {featured[0].title}
                  </div>
                  <Paragraph
                    ellipsis={{ rows: 2 }}
                    style={{ color: 'rgba(255,255,255,0.8)', margin: 0, fontSize: 14 }}
                  >
                    {featured[0].summary}
                  </Paragraph>
                  <div style={{ marginTop: 12, fontSize: 13, opacity: 0.6 }}>
                    <ClockCircleOutlined /> {new Date(featured[0].published_at).toLocaleDateString()}
                    <span style={{ marginLeft: 16 }}><EyeOutlined /> {featured[0].view_count}</span>
                  </div>
                </div>
              </div>
            </Col>

            {/* Side cards */}
            <Col xs={24} md={8}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20, height: '100%' }}>
                {featured.slice(1, 3).map((blog) => (
                  <div
                    key={blog.id}
                    onClick={() => navigate(`/blogs/${blog.id}`)}
                    style={{
                      flex: 1, borderRadius: 'var(--radius-md)',
                      overflow: 'hidden', cursor: 'pointer',
                      background: blog.cover_image
                        ? `url(${blog.cover_image}) center/cover`
                        : 'linear-gradient(135deg, #d97746 0%, #f59e6b 100%)',
                      position: 'relative', minHeight: 170,
                    }}
                  >
                    <div style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0,
                      padding: '20px 16px 16px',
                      background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                      color: '#fff',
                    }}>
                      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4, lineHeight: 1.4 }}>
                        {blog.title}
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.6 }}>
                        {new Date(blog.published_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Col>
          </Row>
        </section>
      )}

      {/* ── Content Grid ──────────────────────── */}
      <Row gutter={[32, 32]}>
        {/* Blog list */}
        <Col xs={24} lg={16}>
          <div className="section-title">最新文章</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {blogs.map((blog, i) => (
              <div
                key={blog.id}
                onClick={() => navigate(`/blogs/${blog.id}`)}
                style={{
                  animation: `slideUp 0.4s ease ${i * 0.06}s both`,
                }}
              >
                <Card
                  hoverable
                  style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden' }}
                  bodyStyle={{ padding: 0 }}
                >
                  <Row>
                    {blog.cover_image && (
                      <Col xs={24} sm={6}>
                        <div style={{
                          height: '100%', minHeight: 140,
                          background: `url(${blog.cover_image}) center/cover`,
                        }} />
                      </Col>
                    )}
                    <Col xs={24} sm={blog.cover_image ? 18 : 24}>
                      <div style={{ padding: '20px 24px' }}>
                        <div style={{
                          fontSize: 17, fontWeight: 600, color: 'var(--color-text)',
                          marginBottom: 8, lineHeight: 1.4,
                          cursor: 'pointer',
                        }}
                          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-accent)'}
                          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text)'}
                        >
                          {blog.title}
                        </div>

                        {blog.tags && blog.tags.length > 0 && (
                          <div style={{ marginBottom: 8 }}>
                            {blog.tags.map((tag) => (
                              <Tag key={tag} style={{ fontSize: 11 }}>{tag}</Tag>
                            ))}
                          </div>
                        )}

                        <Paragraph
                          ellipsis={{ rows: 2 }}
                          style={{ color: 'var(--color-text-secondary)', margin: 0, fontSize: 14 }}
                        >
                          {blog.summary}
                        </Paragraph>

                        <div style={{
                          marginTop: 12, fontSize: 12, color: 'var(--color-text-tertiary)',
                          display: 'flex', gap: 16,
                        }}>
                          <span><ClockCircleOutlined /> {new Date(blog.published_at).toLocaleDateString()}</span>
                          <span><EyeOutlined /> {blog.view_count} 次阅读</span>
                        </div>
                      </div>
                    </Col>
                  </Row>
                </Card>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <span
              onClick={() => navigate('/community')}
              style={{
                color: 'var(--color-accent)', cursor: 'pointer',
                fontSize: 14, fontWeight: 500,
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}
            >
              查看更多文章 <RightOutlined style={{ fontSize: 12 }} />
            </span>
          </div>
        </Col>

        {/* Sidebar */}
        <Col xs={24} lg={8}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Hot Events */}
            <Card
              title={<span style={{ fontSize: 15, fontWeight: 600 }}>热点事件</span>}
              style={{ borderRadius: 'var(--radius-md)' }}
              headStyle={{ border: 'none', paddingBottom: 0 }}
              bodyStyle={{ paddingTop: 8 }}
            >
              <List
                dataSource={hotEvents.filter((e) => e.is_active)}
                renderItem={(event) => (
                  <List.Item style={{ padding: '12px 0', border: 'none' }}>
                    <List.Item.Meta
                      title={
                        event.link ? (
                          <a
                            href={event.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text)' }}
                          >
                            {event.title}
                          </a>
                        ) : (
                          <span style={{ fontSize: 14, fontWeight: 500 }}>{event.title}</span>
                        )
                      }
                      description={
                        event.summary && (
                          <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>
                            {event.summary}
                          </span>
                        )
                      }
                    />
                  </List.Item>
                )}
              />
            </Card>

            {/* Quick links */}
            <Card
              title={<span style={{ fontSize: 15, fontWeight: 600 }}>探索更多</span>}
              style={{ borderRadius: 'var(--radius-md)' }}
              headStyle={{ border: 'none', paddingBottom: 0 }}
              bodyStyle={{ paddingTop: 8 }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { label: '交流社区', desc: '分享旅行故事', path: '/community', color: '#0f766e' },
                  { label: '风景相册', desc: '浏览旅行照片', path: '/albums', color: '#d97746' },
                  { label: '旅行攻略', desc: '查看旅游建议', path: '/travel/suggestions', color: '#0ea5e9' },
                ].map((item) => (
                  <div
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    style={{
                      padding: '14px 16px', borderRadius: 10,
                      cursor: 'pointer', transition: 'background var(--transition-fast)',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-accent-bg)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{item.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                        {item.desc}
                      </div>
                    </div>
                    <RightOutlined style={{ color: 'var(--color-text-tertiary)', fontSize: 12 }} />
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </Col>
      </Row>
    </div>
  );
}
