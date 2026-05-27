import { useState, useEffect } from 'react';
import { Card, Row, Col, Switch, Typography, Spin, Carousel, Button, message } from 'antd';
import { PictureOutlined, HeartFilled, CloseOutlined } from '@ant-design/icons';
import { albumApi } from '../../api/album';
import { useAppStore } from '../../store/appStore';
import type { Album } from '../../types';

const { Title } = Typography;

export default function AlbumPage() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [topLiked, setTopLiked] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const { carouselDisabled, toggleCarousel } = useAppStore();

  useEffect(() => {
    Promise.all([
      albumApi.list(1, 20),
      albumApi.topLiked(),
    ]).then(([listRes, topRes]) => {
      setAlbums(listRes.data.data);
      setTopLiked(topRes.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>🌄 风景记录</Title>
        <div>
          <span style={{ marginRight: 8, color: '#666' }}>TOP10 轮播</span>
          <Switch checked={!carouselDisabled} onChange={toggleCarousel} />
        </div>
      </div>

      {/* TOP10 轮播 */}
      {!carouselDisabled && topLiked.length > 0 && (
        <div style={{ position: 'relative', marginBottom: 24 }}>
          <Carousel autoplay autoplaySpeed={5000}>
            {topLiked.map((album) => (
              <div key={album.id}>
                <div style={{
                  height: 300,
                  background: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 8,
                  color: '#fff',
                  flexDirection: 'column',
                }}>
                  <PictureOutlined style={{ fontSize: 48, marginBottom: 12 }} />
                  <Title level={3} style={{ color: '#fff', margin: 0 }}>{album.name}</Title>
                  <div style={{ marginTop: 8 }}>
                    <HeartFilled style={{ color: '#ff4d4f' }} /> {album.like_count} 次点赞
                  </div>
                </div>
              </div>
            ))}
          </Carousel>
        </div>
      )}

      {/* 相册网格 */}
      <Row gutter={[16, 16]}>
        {albums.map((album) => (
          <Col xs={12} sm={8} md={6} key={album.id}>
            <Card
              hoverable
              cover={
                <div style={{ height: 160, background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {album.cover_url ? (
                    <img src={album.cover_url} alt={album.name} style={{ width: '100%', height: 160, objectFit: 'cover' }} />
                  ) : (
                    <PictureOutlined style={{ fontSize: 48, color: '#ccc' }} />
                  )}
                </div>
              }
            >
              <Card.Meta title={album.name} description={`${album.images?.length || 0} 张照片 · ❤️ ${album.like_count}`} />
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}
