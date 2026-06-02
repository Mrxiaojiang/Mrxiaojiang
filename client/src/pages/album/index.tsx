import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Row, Col, Switch, Typography, Spin, Carousel,
  Button, message, Modal, Input, Select, Upload, Image, Space, Popconfirm,
} from 'antd';
import {
  PictureOutlined, HeartFilled, HeartOutlined, PlusOutlined, UploadOutlined,
  EditOutlined, DeleteOutlined, RightOutlined,
} from '@ant-design/icons';
import { albumApi } from '../../api/album';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import type { Album } from '../../types';

const { Text } = Typography;
const { TextArea } = Input;

export default function AlbumPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [topLiked, setTopLiked] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const { carouselDisabled, toggleCarousel } = useAppStore();

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', tags: '', visibility: 'public' as 'public' | 'private', images: [] as string[] });
  const [myAlbumIds, setMyAlbumIds] = useState<Set<string>>(new Set());
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [uploadFileList, setUploadFileList] = useState<any[]>([]);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      albumApi.list(1, 20),
      albumApi.topLiked(),
      isAuthenticated ? albumApi.myAlbums() : Promise.resolve(null),
    ]).then(([listRes, topRes, myRes]) => {
      const publicList = listRes.data.data;
      if (myRes && myRes.data) {
        setMyAlbumIds(new Set(myRes.data.map((a: Album) => a.id)));
        const ids = new Set(publicList.map((a: Album) => a.id));
        for (const album of myRes.data) {
          if (!ids.has(album.id)) publicList.push(album);
        }
      }
      setAlbums(publicList);
      setTopLiked(topRes.data);
    }).finally(() => setLoading(false));
    if (isAuthenticated) {
      albumApi.getLikedAlbumIds().then((res) => {
        setLikedIds(new Set(res.data || []));
      }).catch(() => {});
    }
  };

  useEffect(() => { fetchData(); }, [isAuthenticated]);

  const openCreate = () => {
    setEditId(null);
    setForm({ name: '', description: '', tags: '', visibility: 'public', images: [] });
    setUploadFileList([]);
    setOpen(true);
  };

  const openEdit = (album: Album) => {
    setEditId(album.id);
    setForm({
      name: album.name, description: album.description || '',
      tags: (album.tags || []).join(','), visibility: album.visibility, images: album.images || [],
    });
    setUploadFileList((album.images || []).map((url, i) => ({ uid: String(i), name: `image-${i}`, status: 'done' as const, url })));
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { message.warning('请输入相册名称'); return; }
    setSubmitting(true);
    try {
      const data = { name: form.name, description: form.description || undefined, tags: form.tags ? form.tags.split(/[,，]/).map((t) => t.trim()).filter(Boolean) : [], visibility: form.visibility, images: form.images };
      if (editId) { await albumApi.update(editId, data); message.success('相册已更新'); }
      else { await albumApi.create(data); message.success('相册创建成功'); }
      setOpen(false); setEditId(null); setUploadFileList([]); fetchData();
    } catch { message.error('操作失败'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    try { await albumApi.remove(id); message.success('相册已删除'); fetchData(); }
    catch { message.error('删除失败'); }
  };

  const toggleLike = async (album: Album) => {
    try {
      const res = await albumApi.like(album.id);
      const liked = res.data.liked;
      setLikedIds((prev) => { const next = new Set(prev); liked ? next.add(album.id) : next.delete(album.id); return next; });
      setAlbums((prev) => prev.map((a) => a.id === album.id ? { ...a, like_count: a.like_count + (liked ? 1 : -1) } : a));
    } catch { message.error('操作失败'); }
  };

  const customRequest = (options: any) => {
    const { file, onSuccess, onError } = options;
    albumApi.uploadImage(file).then((res) => {
      onSuccess(res.data, file);
      setForm((prev) => ({ ...prev, images: [...prev.images, res.data.url] }));
    }).catch((err) => { onError(err); message.error('图片上传失败'); });
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <Spin size="large" />
    </div>
  );

  return (
    <div>
      {/* ── Header ──────────────────────────── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 24, flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <div className="section-title" style={{ marginBottom: 4 }}>风景记录</div>
          <div className="section-subtitle" style={{ marginTop: 0 }}>用照片记录每一段旅程</div>
        </div>
        <Space>
          <Space>
            <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>TOP10 轮播</span>
            <Switch checked={!carouselDisabled} onChange={toggleCarousel} size="small" />
          </Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} style={{ borderRadius: 8 }}>
            创建相册
          </Button>
        </Space>
      </div>

      {/* ── Carousel ────────────────────────── */}
      {!carouselDisabled && topLiked.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <Carousel autoplay autoplaySpeed={5000}>
            {topLiked.map((album) => {
              const imgUrl = album.cover_url || (album.images && album.images[0]);
              return (
                <div key={album.id} onClick={() => navigate(`/albums/${album.id}`)} style={{ cursor: 'pointer' }}>
                  <div style={{
                    height: 320, borderRadius: 'var(--radius-lg)', overflow: 'hidden',
                    background: imgUrl
                      ? `linear-gradient(rgba(0,0,0,0.25), rgba(0,0,0,0.5)), center/cover no-repeat url(${imgUrl})`
                      : 'linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
                    color: '#fff',
                  }}>
                    <div style={{ fontSize: 26, fontWeight: 700, textShadow: '0 2px 8px rgba(0,0,0,0.4)', marginBottom: 8 }}>
                      {album.name}
                    </div>
                    <div style={{ fontSize: 14, opacity: 0.8 }}>
                      <HeartFilled style={{ color: '#ff4d4f' }} /> {album.like_count} 次点赞
                    </div>
                  </div>
                </div>
              );
            })}
          </Carousel>
        </div>
      )}

      {/* ── Album Grid ──────────────────────── */}
      <Row gutter={[20, 20]}>
        {albums.map((album) => {
          const isOwner = myAlbumIds.has(album.id);
          const liked = likedIds.has(album.id);
          return (
          <Col xs={12} sm={8} md={6} key={album.id}>
            <div style={{
              borderRadius: 'var(--radius-md)', overflow: 'hidden',
              background: '#fff', border: '1px solid var(--color-border-light)',
              boxShadow: 'var(--shadow-card)', transition: 'all var(--transition-base)',
            }}
              onMouseEnter={(e) => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
              onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'var(--shadow-card)'}
            >
              {/* Cover */}
              <div
                onClick={() => navigate(`/albums/${album.id}`)}
                style={{ cursor: 'pointer', height: 170, overflow: 'hidden', background: 'var(--color-bg-alt)' }}
              >
                {album.cover_url || (album.images && album.images[0]) ? (
                  <Image
                    src={album.cover_url || album.images[0]}
                    alt={album.name}
                    preview={false}
                    style={{ width: '100%', height: 170, objectFit: 'cover' }}
                    fallback="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'%3E%3Cpath fill='%23ccc' d='M24 4C12.95 4 4 12.95 4 24s8.95 20 20 20 20-8.95 20-20S35.05 4 24 4zm10 30H14v-4l6-8 4 6 4-4 6 10z'/%3E%3C/svg%3E"
                  />
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <PictureOutlined style={{ fontSize: 40, color: 'var(--color-text-tertiary)' }} />
                  </div>
                )}
              </div>

              {/* Info */}
              <div onClick={() => navigate(`/albums/${album.id}`)} style={{ cursor: 'pointer', padding: '14px 16px 0' }}>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4, color: 'var(--color-text)' }}>
                  {album.name}
                  {album.visibility === 'private' && <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginLeft: 6 }}>私密</span>}
                </div>
                <div style={{ color: 'var(--color-text-tertiary)', fontSize: 13, marginBottom: 4 }}>
                  {album.images?.length || 0} 张照片 · {album.like_count} 次点赞
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', alignItems: 'center', padding: '4px 16px 12px', gap: 12 }}>
                <span onClick={() => toggleLike(album)} style={{ cursor: 'pointer', fontSize: 16, color: liked ? '#ff4d4f' : 'var(--color-text-tertiary)' }}>
                  {liked ? <HeartFilled /> : <HeartOutlined />}
                </span>
                {isOwner && (
                  <>
                    <EditOutlined onClick={() => openEdit(album)} style={{ cursor: 'pointer', fontSize: 15, color: 'var(--color-text-tertiary)' }} />
                    <Popconfirm title="确定删除？" onConfirm={() => handleDelete(album.id)}>
                      <DeleteOutlined style={{ cursor: 'pointer', fontSize: 15, color: 'var(--color-text-tertiary)' }} />
                    </Popconfirm>
                  </>
                )}
              </div>
            </div>
          </Col>
          );
        })}
      </Row>

      {albums.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-text-tertiary)' }}>
          暂无相册
        </div>
      )}

      {/* ── Modal ───────────────────────────── */}
      <Modal
        title={editId ? '编辑相册' : '创建相册'}
        open={open}
        onOk={handleSave}
        onCancel={() => { setOpen(false); setEditId(null); setUploadFileList([]); }}
        confirmLoading={submitting}
        okText={editId ? '保存' : '创建'}
        cancelText="取消"
        style={{ borderRadius: 'var(--radius-md)' }}
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
              multiple customRequest={customRequest} listType="picture-card" fileList={uploadFileList}
              onChange={({ fileList }) => { setUploadFileList(fileList.map((f) => { if (f.status === 'done' && (f as any).response?.url && !f.url) return { ...f, url: (f as any).response.url }; return f; })); }}
              onRemove={(file) => { const url = (file as any).url || (file as any).response?.url; if (url) setForm((prev) => ({ ...prev, images: prev.images.filter((u) => u !== url) })); }}
            >
              {uploadFileList.length < 8 && <Button icon={<UploadOutlined />}>选择图片</Button>}
            </Upload>
          </div>
        </div>
      </Modal>
    </div>
  );
}
