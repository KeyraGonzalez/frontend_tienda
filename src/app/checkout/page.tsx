'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  CreditCard,
  Truck,
  Shield,
  ArrowLeft,
  Check,
  Lock,
  Star,
  AlertCircle,
  Loader2,
  Info,
} from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { ordersApi, CreateOrderData } from '@/lib/api/orders';
import { paymentsApi, ProcessPaymentData } from '@/lib/api/payments';

import toast from 'react-hot-toast';

// Test function to check API connectivity
const testApiConnection = async (token: string) => {
  try {
    console.log('=== TESTING API CONNECTION ===');
    console.log('API URL:', process.env.NEXT_PUBLIC_API_URL);
    console.log('Token present:', !!token);

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/cart/debug`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('API Response:', data);
    return data;
  } catch (error) {
    console.error('API Connection Error:', error);
    throw error;
  }
};

// PayPal SDK types
declare global {
  interface Window {
    paypal?: any;
  }
}

// Stripe types
interface StripeCardElement {
  mount: (element: string) => void;
  unmount: () => void;
  on: (event: string, handler: (event: any) => void) => void;
}

interface Stripe {
  elements: () => any;
  createPaymentMethod: (options: any) => Promise<any>;
  confirmCardPayment: (clientSecret: string, options?: any) => Promise<any>;
}

declare global {
  interface Window {
    Stripe?: (publishableKey: string) => Stripe;
  }
}

export default function CheckoutPage() {
  const { cart, clearCart, refreshCart, addToCart } = useCart();
  const { user, token, isAuthenticated } = useAuth();
  const router = useRouter();

  // Prevent hydration issues
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // State management
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<
    'stripe' | 'paypal'
  >('stripe');

  // Stripe state
  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [stripeElements, setStripeElements] = useState<any>(null);
  const [stripeCard, setStripeCard] = useState<StripeCardElement | null>(null);
  const [stripeError, setStripeError] = useState<string | null>(null);

  // PayPal state
  const [paypalLoaded, setPaypalLoaded] = useState(false);
  const [paypalOrderId, setPaypalOrderId] = useState<string | null>(null); // Form data
  const [shippingData, setShippingData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'USA',
    phone: '',
  });

  // Authentication check
  useEffect(() => {
    if (!mounted) return; // Wait for mount

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (!cart || cart.items.length === 0) {
      router.push('/cart');
      return;
    }
  }, [mounted, isAuthenticated, cart, router]);

  // Load payment SDKs
  useEffect(() => {
    if (!mounted) return; // Wait for mount

    // Load Stripe
    const loadStripe = async () => {
      try {
        if (!window.Stripe) {
          const script = document.createElement('script');
          script.src = 'https://js.stripe.com/v3/';
          script.async = true;

          script.onload = () => {
            try {
              const publishableKey =
                process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
              if (!publishableKey) {
                console.error('Stripe publishable key not found');
                return;
              }

              const stripeInstance = window.Stripe!(publishableKey);
              setStripe(stripeInstance);
              const elements = stripeInstance.elements();
              setStripeElements(elements);
            } catch (error) {
              console.error('Error initializing Stripe:', error);
            }
          };

          script.onerror = () => {
            console.error('Failed to load Stripe script');
          };

          document.head.appendChild(script);
        } else {
          try {
            const publishableKey =
              process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
            if (!publishableKey) {
              console.error('Stripe publishable key not found');
              return;
            }

            const stripeInstance = window.Stripe!(publishableKey);
            setStripe(stripeInstance);
            const elements = stripeInstance.elements();
            setStripeElements(elements);
          } catch (error) {
            console.error('Error initializing Stripe:', error);
          }
        }
      } catch (error) {
        console.error('Error loading Stripe:', error);
      }
    };

    // Load PayPal
    const loadPayPal = async () => {
      try {
        if (!window.paypal) {
          const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
          if (!clientId) {
            console.error('PayPal client ID not found');
            return;
          }

          const script = document.createElement('script');
          script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD`;
          script.async = true;

          script.onload = () => {
            setPaypalLoaded(true);
          };

          script.onerror = () => {
            console.error('Failed to load PayPal script');
          };

          document.head.appendChild(script);
        } else {
          setPaypalLoaded(true);
        }
      } catch (error) {
        console.error('Error loading PayPal:', error);
      }
    };

    loadStripe();
    loadPayPal();
  }, [mounted]);

  // Initialize Stripe card element
  useEffect(() => {
    if (
      stripeElements &&
      selectedPaymentMethod === 'stripe' &&
      currentStep === 2 &&
      mounted
    ) {
      try {
        // Clean up previous card element if exists
        if (stripeCard) {
          stripeCard.unmount();
          setStripeCard(null);
        }

        // Wait a bit for DOM to be ready
        const timer = setTimeout(() => {
          const cardElement = stripeElements.create('card', {
            style: {
              base: {
                fontSize: '16px',
                color: '#424770',
                fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
                fontSmoothing: 'antialiased',
                '::placeholder': {
                  color: '#aab7c4',
                },
                padding: '12px',
              },
              invalid: {
                color: '#9e2146',
                iconColor: '#9e2146',
              },
            },
            hidePostalCode: true,
          });

          // Check if element exists before mounting
          const mountElement = document.getElementById('stripe-card-element');
          if (mountElement) {
            cardElement.mount('#stripe-card-element');
            setStripeCard(cardElement);

            cardElement.on('change', (event: any) => {
              setStripeError(event.error ? event.error.message : null);
            });

            cardElement.on('ready', () => {
              console.log('Stripe card element is ready');
            });
          }
        }, 100);

        return () => {
          clearTimeout(timer);
          if (stripeCard) {
            try {
              stripeCard.unmount();
            } catch (error) {
              console.log('Error unmounting Stripe card:', error);
            }
          }
        };
      } catch (error) {
        console.error('Error initializing Stripe card element:', error);
      }
    }
  }, [stripeElements, selectedPaymentMethod, currentStep, mounted]);

  // Prevent hydration mismatch
  if (!mounted) {
    return null;
  }

  if (!isAuthenticated || !cart || cart.items.length === 0) {
    return null;
  }

  // Calculate totals
  const subtotal = cart.totalAmount;
  const tax = subtotal * 0.1;
  const shipping = subtotal > 100 ? 0 : 10;
  const total = subtotal + tax + shipping;

  // Debug function
  const debugCart = async () => {
    try {
      // First test API connection
      await testApiConnection(token!);

      // Then get cart debug info
      toast.success('Debug info logged to console - Check console for details');
    } catch (error) {
      console.error('Debug error:', error);
      toast.error(
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  };

  // Handle shipping form submission
  const handleShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentStep(2);
  };

  // Handle Stripe payment
  const handleStripePayment = async (orderId: string) => {
    if (!stripe || !stripeCard) {
      throw new Error('Stripe no está disponible');
    }

    setPaymentProcessing(true);
    try {
      // Create payment method
      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: stripeCard,
        billing_details: {
          name: `${shippingData.firstName} ${shippingData.lastName}`,
          email: user?.email,
          address: {
            line1: shippingData.street,
            city: shippingData.city,
            state: shippingData.state,
            postal_code: shippingData.zipCode,
            country: shippingData.country,
          },
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      // Process payment with backend
      const paymentData: ProcessPaymentData = {
        orderId,
        method: 'stripe',
        paymentDetails: {
          paymentMethodId: paymentMethod.id,
        },
      };

      const payment = await paymentsApi.processPayment(token!, paymentData);

      if (payment.requiresAction && payment.clientSecret) {
        // Handle 3D Secure authentication
        const { error: confirmError } = await stripe.confirmCardPayment(
          payment.clientSecret
        );
        if (confirmError) {
          throw new Error(confirmError.message);
        }
      }

      return payment;
    } finally {
      setPaymentProcessing(false);
    }
  };

  // Handle PayPal payment
  const handlePayPalPayment = async (orderId: string) => {
    return new Promise((resolve, reject) => {
      if (!window.paypal) {
        reject(new Error('PayPal no está disponible'));
        return;
      }

      setPaymentProcessing(true);

      window.paypal
        .Buttons({
          createOrder: async () => {
            try {
              // Create PayPal order through backend
              const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/payments/paypal/create-order`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({ orderId }),
                }
              );

              const data = await response.json();
              setPaypalOrderId(data.orderId);
              return data.orderId;
            } catch (error) {
              reject(error);
            }
          },
          onApprove: async (data: any) => {
            try {
              // Process payment with backend
              const paymentData: ProcessPaymentData = {
                orderId,
                method: 'paypal',
                paymentDetails: {
                  paypalOrderId: data.orderID,
                  payerId: data.payerID,
                },
              };

              const payment = await paymentsApi.processPayment(
                token!,
                paymentData
              );
              resolve(payment);
            } catch (error) {
              reject(error);
            } finally {
              setPaymentProcessing(false);
            }
          },
          onError: () => {
            setPaymentProcessing(false);
            reject(new Error('Error en el pago de PayPal'));
          },
          onCancel: () => {
            setPaymentProcessing(false);
            reject(new Error('Pago cancelado por el usuario'));
          },
        })
        .render('#paypal-button-container');
    });
  };

  // Handle payment submission
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Debug: Check cart state before creating order
      console.log('=== CHECKOUT DEBUG ===');
      console.log('Cart state:', cart);
      console.log('User:', user);
      console.log('Token:', token ? 'Present' : 'Missing');
      console.log('Cart items count:', cart?.items?.length || 0);

      if (!cart || cart.items.length === 0) {
        toast.error(
          'El carrito está vacío. Por favor, agrega productos antes de continuar.'
        );
        setIsLoading(false);
        return;
      }

      // Refresh cart to ensure it's synced with backend
      await refreshCart();

      // Create order first
      const orderData: CreateOrderData = {
        shippingAddress: shippingData,
      };

      console.log('Creating order with data:', orderData);
      const order = await ordersApi.createOrder(token!, orderData);

      // Process payment based on selected method
      let payment;
      if (selectedPaymentMethod === 'stripe') {
        payment = await handleStripePayment(order._id);
      } else {
        payment = await handlePayPalPayment(order._id);
      }

      // Check payment status
      if (payment.success || payment.status === 'completed') {
        await clearCart();
        toast.success('¡Pedido realizado con éxito!');
        router.push(`/orders/${order._id}`);
      } else {
        toast.error('El pago falló. Por favor, inténtalo de nuevo.');
      }
    } catch (error: any) {
      const message = error.message || 'Error al realizar el pedido';
      toast.error(message);
    } finally {
      setIsLoading(false);
      setPaymentProcessing(false);
    }
  };

  const steps = [
    { number: 1, title: 'Envío', icon: Truck },
    { number: 2, title: 'Pago', icon: CreditCard },
    { number: 3, title: 'Confirmación', icon: Check },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-8">
          <button
            onClick={() => router.push('/cart')}
            className="hover:text-blue-600 transition-colors flex items-center space-x-1"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver</span>
          </button>
          <span>/</span>
          <span className="text-gray-900 font-medium">Finalizar Compra</span>
        </nav>

        {/* Page Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Finalizar Compra
          </h1>
          <p className="text-gray-600">
            Completa tu información para procesar tu pedido de forma segura
          </p>

          {/* Debug buttons - temporary */}
          <div className="mt-4 space-x-2">
            <button
              onClick={debugCart}
              className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 text-sm"
            >
              🐛 Debug Cart
            </button>
            <button
              onClick={async () => {
                try {
                  console.log('=== TESTING ADD TO CART ===');
                  // Use a dummy product ID for testing
                  await addToCart('test-product-id', 1);
                  toast.success('Test product added to cart');
                } catch (error) {
                  console.error('Test add to cart error:', error);
                  toast.error('Failed to add test product');
                }
              }}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm"
            >
              🧪 Test Add to Cart
            </button>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="mb-12">
          <div className="flex items-center justify-center">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 shadow-lg ${
                    currentStep >= step.number
                      ? 'border-blue-500 bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                      : 'border-gray-300 bg-white text-gray-400'
                  }`}
                >
                  <step.icon className="w-6 h-6" />
                </div>
                <span
                  className={`ml-3 text-sm font-medium ${
                    currentStep >= step.number
                      ? 'text-blue-600'
                      : 'text-gray-400'
                  }`}
                >
                  {step.title}
                </span>
                {index < steps.length - 1 && (
                  <div
                    className={`w-20 h-1 mx-6 rounded-full transition-all duration-300 ${
                      currentStep > step.number
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500'
                        : 'bg-gray-300'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Step 1: Shipping Information */}
            {currentStep === 1 && (
              <Card className="p-8 shadow-lg">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <Truck className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Información de Envío
                  </h2>
                </div>

                <form onSubmit={handleShippingSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Nombre"
                      value={shippingData.firstName}
                      onChange={(e) =>
                        setShippingData((prev) => ({
                          ...prev,
                          firstName: e.target.value,
                        }))
                      }
                      required
                    />
                    <Input
                      label="Apellido"
                      value={shippingData.lastName}
                      onChange={(e) =>
                        setShippingData((prev) => ({
                          ...prev,
                          lastName: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>

                  <Input
                    label="Dirección"
                    value={shippingData.street}
                    onChange={(e) =>
                      setShippingData((prev) => ({
                        ...prev,
                        street: e.target.value,
                      }))
                    }
                    placeholder="Calle, número, apartamento"
                    required
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Ciudad"
                      value={shippingData.city}
                      onChange={(e) =>
                        setShippingData((prev) => ({
                          ...prev,
                          city: e.target.value,
                        }))
                      }
                      required
                    />
                    <Input
                      label="Estado/Provincia"
                      value={shippingData.state}
                      onChange={(e) =>
                        setShippingData((prev) => ({
                          ...prev,
                          state: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Código Postal"
                      value={shippingData.zipCode}
                      onChange={(e) =>
                        setShippingData((prev) => ({
                          ...prev,
                          zipCode: e.target.value,
                        }))
                      }
                      required
                    />
                    <Input
                      label="Teléfono"
                      type="tel"
                      value={shippingData.phone}
                      onChange={(e) =>
                        setShippingData((prev) => ({
                          ...prev,
                          phone: e.target.value,
                        }))
                      }
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full px-6 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium rounded-lg hover:from-blue-600 hover:to-purple-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all shadow-lg transform hover:scale-105"
                  >
                    Continuar al Pago
                  </button>
                </form>
              </Card>
            )}

            {/* Step 2: Payment Information */}
            {currentStep === 2 && (
              <Card className="p-8 shadow-lg">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Método de Pago
                  </h2>
                </div>

                <form onSubmit={handlePaymentSubmit} className="space-y-6">
                  {/* Payment Method Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-4">
                      Selecciona tu método de pago
                    </label>
                    <div className="grid grid-cols-1 gap-4">
                      {/* Stripe Option */}
                      <label
                        className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md ${
                          selectedPaymentMethod === 'stripe'
                            ? 'border-blue-500 bg-blue-50 shadow-md'
                            : 'border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="stripe"
                          checked={selectedPaymentMethod === 'stripe'}
                          onChange={(e) =>
                            setSelectedPaymentMethod(e.target.value as 'stripe')
                          }
                          className="mr-3 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex items-center">
                          <span className="mr-3 text-2xl">💳</span>
                          <div>
                            <div className="font-medium text-gray-900">
                              Tarjeta de Crédito/Débito
                            </div>
                            <div className="text-sm text-gray-500">
                              Visa, Mastercard, American Express
                            </div>
                          </div>
                        </div>
                      </label>

                      {/* PayPal Option */}
                      <label
                        className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md ${
                          selectedPaymentMethod === 'paypal'
                            ? 'border-blue-500 bg-blue-50 shadow-md'
                            : 'border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="paypal"
                          checked={selectedPaymentMethod === 'paypal'}
                          onChange={(e) =>
                            setSelectedPaymentMethod(e.target.value as 'paypal')
                          }
                          className="mr-3 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex items-center">
                          <span className="mr-3 text-2xl">🅿️</span>
                          <div>
                            <div className="font-medium text-gray-900">
                              PayPal
                            </div>
                            <div className="text-sm text-gray-500">
                              Paga con tu cuenta de PayPal
                            </div>
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Stripe Card Element */}
                  {selectedPaymentMethod === 'stripe' && (
                    <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                      <h3 className="font-medium text-gray-900 mb-4">
                        Información de la Tarjeta
                      </h3>

                      {stripe && stripeElements ? (
                        <>
                          <div className="mb-4">
                            <div className="flex items-center space-x-2 text-green-600 text-sm mb-2">
                              <Check className="w-4 h-4" />
                              <span>
                                Procesador de pagos cargado correctamente
                              </span>
                            </div>
                          </div>

                          <div className="p-4 border border-gray-300 rounded-lg bg-white">
                            <div
                              id="stripe-card-element"
                              className="min-h-[40px]"
                            >
                              {/* Stripe Elements will mount here */}
                            </div>
                          </div>

                          {stripeError && (
                            <div className="flex items-center space-x-2 text-red-600 text-sm">
                              <AlertCircle className="w-4 h-4" />
                              <span>{stripeError}</span>
                            </div>
                          )}

                          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-center space-x-2 text-blue-700 text-sm">
                              <Info className="w-4 h-4" />
                              <span>
                                Para pruebas, usa: 4242 4242 4242 4242,
                                cualquier fecha futura y CVC
                              </span>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex items-center justify-center p-8 bg-white border border-gray-300 rounded-lg">
                            <div className="text-center">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                              <p className="text-gray-600">
                                Cargando procesador de pagos...
                              </p>
                            </div>
                          </div>

                          {/* Fallback form while Stripe loads */}
                          <div className="space-y-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <div className="flex items-center space-x-2 text-yellow-800">
                              <AlertCircle className="w-4 h-4" />
                              <span className="text-sm">
                                Formulario de respaldo (solo para pruebas)
                              </span>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                              <Input
                                label="Número de Tarjeta"
                                placeholder="1234 5678 9012 3456"
                                disabled
                                className="bg-gray-100"
                              />
                              <div className="grid grid-cols-2 gap-4">
                                <Input
                                  label="MM/YY"
                                  placeholder="12/25"
                                  disabled
                                  className="bg-gray-100"
                                />
                                <Input
                                  label="CVC"
                                  placeholder="123"
                                  disabled
                                  className="bg-gray-100"
                                />
                              </div>
                              <Input
                                label="Nombre en la Tarjeta"
                                placeholder="Juan Pérez"
                                disabled
                                className="bg-gray-100"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* PayPal Container */}
                  {selectedPaymentMethod === 'paypal' && (
                    <div className="space-y-4">
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="text-2xl">🅿️</div>
                          <div>
                            <h3 className="font-medium text-blue-900">
                              Pago con PayPal
                            </h3>
                            <p className="text-sm text-blue-700">
                              Haz clic en "Realizar Pedido" para continuar con
                              PayPal
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* PayPal button will be rendered here */}
                      <div
                        id="paypal-button-container"
                        className="hidden"
                      ></div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex space-x-4">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="flex-1 px-6 py-3 bg-white text-gray-700 border border-gray-300 font-medium rounded-lg hover:bg-gray-50 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all shadow-sm"
                    >
                      Volver
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading || paymentProcessing}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium rounded-lg hover:from-blue-600 hover:to-purple-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all shadow-lg transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      {isLoading || paymentProcessing ? (
                        <div className="flex items-center justify-center">
                          <Loader2 className="animate-spin w-4 h-4 mr-2" />
                          Procesando...
                        </div>
                      ) : (
                        'Realizar Pedido'
                      )}
                    </button>
                  </div>
                </form>
              </Card>
            )}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-8">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                  <Star className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">
                  Resumen del Pedido
                </h2>
              </div>

              {/* Items */}
              <div className="space-y-4 mb-6">
                {cart.items.map((item) => (
                  <div
                    key={item._id}
                    className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg border border-blue-100"
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center shadow-sm">
                      <span className="text-xs text-blue-400 font-medium">
                        IMG
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {item.productId?.name ?? 'Producto desconocido'}
                      </h4>
                      <p className="text-xs text-gray-500">
                        Cant: {item.quantity}{' '}
                        {item.size && `• Talla: ${item.size}`}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-blue-600">
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-3 mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Envío</span>
                  <span>
                    {shipping === 0 ? (
                      <span className="text-green-600 font-medium">Gratis</span>
                    ) : (
                      `$${shipping.toFixed(2)}`
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Impuestos</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <hr className="border-gray-300" />
                <div className="flex justify-between text-lg font-bold text-gray-900">
                  <span>Total</span>
                  <span className="text-blue-600">${total.toFixed(2)}</span>
                </div>
              </div>

              {/* Security Features */}
              <div className="space-y-3 pt-4 border-t border-gray-200">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Shield className="w-4 h-4 text-green-500" />
                  <span>Pago 100% seguro</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Lock className="w-4 h-4 text-green-500" />
                  <span>Datos protegidos con SSL</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Truck className="w-4 h-4 text-green-500" />
                  <span>Envío gratis en compras +$100</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
