import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Form, Input, Button, message, Typography, Select, InputNumber, Switch, Space, DatePicker } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { travelApi } from '../../api/travel';

const { Title } = Typography;
const { TextArea } = Input;

export default function TravelPlanForm() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      await travelApi.createPlan({
        title: values.title,
        destination: values.destination,
        start_date: values.dateRange?.[0]?.format('YYYY-MM-DD'),
        end_date: values.dateRange?.[1]?.format('YYYY-MM-DD'),
        budget: values.budget,
        notes: values.notes,
        is_public: values.is_public ?? true,
      });
      message.success('创建成功');
      navigate('/travel/plans');
    } catch {
      message.error('创建失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <Space style={{ marginBottom: 16, cursor: 'pointer' }} onClick={() => navigate(-1)}>
        <ArrowLeftOutlined /> 返回
      </Space>
      <Title level={3}>创建旅游计划</Title>

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

          <Form.Item name="notes" label="备注">
            <TextArea rows={4} placeholder="行程备注、注意事项..." />
          </Form.Item>

          <Form.Item name="is_public" label="公开计划" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>

          <Button type="primary" htmlType="submit" loading={loading} block size="large">
            创建
          </Button>
        </Form>
      </Card>
    </div>
  );
}
