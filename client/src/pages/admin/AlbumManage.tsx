import { useState, useEffect } from 'react';
import { Table, Tag, Button, Spin, message, Popconfirm } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import http from '../../api/http';
import type { Album } from '../../types';

export default function AlbumManage() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchData = (p: number) => {
    setLoading(true);
    http.get('/admin/albums', { params: { page: p, limit: 20 } }).then((res) => {
      setAlbums(res.data.data);
      setTotal(res.data.total);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(page); }, [page]);

  const handleDelete = async (id: string) => {
    await http.delete(`/admin/albums/${id}`);
    message.success('相册已删除');
    fetchData(page);
  };

  const columns = [
    { title: '相册名', dataIndex: 'name', key: 'name', ellipsis: true, width: 200 },
    { title: '创建者', dataIndex: ['user', 'nickname'], key: 'user', width: 100 },
    {
      title: '可见性', dataIndex: 'visibility', key: 'visibility', width: 80,
      render: (v: string) => <Tag color={v === 'public' ? 'green' : 'default'}>{v === 'public' ? '公开' : '私有'}</Tag>,
    },
    { title: '照片数', dataIndex: 'images', key: 'images', width: 80,
      render: (imgs: string[]) => imgs?.length || 0 },
    { title: '点赞', dataIndex: 'like_count', key: 'like_count', width: 60 },
    { title: '时间', dataIndex: 'created_at', key: 'created_at', width: 120,
      render: (d: string) => new Date(d).toLocaleDateString() },
    {
      title: '操作', key: 'action', width: 80,
      render: (_: any, record: Album) => (
        <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)}>
          <Button danger size="small" icon={<DeleteOutlined />}>删除</Button>
        </Popconfirm>
      ),
    },
  ];

  if (loading && albums.length === 0) return <Spin />;
  return (
    <Table
      dataSource={albums}
      columns={columns}
      rowKey="id"
      pagination={{ current: page, total, pageSize: 20, onChange: setPage }}
      scroll={{ x: 800 }}
    />
  );
}
