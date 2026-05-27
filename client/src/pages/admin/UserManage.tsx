import { useState, useEffect } from 'react';
import { Table, Tag, Button, Spin, message, Switch } from 'antd';
import http from '../../api/http';
import type { User } from '../../types';

export default function UserManage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = () => {
    http.get('/admin/users').then((res) => {
      setUsers(res.data.data);
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const toggleStatus = async (userId: string) => {
    try {
      await http.put(`/admin/users/${userId}/status`);
      message.success('状态已更新');
      fetchUsers();
    } catch {
      message.error('操作失败');
    }
  };

  const columns = [
    { title: '昵称', dataIndex: 'nickname', key: 'nickname' },
    { title: '邮箱', dataIndex: 'email', key: 'email' },
    { title: '角色', dataIndex: 'role', key: 'role', render: (role: string) => <Tag>{role}</Tag> },
    { title: '状态', dataIndex: 'is_active', key: 'is_active', render: (active: boolean, record: User) => (
      <Switch checked={active} onChange={() => toggleStatus(record.id)} />
    )},
    { title: '注册时间', dataIndex: 'created_at', key: 'created_at', render: (d: string) => new Date(d).toLocaleDateString() },
  ];

  if (loading) return <Spin />;
  return <Table dataSource={users} columns={columns} rowKey="id" />;
}
