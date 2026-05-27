import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Typography, Spin, Tag, Button, Divider } from 'antd';
import { ArrowLeftOutlined, ClockCircleOutlined, EyeOutlined } from '@ant-design/icons';
import { blogApi } from '../../api/blog';
import type { Blog } from '../../types';

const { Title, Paragraph } = Typography;

export default function BlogDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [blog, setBlog] = useState<Blog | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    blogApi.detail(id).then((res) => {
      setBlog(res.data);
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (!blog) return <div>文章不存在</div>;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <Button type="link" icon={<ArrowLeftOutlined />} onClick={() => navigate('/')} style={{ padding: 0, marginBottom: 16 }}>
        返回首页
      </Button>

      <Card>
        <Title>{blog.title}</Title>
        <div style={{ color: '#999', marginBottom: 16 }}>
          <ClockCircleOutlined /> {new Date(blog.published_at).toLocaleDateString()}
          <span style={{ marginLeft: 16 }}><EyeOutlined /> {blog.view_count} 次阅读</span>
        </div>
        {blog.tags?.map((tag) => <Tag key={tag}>{tag}</Tag>)}
        <Divider />
        <div style={{ lineHeight: 1.8, fontSize: 15 }}>
          {blog.content.split('\n').map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      </Card>
    </div>
  );
}
