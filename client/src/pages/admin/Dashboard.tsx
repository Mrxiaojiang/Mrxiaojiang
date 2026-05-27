import { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Spin } from 'antd';
import {
  UserOutlined, FileTextOutlined, MessageOutlined,
  CommentOutlined, PictureOutlined,
} from '@ant-design/icons';
import http from '../../api/http';

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    http.get('/admin/dashboard').then((res) => {
      setData(res.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  const stats = [
    { title: '用户总数', value: data?.userCount || 0, icon: <UserOutlined />, color: '#1890ff' },
    { title: '博客总数', value: data?.blogCount || 0, icon: <FileTextOutlined />, color: '#52c41a' },
    { title: '帖子总数', value: data?.postCount || 0, icon: <MessageOutlined />, color: '#faad14' },
    { title: '评论总数', value: data?.commentCount || 0, icon: <CommentOutlined />, color: '#722ed1' },
    { title: '相册总数', value: data?.albumCount || 0, icon: <PictureOutlined />, color: '#eb2f96' },
  ];

  return (
    <Row gutter={[16, 16]}>
      {stats.map((s) => (
        <Col xs={12} md={8} lg={4} key={s.title}>
          <Card hoverable>
            <Statistic
              title={s.title}
              value={s.value}
              prefix={<span style={{ color: s.color }}>{s.icon}</span>}
              valueStyle={{ color: s.color }}
            />
          </Card>
        </Col>
      ))}
    </Row>
  );
}
