import { useState, useEffect } from 'react';
import { Table, Button, Spin, message, Popconfirm } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import http from '../../api/http';
import type { CommunityPost } from '../../types';

export default function PostManage() {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchData = (p: number) => {
    setLoading(true);
    http.get('/admin/posts', { params: { page: p, limit: 20 } }).then((res) => {
      setPosts(res.data.data);
      setTotal(res.data.total);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(page); }, [page]);

  const handleDelete = async (id: string) => {
    await http.delete(`/admin/posts/${id}`);
    message.success('帖子已删除');
    fetchData(page);
  };

  const columns = [
    { title: '标题', dataIndex: 'title', key: 'title', ellipsis: true, width: 350 },
    { title: '作者', dataIndex: ['author', 'nickname'], key: 'author', width: 100 },
    { title: '评论', dataIndex: 'comment_count', key: 'comment_count', width: 60 },
    { title: '点赞', dataIndex: 'like_count', key: 'like_count', width: 60 },
    { title: '时间', dataIndex: 'created_at', key: 'created_at', width: 120,
      render: (d: string) => new Date(d).toLocaleDateString() },
    {
      title: '操作', key: 'action', width: 80,
      render: (_: any, record: CommunityPost) => (
        <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)}>
          <Button danger size="small" icon={<DeleteOutlined />}>删除</Button>
        </Popconfirm>
      ),
    },
  ];

  if (loading && posts.length === 0) return <Spin />;
  return (
    <Table
      dataSource={posts}
      columns={columns}
      rowKey="id"
      pagination={{ current: page, total, pageSize: 20, onChange: setPage }}
      scroll={{ x: 800 }}
    />
  );
}
