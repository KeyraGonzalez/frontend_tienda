'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { XCircle, ArrowLeft, Home, CreditCard } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export default function CheckoutCancelPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
  }, [mounted, isAuthenticated, router]);

  if (!mounted) {
    return null;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50">
      <Header />

      <main className="container mx-auto px-4 py-16 max-w-4xl">
        {/* Cancel Header */}
        <div className="text-center mb-12">
          <div className="bg-white rounded-3xl shadow-2xl p-8 mb-8">
            <div className="text-orange-500 mb-6">
              <XCircle className="h-24 w-24 mx-auto" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Pago Cancelado
            </h1>
            <p className="text-xl text-gray-600 mb-2">
              Has cancelado el proceso de pago
            </p>
            <p className="text-lg text-gray-500">
              No se ha realizado ningún cargo a tu método de pago
            </p>
          </div>
        </div>

        {/* Information */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">¿Qué pasó?</h2>

          <div className="space-y-4 text-gray-600">
            <p>
              El proceso de pago fue cancelado antes de completarse. Esto puede
              haber ocurrido por:
            </p>

            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Decidiste no continuar con la compra</li>
              <li>Cerraste la ventana de pago accidentalmente</li>
              <li>Hubo un problema técnico durante el proceso</li>
              <li>Tu sesión de pago expiró</li>
            </ul>

            <p className="mt-6">
              <strong>Tu carrito de compras se mantiene intacto</strong>, así
              que puedes continuar donde lo dejaste cuando estés listo.
            </p>
          </div>
        </div>

        {/* What's Next */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <CreditCard className="h-6 w-6 mr-2" />
            ¿Qué puedes hacer ahora?
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start space-x-4">
                <div className="bg-blue-100 rounded-full p-2 mt-1">
                  <span className="block w-2 h-2 bg-blue-600 rounded-full"></span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    Volver al carrito
                  </h3>
                  <p className="text-gray-600">
                    Revisa tu carrito y continúa con el proceso de compra cuando
                    estés listo.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="bg-blue-100 rounded-full p-2 mt-1">
                  <span className="block w-2 h-2 bg-blue-600 rounded-full"></span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    Intentar otro método de pago
                  </h3>
                  <p className="text-gray-600">
                    Prueba con una tarjeta diferente o cambia a PayPal.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start space-x-4">
                <div className="bg-blue-100 rounded-full p-2 mt-1">
                  <span className="block w-2 h-2 bg-blue-600 rounded-full"></span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    Seguir navegando
                  </h3>
                  <p className="text-gray-600">
                    Explora más productos y vuelve cuando tengas todo listo.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="bg-blue-100 rounded-full p-2 mt-1">
                  <span className="block w-2 h-2 bg-blue-600 rounded-full"></span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    Contactar soporte
                  </h3>
                  <p className="text-gray-600">
                    Si necesitas ayuda, nuestro equipo está listo para
                    asistirte.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            💡 Consejos para tu próxima compra
          </h2>

          <div className="grid md:grid-cols-2 gap-4 text-gray-700">
            <ul className="space-y-2">
              <li className="flex items-start">
                <span className="text-blue-500 mr-2">•</span>
                Verifica que tu tarjeta tenga fondos suficientes
              </li>
              <li className="flex items-start">
                <span className="text-blue-500 mr-2">•</span>
                Asegúrate de tener una conexión estable a internet
              </li>
            </ul>
            <ul className="space-y-2">
              <li className="flex items-start">
                <span className="text-blue-500 mr-2">•</span>
                Revisa que los datos de facturación sean correctos
              </li>
              <li className="flex items-start">
                <span className="text-blue-500 mr-2">•</span>
                Considera usar PayPal como alternativa
              </li>
            </ul>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/cart"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg transition-colors flex items-center justify-center font-semibold"
            >
              <ArrowLeft className="mr-2 h-5 w-5" />
              Volver al carrito
            </Link>

            <Link
              href="/checkout"
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-lg transition-colors flex items-center justify-center font-semibold"
            >
              <CreditCard className="mr-2 h-5 w-5" />
              Intentar de nuevo
            </Link>

            <Link
              href="/products"
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-8 py-4 rounded-lg transition-colors flex items-center justify-center font-semibold"
            >
              Seguir comprando
            </Link>

            <Link
              href="/"
              className="bg-orange-100 hover:bg-orange-200 text-orange-800 px-8 py-4 rounded-lg transition-colors flex items-center justify-center font-semibold"
            >
              <Home className="mr-2 h-5 w-5" />
              Ir al inicio
            </Link>
          </div>
        </div>

        {/* Support */}
        <div className="text-center mt-8">
          <p className="text-gray-600">
            ¿Necesitas ayuda?{' '}
            <Link
              href="/contact"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Contacta con nuestro equipo de soporte
            </Link>
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
