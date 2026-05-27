import { useState, useEffect } from 'react';
import { Table, Button, Spin, message, Popconfirm } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import http from '../../api/http';
import type { Comment } from '../../types';

export default function CommentManage() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchData = (p: number) => {
    setLoading(true);
    http.get('/admin/comments', { params: { page: p, limit: 20 } }).then((res) => {
      setComments(res.data.data);
      setTotal(res.data.total);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(page); }, [page]);

  const handleDelete = async (id: string) => {
    await http.delete(`/admin/comments/${id}`);
    message.success('评论已删除');
    fetchData(page);
  };

  const columns = [
    { title: '内容', dataIndex: 'content', key: 'content', ellipsis: true, width: 400 },
    { title: '作者', dataIndex: ['author', 'nickname'], key: 'author', width: 100 },
    { title: '点赞', dataIndex: 'like_count', key: 'like_count', width: 60 },
    { title: '时间', dataIndex: 'created_at', key: 'created_at', width: 120,
      render: (d: string) => new Date(d).toLocaleDateString() },
    {
      title: '操作', key: 'action', width: 80,
      render: (_: any, record: Comment) => (
        <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)}>
          <Button danger size="small" icon={<DeleteOutlined />}>删除</Button>
        </Popconfirm>
      ),
    },
  ];

  if (loading && comments.length === 0) return <Spin />;
  return (
    <Table
      dataSource={comments}
      columns={columns}
      rowKey="id"
      pagination={{ current: page, total, pageSize: 20, onChange: setPage }}
      scroll={{ x: 800 }}
    />
  );
}
