import { useState, useEffect } from 'react';
import { Table, Tag, Button, Space, Switch, Spin, message, Popconfirm } from 'antd';
import { PushpinOutlined, StarOutlined, DeleteOutlined } from '@ant-design/icons';
import http from '../../api/http';
import type { Blog } from '../../types';

export default function BlogManage() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchData = (p: number) => {
    setLoading(true);
    http.get('/admin/blogs', { params: { page: p, limit: 20 } }).then((res) => {
      setBlogs(res.data.data);
      setTotal(res.data.total);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(page); }, [page]);

  const togglePin = async (id: string) => {
    await http.put(`/admin/blogs/${id}/pin`);
    message.success('置顶状态已更新');
    fetchData(page);
  };

  const toggleFeatured = async (id: string) => {
    await http.put(`/admin/blogs/${id}/feature`);
    message.success('推荐状态已更新');
    fetchData(page);
  };

  const handleDelete = async (id: string) => {
    await http.delete(`/admin/blogs/${id}`);
    message.success('博客已删除');
    fetchData(page);
  };

  const columns = [
    { title: '标题', dataIndex: 'title', key: 'title', ellipsis: true, width: 300 },
    { title: '作者', dataIndex: ['author', 'nickname'], key: 'author', width: 100 },
    {
      title: '置顶', key: 'is_pinned', width: 80,
      render: (_: any, record: Blog) => (
        <Switch
          checked={record.is_pinned}
          onChange={() => togglePin(record.id)}
          checkedChildren={<PushpinOutlined />}
          unCheckedChildren={<PushpinOutlined />}
        />
      ),
    },
    {
      title: '推荐', key: 'is_featured', width: 80,
      render: (_: any, record: Blog) => (
        <Switch
          checked={record.is_featured}
          onChange={() => toggleFeatured(record.id)}
          checkedChildren={<StarOutlined />}
          unCheckedChildren={<StarOutlined />}
        />
      ),
    },
    { title: '阅读', dataIndex: 'view_count', key: 'view_count', width: 60 },
    { title: '发布', dataIndex: 'published_at', key: 'published_at', width: 120,
      render: (d: string) => d ? new Date(d).toLocaleDateString() : '未发布' },
    {
      title: '操作', key: 'action', width: 80,
      render: (_: any, record: Blog) => (
        <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)}>
          <Button danger size="small" icon={<DeleteOutlined />}>删除</Button>
        </Popconfirm>
      ),
    },
  ];

  if (loading && blogs.length === 0) return <Spin />;
  return (
    <Table
      dataSource={blogs}
      columns={columns}
      rowKey="id"
      pagination={{ current: page, total, pageSize: 20, onChange: setPage }}
      scroll={{ x: 800 }}
    />
  );
}
