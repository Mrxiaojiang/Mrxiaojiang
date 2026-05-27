import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Form, Input, Button, message, Typography, Select } from 'antd';
import { communityApi } from '../../api/community';

const { Title } = Typography;
const { TextArea } = Input;

export default function CreatePostPage() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: { title: string; content: string; tags: string[] }) => {
    setLoading(true);
    try {
      const res = await communityApi.createPost(values);
      message.success('发布成功');
      navigate(`/community/${res.data.id}`);
    } catch (err: any) {
      message.error(err.response?.data?.message || '发布失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <Title level={3}>📝 发布帖子</Title>
      <Card>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder="帖子标题" maxLength={200} />
          </Form.Item>
          <Form.Item name="tags" label="标签">
            <Select mode="tags" placeholder="输入标签后回车" />
          </Form.Item>
          <Form.Item name="content" label="内容" rules={[{ required: true, message: '请输入内容' }]}>
            <TextArea rows={8} placeholder="写下你想分享的内容..." />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block size="large">
            发布帖子
          </Button>
        </Form>
      </Card>
    </div>
  );
}
