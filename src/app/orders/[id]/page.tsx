'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  ArrowLeft,
  Package,
  Truck,
  CheckCircle,
  Clock,
  AlertCircle,
  MapPin,
  CreditCard,
  X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ordersApi, Order } from '@/lib/api/orders';
import { paymentsApi } from '@/lib/api/payments';
import React from 'react';

interface OrderDetailPageProps {
  params: {
    id: string;
  };
}

export default function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { token, isAuthenticated } = useAuth();

  const {
    data: order,
    isLoading: orderLoading,
    error: orderError,
  } = useQuery({
    queryKey: ['order', params.id],
    queryFn: () => ordersApi.getOrder(token!, params.id),
    enabled: !!token,
  });

  const { data: payment, isLoading: paymentLoading } = useQuery({
    queryKey: ['payment', params.id],
    queryFn: () => paymentsApi.getPaymentByOrder(token!, params.id),
    enabled: !!token && !!order,
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'confirmed':
        return <CheckCircle className="w-5 h-5 text-blue-500" />;
      case 'processing':
        return <Package className="w-5 h-5 text-purple-500" />;
      case 'shipped':
        return <Truck className="w-5 h-5 text-indigo-500" />;
      case 'delivered':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'cancelled':
        return <X className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
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

  const getOrderProgress = (status: string) => {
    const steps = [
      { key: 'pending', label: 'Pedido Realizado', icon: Package },
      { key: 'confirmed', label: 'Confirmado', icon: CheckCircle },
      { key: 'processing', label: 'Procesando', icon: Clock },
      { key: 'shipped', label: 'Enviado', icon: Truck },
      { key: 'delivered', label: 'Entregado', icon: CheckCircle },
    ];

    const currentIndex = steps.findIndex((step) => step.key === status);

    return steps.map((step, index) => ({
      ...step,
      completed: index <= currentIndex,
      current: index === currentIndex,
    }));
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
              Inicia sesión para ver detalles del pedido
            </h2>
            <p className="text-gray-600 mb-8 leading-relaxed">
              Por favor inicia sesión en tu cuenta para acceder a la información
              del pedido.
            </p>
            <Link href="/login">
              <button className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all shadow-lg hover:scale-105">
                Iniciar Sesión
              </button>
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (orderLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <Header />
        <div className="container-custom py-16">
          <div className="flex justify-center animate-fade-in-up">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl animate-spin">
                <Package className="w-8 h-8 text-white" />
              </div>
              <p className="text-gray-600">Cargando detalles del pedido...</p>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (orderError || !order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50">
        <Header />
        <div className="container-custom py-16">
          <div className="text-center animate-fade-in-up">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Pedido no encontrado
            </h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              El pedido que buscas no existe o no tienes permisos para verlo.
            </p>
            <Link href="/orders">
              <button className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all shadow-lg hover:scale-105">
                Volver a Pedidos
              </button>
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const progressSteps = getOrderProgress(order.status);

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
          <Link
            href="/orders"
            className="hover:text-blue-600 transition-colors"
          >
            Pedidos
          </Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">
            #{order.orderNumber}
          </span>
        </nav>

        {/* Back Button */}
        <Link
          href="/orders"
          className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a Pedidos
        </Link>

        {/* Order Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 animate-fade-in-up">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-blue-600 bg-clip-text text-transparent mb-2">
              Pedido #{order.orderNumber}
            </h1>
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <span>
                Realizado el{' '}
                {new Date(order.createdAt).toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
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

          <div className="mt-4 lg:mt-0">
            <Badge
              variant={getStatusColor(order.status) as any}
              className="flex items-center space-x-2 text-base px-4 py-2 rounded-full"
            >
              {getStatusIcon(order.status)}
              <span>{getStatusText(order.status)}</span>
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Progress */}
            {order.status !== 'cancelled' && (
              <Card className="p-6 bg-white shadow-lg rounded-xl border border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">
                  Progreso del Pedido
                </h2>
                <div className="space-y-4">
                  {progressSteps.map((step, index) => (
                    <div key={step.key} className="flex items-center relative">
                      <div
                        className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                          step.completed
                            ? 'border-blue-600 bg-blue-600 text-white'
                            : 'border-gray-300 text-gray-400'
                        }`}
                      >
                        <step.icon className="w-5 h-5" />
                      </div>
                      <div className="ml-4 flex-1">
                        <p
                          className={`font-medium ${
                            step.completed ? 'text-gray-900' : 'text-gray-400'
                          }`}
                        >
                          {step.label}
                        </p>
                        {step.current && (
                          <p className="text-sm text-blue-600">Estado actual</p>
                        )}
                      </div>
                      {index < progressSteps.length - 1 && (
                        <div
                          className={`absolute left-5 top-10 w-0.5 h-8 ${
                            step.completed ? 'bg-blue-600' : 'bg-gray-300'
                          }`}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Order Items */}
            <Card className="p-6 bg-white shadow-lg rounded-xl border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">
                Artículos del Pedido
              </h2>
              <div className="space-y-4">
                {order.items.map((item: any, index: number) => (
                  <div
                    key={index}
                    className="flex items-center space-x-4 py-4 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="w-16 h-16 bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg flex items-center justify-center shadow-sm">
                      <Package className="w-8 h-8 text-gray-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">
                        {item.productName}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                        <span>Cantidad: {item.quantity}</span>
                        {item.size && <span>Talla: {item.size}</span>}
                        {item.color && <span>Color: {item.color}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">
                        ${item.totalPrice.toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-500">
                        ${item.unitPrice.toFixed(2)} c/u
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Tracking Information */}
            {order.trackingNumber && (
              <Card className="p-6 bg-white shadow-lg rounded-xl border border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Información de Seguimiento
                </h2>
                <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Truck className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-blue-900">
                      Número de Seguimiento
                    </p>
                    <p className="text-blue-700 font-mono">
                      {order.trackingNumber}
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Order Summary */}
            <Card className="p-6 bg-white shadow-lg rounded-xl border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Resumen del Pedido
              </h2>
              <div className="space-y-2">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>${order.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Envío</span>
                  <span>
                    {order.shippingCost === 0
                      ? 'Gratis'
                      : `$${order.shippingCost.toFixed(2)}`}
                  </span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Impuestos</span>
                  <span>${order.tax.toFixed(2)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Descuento</span>
                    <span>-${order.discount.toFixed(2)}</span>
                  </div>
                )}
                <hr className="border-gray-200" />
                <div className="flex justify-between text-lg font-semibold text-gray-900">
                  <span>Total</span>
                  <span>${order.totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </Card>

            {/* Shipping Address */}
            <Card className="p-6 bg-white shadow-lg rounded-xl border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <MapPin className="w-5 h-5 mr-2" />
                Dirección de Envío
              </h2>
              <div className="text-gray-600 space-y-1">
                <p className="font-medium text-gray-900">
                  {order.shippingAddress.firstName}{' '}
                  {order.shippingAddress.lastName}
                </p>
                <p>{order.shippingAddress.street}</p>
                <p>
                  {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                  {order.shippingAddress.zipCode}
                </p>
                <p>{order.shippingAddress.country}</p>
                {order.shippingAddress.phone && (
                  <p className="mt-2">{order.shippingAddress.phone}</p>
                )}
              </div>
            </Card>

            {/* Payment Information */}
            {payment && (
              <Card className="p-6 bg-white shadow-lg rounded-xl border border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <CreditCard className="w-5 h-5 mr-2" />
                  Información de Pago
                </h2>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">ID de Pago</span>
                    <span className="font-mono text-sm">
                      {payment.paymentId}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Método</span>
                    <span className="capitalize">
                      {payment.method.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Estado</span>
                    <Badge
                      variant={
                        payment.status === 'completed'
                          ? 'success'
                          : payment.status === 'failed'
                          ? 'error'
                          : 'warning'
                      }
                    >
                      {payment.status === 'completed'
                        ? 'Completado'
                        : payment.status === 'failed'
                        ? 'Falló'
                        : payment.status === 'pending'
                        ? 'Pendiente'
                        : payment.status}
                    </Badge>
                  </div>
                  {payment.processedAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Procesado</span>
                      <span className="text-sm">
                        {new Date(payment.processedAt).toLocaleDateString(
                          'es-ES',
                          {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          }
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
