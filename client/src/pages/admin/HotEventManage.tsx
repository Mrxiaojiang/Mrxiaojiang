import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Switch, Spin, message, Space } from 'antd';
import http from '../../api/http';
import type { HotEvent } from '../../types';

export default function HotEventManage() {
  const [events, setEvents] = useState<HotEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form] = Form.useForm();

  const fetchEvents = () => {
    http.get('/admin/hot-events').then((res) => {
      setEvents(res.data);
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (record: HotEvent) => {
    setEditingId(record.id);
    form.setFieldsValue(record);
    setModalOpen(true);
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    try {
      if (editingId) {
        await http.put(`/admin/hot-events/${editingId}`, values);
      } else {
        await http.post('/admin/hot-events', values);
      }
      message.success('保存成功');
      setModalOpen(false);
      fetchEvents();
    } catch {
      message.error('操作失败');
    }
  };

  const handleDelete = async (id: string) => {
    await http.delete(`/admin/hot-events/${id}`);
    message.success('已删除');
    fetchEvents();
  };

  const columns = [
    { title: '标题', dataIndex: 'title', key: 'title' },
    { title: '权重', dataIndex: 'sort_weight', key: 'sort_weight' },
    { title: '启用', dataIndex: 'is_active', key: 'is_active', render: (v: boolean) => v ? '是' : '否' },
    {
      title: '操作', key: 'action',
      render: (_: any, record: HotEvent) => (
        <Space>
          <Button size="small" onClick={() => openEdit(record)}>编辑</Button>
          <Button size="small" danger onClick={() => handleDelete(record.id)}>删除</Button>
        </Space>
      ),
    },
  ];

  if (loading) return <Spin />;
  return (
    <div>
      <Button type="primary" onClick={openCreate} style={{ marginBottom: 16 }}>新增热点</Button>
      <Table dataSource={events} columns={columns} rowKey="id" />
      <Modal open={modalOpen} onOk={handleSave} onCancel={() => setModalOpen(false)} title={editingId ? '编辑热点' : '新增热点'}>
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="标题" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="link" label="链接"><Input /></Form.Item>
          <Form.Item name="summary" label="摘要"><Input.TextArea rows={3} /></Form.Item>
          <Form.Item name="sort_weight" label="排序权重"><Input type="number" /></Form.Item>
          <Form.Item name="is_active" label="启用" valuePropName="checked"><Switch /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
