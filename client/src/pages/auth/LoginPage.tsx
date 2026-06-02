import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, Form, Input, Button, Tabs, message, Typography } from 'antd';
import { MailOutlined, LockOutlined } from '@ant-design/icons';
import { authApi } from '../../api/auth';
import { useAuthStore } from '../../store/authStore';

const { Title, Text } = Typography;

export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [codeSending, setCodeSending] = useState(false);
  const [passwordForm] = Form.useForm();

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

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 200px)', padding: 24 }}>
      <div style={{ width: 400, maxWidth: '100%' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            display: 'inline-flex', width: 48, height: 48,
            background: 'var(--color-accent)', borderRadius: 14,
            alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 22, marginBottom: 16,
          }}>旅</div>
          <Title level={3} style={{ margin: 0, fontWeight: 700 }}>欢迎回来</Title>
          <Text type="secondary" style={{ marginTop: 8, display: 'block' }}>登录你的旅途博客账号</Text>
        </div>

        <Card style={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-light)', boxShadow: 'var(--shadow-md)', padding: 0 }}>
          <Tabs
            centered
            items={[
              {
                key: 'password',
                label: '密码登录',
                children: (
                  <Form form={passwordForm} layout="vertical" onFinish={onPasswordLogin} style={{ marginTop: 8 }}>
                    <Form.Item name="email" label="邮箱" rules={[{ required: true, type: 'email', message: '请输入有效邮箱' }]}>
                      <Input prefix={<MailOutlined />} placeholder="your@email.com" size="large" />
                    </Form.Item>
                    <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
                      <Input.Password prefix={<LockOutlined />} placeholder="••••••••" size="large" />
                    </Form.Item>
                    <Form.Item>
                      <Button type="primary" htmlType="submit" loading={loading} block size="large" style={{ borderRadius: 8 }}>
                        登录
                      </Button>
                    </Form.Item>
                    <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--color-text-tertiary)' }}>
                      还没有账号？<Link to="/register" style={{ color: 'var(--color-accent)' }}>立即注册</Link>
                    </div>
                  </Form>
                ),
              },
              {
                key: 'code',
                label: '验证码登录',
                children: (
                  <LoginCodeForm
                    loading={loading}
                    setLoading={setLoading}
                    codeSending={codeSending}
                    setCodeSending={setCodeSending}
                    navigate={navigate}
                    setAuth={setAuth}
                  />
                ),
              },
            ]}
            style={{ padding: '0 24px' }}
          />
        </Card>
      </div>
    </div>
  );
}

function LoginCodeForm({
  loading, setLoading, codeSending, setCodeSending, navigate, setAuth,
}: {
  loading: boolean;
  setLoading: (v: boolean) => void;
  codeSending: boolean;
  setCodeSending: (v: boolean) => void;
  navigate: (path: string) => void;
  setAuth: (user: any, accessToken: string, refreshToken: string) => void;
}) {
  const navigateFn = navigate;
  const setAuthFn = setAuth;
  const [form] = Form.useForm();

  const sendCode = async () => {
    const email = form.getFieldValue('email') as string;
    if (!email) { message.warning('请先输入邮箱'); return; }
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

  const onCodeLogin = async (values: { email: string; code: string }) => {
    setLoading(true);
    try {
      const res = await authApi.loginWithCode(values);
      setAuthFn(res.data.user, res.data.accessToken, res.data.refreshToken);
      message.success('登录成功');
      navigateFn('/');
    } catch (err: any) {
      message.error(err.response?.data?.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form form={form} layout="vertical" onFinish={onCodeLogin} style={{ marginTop: 8 }}>
      <Form.Item name="email" label="邮箱" rules={[{ required: true, type: 'email', message: '请输入有效邮箱' }]}>
        <Input prefix={<MailOutlined />} placeholder="your@email.com" size="large" />
      </Form.Item>
      <Form.Item name="code" label="验证码">
        <div style={{ display: 'flex', gap: 8 }}>
          <Input placeholder="输入验证码" size="large" style={{ flex: 1 }} />
          <Button onClick={sendCode} loading={codeSending} size="large" style={{ borderRadius: 8, whiteSpace: 'nowrap' }}>
            {codeSending ? '发送中' : '获取验证码'}
          </Button>
        </div>
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading} block size="large" style={{ borderRadius: 8 }}>
          登录
        </Button>
      </Form.Item>
      <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--color-text-tertiary)' }}>
        还没有账号？<Link to="/register" style={{ color: 'var(--color-accent)' }}>立即注册</Link>
      </div>
    </Form>
  );
}
