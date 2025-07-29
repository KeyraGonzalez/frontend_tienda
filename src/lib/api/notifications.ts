import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export interface Notification {
  _id: string;
  userId: string;
  type: 'order' | 'payment' | 'product' | 'system' | 'promotion';
  title: string;
  message: string;
  data?: any;
  read: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationFilters {
  page?: number;
  limit?: number;
  type?: string;
  read?: boolean;
  priority?: string;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: {
    [key: string]: number;
  };
  byPriority: {
    [key: string]: number;
  };
}

const notificationsApi = {
  // Obtener notificaciones del usuario
  getUserNotifications: async (
    token: string,
    filters: NotificationFilters = {}
  ) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString());
      }
    });

    const response = await axios.get(`${API_URL}/notifications?${params}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data.data;
  },

  // Marcar notificación como leída
  markAsRead: async (token: string, notificationId: string) => {
    const response = await axios.patch(
      `${API_URL}/notifications/${notificationId}/read`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data.data;
  },

  // Marcar todas las notificaciones como leídas
  markAllAsRead: async (token: string) => {
    const response = await axios.patch(
      `${API_URL}/notifications/mark-all-read`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data.data;
  },

  // Eliminar notificación
  deleteNotification: async (token: string, notificationId: string) => {
    const response = await axios.delete(
      `${API_URL}/notifications/${notificationId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data.data;
  },

  // Obtener estadísticas de notificaciones
  getNotificationStats: async (token: string): Promise<NotificationStats> => {
    const response = await axios.get(`${API_URL}/notifications/stats`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data.data;
  },

  // Obtener notificaciones no leídas
  getUnreadNotifications: async (token: string) => {
    const response = await axios.get(
      `${API_URL}/notifications?read=false&limit=10`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data.data;
  },

  // Configurar preferencias de notificaciones
  updateNotificationPreferences: async (token: string, preferences: any) => {
    const response = await axios.patch(
      `${API_URL}/notifications/preferences`,
      preferences,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data.data;
  },
};

export { notificationsApi };
