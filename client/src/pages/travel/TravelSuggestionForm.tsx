import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, Form, Input, Button, message, Typography, Select, Space, Upload, Spin } from 'antd';
import { ArrowLeftOutlined, UploadOutlined } from '@ant-design/icons';
import MDEditor from '@uiw/react-md-editor';
import { travelApi } from '../../api/travel';
import { albumApi } from '../../api/album';

const { Title } = Typography;

const categoryOptions = [
  { value: 'scenic', label: '景点推荐' },
  { value: 'food', label: '美食推荐' },
  { value: 'transport', label: '交通建议' },
  { value: 'accommodation', label: '住宿推荐' },
  { value: 'tips', label: '避坑指南' },
];

export default function TravelSuggestionForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState<string>('');
  const [initialLoading, setInitialLoading] = useState(!!id);

  const isEdit = !!id;

  useEffect(() => {
    if (!id) return;
    travelApi.getSuggestion(id).then((res) => {
      const sug = res.data;
      form.setFieldsValue({
        title: sug.title,
        destination: sug.destination,
        category: sug.category,
        tags: (sug.tags || []).join(', '),
      });
      setContent(sug.content || '');
    }).catch(() => {
      message.error('加载建议失败');
      navigate('/travel/suggestions');
    }).finally(() => setInitialLoading(false));
  }, [id, form, navigate]);

  const onFinish = async (values: { title: string; destination: string; category: string; tags: string }) => {
    if (!content.trim()) { message.warning('请输入内容'); return; }
    setLoading(true);
    try {
      const tags = values.tags
        ? values.tags.split(/[,，]/).map((t) => t.trim()).filter(Boolean)
        : [];
      const data = { ...values, content, tags };

      if (isEdit && id) {
        await travelApi.updateSuggestion(id, data);
        message.success('更新成功');
      } else {
        await travelApi.createSuggestion(data);
        message.success('发布成功');
      }
      navigate('/travel/suggestions');
    } catch {
      message.error(isEdit ? '更新失败，请稍后重试' : '发布失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const insertImage = async (file: File) => {
    try {
      const res = await albumApi.uploadImage(file);
      const url = res.data.url;
      setContent((prev) => prev + `\n![图片](${url})\n`);
    } catch {
      message.error('图片上传失败');
    }
  };

  if (initialLoading) {
    return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <Space style={{ marginBottom: 16, cursor: 'pointer' }} onClick={() => navigate(-1)}>
        <ArrowLeftOutlined /> 返回
      </Space>
      <Title level={3}>{isEdit ? '编辑旅游建议' : '发布旅游建议'}</Title>

      <Card>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder="例如：北京三日游攻略" size="large" />
          </Form.Item>

          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item name="destination" label="目的地" rules={[{ required: true, message: '请输入目的地' }]} style={{ flex: 1 }}>
              <Input placeholder="例如：北京" size="large" />
            </Form.Item>
            <Form.Item name="category" label="分类" rules={[{ required: true, message: '请选择分类' }]} style={{ flex: 1 }}>
              <Select placeholder="选择分类" size="large" options={categoryOptions} />
            </Form.Item>
          </div>

          <Form.Item label="内容（支持 Markdown 格式）" required style={{ marginBottom: 8 }}>
            <div data-color-mode="light">
              <MDEditor
                value={content}
                onChange={(val) => setContent(val || '')}
                height={400}
                preview="live"
                visibleDragbar={false}
              />
            </div>
          </Form.Item>

          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>插入图片：</span>
            <Upload
              accept="image/*"
              showUploadList={false}
              beforeUpload={(file) => { insertImage(file); return false; }}
            >
              <Button icon={<UploadOutlined />} size="small">选择图片</Button>
            </Upload>
          </div>

          <Form.Item name="tags" label="标签（可选，用逗号分隔）">
            <Input placeholder="例如：美食, 性价比, 周末游" />
          </Form.Item>

          <Button type="primary" htmlType="submit" loading={loading} block size="large">
            {isEdit ? '保存修改' : '发布'}
          </Button>
        </Form>
      </Card>
    </div>
  );
}
