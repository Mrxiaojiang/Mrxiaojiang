import { useState, useEffect } from 'react';
import { List, Tag, Typography, Spin, Button, Input, Space, Popconfirm, message } from 'antd';
import {
  MessageOutlined, HeartOutlined, PlusOutlined,
  EditOutlined, DeleteOutlined, SearchOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { communityApi } from '../../api/community';
import { useAuthStore } from '../../store/authStore';
import type { CommunityPost } from '../../types';

const { Paragraph } = Typography;

export default function CommunityPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [allTags, setAllTags] = useState<string[]>([]);
  const [myPostIds, setMyPostIds] = useState<Set<string>>(new Set());
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    communityApi.posts(1, 20, keyword || undefined, selectedTag || undefined).then((res) => {
      setPosts(res.data.data);
    }).finally(() => setLoading(false));
  }, [keyword, selectedTag]);

  useEffect(() => {
    communityApi.getTags().then((res) => {
      if (res.data) setAllTags(res.data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    communityApi.myPosts().then((res) => {
      if (res.data) setMyPostIds(new Set(res.data.map((p) => p.id)));
    }).catch(() => {});
  }, [isAuthenticated]);

  const handleDelete = async (id: string) => {
    try {
      await communityApi.deletePost(id);
      message.success('帖子已删除');
      setPosts((prev) => prev.filter((p) => p.id !== id));
    } catch {
      message.error('删除失败');
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <Spin size="large" />
    </div>
  );

  return (
    <div>
      {/* ── Header ──────────────────────────── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 24, flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <div className="section-title" style={{ marginBottom: 4 }}>交流社区</div>
          <div className="section-subtitle" style={{ marginTop: 0 }}>分享旅行故事，交流旅行经验</div>
        </div>
        <Space>
          <Input.Search
            placeholder="搜索帖子..."
            allowClear
            onSearch={(v) => setKeyword(v)}
            style={{ width: 220 }}
            size="middle"
          />
          {isAuthenticated && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/community/new')}
              style={{ borderRadius: 8 }}
            >
              发帖
            </Button>
          )}
        </Space>
      </div>

      {/* ── Tags ────────────────────────────── */}
      {allTags.length > 0 && (
        <div style={{ marginBottom: 20, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <Tag
            style={{
              cursor: 'pointer', borderRadius: 6, padding: '2px 12px',
              fontSize: 13, border: 'none',
              background: !selectedTag ? 'var(--color-accent)' : 'var(--color-bg-alt)',
              color: !selectedTag ? '#fff' : 'var(--color-text-secondary)',
            }}
            onClick={() => setSelectedTag('')}
          >
            全部
          </Tag>
          {allTags.map((tag) => (
            <Tag
              key={tag}
              style={{
                cursor: 'pointer', borderRadius: 6, padding: '2px 12px',
                fontSize: 13, border: 'none',
                background: selectedTag === tag ? 'var(--color-accent)' : 'var(--color-bg-alt)',
                color: selectedTag === tag ? '#fff' : 'var(--color-text-secondary)',
              }}
              onClick={() => setSelectedTag(tag === selectedTag ? '' : tag)}
            >
              {tag}
            </Tag>
          ))}
        </div>
      )}

      {/* ── Posts ───────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {posts.map((post) => {
          const isOwner = myPostIds.has(post.id);
          return (
            <div
              key={post.id}
              onClick={() => navigate(`/community/${post.id}`)}
              style={{
                background: '#fff', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border-light)',
                padding: '20px 24px', cursor: 'pointer',
                transition: 'all var(--transition-fast)',
                boxShadow: 'var(--shadow-card)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                e.currentTarget.style.borderColor = 'var(--color-accent)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'var(--shadow-card)';
                e.currentTarget.style.borderColor = 'var(--color-border-light)';
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
                {post.title}
                {post.tags?.map((tag) => (
                  <Tag key={tag} style={{
                    marginLeft: 8, fontSize: 11, border: 'none',
                    background: 'var(--color-accent-bg)', color: 'var(--color-accent)',
                    borderRadius: 4,
                  }}>{tag}</Tag>
                ))}
              </div>

              <Paragraph
                ellipsis={{ rows: 2 }}
                style={{ color: 'var(--color-text-secondary)', fontSize: 14, marginBottom: 12 }}
              >
                {post.content}
              </Paragraph>

              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', fontSize: 13, color: 'var(--color-text-tertiary)',
              }}>
                <span>{post.author?.nickname} · {new Date(post.created_at).toLocaleDateString()}</span>
                <Space size="middle">
                  <span><HeartOutlined style={{ marginRight: 4 }} />{post.like_count}</span>
                  <span><MessageOutlined style={{ marginRight: 4 }} />{post.comment_count}</span>
                  {isOwner && (
                    <>
                      <EditOutlined
                        onClick={(e) => { e.stopPropagation(); navigate(`/community/${post.id}/edit`); }}
                        style={{ cursor: 'pointer' }}
                      />
                      <Popconfirm title="确定删除此帖子？" onConfirm={(e) => { e?.stopPropagation?.(); handleDelete(post.id); }}>
                        <DeleteOutlined
                          onClick={(e) => e.stopPropagation()}
                          style={{ cursor: 'pointer' }}
                        />
                      </Popconfirm>
                    </>
                  )}
                </Space>
              </div>
            </div>
          );
        })}
      </div>

      {posts.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-text-tertiary)' }}>
          暂无帖子
        </div>
      )}
    </div>
  );
}
