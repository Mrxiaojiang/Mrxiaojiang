import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ConfigProvider, Spin } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import MainLayout from './components/layout/MainLayout';
import AdminLayout from './components/layout/AdminLayout';

// ─── 路由级代码分割 ─────────────────────────────────
const HomePage = lazy(() => import('./pages/home'));
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const BlogDetailPage = lazy(() => import('./pages/blog/BlogDetail'));
const CommunityPage = lazy(() => import('./pages/community'));
const CreatePostPage = lazy(() => import('./pages/community/CreatePost'));
const PostDetailPage = lazy(() => import('./pages/community/PostDetail'));
const AlbumPage = lazy(() => import('./pages/album'));
const AlbumDetailPage = lazy(() => import('./pages/album/AlbumDetail'));
const TravelPage = lazy(() => import('./pages/travel'));
const TravelPlansPage = lazy(() => import('./pages/travel/TravelPlans'));
const TravelSuggestionsPage = lazy(() => import('./pages/travel/TravelSuggestions'));
const CustomizePage = lazy(() => import('./pages/travel/CustomizePage'));
const NotificationPage = lazy(() => import('./pages/notification'));
const ProfilePage = lazy(() => import('./pages/profile'));
const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
const UserManage = lazy(() => import('./pages/admin/UserManage'));
const BlogManage = lazy(() => import('./pages/admin/BlogManage'));
const PostManage = lazy(() => import('./pages/admin/PostManage'));
const CommentManage = lazy(() => import('./pages/admin/CommentManage'));
const AlbumManage = lazy(() => import('./pages/admin/AlbumManage'));
const HotEventManage = lazy(() => import('./pages/admin/HotEventManage'));
const Settings = lazy(() => import('./pages/admin/Settings'));
const BlogEditor = lazy(() => import('./pages/admin/BlogEditor'));

function PageLoader() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <Spin size="large" />
    </div>
  );
}

export default function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* 前台布局 */}
            <Route element={<MainLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/blogs/:id" element={<BlogDetailPage />} />
              <Route path="/community" element={<CommunityPage />} />
              <Route path="/community/new" element={<CreatePostPage />} />
              <Route path="/community/:id/edit" element={<CreatePostPage />} />
              <Route path="/community/:id" element={<PostDetailPage />} />
              <Route path="/albums" element={<AlbumPage />} />
              <Route path="/albums/:id" element={<AlbumDetailPage />} />
              <Route path="/travel" element={<TravelPage />} />
              <Route path="/travel/plans" element={<TravelPlansPage />} />
              <Route path="/travel/suggestions" element={<TravelSuggestionsPage />} />
              <Route path="/travel/customize" element={<CustomizePage />} />
              <Route path="/notifications" element={<NotificationPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>

            {/* 后台管理布局 */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="users" element={<UserManage />} />
              <Route path="blogs" element={<BlogManage />} />
              <Route path="blogs/new" element={<BlogEditor />} />
              <Route path="blogs/:id/edit" element={<BlogEditor />} />
              <Route path="posts" element={<PostManage />} />
              <Route path="comments" element={<CommentManage />} />
              <Route path="albums" element={<AlbumManage />} />
              <Route path="hot-events" element={<HotEventManage />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ConfigProvider>
  );
}
