import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Image, Spin, Button, Tag, Typography, Row, Col,
  message, Modal, Input, Select, Upload, Space, Popconfirm,
} from 'antd';
import {
  ArrowLeftOutlined, HeartFilled, HeartOutlined, EyeOutlined,
  EditOutlined, DeleteOutlined, UploadOutlined,
} from '@ant-design/icons';
import { albumApi } from '../../api/album';
import { useAuthStore } from '../../store/authStore';
import type { Album } from '../../types';

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function AlbumDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [album, setAlbum] = useState<Album | null>(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);

  // 编辑弹窗
  const [editOpen, setEditOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', tags: '', visibility: 'public' as 'public' | 'private', images: [] as string[] });

  const fetchAlbum = () => {
    if (!id) return;
    setLoading(true);
    albumApi.detail(id).then((res) => {
      setAlbum(res.data);
    }).catch(() => {
      message.error('加载相册失败');
      navigate('/albums');
    }).finally(() => setLoading(false));
  };

  const [myAlbumIds, setMyAlbumIds] = useState<Set<string>>(new Set());

  useEffect(() => { fetchAlbum(); }, [id]);

  useEffect(() => {
    if (!id || !isAuthenticated) return;
    albumApi.myAlbums().then((res) => {
      if (res.data) setMyAlbumIds(new Set(res.data.map((a) => a.id)));
    }).catch(() => {});
    albumApi.getLikeStatus(id).then((res) => {
      setLiked(res.data);
    }).catch(() => {});
  }, [id, isAuthenticated]);

  const isOwner = isAuthenticated && myAlbumIds.has(album?.id || '');

  const openEdit = () => {
    if (!album) return;
    setForm({
      name: album.name,
      description: album.description || '',
      tags: (album.tags || []).join(','),
      visibility: album.visibility,
      images: album.images || [],
    });
    setEditOpen(true);
  };

  const handleUpload = async (file: File) => {
    try {
      const res = await albumApi.uploadImage(file);
      setForm((prev) => ({ ...prev, images: [...prev.images, res.data.url] }));
      return false;
    } catch { return false; }
  };

  const handleSave = async () => {
    if (!form.name.trim()) { message.warning('请输入相册名称'); return; }
    if (!id) return;
    setSubmitting(true);
    try {
      await albumApi.update(id, {
        name: form.name,
        description: form.description || undefined,
        tags: form.tags ? form.tags.split(/[,，]/).map((t) => t.trim()).filter(Boolean) : [],
        visibility: form.visibility,
        images: form.images,
      });
      message.success('相册已更新');
      setEditOpen(false);
      fetchAlbum();
    } catch {
      message.error('保存失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      await albumApi.remove(id);
      message.success('相册已删除');
      navigate('/albums');
    } catch {
      message.error('删除失败');
    }
  };

  const toggleLike = async () => {
    if (!id || !user) { message.warning('请先登录'); return; }
    setLikeLoading(true);
    try {
      const res = await albumApi.like(id);
      const { liked: newLiked, like_count } = res.data;
      setLiked(newLiked);
      setAlbum((prev) => prev ? { ...prev, like_count } : prev);
    } catch {
      message.error('操作失败');
    } finally {
      setLikeLoading(false);
    }
  };

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (!album) return null;

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/albums')}>返回相册</Button>
        {isOwner && (
          <Space>
            <Button icon={<EditOutlined />} onClick={openEdit}>编辑</Button>
            <Popconfirm title="确定删除此相册？" onConfirm={handleDelete}>
              <Button danger icon={<DeleteOutlined />}>删除</Button>
            </Popconfirm>
          </Space>
        )}
      </div>

      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <Title level={3} style={{ margin: 0 }}>
              {album.name}
              {album.visibility === 'private' && <Tag color="default" style={{ marginLeft: 8 }}>私密</Tag>}
            </Title>
            {album.description && (
              <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>{album.description}</Text>
            )}
            <div style={{ marginTop: 8, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <span onClick={toggleLike} style={{ cursor: user ? 'pointer' : 'default' }}>
                {liked ? <HeartFilled style={{ color: '#ff4d4f' }} /> : <HeartOutlined />} {album.like_count}
              </span>
              <span><EyeOutlined /> {album.view_count}</span>
              <span>{album.images?.length || 0} 张照片</span>
              {album.tags?.map((t) => <Tag key={t}>{t}</Tag>)}
            </div>
          </div>
        </div>
      </Card>

      <div style={{ marginTop: 16 }}>
        {album.cover_url && (
          <Card title="封面" style={{ marginBottom: 16 }}>
            <Image src={album.cover_url} alt="封面" style={{ maxHeight: 400 }} />
          </Card>
        )}

        {album.images && album.images.length > 0 ? (
          <Card title="相册图片">
            <Row gutter={[16, 16]}>
              {album.images.map((url, i) => (
                <Col xs={12} sm={8} md={6} key={i}>
                  <Image
                    src={url}
                    alt={`${album.name} ${i + 1}`}
                    style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 6 }}
                  />
                </Col>
              ))}
            </Row>
          </Card>
        ) : (
          <Card><Text type="secondary">暂无图片</Text></Card>
        )}
      </div>

      {/* 编辑弹窗 */}
      <Modal
        title="编辑相册"
        open={editOpen}
        onOk={handleSave}
        onCancel={() => setEditOpen(false)}
        confirmLoading={submitting}
        okText="保存"
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
