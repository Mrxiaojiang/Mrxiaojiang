import { io, Socket } from 'socket.io-client';
import { notification } from 'antd';
import { useAuthStore } from '../store/authStore';
import { useAppStore } from '../store/appStore';
import type { Notification } from '../types';

let socket: Socket | null = null;

export function connectSocket() {
  const { accessToken } = useAuthStore.getState();
  if (!accessToken || socket?.connected) return;

  socket = io('/notifications', {
    auth: { token: accessToken },
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('[Socket] 已连接');
  });

  socket.on('notification', (msg: Notification) => {
    notification.info({
      message: '新通知',
      description: msg.content,
      placement: 'topRight',
      duration: 4,
    });
  });

  socket.on('unread_count', (data: { count: number }) => {
    useAppStore.getState().setUnreadCount(data.count);
  });

  socket.on('disconnect', () => {
    console.log('[Socket] 已断开');
  });

  socket.on('connect_error', (err) => {
    console.warn('[Socket] 连接失败:', err.message);
  });
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket(): Socket | null {
  return socket;
}
