import { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Spin, message, Switch, Typography } from 'antd';
import http from '../../api/http';

const { Title } = Typography;

const defaultSettings = {
  site_name: '旅途博客',
  site_description: '记录每一次旅行',
  site_logo: '',
  registration_enabled: 'true',
  about_us: '',
  contact_email: '',
};

export default function Settings() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    http.get('/admin/settings').then((res) => {
      const settings = { ...defaultSettings, ...res.data };
      form.setFieldsValue(settings);
    }).finally(() => setLoading(false));
  }, []);

  const onFinish = async (values: any) => {
    setSaving(true);
    try {
      await http.put('/admin/settings', values);
      message.success('设置已保存');
    } catch {
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spin style={{ display: 'block', margin: '40px auto' }} />;

  return (
    <Card title="系统设置" style={{ maxWidth: 600 }}>
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item name="site_name" label="站点名称" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="site_description" label="站点描述">
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item name="site_logo" label="Logo URL">
          <Input placeholder="可选" />
        </Form.Item>
        <Form.Item name="registration_enabled" label="开放注册" valuePropName="checked">
          <Switch checkedChildren="开" unCheckedChildren="关" />
        </Form.Item>
        <Form.Item name="contact_email" label="联系邮箱">
          <Input />
        </Form.Item>
        <Form.Item name="about_us" label="关于我们">
          <Input.TextArea rows={4} />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={saving} block>
          保存设置
        </Button>
      </Form>
    </Card>
  );
}
