export const dynamic = "force-dynamic";

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { ordersApi } from '@/lib/api/orders';
import { paymentsApi } from '@/lib/api/payments';
import Link from 'next/link';
import {
  CheckCircle,
  Package,
  CreditCard,
  Truck,
  ArrowRight,
  Home,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import toast from 'react-hot-toast';

interface OrderDetails {
  _id: string;
  orderNumber: string;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  shippingAddress: any;
  items: any[];
  createdAt: string;
}

interface PaymentDetails {
  _id: string;
  paymentId: string;
  amount: number;
  method: string;
  status: string;
  transactionId: string;
  processedAt: string;
}

export default function CheckoutSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, token, isAuthenticated } = useAuth();
  const { clearCart } = useCart();

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cartCleared, setCartCleared] = useState(false); // Bandera para evitar múltiples limpiezas
  const [toastShown, setToastShown] = useState(false); // Bandera para evitar múltiples mensajes de éxito
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  // Get parameters from URL
  const sessionId = searchParams?.get('session_id'); // Stripe
  const paypalOrderId = searchParams?.get('paypal_order_id'); // PayPal
  const orderId = searchParams?.get('order_id');
  const paymentMethod = searchParams?.get('payment_method');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Effect para limpiar el carrito UNA SOLA VEZ cuando llegamos a la página de éxito
  useEffect(() => {
    if (!mounted || cartCleared) return;

    // Si tenemos indicadores de pago exitoso, limpiar el carrito UNA VEZ
    if (sessionId || paypalOrderId || (orderId && paymentMethod)) {
      console.log(
        'Success page loaded with payment indicators, clearing cart ONCE'
      );
      setCartCleared(true); // Marcar PRIMERO como limpiado para evitar condiciones de carrera
      clearCart();

      // Mostrar mensaje de éxito inmediatamente para PayPal
      if (paypalOrderId && !toastShown) {
        toast.success('¡Pago con PayPal completado exitosamente!');
        setToastShown(true);
      }
    }
  }, [mounted, sessionId, paypalOrderId, orderId, paymentMethod]); // Removido clearCart y cartCleared de las dependencias

  useEffect(() => {
    if (!mounted) return;

    // Solo requerir sessionId o paypalOrderId si no hay forma de identificar un pedido reciente
    if (!sessionId && !paypalOrderId && !orderId) {
      console.log(
        'No session_id, paypal_order_id, or order_id found, trying to find recent order...'
      );
    }

    fetchOrderAndPaymentDetails();
  }, [mounted, isAuthenticated, sessionId, paypalOrderId, orderId, token]);

  const fetchOrderAndPaymentDetails = async () => {
    try {
      setLoading(true);

      // Si tenemos un paypalOrderId, capturar el pago primero
      if (paypalOrderId && orderId) {
        console.log(
          'PayPal payment completed, capturing order:',
          paypalOrderId
        );

        // Solo mostrar toast si no se ha mostrado ya en el useEffect anterior
        if (!toastShown) {
          toast.success('¡Pago con PayPal completado exitosamente!');
          setToastShown(true);
        }

        try {
          await paymentsApi.capturePayPalOrder(token!, paypalOrderId, orderId);
          console.log('PayPal payment captured successfully');
          if (!cartCleared) {
            console.log('Clearing cart after PayPal capture');
            clearCart();
            setCartCleared(true);
          }
        } catch (captureError: any) {
          console.error('Error capturing PayPal payment:', captureError);
          // NO mostrar error al usuario ya que el pago fue exitoso en PayPal
          // El error es interno y será manejado por el backend
          console.log(
            'PayPal payment was successful, but capture failed internally'
          );
        }
      } else if (sessionId) {
        // Si tenemos un sessionId de Stripe, solo mostrar mensaje
        console.log('Stripe session completed:', sessionId);
        if (!toastShown) {
          toast.success('¡Pago completado exitosamente!');
          setToastShown(true);
        }
      }

      // Obtener todas las órdenes del usuario y buscar la más reciente
      const ordersResponse = await ordersApi.getUserOrders(token!);
      console.log('Orders response:', ordersResponse);

      // Verificar si la respuesta es un array o tiene estructura anidada
      let orders = [];
      if (Array.isArray(ordersResponse)) {
        orders = ordersResponse;
      } else if (ordersResponse && Array.isArray(ordersResponse.orders)) {
        orders = ordersResponse.orders;
      } else if (ordersResponse && Array.isArray(ordersResponse.data)) {
        orders = ordersResponse.data;
      } else {
        console.error(
          'Estructura de respuesta de órdenes no reconocida:',
          ordersResponse
        );
        throw new Error('No se pudieron obtener las órdenes');
      }

      let targetOrder = null;
      if (orderId) {
        targetOrder = orders.find((order: any) => order._id === orderId);
      } else {
        // Si no tenemos orderId específico, tomar la más reciente con pago completado
        const paidOrders = orders.filter(
          (order: any) => order.paymentStatus === 'paid'
        );
        if (paidOrders.length > 0) {
          targetOrder = paidOrders.sort(
            (a: any, b: any) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )[0];
        } else {
          // Si no hay órdenes pagadas, tomar la más reciente
          targetOrder = orders.sort(
            (a: any, b: any) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )[0];
        }
      }

      if (!targetOrder) {
        throw new Error('No se encontró el pedido');
      }

      setOrderDetails(targetOrder);

      // Limpiar el carrito como respaldo si no se ha limpiado aún y tenemos un pedido exitoso
      if (
        !cartCleared &&
        targetOrder &&
        (targetOrder.paymentStatus === 'paid' ||
          targetOrder.status === 'confirmed')
      ) {
        console.log(
          'Order found with successful payment status, clearing cart as backup'
        );
        clearCart();
        setCartCleared(true);
      }

      // Obtener detalles del pago
      try {
        const payment = await paymentsApi.getPaymentByOrder(
          token!,
          targetOrder._id
        );
        setPaymentDetails(payment);
      } catch (paymentError) {
        console.log('No se encontraron detalles del pago:', paymentError);
      }
    } catch (error: any) {
      console.error('Error fetching order details:', error);
      setError(error.message || 'Error al cargar los detalles del pedido');
      toast.error('Error al cargar los detalles del pedido');
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return null;
  }

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50">
        <Header />
        <main className="container mx-auto px-4 py-16 max-w-4xl">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">
              Cargando detalles del pedido...
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50">
        <Header />
        <main className="container mx-auto px-4 py-16 max-w-4xl">
          <div className="text-center">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="text-red-500 mb-4">
                <Package className="h-16 w-16 mx-auto" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Error</h1>
              <p className="text-gray-600 mb-8">{error}</p>
              <div className="flex justify-center space-x-4">
                <Link
                  href="/orders"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
                >
                  Ver mis pedidos
                </Link>
                <Link
                  href="/"
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-3 rounded-lg transition-colors"
                >
                  Volver al inicio
                </Link>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50">
      <Header />

      <main className="container mx-auto px-4 py-16 max-w-4xl">
        {/* Success Header */}
        <div className="text-center mb-12">
          <div className="bg-white rounded-3xl shadow-2xl p-8 mb-8">
            <div className="text-green-500 mb-6">
              <CheckCircle className="h-24 w-24 mx-auto" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              ¡Pago Exitoso!
            </h1>
            <p className="text-xl text-gray-600 mb-2">
              Tu pedido ha sido procesado correctamente
            </p>
            {orderDetails && (
              <p className="text-lg text-gray-500">
                Pedido #{orderDetails.orderNumber}
              </p>
            )}
          </div>
        </div>

        {/* Order Details */}
        {orderDetails && (
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <Package className="h-6 w-6 mr-2" />
              Detalles del Pedido
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Número de Pedido
                  </p>
                  <p className="text-lg font-semibold text-gray-900">
                    #{orderDetails.orderNumber}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500">Total</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${orderDetails.totalAmount.toFixed(2)}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500">Estado</p>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    {orderDetails.status}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Fecha</p>
                  <p className="text-lg text-gray-900">
                    {new Date(orderDetails.createdAt).toLocaleDateString(
                      'es-ES',
                      {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      }
                    )}
                  </p>
                </div>

                {orderDetails.shippingAddress && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Dirección de Envío
                    </p>
                    <div className="text-gray-900">
                      <p>
                        {orderDetails.shippingAddress.firstName}{' '}
                        {orderDetails.shippingAddress.lastName}
                      </p>
                      <p>{orderDetails.shippingAddress.street}</p>
                      <p>
                        {orderDetails.shippingAddress.city},{' '}
                        {orderDetails.shippingAddress.state}{' '}
                        {orderDetails.shippingAddress.zipCode}
                      </p>
                      <p>{orderDetails.shippingAddress.country}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Payment Details */}
        {paymentDetails && (
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <CreditCard className="h-6 w-6 mr-2" />
              Detalles del Pago
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    ID de Transacción
                  </p>
                  <p className="text-lg font-mono text-gray-900 break-all">
                    {paymentDetails.transactionId}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Método de Pago
                  </p>
                  <div className="flex items-center space-x-2">
                    {paymentDetails.method === 'paypal' ? (
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-sm">P</span>
                      </div>
                    ) : (
                      <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
                        <CreditCard className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <p className="text-lg text-gray-900 capitalize">
                      {paymentDetails.method === 'paypal'
                        ? 'PayPal'
                        : paymentDetails.method === 'stripe'
                        ? 'Tarjeta de Crédito/Débito'
                        : paymentDetails.method}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500">Monto</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${paymentDetails.amount.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Estado del Pago
                  </p>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    {paymentDetails.status}
                  </span>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Fecha de Procesamiento
                  </p>
                  <p className="text-lg text-gray-900">
                    {new Date(paymentDetails.processedAt).toLocaleDateString(
                      'es-ES',
                      {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      }
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Next Steps */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <Truck className="h-6 w-6 mr-2" />
            ¿Qué sigue?
          </h2>

          <div className="space-y-4">
            <div className="flex items-start space-x-4">
              <div className="bg-blue-100 rounded-full p-2 mt-1">
                <span className="block w-2 h-2 bg-blue-600 rounded-full"></span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  Confirmación por email
                </h3>
                <p className="text-gray-600">
                  Te hemos enviado un email de confirmación con todos los
                  detalles del pedido.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="bg-blue-100 rounded-full p-2 mt-1">
                <span className="block w-2 h-2 bg-blue-600 rounded-full"></span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  Preparación del pedido
                </h3>
                <p className="text-gray-600">
                  Nuestro equipo comenzará a preparar tu pedido para el envío.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="bg-blue-100 rounded-full p-2 mt-1">
                <span className="block w-2 h-2 bg-blue-600 rounded-full"></span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  Seguimiento de envío
                </h3>
                <p className="text-gray-600">
                  Te notificaremos cuando tu pedido sea enviado con información
                  de seguimiento.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/orders"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg transition-colors flex items-center justify-center font-semibold"
            >
              Ver mis pedidos
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>

            <Link
              href="/products"
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-8 py-4 rounded-lg transition-colors flex items-center justify-center font-semibold"
            >
              Seguir comprando
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>

            <Link
              href="/"
              className="bg-green-100 hover:bg-green-200 text-green-800 px-8 py-4 rounded-lg transition-colors flex items-center justify-center font-semibold"
            >
              <Home className="mr-2 h-5 w-5" />
              Volver al inicio
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

