'use client';

import { Suspense } from 'react';
import { lazy } from 'react';

// Forzar renderizado dinámico
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;

// Importar dinámicamente el componente que usa useSearchParams
const CheckoutSuccessContent = lazy(() => import('./CheckoutSuccessContent'));

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      }
    >
      <CheckoutSuccessContent />
    </Suspense>
    );
  }
