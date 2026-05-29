import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Card, Input, Button, message, Spin, Switch, Upload, Tag,
} from 'antd';
import {
  SaveOutlined, SendOutlined, UploadOutlined, ArrowLeftOutlined,
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import http from '../../api/http';

const { TextArea } = Input;

export default function BlogEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [summary, setSummary] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    if (id) {
      http.get(`/blogs/${id}`).then((res) => {
        const blog = res.data;
        setTitle(blog.title);
        setContent(blog.content);
        setSummary(blog.summary || '');
        setCoverImage(blog.cover_image || '');
        setTags(blog.tags || []);
        setIsPublished(blog.is_published);
      }).catch(() => message.error('加载博客失败'))
        .finally(() => setLoading(false));
    }
  }, [id]);

  const handleUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await http.post<{ url: string }>('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setCoverImage(res.data.url);
      message.success('封面上传成功');
    } catch {
      message.error('上传失败');
    }
    return false;
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
      setTagInput('');
    }
  };

  const handleSave = async (publish = false) => {
    if (!title.trim()) { message.warning('请输入标题'); return; }
    if (!content.trim()) { message.warning('请输入内容'); return; }
    setSubmitting(true);

    const body = {
      title: title.trim(),
      content,
      summary: summary.trim() || undefined,
      cover_image: coverImage || undefined,
      tags: tags.length > 0 ? tags : undefined,
      is_published: publish,
    };

    try {
      if (isEdit) {
        await http.put(`/blogs/${id}`, body);
        message.success('文章已更新');
      } else {
        await http.post('/blogs', body);
        message.success('文章已创建');
      }
      navigate('/admin/blogs');
    } catch {
      message.error('保存失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin/blogs')}>返回</Button>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ color: '#666' }}>发布</span>
          <Switch checked={isPublished} onChange={setIsPublished} />
          <Button icon={<SaveOutlined />} loading={submitting} onClick={() => handleSave(isPublished)}>
            保存
          </Button>
          <Button type="primary" icon={<SendOutlined />} loading={submitting} onClick={() => handleSave(true)}>
            {isEdit ? '更新并发布' : '发布'}
          </Button>
        </div>
      </div>

      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input
            size="large"
            placeholder="文章标题"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <div>
            <Upload beforeUpload={handleUpload} showUploadList={false} accept="image/*">
              <Button icon={<UploadOutlined />}>
                {coverImage ? '更换封面' : '上传封面'}
              </Button>
            </Upload>
            {coverImage && (
              <div style={{ marginTop: 8 }}>
                <img src={coverImage} alt="封面" style={{ maxHeight: 120, borderRadius: 4 }} />
              </div>
            )}
          </div>

          <TextArea
            placeholder="文章摘要（可选）"
            rows={2}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
          />

          <div>
            <Input
              placeholder="添加标签（回车确认）"
              value={tagInput}
              style={{ width: 300 }}
              onChange={(e) => setTagInput(e.target.value)}
              onPressEnter={addTag}
            />
            <div style={{ marginTop: 8 }}>
              {tags.map((t) => (
                <Tag key={t} closable onClose={() => setTags(tags.filter((x) => x !== t))}>
                  {t}
                </Tag>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 16, minHeight: 500 }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontWeight: 600, marginBottom: 8, color: '#666' }}>编辑 (Markdown)</div>
              <TextArea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                style={{ flex: 1, minHeight: 460, fontFamily: 'monospace' }}
              />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontWeight: 600, marginBottom: 8, color: '#666' }}>预览</div>
              <div style={{ flex: 1, minHeight: 460, border: '1px solid #d9d9d9', borderRadius: 6, padding: 12, overflow: 'auto', background: '#fff' }}>
                <ReactMarkdown>{content || '*暂无内容*'}</ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
