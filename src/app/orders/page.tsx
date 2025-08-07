'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Package,
  Eye,
  X,
  Truck,
  CheckCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ordersApi, Order } from '@/lib/api/orders';
import toast from 'react-hot-toast';

export default function OrdersPage() {
  const { token, isAuthenticated } = useAuth();
  const [page, setPage] = useState(1);
  const [cancellingOrder, setCancellingOrder] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['user-orders', page],
    queryFn: () => ordersApi.getUserOrders(token!, page, 10),
    enabled: !!token,
  });

  const handleCancelOrder = async (orderId: string) => {
    if (!token) return;

    setCancellingOrder(orderId);
    try {
      await ordersApi.cancelOrder(token, orderId);
      toast.success('Pedido cancelado exitosamente');
      refetch();
    } catch (error: any) {
      const message =
        error.response?.data?.message || 'Error al cancelar el pedido';
      toast.error(message);
    } finally {
      setCancellingOrder(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'confirmed':
        return <CheckCircle className="w-4 h-4 text-blue-500" />;
      case 'processing':
        return <Package className="w-4 h-4 text-purple-500" />;
      case 'shipped':
        return <Truck className="w-4 h-4 text-indigo-500" />;
      case 'delivered':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'cancelled':
        return <X className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'confirmed':
        return 'info';
      case 'processing':
        return 'secondary';
      case 'shipped':
        return 'primary';
      case 'delivered':
        return 'success';
      case 'cancelled':
        return 'error';
      default:
        return 'secondary';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendiente';
      case 'confirmed':
        return 'Confirmado';
      case 'processing':
        return 'Procesando';
      case 'shipped':
        return 'Enviado';
      case 'delivered':
        return 'Entregado';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status;
    }
  };

  const canCancelOrder = (order: Order) => {
    return order.status === 'pending' || order.status === 'confirmed';
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <Header />
        <div className="container-custom py-16">
          <div className="text-center max-w-md mx-auto animate-fade-in-up">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
              <Package className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-4">
              Inicia sesión para ver tus pedidos
            </h2>
            <p className="text-gray-600 mb-8 leading-relaxed">
              Por favor inicia sesión en tu cuenta para acceder al historial de
              pedidos.
            </p>
            <div className="space-y-3">
              <Link href="/login" className="block">
                <button className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all shadow-lg hover:scale-105">
                  Iniciar Sesión
                </button>
              </Link>
              <Link href="/register" className="block">
                <button className="w-full px-6 py-3 bg-white text-gray-700 border border-gray-300 font-medium rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all shadow-sm hover:scale-105">
                  Crear Cuenta
                </button>
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <Header />

      <main className="container-custom py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-8">
          <Link href="/" className="hover:text-blue-600 transition-colors">
            Inicio
          </Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">Mis Pedidos</span>
        </nav>

        {/* Page Header */}
        <div className="flex items-center justify-between mb-8 animate-fade-in-up">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-blue-600 bg-clip-text text-transparent">
            Mis Pedidos
          </h1>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16 animate-fade-in-up">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl animate-spin">
                <Package className="w-8 h-8 text-white" />
              </div>
              <p className="text-gray-600">Cargando tus pedidos...</p>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-16 animate-fade-in-up">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Error al cargar los pedidos
            </h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Hubo un error al cargar tus pedidos. Por favor, inténtalo de
              nuevo.
            </p>
            <button
              onClick={() => refetch()}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all shadow-lg hover:scale-105"
            >
              Intentar de Nuevo
            </button>
          </div>
        ) : !data?.orders.length ? (
          <div className="text-center py-16 animate-fade-in-up">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
              <Package className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Aún no tienes pedidos
            </h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Todavía no has realizado ningún pedido. ¡Comienza a comprar para
              ver tus pedidos aquí!
            </p>
            <Link href="/products">
              <button className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all shadow-lg hover:scale-105">
                Comenzar a Comprar
              </button>
            </Link>
          </div>
        ) : (
          <>
            {/* Orders List */}
            <div className="space-y-6">
              {data.orders.map((order: Order) => (
                <Card
                  key={order._id}
                  className="p-6 hover:shadow-xl transition-all duration-300 border border-gray-200 bg-white rounded-xl"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          Pedido #{order.orderNumber}
                        </h3>
                        <Badge
                          variant={getStatusColor(order.status) as any}
                          className="flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium"
                        >
                          {getStatusIcon(order.status)}
                          <span>{getStatusText(order.status)}</span>
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>
                          Realizado el{' '}
                          {new Date(order.createdAt).toLocaleDateString(
                            'es-ES',
                            {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            }
                          )}
                        </span>
                        <span>•</span>
                        <span>
                          {order.items.length}{' '}
                          {order.items.length === 1 ? 'artículo' : 'artículos'}
                        </span>
                        <span>•</span>
                        <span className="font-medium text-gray-900">
                          ${order.totalAmount.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Link href={`/orders/${order._id}`}>
                        <button className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                          <Eye className="w-4 h-4 mr-2" />
                          Ver Detalles
                        </button>
                      </Link>

                      {canCancelOrder(order) && (
                        <button
                          onClick={() => handleCancelOrder(order._id)}
                          disabled={cancellingOrder === order._id}
                          className="inline-flex items-center px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {cancellingOrder === order._id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2"></div>
                          ) : (
                            <X className="w-4 h-4 mr-2" />
                          )}
                          Cancelar
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Order Items Preview */}
                  <div className="border-t border-gray-100 pt-4 mt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">
                      Artículos del pedido:
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {order.items.slice(0, 3).map((item, index) => (
                        <div
                          key={index}
                          className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="w-12 h-12 bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg flex items-center justify-center shadow-sm">
                            <Package className="w-6 h-6 text-gray-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-gray-900 truncate">
                              {item.productName}
                            </h4>
                            <p className="text-xs text-gray-500">
                              Cant: {item.quantity}{' '}
                              {item.size && `• Talla: ${item.size}`}
                            </p>
                          </div>
                        </div>
                      ))}
                      {order.items.length > 3 && (
                        <div className="flex items-center justify-center text-sm text-gray-500 p-3 bg-gray-50 rounded-lg">
                          +{order.items.length - 3} artículos más
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tracking Info */}
                  {order.trackingNumber && (
                    <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <Truck className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-blue-900">
                            Número de Seguimiento
                          </p>
                          <p className="text-sm text-blue-700 font-mono">
                            {order.trackingNumber}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {data.pagination.pages > 1 && (
              <div className="flex justify-center items-center space-x-4 mt-8">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Anterior
                </button>

                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">
                    Página {page} de {data.pagination.pages}
                  </span>
                </div>

                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page === data.pagination.pages}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Siguiente
                </button>
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
