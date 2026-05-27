import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, Form, Input, Button, message, Typography } from 'antd';
import { MailOutlined, LockOutlined, UserOutlined } from '@ant-design/icons';
import { authApi } from '../../api/auth';
import { useAuthStore } from '../../store/authStore';

const { Title } = Typography;

export default function RegisterPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [codeSending, setCodeSending] = useState(false);
  const [form] = Form.useForm();

  const sendCode = async () => {
    const email = form.getFieldValue('email');
    if (!email) { message.warning('请先输入邮箱'); return; }
    setCodeSending(true);
    try {
      await authApi.sendCode(email);
      message.success('验证码已发送到邮箱');
    } catch (err: any) {
      message.error(err.response?.data?.message || '发送失败');
    } finally {
      setCodeSending(false);
    }
  };

  const onFinish = async (values: { email: string; code: string; nickname: string; password: string }) => {
    setLoading(true);
    try {
      const res = await authApi.register(values);
      setAuth(res.data.user, res.data.accessToken, res.data.refreshToken);
      message.success('注册成功');
      navigate('/');
    } catch (err: any) {
      message.error(err.response?.data?.message || '注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <Card style={{ width: 420 }}>
        <Title level={3} style={{ textAlign: 'center', marginBottom: 24 }}>注册</Title>
        <Form form={form} onFinish={onFinish} layout="vertical">
          <Form.Item name="email" rules={[{ required: true, type: 'email', message: '请输入有效邮箱' }]}>
            <Input prefix={<MailOutlined />} placeholder="邮箱" />
          </Form.Item>
          <Form.Item>
            <div style={{ display: 'flex', gap: 8 }}>
              <Form.Item name="code" noStyle rules={[{ required: true, len: 6, message: '请输入 6 位验证码' }]}>
                <Input placeholder="验证码" maxLength={6} style={{ flex: 1 }} />
              </Form.Item>
              <Button onClick={sendCode} loading={codeSending}>获取验证码</Button>
            </div>
          </Form.Item>
          <Form.Item name="nickname" rules={[{ required: true, min: 2, max: 50, message: '昵称 2-50 个字符' }]}>
            <Input prefix={<UserOutlined />} placeholder="昵称" />
          </Form.Item>
          <Form.Item name="password" rules={[
            { required: true, min: 8, message: '密码至少 8 个字符' },
            { pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, message: '需包含大小写字母和数字' },
          ]}>
            <Input.Password prefix={<LockOutlined />} placeholder="密码" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block>注册</Button>
          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <Link to="/login">已有账号？去登录</Link>
          </div>
        </Form>
      </Card>
    </div>
  );
}
