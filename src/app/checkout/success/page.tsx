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
import { Suspense } from 'react';

// Forzar renderizado dinámico
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;

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

function CheckoutSuccessPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, token } = useAuth();
  const { clearCart } = useCart();

  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Asegurar que el componente esté montado antes de acceder a searchParams
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const fetchOrderAndPaymentDetails = async () => {
      try {
        const orderId = searchParams.get('orderId');
        const paymentId = searchParams.get('paymentId');

        if (!orderId) {
          setError('ID de orden no encontrado');
          return;
        }

        if (!token) {
          setError('Token de autenticación no encontrado');
          router.push('/login');
          return;
        }

        // Obtener detalles de la orden
        const orderResponse = await ordersApi.getById(token, orderId);
        setOrderDetails(orderResponse);

        // Obtener detalles del pago si hay paymentId
        if (paymentId) {
          try {
            const paymentResponse = await paymentsApi.getById(token, paymentId);
            setPaymentDetails(paymentResponse);
          } catch (paymentError) {
            console.error('Error al obtener detalles del pago:', paymentError);
          }
        }

        // Limpiar el carrito después de una compra exitosa
        clearCart();
      } catch (error) {
        console.error('Error al obtener detalles de la orden:', error);
        setError('Error al cargar los detalles de la orden');
        toast.error('Error al cargar los detalles de la orden');
      } finally {
        setLoading(false);
      }
    };

    fetchOrderAndPaymentDetails();
  }, [mounted, searchParams, clearCart, token, router]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex justify-center items-center h-96">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !orderDetails) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="max-w-md mx-auto">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Error</h1>
            <p className="text-gray-600 mb-8">
              {error || 'No se pudieron cargar los detalles de la orden'}
            </p>
            <Link
              href="/"
              className="inline-flex items-center bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Home className="mr-2 h-4 w-4" />
              Volver al inicio
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto">
          {/* Encabezado de éxito */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              ¡Compra exitosa!
            </h1>
            <p className="text-gray-600">
              Tu pedido ha sido procesado correctamente
            </p>
          </div>

          {/* Información de la orden */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between border-b pb-4 mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Detalles de la orden
              </h2>
              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                {orderDetails.status}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm text-gray-500">Número de orden</p>
                <p className="font-semibold">{orderDetails.orderNumber}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Fecha</p>
                <p className="font-semibold">
                  {new Date(orderDetails.createdAt).toLocaleDateString('es-ES')}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total</p>
                <p className="font-semibold text-lg">
                  ${orderDetails.totalAmount.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Estado del pago</p>
                <p className="font-semibold">{orderDetails.paymentStatus}</p>
              </div>
            </div>

            {/* Productos */}
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">Productos</h3>
              <div className="space-y-3">
                {orderDetails.items.map((item, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center"
                  >
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-gray-500">
                        Cantidad: {item.quantity}
                      </p>
                    </div>
                    <p className="font-semibold">
                      ${(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Información del pago */}
          {paymentDetails && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="flex items-center mb-4">
                <CreditCard className="w-5 h-5 text-blue-600 mr-2" />
                <h2 className="text-xl font-semibold text-gray-900">
                  Detalles del pago
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">ID de transacción</p>
                  <p className="font-semibold">
                    {paymentDetails.transactionId}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Método de pago</p>
                  <p className="font-semibold">{paymentDetails.method}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Estado</p>
                  <p className="font-semibold">{paymentDetails.status}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Procesado el</p>
                  <p className="font-semibold">
                    {new Date(paymentDetails.processedAt).toLocaleDateString(
                      'es-ES'
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Información de envío */}
          {orderDetails.shippingAddress && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="flex items-center mb-4">
                <Truck className="w-5 h-5 text-blue-600 mr-2" />
                <h2 className="text-xl font-semibold text-gray-900">
                  Dirección de envío
                </h2>
              </div>

              <div className="text-gray-700">
                <p>{orderDetails.shippingAddress.fullName}</p>
                <p>{orderDetails.shippingAddress.address}</p>
                <p>
                  {orderDetails.shippingAddress.city},{' '}
                  {orderDetails.shippingAddress.postalCode}
                </p>
                <p>{orderDetails.shippingAddress.country}</p>
              </div>
            </div>
          )}

          {/* Acciones */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href={`/orders/${orderDetails._id}`}
              className="inline-flex items-center justify-center bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Package className="mr-2 h-4 w-4" />
              Ver detalles de la orden
            </Link>

            <Link
              href="/products"
              className="inline-flex items-center justify-center bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <ArrowRight className="mr-2 h-4 w-4" />
              Continuar comprando
            </Link>

            <Link
              href="/"
              className="inline-flex items-center justify-center border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Home className="mr-2 h-4 w-4" />
              Volver al inicio
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      }
    >
      <CheckoutSuccessPageContent />
    </Suspense>
  );
}
