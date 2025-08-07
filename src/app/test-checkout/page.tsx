import Link from 'next/link';

export default function TestCheckoutPage() {
  // Simulamos algunos IDs de prueba
  const testOrderId = '507f1f77bcf86cd799439011';
  const testSessionId = 'cs_test_123456789';

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          Probar Página de Éxito
        </h1>

        <p className="text-gray-600 mb-6">
          Esta página te permite probar la funcionalidad de checkout success con
          diferentes parámetros:
        </p>

        <div className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Prueba con orderId:</h3>
            <Link
              href={`/checkout/success?orderId=${testOrderId}`}
              className="block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors text-center"
            >
              Probar con orderId
            </Link>
          </div>

          <div>
            <h3 className="font-semibold mb-2">
              Prueba con order_id (Stripe):
            </h3>
            <Link
              href={`/checkout/success?order_id=${testOrderId}&session_id=${testSessionId}`}
              className="block bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors text-center"
            >
              Probar con order_id (Stripe)
            </Link>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Prueba sin parámetros:</h3>
            <Link
              href="/checkout/success"
              className="block bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors text-center"
            >
              Probar sin parámetros (error)
            </Link>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t">
          <Link
            href="/"
            className="block text-center text-gray-600 hover:text-gray-800"
          >
            ← Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
