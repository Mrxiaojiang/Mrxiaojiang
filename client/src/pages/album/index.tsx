import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, Row, Col, Switch, Typography, Spin, Carousel,
  Button, message, Modal, Input, Select, Upload, Image, Space, Popconfirm,
} from 'antd';
import {
  PictureOutlined, HeartFilled, HeartOutlined, PlusOutlined, UploadOutlined,
  EditOutlined, DeleteOutlined,
} from '@ant-design/icons';
import { albumApi } from '../../api/album';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import type { Album } from '../../types';

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function AlbumPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [topLiked, setTopLiked] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const { carouselDisabled, toggleCarousel } = useAppStore();

  // 创建/编辑相册弹窗
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', tags: '', visibility: 'public' as 'public' | 'private', images: [] as string[] });
  const [myAlbumIds, setMyAlbumIds] = useState<Set<string>>(new Set());
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      albumApi.list(1, 20),
      albumApi.topLiked(),
      isAuthenticated ? albumApi.myAlbums() : Promise.resolve(null),
    ]).then(([listRes, topRes, myRes]) => {
      const publicList = listRes.data.data;
      // 合并用户自己的相册（含私密），去重
      if (myRes && myRes.data) {
        setMyAlbumIds(new Set(myRes.data.map((a: Album) => a.id)));
        const ids = new Set(publicList.map((a: Album) => a.id));
        for (const album of myRes.data) {
          if (!ids.has(album.id)) {
            publicList.push(album);
          }
        }
      }
      setAlbums(publicList);
      setTopLiked(topRes.data);
    }).finally(() => setLoading(false));
    // 获取用户点赞过的相册 ID
    if (isAuthenticated) {
      albumApi.getLikedAlbumIds().then((res) => {
        setLikedIds(new Set(res.data || []));
      }).catch(() => {});
    }
  };

  useEffect(() => { fetchData(); }, [isAuthenticated]);

  // ─── 创建/编辑相册 ─────────────────────────
  const openCreate = () => {
    setEditId(null);
    setForm({ name: '', description: '', tags: '', visibility: 'public', images: [] });
    setOpen(true);
  };

  const openEdit = (album: Album) => {
    setEditId(album.id);
    setForm({
      name: album.name,
      description: album.description || '',
      tags: (album.tags || []).join(','),
      visibility: album.visibility,
      images: album.images || [],
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { message.warning('请输入相册名称'); return; }
    setSubmitting(true);
    try {
      const data = {
        name: form.name,
        description: form.description || undefined,
        tags: form.tags ? form.tags.split(/[,，]/).map((t) => t.trim()).filter(Boolean) : [],
        visibility: form.visibility,
        images: form.images,
      };
      if (editId) {
        await albumApi.update(editId, data);
        message.success('相册已更新');
      } else {
        await albumApi.create(data);
        message.success('相册创建成功');
      }
      setOpen(false);
      setEditId(null);
      fetchData();
    } catch {
      message.error('操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await albumApi.remove(id);
      message.success('相册已删除');
      fetchData();
    } catch {
      message.error('删除失败');
    }
  };

  // ─── 点赞 ──────────────────────────────────────
  const toggleLike = async (album: Album) => {
    try {
      const res = await albumApi.like(album.id);
      const liked = res.data.liked;
      setLikedIds((prev) => {
        const next = new Set(prev);
        liked ? next.add(album.id) : next.delete(album.id);
        return next;
      });
      setAlbums((prev) => prev.map((a) =>
        a.id === album.id ? { ...a, like_count: a.like_count + (liked ? 1 : -1) } : a
      ));
    } catch {
      message.error('操作失败');
    }
  };

  // ─── 上传图片到服务器 ──────────────────────
  const handleUpload = async (file: File) => {
    try {
      const res = await albumApi.uploadImage(file);
      setForm((prev) => ({ ...prev, images: [...prev.images, res.data.url] }));
      return false; // 阻止 Upload 默认上传行为
    } catch {
      message.error('图片上传失败');
      return false;
    }
  };

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  return (
    <div>
      {/* 标题栏 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>🌄 风景记录</Title>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: '#666' }}>TOP10 轮播</span>
          <Switch checked={!carouselDisabled} onChange={toggleCarousel} />
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            创建相册
          </Button>
        </div>
      </div>

      {/* TOP10 轮播 */}
      {!carouselDisabled && topLiked.length > 0 && (
        <div style={{ position: 'relative', marginBottom: 24 }}>
          <Carousel autoplay autoplaySpeed={5000}>
            {topLiked.map((album) => {
              const imgUrl = album.cover_url || (album.images && album.images[0]);
              return (
                <div key={album.id} onClick={() => navigate(`/albums/${album.id}`)} style={{ cursor: 'pointer' }}>
                  <div style={{
                    height: 300,
                    background: imgUrl
                      ? `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), center/cover no-repeat url(${imgUrl})`
                      : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 8,
                    color: '#fff',
                    flexDirection: 'column',
                    position: 'relative',
                  }}>
                    <Title level={2} style={{ color: '#fff', margin: 0, textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
                      {album.name}
                    </Title>
                    <div style={{ marginTop: 8, fontSize: 16, textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>
                      <HeartFilled style={{ color: '#ff4d4f' }} /> {album.like_count} 次点赞
                    </div>
                  </div>
                </div>
              );
            })}
          </Carousel>
        </div>
      )}

      {/* 相册网格 */}
      <Row gutter={[16, 16]}>
        {albums.map((album) => {
          const isOwner = myAlbumIds.has(album.id);
          return (
          <Col xs={12} sm={8} md={6} key={album.id}>
            <Card
              hoverable
              onClick={() => navigate(`/albums/${album.id}`)}
              cover={
                <div style={{ height: 160, background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {album.cover_url || (album.images && album.images[0]) ? (
                    <Image
                      src={album.cover_url || album.images[0]}
                      alt={album.name}
                      preview={false}
                      style={{ width: '100%', height: 160, objectFit: 'cover' }}
                      fallback="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'%3E%3Cpath fill='%23ccc' d='M24 4C12.95 4 4 12.95 4 24s8.95 20 20 20 20-8.95 20-20S35.05 4 24 4zm10 30H14v-4l6-8 4 6 4-4 6 10z'/%3E%3C/svg%3E"
                    />
                  ) : (
                    <PictureOutlined style={{ fontSize: 48, color: '#ccc' }} />
                  )}
                </div>
              }
              actions={[
                <span key="like" onClick={(e) => { e.stopPropagation(); toggleLike(album); }}>
                  {likedIds.has(album.id) ? <HeartFilled style={{ color: '#ff4d4f' }} /> : <HeartOutlined />}
                </span>,
                ...(isOwner ? [
                  <EditOutlined key="edit" onClick={(e) => { e.stopPropagation(); openEdit(album); }} />,
                  <Popconfirm key="delete" title="确定删除？" onConfirm={() => handleDelete(album.id)}>
                    <DeleteOutlined onClick={(e) => e.stopPropagation()} />
                  </Popconfirm>,
                ] : []),
              ]}
            >
              <Card.Meta
                title={<Space>{album.name}{album.visibility === 'private' && <span style={{ fontSize: 12, color: '#999' }}>私密</span>}</Space>}
                description={`${album.images?.length || 0} 张照片 · ❤️ ${album.like_count}`}
              />
            </Card>
          </Col>
          );
        })}
      </Row>

      {/* 创建/编辑相册弹窗 */}
      <Modal
        title={editId ? '编辑相册' : '创建相册'}
        open={open}
        onOk={handleSave}
        onCancel={() => { setOpen(false); setEditId(null); }}
        confirmLoading={submitting}
        okText={editId ? '保存' : '创建'}
        cancelText="取消"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
          <Input placeholder="相册名称" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <TextArea placeholder="相册描述（可选）" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Input placeholder="标签（用逗号分隔，可选）" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
          <Select value={form.visibility} onChange={(v) => setForm({ ...form, visibility: v })} style={{ width: '100%' }}>
            <Select.Option value="public">公开</Select.Option>
            <Select.Option value="private">私密</Select.Option>
          </Select>
          <div>
            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>上传图片</Text>
            <Upload
              multiple
              beforeUpload={handleUpload}
              showUploadList={true}
              fileList={form.images.map((url, i) => ({ uid: String(i), name: `image-${i}`, status: 'done' as const, url }))}
              onRemove={(file) => setForm((prev) => ({ ...prev, images: prev.images.filter((_, i) => String(i) !== file.uid) }))}
            >
              <Button icon={<UploadOutlined />}>选择图片</Button>
            </Upload>
          </div>
        </div>
      </Modal>
    </div>
  );
}
