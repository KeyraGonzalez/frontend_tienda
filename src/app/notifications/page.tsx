'use client';

import React, { useState } from 'react';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  RefreshCw,
  Search,
  Package,
  CreditCard,
  ShoppingBag,
  Settings,
  AlertCircle,
  Info,
  Clock,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationContext';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Notification } from '@/lib/api/notifications';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export default function NotificationsPage() {
  const {
    notifications,
    unreadCount,
    stats,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications,
    loadMoreNotifications,
    hasMore,
  } = useNotifications();

  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>(
    []
  );

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'order':
        return <Package className="w-5 h-5 text-blue-500" />;
      case 'payment':
        return <CreditCard className="w-5 h-5 text-green-500" />;
      case 'product':
        return <ShoppingBag className="w-5 h-5 text-purple-500" />;
      case 'system':
        return <Settings className="w-5 h-5 text-gray-500" />;
      case 'promotion':
        return <AlertCircle className="w-5 h-5 text-orange-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'border-l-red-500 bg-red-50';
      case 'high':
        return 'border-l-orange-500 bg-orange-50';
      case 'medium':
        return 'border-l-yellow-500 bg-yellow-50';
      default:
        return 'border-l-blue-500 bg-blue-50';
    }
  };

  const getPriorityBadge = (priority: string) => {
    const colors = {
      urgent: 'bg-red-100 text-red-800',
      high: 'bg-orange-100 text-orange-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-blue-100 text-blue-800',
    };
    return colors[priority as keyof typeof colors] || colors.low;
  };

  const filteredNotifications = notifications.filter((notification) => {
    const matchesFilter =
      filter === 'all' ||
      (filter === 'read' && notification.read) ||
      (filter === 'unread' && !notification.read);

    const matchesType =
      typeFilter === 'all' || notification.type === typeFilter;

    const matchesSearch =
      searchTerm === '' ||
      notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notification.message.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesFilter && matchesType && matchesSearch;
  });

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await markAsRead(notification._id);
    }

    // Navegar según el tipo de notificación
    if (notification.data?.orderId) {
      window.location.href = `/orders/${notification.data.orderId}`;
    } else if (notification.data?.productId) {
      window.location.href = `/products/${notification.data.productId}`;
    }
  };

  const handleSelectNotification = (notificationId: string) => {
    setSelectedNotifications((prev) =>
      prev.includes(notificationId)
        ? prev.filter((id) => id !== notificationId)
        : [...prev, notificationId]
    );
  };

  const handleSelectAll = () => {
    if (selectedNotifications.length === filteredNotifications.length) {
      setSelectedNotifications([]);
    } else {
      setSelectedNotifications(filteredNotifications.map((n) => n._id));
    }
  };

  const handleBulkMarkAsRead = async () => {
    const unreadSelected = selectedNotifications.filter((id) => {
      const notification = notifications.find((n) => n._id === id);
      return notification && !notification.read;
    });

    for (const id of unreadSelected) {
      await markAsRead(id);
    }
    setSelectedNotifications([]);
  };

  const handleBulkDelete = async () => {
    for (const id of selectedNotifications) {
      await deleteNotification(id);
    }
    setSelectedNotifications([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Notificaciones
              </h1>
              <p className="text-gray-600">
                Mantente al día con todas tus notificaciones
              </p>
            </div>
            <Button
              onClick={refreshNotifications}
              disabled={loading}
              className="flex items-center space-x-2"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
              />
              <span>Actualizar</span>
            </Button>
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
              <Card className="p-4">
                <div className="flex items-center space-x-3">
                  <Bell className="w-8 h-8 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.total}
                    </p>
                    <p className="text-sm text-gray-600">Total</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center space-x-3">
                  <EyeOff className="w-8 h-8 text-orange-500" />
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.unread}
                    </p>
                    <p className="text-sm text-gray-600">Sin leer</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center space-x-3">
                  <Eye className="w-8 h-8 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.total - stats.unread}
                    </p>
                    <p className="text-sm text-gray-600">Leídas</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center space-x-3">
                  <AlertCircle className="w-8 h-8 text-red-500" />
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.byPriority.urgent || 0}
                    </p>
                    <p className="text-sm text-gray-600">Urgentes</p>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* Filters and Actions */}
        <Card className="p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            {/* Search */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Buscar notificaciones..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex items-center space-x-4">
              <select
                value={filter}
                onChange={(e) =>
                  setFilter(e.target.value as 'all' | 'unread' | 'read')
                }
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Todas</option>
                <option value="unread">Sin leer</option>
                <option value="read">Leídas</option>
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Todos los tipos</option>
                <option value="order">Pedidos</option>
                <option value="payment">Pagos</option>
                <option value="product">Productos</option>
                <option value="system">Sistema</option>
                <option value="promotion">Promociones</option>
              </select>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedNotifications.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  {selectedNotifications.length} notificación
                  {selectedNotifications.length !== 1 ? 'es' : ''} seleccionada
                  {selectedNotifications.length !== 1 ? 's' : ''}
                </p>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkMarkAsRead}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Marcar como leídas
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkDelete}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Eliminar
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                {selectedNotifications.length === filteredNotifications.length
                  ? 'Deseleccionar todo'
                  : 'Seleccionar todo'}
              </Button>
              {unreadCount > 0 && (
                <Button variant="outline" size="sm" onClick={markAllAsRead}>
                  <CheckCheck className="w-4 h-4 mr-2" />
                  Marcar todas como leídas
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Notifications List */}
        <div className="space-y-4">
          {loading && notifications.length === 0 ? (
            <Card className="p-8 text-center">
              <Clock className="w-12 h-12 mx-auto mb-4 text-gray-400 animate-spin" />
              <p className="text-gray-600">Cargando notificaciones...</p>
            </Card>
          ) : filteredNotifications.length === 0 ? (
            <Card className="p-8 text-center">
              <Bell className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No hay notificaciones
              </h3>
              <p className="text-gray-600">
                {searchTerm || filter !== 'all' || typeFilter !== 'all'
                  ? 'No se encontraron notificaciones con los filtros aplicados'
                  : 'Te notificaremos cuando tengas algo nuevo'}
              </p>
            </Card>
          ) : (
            <>
              {filteredNotifications.map((notification) => (
                <Card
                  key={notification._id}
                  className={`p-6 border-l-4 cursor-pointer hover:shadow-md transition-all ${getPriorityColor(
                    notification.priority
                  )} ${!notification.read ? 'bg-blue-50' : 'bg-white'}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start space-x-4">
                    <input
                      type="checkbox"
                      checked={selectedNotifications.includes(notification._id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleSelectNotification(notification._id);
                      }}
                      className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />

                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3
                              className={`text-lg font-semibold ${
                                !notification.read
                                  ? 'text-gray-900'
                                  : 'text-gray-700'
                              }`}
                            >
                              {notification.title}
                            </h3>
                            <Badge
                              className={getPriorityBadge(
                                notification.priority
                              )}
                            >
                              {notification.priority}
                            </Badge>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            )}
                          </div>

                          <p
                            className={`text-base mb-3 ${
                              !notification.read
                                ? 'text-gray-700'
                                : 'text-gray-600'
                            }`}
                          >
                            {notification.message}
                          </p>

                          <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-500">
                              {formatDistanceToNow(
                                new Date(notification.createdAt),
                                {
                                  addSuffix: true,
                                  locale: es,
                                }
                              )}
                            </p>

                            <div className="flex items-center space-x-2">
                              <Badge variant="secondary">
                                {notification.type}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification._id);
                          }}
                          className="text-gray-400 hover:text-red-500 p-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}

              {/* Load More Button */}
              {hasMore && (
                <div className="text-center py-6">
                  <Button
                    onClick={loadMoreNotifications}
                    disabled={loading}
                    variant="outline"
                  >
                    {loading ? (
                      <>
                        <Clock className="w-4 h-4 mr-2 animate-spin" />
                        Cargando...
                      </>
                    ) : (
                      'Cargar más notificaciones'
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
