import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, Form, Input, Button, Tabs, message, Typography } from 'antd';
import { MailOutlined, LockOutlined } from '@ant-design/icons';
import { authApi } from '../../api/auth';
import { useAuthStore } from '../../store/authStore';

const { Title } = Typography;

export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [codeSending, setCodeSending] = useState(false);

  const onPasswordLogin = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      const res = await authApi.loginWithPassword(values);
      setAuth(res.data.user, res.data.accessToken, res.data.refreshToken);
      message.success('登录成功');
      navigate('/');
    } catch (err: any) {
      message.error(err.response?.data?.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  const [codeForm] = Form.useForm();

  const onCodeLogin = async (values: { email: string; code: string }) => {
    setLoading(true);
    try {
      const res = await authApi.loginWithCode(values);
      setAuth(res.data.user, res.data.accessToken, res.data.refreshToken);
      message.success('登录成功');
      navigate('/');
    } catch (err: any) {
      message.error(err.response?.data?.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  const sendCode = async (email: string) => {
    if (!email) { message.warning('请输入邮箱'); return; }
    setCodeSending(true);
    try {
      await authApi.sendCode(email);
      message.success('验证码已发送');
    } catch (err: any) {
      message.error(err.response?.data?.message || '发送失败');
    } finally {
      setCodeSending(false);
    }
  };

  const handleSendCode = () => {
    const email = codeForm.getFieldValue('email');
    sendCode(email);
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <Card style={{ width: 420 }}>
        <Title level={3} style={{ textAlign: 'center', marginBottom: 24 }}>登录</Title>
        <Tabs
          centered
          items={[
            {
              key: 'password',
              label: '密码登录',
              children: (
                <Form onFinish={onPasswordLogin} layout="vertical">
                  <Form.Item name="email" rules={[{ required: true, type: 'email', message: '请输入有效邮箱' }]}>
                    <Input prefix={<MailOutlined />} placeholder="邮箱" />
                  </Form.Item>
                  <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
                    <Input.Password prefix={<LockOutlined />} placeholder="密码" />
                  </Form.Item>
                  <Button type="primary" htmlType="submit" loading={loading} block>登录</Button>
                  <div style={{ textAlign: 'center', marginTop: 12 }}>
                    <Link to="/register">没有账号？去注册</Link>
                  </div>
                </Form>
              ),
            },
            {
              key: 'code',
              label: '验证码登录',
              children: (
                <Form form={codeForm} onFinish={onCodeLogin} layout="vertical">
                  <Form.Item name="email" rules={[{ required: true, type: 'email', message: '请输入有效邮箱' }]}>
                    <Input prefix={<MailOutlined />} placeholder="邮箱" />
                  </Form.Item>
                  <Form.Item>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Form.Item name="code" noStyle rules={[{ required: true, len: 6, message: '请输入 6 位验证码' }]}>
                        <Input placeholder="验证码" maxLength={6} style={{ flex: 1 }} />
                      </Form.Item>
                      <Button onClick={handleSendCode} loading={codeSending}>
                        获取验证码
                      </Button>
                    </div>
                  </Form.Item>
                  <Button type="primary" htmlType="submit" loading={loading} block>登录</Button>
                  <div style={{ textAlign: 'center', marginTop: 12 }}>
                    <Link to="/register">没有账号？去注册</Link>
                  </div>
                </Form>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
