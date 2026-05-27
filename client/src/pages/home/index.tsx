import { useState, useEffect } from 'react';
import { Card, Row, Col, Typography, List, Tag, Spin } from 'antd';
import { ClockCircleOutlined, EyeOutlined } from '@ant-design/icons';
import type { Blog, HotEvent } from '../../types';
import { blogApi } from '../../api/blog';
import http from '../../api/http';

const { Title, Paragraph } = Typography;

export default function HomePage() {
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

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  return (
    <div>
      {/* 精选博客 */}
      {featured.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <Title level={3}>📌 精选文章</Title>
          <Row gutter={[16, 16]}>
            {featured.map((blog) => (
              <Col xs={24} sm={12} md={8} key={blog.id}>
                <Card
                  hoverable
                  cover={
                    <div style={{ height: 180, background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
                      {blog.cover_image ? <img src={blog.cover_image} alt={blog.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '暂无封面'}
                    </div>
                  }
                >
                  <Card.Meta
                    title={blog.title}
                    description={
                      <Paragraph ellipsis={{ rows: 2 }}>{blog.summary}</Paragraph>
                    }
                  />
                  <div style={{ marginTop: 12, color: '#999', fontSize: 12 }}>
                    <ClockCircleOutlined /> {new Date(blog.published_at).toLocaleDateString()}
                    <span style={{ marginLeft: 12 }}><EyeOutlined /> {blog.view_count}</span>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      )}

      <Row gutter={24}>
        {/* 博客列表 */}
        <Col xs={24} lg={16}>
          <Title level={3}>最新文章</Title>
          <List
            dataSource={blogs}
            renderItem={(blog) => (
              <List.Item
                extra={
                  blog.cover_image && (
                    <img width={120} height={80} style={{ objectFit: 'cover', borderRadius: 4 }} src={blog.cover_image} alt="" />
                  )
                }
              >
                <List.Item.Meta
                  title={<a href={`/blogs/${blog.id}`}>{blog.title}</a>}
                  description={
                    <>
                      <Paragraph ellipsis={{ rows: 2 }} type="secondary">{blog.summary}</Paragraph>
                      <div>
                        {blog.tags?.map((tag) => <Tag key={tag}>{tag}</Tag>)}
                        <span style={{ color: '#999', fontSize: 12, marginLeft: 8 }}>
                          {new Date(blog.published_at).toLocaleDateString()} · {blog.view_count} 次阅读
                        </span>
                      </div>
                    </>
                  }
                />
              </List.Item>
            )}
          />
        </Col>

        {/* 热点事件 */}
        <Col xs={24} lg={8}>
          <Card title="🔥 热点事件">
            <List
              dataSource={hotEvents.filter((e) => e.is_active)}
              renderItem={(event) => (
                <List.Item>
                  <List.Item.Meta
                    title={
                      event.link ? (
                        <a href={event.link} target="_blank" rel="noopener noreferrer">{event.title}</a>
                      ) : (
                        event.title
                      )
                    }
                    description={event.summary}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
