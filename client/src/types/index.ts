// ─── 用户 ───────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  nickname: string;
  avatar: string | null;
  bio: string | null;
  role: 'user' | 'admin';
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

// ─── 博客 ───────────────────────────────────────────────
export interface Blog {
  id: string;
  author_id: string;
  author: User;
  title: string;
  content: string;
  summary: string;
  cover_image: string;
  tags: string[];
  is_pinned: boolean;
  is_featured: boolean;
  is_published: boolean;
  view_count: number;
  like_count: number;
  comment_count: number;
  published_at: string;
  created_at: string;
}

// ─── 社区帖子 ───────────────────────────────────────────
export interface CommunityPost {
  id: string;
  author_id: string;
  author: User;
  title: string;
  content: string;
  tags: string[];
  images: string[];
  like_count: number;
  comment_count: number;
  view_count: number;
  is_pinned: boolean;
  created_at: string;
  comments?: Comment[];
}

// ─── 评论 ───────────────────────────────────────────────
export interface Comment {
  id: string;
  author_id: string;
  author: User;
  post_id: string;
  parent_id: string | null;
  content: string;
  like_count: number;
  created_at: string;
}

// ─── 相册 ───────────────────────────────────────────────
export interface Album {
  id: string;
  user_id: string;
  user: User;
  name: string;
  description: string;
  cover_url: string;
  images: string[];
  tags: string[];
  visibility: 'public' | 'private';
  like_count: number;
  view_count: number;
  created_at: string;
}

// ─── 旅游计划 ───────────────────────────────────────────
export interface TravelPlan {
  id: string;
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  user_id: string;
  user?: User;
  budget: number;
  itinerary: Record<string, any>;
  notes: string;
  is_public: boolean;
  like_count: number;
  created_at: string;
}

// ─── 旅游建议 ───────────────────────────────────────────
export interface TravelSuggestion {
  id: string;
  user_id: string;
  user: User;
  destination: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  like_count: number;
  created_at: string;
}

// ─── 通知 ───────────────────────────────────────────────
export interface Notification {
  id: string;
  user_id: string;
  actor_id: string;
  type: 'comment' | 'reply' | 'like';
  target_type: 'post' | 'comment' | 'album' | 'plan' | 'suggestion';
  target_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

// ─── 热点事件 ───────────────────────────────────────────
export interface HotEvent {
  id: string;
  title: string;
  link: string;
  cover_image: string;
  summary: string;
  sort_weight: number;
  is_active: boolean;
}

// ─── 分页 ───────────────────────────────────────────────
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
