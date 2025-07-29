'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import {
  notificationsApi,
  Notification,
  NotificationStats,
} from '@/lib/api/notifications';
import toast from 'react-hot-toast';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  stats: NotificationStats | null;
  loading: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  refreshNotifications: () => Promise<void>;
  loadMoreNotifications: () => Promise<void>;
  hasMore: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const { isAuthenticated, token } = useAuth();

  const ITEMS_PER_PAGE = 20;

  // Cargar notificaciones iniciales
  useEffect(() => {
    if (isAuthenticated && token) {
      refreshNotifications();
      loadStats();
    } else {
      setNotifications([]);
      setStats(null);
    }
  }, [isAuthenticated, token]);

  // Polling para notificaciones nuevas cada 30 segundos
  useEffect(() => {
    if (!isAuthenticated || !token) return;

    const interval = setInterval(() => {
      loadStats(); // Solo actualizamos stats para no interferir con la lista
    }, 30000);

    return () => clearInterval(interval);
  }, [isAuthenticated, token]);

  const refreshNotifications = async () => {
    if (!token) return;

    try {
      setLoading(true);
      const response = await notificationsApi.getUserNotifications(token, {
        page: 1,
        limit: ITEMS_PER_PAGE,
      });

      setNotifications(response.notifications || []);
      setPage(1);
      setHasMore((response.notifications?.length || 0) === ITEMS_PER_PAGE);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreNotifications = async () => {
    if (!token || loading || !hasMore) return;

    try {
      setLoading(true);
      const nextPage = page + 1;
      const response = await notificationsApi.getUserNotifications(token, {
        page: nextPage,
        limit: ITEMS_PER_PAGE,
      });

      const newNotifications = response.notifications || [];
      setNotifications((prev) => [...prev, ...newNotifications]);
      setPage(nextPage);
      setHasMore(newNotifications.length === ITEMS_PER_PAGE);
    } catch (error) {
      console.error('Failed to load more notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!token) return;

    try {
      const statsData = await notificationsApi.getNotificationStats(token);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to fetch notification stats:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    if (!token) return;

    try {
      await notificationsApi.markAsRead(token, notificationId);

      // Actualizar localmente
      setNotifications((prev) =>
        prev.map((notification) =>
          notification._id === notificationId
            ? { ...notification, read: true }
            : notification
        )
      );

      // Actualizar stats
      if (stats) {
        setStats((prev) =>
          prev
            ? {
                ...prev,
                unread: Math.max(0, prev.unread - 1),
              }
            : null
        );
      }
    } catch (error: any) {
      const message =
        error.response?.data?.message || 'Failed to mark notification as read';
      toast.error(message);
    }
  };

  const markAllAsRead = async () => {
    if (!token) return;

    try {
      await notificationsApi.markAllAsRead(token);

      // Actualizar localmente
      setNotifications((prev) =>
        prev.map((notification) => ({ ...notification, read: true }))
      );

      // Actualizar stats
      if (stats) {
        setStats((prev) => (prev ? { ...prev, unread: 0 } : null));
      }

      toast.success('All notifications marked as read');
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        'Failed to mark all notifications as read';
      toast.error(message);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    if (!token) return;

    try {
      await notificationsApi.deleteNotification(token, notificationId);

      // Actualizar localmente
      const deletedNotification = notifications.find(
        (n) => n._id === notificationId
      );
      setNotifications((prev) => prev.filter((n) => n._id !== notificationId));

      // Actualizar stats
      if (stats && deletedNotification) {
        setStats((prev) =>
          prev
            ? {
                ...prev,
                total: prev.total - 1,
                unread: deletedNotification.read
                  ? prev.unread
                  : prev.unread - 1,
              }
            : null
        );
      }

      toast.success('Notification deleted');
    } catch (error: any) {
      const message =
        error.response?.data?.message || 'Failed to delete notification';
      toast.error(message);
    }
  };

  const value = {
    notifications,
    unreadCount: stats?.unread || 0,
    stats,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications,
    loadMoreNotifications,
    hasMore,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      'useNotifications must be used within a NotificationProvider'
    );
  }
  return context;
}
