import { useState, useRef } from 'react';
import { Card, Typography, Avatar, Descriptions, Button, Input, message } from 'antd';
import { UserOutlined, EditOutlined, SaveOutlined, CloseOutlined, CameraOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import http from '../../api/http';

const { Title } = Typography;
const { TextArea } = Input;

export default function ProfilePage() {
  const { user, logout, updateUser } = useAuthStore();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nickname, setNickname] = useState(user?.nickname || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!user) {
    navigate('/login');
    return null;
  }

  const handleAvatarUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await http.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setAvatarUrl(res.data.url);
      message.success('头像已更新');
    } catch {
      message.error('头像上传失败');
    }
  };

  const handleSave = async () => {
    if (!nickname.trim()) {
      message.warning('昵称不能为空');
      return;
    }
    setSaving(true);
    try {
      const res = await http.put('/users/me', {
        nickname: nickname.trim(),
        bio: bio.trim(),
        avatar: avatarUrl,
      });
      updateUser(res.data);
      message.success('资料已更新');
      setEditing(false);
    } catch {
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setNickname(user.nickname);
    setBio(user.bio || '');
    setAvatarUrl(user.avatar || '');
    setEditing(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <Card>
        {/* 头像区域 */}
        <div style={{ textAlign: 'center', marginBottom: 24, position: 'relative' }}>
          <div style={{ display: 'inline-block', position: 'relative' }}>
            <Avatar
              size={96}
              src={avatarUrl}
              icon={!avatarUrl ? <UserOutlined /> : undefined}
              style={{ background: 'var(--color-accent)', border: '3px solid var(--color-border-light)' }}
            />
            {editing && (
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  position: 'absolute', bottom: 0, right: 0,
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'var(--color-accent)', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', border: '2px solid #fff',
                  fontSize: 14,
                }}
              >
                <CameraOutlined />
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleAvatarUpload(file);
              }}
            />
          </div>
          {editing ? (
            <Input
              size="small"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              style={{ marginTop: 12, textAlign: 'center', maxWidth: 240, fontSize: 16, fontWeight: 600 }}
              placeholder="输入昵称"
            />
          ) : (
            <Title level={3} style={{ marginTop: 12 }}>{user.nickname}</Title>
          )}
        </div>

        {/* 信息区域 */}
        {editing ? (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 8 }}>个人简介</div>
            <TextArea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="介绍一下自己..."
              rows={4}
              maxLength={500}
              showCount
            />
          </div>
        ) : (
          <Descriptions column={1} bordered>
            <Descriptions.Item label="邮箱">{user.email}</Descriptions.Item>
            <Descriptions.Item label="角色">{user.role === 'admin' ? '管理员' : '用户'}</Descriptions.Item>
            <Descriptions.Item label="个人简介">{user.bio || '未设置'}</Descriptions.Item>
            <Descriptions.Item label="注册时间">{user.created_at ? new Date(user.created_at).toLocaleDateString() : '未知'}</Descriptions.Item>
          </Descriptions>
        )}

        {/* 操作按钮 */}
        <div style={{ marginTop: 20, display: 'flex', gap: 12, justifyContent: 'center' }}>
          {editing ? (
            <>
              <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving}>
                保存
              </Button>
              <Button icon={<CloseOutlined />} onClick={handleCancel}>
                取消
              </Button>
            </>
          ) : (
            <>
              <Button type="primary" icon={<EditOutlined />} onClick={() => setEditing(true)}>
                编辑资料
              </Button>
              <Button danger onClick={handleLogout}>退出登录</Button>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
