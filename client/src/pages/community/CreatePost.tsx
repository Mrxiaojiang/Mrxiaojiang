import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, Form, Input, Button, message, Typography, Select, Spin } from 'antd';
import { communityApi } from '../../api/community';

const { Title } = Typography;
const { TextArea } = Input;

export default function CreatePostPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!id);
  const [existingTags, setExistingTags] = useState<string[]>([]);

  const isEdit = !!id;

  useEffect(() => {
    communityApi.getTags().then((res) => {
      if (res.data) setExistingTags(res.data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!id) return;
    communityApi.postDetail(id).then((res) => {
      form.setFieldsValue({
        title: res.data.title,
        content: res.data.content,
        tags: res.data.tags || [],
      });
    }).catch(() => {
      message.error('加载帖子失败');
      navigate('/community');
    }).finally(() => setFetching(false));
  }, [id]);

  const onFinish = async (values: { title: string; content: string; tags: string[] }) => {
    setLoading(true);
    try {
      if (isEdit && id) {
        await communityApi.updatePost(id, values);
        message.success('编辑成功');
        navigate(`/community/${id}`);
      } else {
        const res = await communityApi.createPost(values);
        message.success('发布成功');
        navigate(`/community/${res.data.id}`);
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || (isEdit ? '编辑失败' : '发布失败'));
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <Title level={3}>{isEdit ? '✏️ 编辑帖子' : '📝 发布帖子'}</Title>
      <Card>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder="帖子标题" maxLength={200} />
          </Form.Item>
          <Form.Item name="tags" label="标签">
            <Select
              mode="tags"
              placeholder="输入或选择标签"
              showSearch
              filterOption={(input, option) =>
                (option?.label as string || '').toLowerCase().includes(input.toLowerCase())
              }
              options={existingTags.map((t) => ({ label: t, value: t }))}
            />
          </Form.Item>
          <Form.Item name="content" label="内容" rules={[{ required: true, message: '请输入内容' }]}>
            <TextArea rows={8} placeholder="写下你想分享的内容..." />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block size="large">
            {isEdit ? '保存修改' : '发布帖子'}
          </Button>
        </Form>
      </Card>
    </div>
  );
}
