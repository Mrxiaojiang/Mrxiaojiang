import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, Form, Input, Button, message, Typography, InputNumber, Switch, Space, DatePicker, Upload, Spin } from 'antd';
import { ArrowLeftOutlined, UploadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import MDEditor from '@uiw/react-md-editor';
import { travelApi } from '../../api/travel';
import { albumApi } from '../../api/album';

const { Title } = Typography;

export default function TravelPlanForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState<string>('');
  const [initialLoading, setInitialLoading] = useState(!!id);

  const isEdit = !!id;

  useEffect(() => {
    if (!id) return;
    travelApi.getPlan(id).then((res) => {
      const plan = res.data;
      form.setFieldsValue({
        title: plan.title,
        destination: plan.destination,
        dateRange: plan.start_date ? [dayjs(plan.start_date), dayjs(plan.end_date)] : undefined,
        budget: plan.budget,
        is_public: plan.is_public,
      });
      setContent(plan.notes || '');
    }).catch(() => {
      message.error('加载计划失败');
      navigate('/travel/plans');
    }).finally(() => setInitialLoading(false));
  }, [id, form, navigate]);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const data = {
        title: values.title,
        destination: values.destination,
        start_date: values.dateRange?.[0]?.format('YYYY-MM-DD'),
        end_date: values.dateRange?.[1]?.format('YYYY-MM-DD'),
        budget: values.budget,
        notes: content,
        is_public: values.is_public ?? true,
      };

      if (isEdit && id) {
        await travelApi.updatePlan(id, data);
        message.success('更新成功');
      } else {
        await travelApi.createPlan(data);
        message.success('创建成功');
      }
      navigate('/travel/plans');
    } catch {
      message.error(isEdit ? '更新失败，请稍后重试' : '创建失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    try {
      const res = await albumApi.uploadImage(file);
      const url = res.data.url || res.data;
      setContent(prev => prev + `\n![图片](${url})\n`);
    } catch {
      message.error('图片上传失败');
    }
    return false;
  };

  if (initialLoading) {
    return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <Space style={{ marginBottom: 16, cursor: 'pointer' }} onClick={() => navigate(-1)}>
        <ArrowLeftOutlined /> 返回
      </Space>
      <Title level={3}>{isEdit ? '编辑旅游计划' : '创建旅游计划'}</Title>

      <Card>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="title" label="计划名称" rules={[{ required: true, message: '请输入计划名称' }]}>
            <Input placeholder="例如：北京三日游" size="large" />
          </Form.Item>

          <Form.Item name="destination" label="目的地" rules={[{ required: true, message: '请输入目的地' }]}>
            <Input placeholder="例如：北京" size="large" />
          </Form.Item>

          <Form.Item name="dateRange" label="出行日期">
            <DatePicker.RangePicker style={{ width: '100%' }} size="large" />
          </Form.Item>

          <Form.Item name="budget" label="预算（元）">
            <InputNumber min={0} style={{ width: '100%' }} size="large" placeholder="预估总预算" />
          </Form.Item>

          <Form.Item label="行程详情（支持 Markdown 格式）" style={{ marginBottom: 8 }}>
            <Space style={{ marginBottom: 8 }}>
              <Upload beforeUpload={handleImageUpload} accept="image/*" showUploadList={false}>
                <Button icon={<UploadOutlined />} size="small">上传图片</Button>
              </Upload>
            </Space>
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

          <Form.Item name="is_public" label="公开计划" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>

          <Button type="primary" htmlType="submit" loading={loading} block size="large">
            {isEdit ? '保存修改' : '创建'}
          </Button>
        </Form>
      </Card>
    </div>
  );
}
