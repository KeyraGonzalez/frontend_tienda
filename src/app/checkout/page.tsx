'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { paymentsApi } from '@/lib/api/payments';
import { ordersApi, CreateOrderData } from '@/lib/api/orders';
import {
  CreditCard,
  Truck,
  Check,
  ShoppingBag,
  MapPin,
  User,
  Phone,
  Mail,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import toast from 'react-hot-toast';
import { Input } from '@/components/ui/Input';
import Script from 'next/script';

// Declaraciones de PayPal
declare global {
  interface Window {
    paypal: any;
  }
}

interface ShippingData {
  firstName: string;
  lastName: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone: string;
}

export default function CheckoutPage() {
  const { cart, clearCart, refreshCart } = useCart();
  const { user, token, isAuthenticated } = useAuth();
  const router = useRouter();
  const paypalButtonRef = useRef<HTMLDivElement>(null);

  // State
  const [mounted, setMounted] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paypalLoaded, setPaypalLoaded] = useState(false);
  const [paypalInitializing, setPaypalInitializing] = useState(false);
  const [cartCleared, setCartCleared] = useState(false); // Bandera para evitar múltiples limpiezas
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<
    'stripe' | 'paypal'
  >('stripe');

  // Form data
  const [shippingData, setShippingData] = useState<ShippingData>({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'USA',
    phone: '',
  });

  useEffect(() => {
    setMounted(true);

    // Verificar si PayPal ya está cargado
    if (window.paypal) {
      console.log('PayPal already available on window object');
      setPaypalLoaded(true);
    }

    // Timeout de seguridad para PayPal SDK
    const paypalTimeout = setTimeout(() => {
      if (!paypalLoaded && window.paypal) {
        console.log('PayPal detected via timeout check');
        setPaypalLoaded(true);
      } else if (!paypalLoaded) {
        console.warn('PayPal SDK taking too long to load');
        // Podrías mostrar un mensaje de error o alternativa aquí
      }
    }, 10000); // 10 segundos timeout

    return () => clearTimeout(paypalTimeout);
  }, [paypalLoaded]);

  useEffect(() => {
    if (!mounted) return;

    console.log('Authentication/Cart check:', {
      isAuthenticated,
      cartExists: !!cart,
      cartItemsLength: cart?.items?.length || 0,
    });

    if (!isAuthenticated) {
      console.log('User not authenticated, redirecting to login');
      router.push('/login');
      return;
    }

    // Solo redirigir si definitivamente no hay carrito Y no estamos procesando un pago
    if (!cart || cart.items.length === 0) {
      // Dar tiempo para que el carrito se cargue
      if (!paymentProcessing && !isLoading) {
        console.log('Cart is empty and not processing, redirecting to cart');
        setTimeout(() => {
          if (!cart || cart.items.length === 0) {
            router.push('/cart');
          }
        }, 1000);
      }
      return;
    }
  }, [mounted, isAuthenticated, cart, router, paymentProcessing, isLoading]);

  // Efecto para inicializar PayPal cuando se cargue el SDK
  useEffect(() => {
    console.log('PayPal useEffect triggered:', {
      paypalLoaded,
      currentStep,
      selectedPaymentMethod,
      mounted,
      isAuthenticated,
      cartExists: !!cart,
      cartItemsLength: cart?.items?.length || 0,
    });

    if (
      paypalLoaded &&
      currentStep === 2 &&
      selectedPaymentMethod === 'paypal' &&
      mounted &&
      isAuthenticated &&
      cart &&
      cart.items.length > 0
    ) {
      console.log('Initializing PayPal...');
      // Limpiar el contenedor antes de renderizar
      if (paypalButtonRef.current) {
        paypalButtonRef.current.innerHTML = '';
      }

      // Pequeño delay para asegurar que el DOM esté listo
      setTimeout(() => {
        initializePayPal();
      }, 100);
    }
  }, [
    paypalLoaded,
    currentStep,
    selectedPaymentMethod,
    shippingData,
    token,
    mounted,
    isAuthenticated,
    cart,
  ]);

  // Calculate totals - hacer esto de manera segura
  const subtotal = cart?.totalAmount || 0;
  const tax = subtotal * 0.1;
  const shipping = subtotal > 100 ? 0 : 10;
  const total = subtotal + tax + shipping;

  // Handle form submissions
  const handleShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentStep(2);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Si es PayPal, no hacer nada aquí ya que PayPal maneja su propio flujo
    if (selectedPaymentMethod === 'paypal') {
      return;
    }

    setIsLoading(true);
    setPaymentProcessing(true);

    try {
      // Refresh cart to ensure sync
      await refreshCart();

      // Create order first
      const orderData: CreateOrderData = {
        shippingAddress: shippingData,
      };

      console.log('Creating order with data:', orderData);
      const order = await ordersApi.createOrder(token!, orderData);

      // Store order ID for success page
      sessionStorage.setItem('pendingOrderId', order._id);

      // Create payment session and redirect (solo para Stripe)
      if (selectedPaymentMethod === 'stripe') {
        const result = await paymentsApi.createStripeCheckoutSession(
          token!,
          order._id
        );
        console.log('Stripe checkout result:', result); // Debug log

        // La respuesta tiene estructura: { success: true, data: { url: "...", session_id: "..." } }
        const checkoutUrl = result.data?.url || result.url;

        if (checkoutUrl) {
          console.log('Redirecting to Stripe checkout:', checkoutUrl);
          // NOTA: Para Stripe, el carrito se limpiará en la página de éxito (/checkout/success)
          // después de que Stripe confirme el pago exitoso
          window.location.href = checkoutUrl;
        } else {
          console.error('No URL in Stripe response:', result);
          throw new Error('No se pudo crear la sesión de pago');
        }
      }
    } catch (error: any) {
      console.error('Error en checkout:', error);
      const message = error.message || 'Error al procesar el pedido';
      toast.error(message);
    } finally {
      setIsLoading(false);
      setPaymentProcessing(false);
    }
  };

  const handleInputChange = (field: keyof ShippingData, value: string) => {
    setShippingData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Función para validar datos de envío
  const validateShippingData = () => {
    const required = [
      'firstName',
      'lastName',
      'street',
      'city',
      'state',
      'zipCode',
      'phone',
    ];
    for (const field of required) {
      if (!shippingData[field as keyof ShippingData]) {
        toast.error(`El campo ${field} es requerido`);
        return false;
      }
    }
    return true;
  };

  // Función para inicializar PayPal
  const initializePayPal = () => {
    console.log('initializePayPal called');
    console.log('PayPal available:', !!window.paypal);
    console.log('PayPal ref available:', !!paypalButtonRef.current);

    if (!window.paypal) {
      console.error('PayPal SDK not loaded');
      toast.error(
        'PayPal no está disponible. Recarga la página e intenta de nuevo.'
      );
      return;
    }

    if (!paypalButtonRef.current) {
      console.error('PayPal button ref not available');
      return;
    }

    console.log('Creating PayPal buttons...');
    setPaypalInitializing(true);

    window.paypal
      .Buttons({
        createOrder: async () => {
          console.log('PayPal createOrder called');

          try {
            // Validar datos de envío antes de crear la orden
            if (!validateShippingData()) {
              throw new Error('Por favor completa todos los datos de envío');
            }

            console.log('Validation passed, creating order...');
            setIsLoading(true);

            // NO hacer refreshCart aquí ya que puede vaciar el carrito
            // await refreshCart();

            // Crear orden primero
            const orderData: CreateOrderData = {
              shippingAddress: shippingData,
            };

            console.log('Creating order with data:', orderData);
            const order = await ordersApi.createOrder(token!, orderData);
            console.log('Order created:', order);

            sessionStorage.setItem('pendingOrderId', order._id);

            // Crear orden de PayPal
            console.log('Creating PayPal order...');
            const paypalResult = await paymentsApi.createPayPalOrder(
              token!,
              order._id
            );

            console.log('PayPal Order Response:', paypalResult);

            // El backend devuelve { success: true, data: { orderId: "...", approvalUrl: "..." } }
            const paypalOrderId =
              paypalResult.data?.orderId || paypalResult.orderId;

            if (paypalOrderId) {
              console.log('PayPal order created successfully:', paypalOrderId);
              return paypalOrderId;
            } else {
              console.error('No PayPal order ID received:', paypalResult);
              throw new Error('No se pudo crear la orden de PayPal');
            }
          } catch (error: any) {
            console.error('Error creando orden PayPal:', error);
            console.error('Error details:', {
              message: error.message,
              response: error.response?.data,
              status: error.response?.status,
            });
            toast.error(error.message || 'Error al crear la orden');
            throw error;
          } finally {
            setIsLoading(false);
          }
        },
        onApprove: async (data: any) => {
          console.log('PayPal onApprove called with data:', data);

          try {
            setPaymentProcessing(true);
            toast.success('¡Pago aprobado! Procesando...');

            // Redirigir a página de éxito con los datos de PayPal
            const orderId = sessionStorage.getItem('pendingOrderId');
            const paypalOrderId = data.orderID;

            console.log('Redirecting to success with:', {
              paypalOrderId,
              orderId,
              paymentMethod: 'paypal',
            });

            if (!orderId) {
              console.error('No order ID found in session storage');
              throw new Error('Error: No se encontró el ID del pedido');
            }

            if (!paypalOrderId) {
              console.error('No PayPal order ID received');
              throw new Error('Error: No se recibió el ID de PayPal');
            }

            // Limpiar el carrito después de confirmación de pago exitoso (solo una vez)
            if (!cartCleared) {
              console.log('Clearing cart after successful PayPal payment');
              setCartCleared(true);
              clearCart();
            }

            // Redirigir inmediatamente - no esperar más procesos
            router.push(
              `/checkout/success?paypal_order_id=${paypalOrderId}&order_id=${orderId}&payment_method=paypal`
            );
          } catch (error: any) {
            console.error('Error procesando pago PayPal:', error);
            toast.error(error.message || 'Error al procesar el pago');
          } finally {
            setPaymentProcessing(false);
          }
        },
        onError: (err: any) => {
          console.error('PayPal Error:', err);
          console.error('PayPal Error Details:', JSON.stringify(err, null, 2));
          toast.error(
            'Error en el proceso de pago con PayPal. Por favor intenta de nuevo.'
          );
          setIsLoading(false);
          setPaymentProcessing(false);
        },
        onCancel: (data: any) => {
          console.log('PayPal payment cancelled:', data);
          toast.error('Pago cancelado por el usuario');
          setIsLoading(false);
          setPaymentProcessing(false);
        },
        style: {
          layout: 'vertical',
          color: 'blue',
          shape: 'rect',
          label: 'paypal',
          height: 45,
        },
      })
      .render(paypalButtonRef.current)
      .then(() => {
        console.log('PayPal buttons rendered successfully');
        setPaypalInitializing(false);
      })
      .catch((error: any) => {
        console.error('Error rendering PayPal buttons:', error);
        setPaypalInitializing(false);
        toast.error(
          'Error cargando los botones de PayPal. Por favor recarga la página.'
        );
      });
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Acceso requerido
          </h2>
          <p className="text-gray-600">
            Por favor inicia sesión para continuar
          </p>
        </div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Carrito vacío
          </h2>
          <p className="text-gray-600">No hay productos en tu carrito</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* PayPal SDK */}
      <Script
        src={`https://www.paypal.com/sdk/js?client-id=${
          process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || 'test'
        }&currency=USD&intent=capture`}
        onLoad={() => {
          console.log('PayPal SDK script loaded');
          setPaypalLoaded(true);
        }}
        onReady={() => {
          console.log('PayPal SDK ready');
          setPaypalLoaded(true);
        }}
        onError={(error) => {
          console.error('Error loading PayPal SDK:', error);
          setPaypalLoaded(false);
          toast.error('Error cargando PayPal. Intenta con tarjeta de crédito.');
        }}
      />

      <Header />

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-8">
          <button
            onClick={() => router.push('/cart')}
            className="hover:text-blue-600"
          >
            Carrito
          </button>
          <span>›</span>
          <span className="text-blue-600 font-medium">Checkout</span>
        </nav>

        {/* Steps */}
        <div className="flex items-center justify-center mb-12">
          <div className="flex items-center space-x-8">
            <div
              className={`flex items-center space-x-2 ${
                currentStep >= 1 ? 'text-blue-600' : 'text-gray-400'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'
                }`}
              >
                {currentStep > 1 ? <Check className="w-5 h-5" /> : '1'}
              </div>
              <span className="font-medium">Envío</span>
            </div>

            <div className="flex-1 h-px bg-gray-300"></div>

            <div
              className={`flex items-center space-x-2 ${
                currentStep >= 2 ? 'text-blue-600' : 'text-gray-400'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'
                }`}
              >
                {currentStep > 2 ? <Check className="w-5 h-5" /> : '2'}
              </div>
              <span className="font-medium">Pago</span>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Step 1: Shipping */}
            {currentStep === 1 && (
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                    <Truck className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Información de Envío
                  </h2>
                </div>

                <form onSubmit={handleShippingSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <User className="w-4 h-4 inline mr-1" />
                        Nombre
                      </label>
                      <Input
                        type="text"
                        value={shippingData.firstName}
                        onChange={(e) =>
                          handleInputChange('firstName', e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Apellido
                      </label>
                      <Input
                        type="text"
                        value={shippingData.lastName}
                        onChange={(e) =>
                          handleInputChange('lastName', e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <MapPin className="w-4 h-4 inline mr-1" />
                      Dirección
                    </label>
                    <Input
                      type="text"
                      value={shippingData.street}
                      onChange={(e) =>
                        handleInputChange('street', e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ciudad
                      </label>
                      <Input
                        type="text"
                        value={shippingData.city}
                        onChange={(e) =>
                          handleInputChange('city', e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Estado
                      </label>
                      <Input
                        type="text"
                        value={shippingData.state}
                        onChange={(e) =>
                          handleInputChange('state', e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Código Postal
                      </label>
                      <Input
                        type="text"
                        value={shippingData.zipCode}
                        onChange={(e) =>
                          handleInputChange('zipCode', e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Phone className="w-4 h-4 inline mr-1" />
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      value={shippingData.phone}
                      onChange={(e) =>
                        handleInputChange('phone', e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all"
                  >
                    Continuar al Pago
                  </button>
                </form>
              </div>
            )}

            {/* Step 2: Payment */}
            {currentStep === 2 && (
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Método de Pago
                  </h2>
                </div>

                <form onSubmit={handlePaymentSubmit} className="space-y-6">
                  {/* Payment Method Selection */}
                  <div className="space-y-4">
                    <h3 className="font-medium text-gray-700">
                      Selecciona tu método de pago:
                    </h3>

                    {/* Stripe Option */}
                    <label
                      className={`block p-4 border-2 rounded-xl cursor-pointer transition-all ${
                        selectedPaymentMethod === 'stripe'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-center">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="stripe"
                          checked={selectedPaymentMethod === 'stripe'}
                          onChange={(e) => setSelectedPaymentMethod('stripe')}
                          className="mr-3 text-blue-600"
                        />
                        <div className="flex items-center flex-1">
                          <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mr-4">
                            <CreditCard className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">
                              Tarjeta de Crédito/Débito
                            </div>
                            <div className="text-sm text-gray-600">
                              Pago seguro con Stripe
                            </div>
                            <div className="text-xs text-gray-500">
                              Visa, Mastercard, American Express
                            </div>
                          </div>
                        </div>
                      </div>
                    </label>

                    {/* PayPal Option */}
                    <label
                      className={`block p-4 border-2 rounded-xl cursor-pointer transition-all ${
                        selectedPaymentMethod === 'paypal'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-center">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="paypal"
                          checked={selectedPaymentMethod === 'paypal'}
                          onChange={(e) => setSelectedPaymentMethod('paypal')}
                          className="mr-3 text-blue-600"
                        />
                        <div className="flex items-center flex-1">
                          <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mr-4">
                            <span className="text-white font-bold text-lg">
                              P
                            </span>
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">
                              PayPal
                            </div>
                            <div className="text-sm text-gray-600">
                              Pago seguro con PayPal
                            </div>
                            <div className="text-xs text-gray-500">
                              Cuenta PayPal o tarjeta
                            </div>
                          </div>
                        </div>
                      </div>
                    </label>
                  </div>

                  {/* Payment Info */}
                  <div className="bg-gray-50 rounded-xl p-6">
                    <div className="flex items-center text-sm text-gray-600 mb-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                      <span>
                        {selectedPaymentMethod === 'paypal'
                          ? 'Completa tu pago con PayPal de forma segura'
                          : 'Serás redirigido a una página segura para completar el pago'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      Tu información está protegida con encriptación SSL de 256
                      bits
                    </div>
                  </div>

                  {/* PayPal Buttons Area */}
                  {selectedPaymentMethod === 'paypal' && (
                    <div className="bg-white border border-gray-200 rounded-xl p-6">
                      <h4 className="text-lg font-medium text-gray-900 mb-4">
                        Pagar con PayPal
                      </h4>

                      {!paypalLoaded ? (
                        <div className="flex flex-col items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
                          <span className="text-gray-600 mb-4">
                            Cargando PayPal SDK...
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              console.log(
                                'Manual PayPal check - window.paypal:',
                                !!window.paypal
                              );
                              if (window.paypal) {
                                setPaypalLoaded(true);
                              } else {
                                window.location.reload();
                              }
                            }}
                            className="text-blue-600 hover:text-blue-700 text-sm underline"
                          >
                            Haz clic aquí si PayPal no carga
                          </button>
                        </div>
                      ) : paypalInitializing ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
                          <span className="text-gray-600">
                            Inicializando botones PayPal...
                          </span>
                        </div>
                      ) : isLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
                          <span className="text-gray-600">
                            Creando orden...
                          </span>
                        </div>
                      ) : paymentProcessing ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
                          <span className="text-gray-600">
                            Procesando pago...
                          </span>
                        </div>
                      ) : (
                        <div>
                          <div
                            ref={paypalButtonRef}
                            className="paypal-buttons"
                          ></div>
                          <div className="mt-3 text-xs text-gray-500 text-center">
                            Al hacer clic en PayPal, serás redirigido a
                            completar tu pago de forma segura
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Buttons - Solo mostrar si no es PayPal */}
                  {selectedPaymentMethod !== 'paypal' && (
                    <div className="flex space-x-4">
                      <button
                        type="button"
                        onClick={() => setCurrentStep(1)}
                        className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Volver
                      </button>
                      <button
                        type="submit"
                        disabled={isLoading || paymentProcessing}
                        className="flex-1 px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {paymentProcessing ? (
                          <span className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                            Procesando...
                          </span>
                        ) : (
                          `Realizar Pedido - $${total.toFixed(2)}`
                        )}
                      </button>
                    </div>
                  )}

                  {/* Botón de volver para PayPal */}
                  {selectedPaymentMethod === 'paypal' && (
                    <div className="flex justify-start">
                      <button
                        type="button"
                        onClick={() => setCurrentStep(1)}
                        className="px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Volver a Información de Envío
                      </button>
                    </div>
                  )}
                </form>
              </div>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-6">
              <div className="flex items-center space-x-3 mb-6">
                <ShoppingBag className="w-6 h-6 text-blue-600" />
                <h3 className="text-xl font-bold text-gray-900">
                  Resumen del Pedido
                </h3>
              </div>

              {/* Items */}
              <div className="space-y-4 mb-6">
                {cart && cart.items && cart.items.length > 0 ? (
                  cart.items.map((item) => {
                    // Obtener URL de imagen de forma segura
                    let imageUrl = null;
                    if (item.productId?.images && item.productId.images[0]) {
                      const img = item.productId.images[0];
                      imageUrl = typeof img === 'object' ? img.url : img;
                    }

                    return (
                      <div
                        key={`${item.productId}-${item.size || 'default'}`}
                        className="flex items-center space-x-3"
                      >
                        <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={item.productId?.name || 'Producto'}
                              className="w-full h-full object-cover rounded-lg"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                target.parentElement!.innerHTML =
                                  '<div class="w-6 h-6 text-gray-400"><svg fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 2L3 7v11a2 2 0 002 2h10a2 2 0 002-2V7l-7-5z" clip-rule="evenodd"></path></svg></div>';
                              }}
                            />
                          ) : (
                            <ShoppingBag className="w-6 h-6 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 truncate">
                            {item.productId?.name || 'Producto'}
                          </h4>
                          <div className="flex items-center text-sm text-gray-500">
                            <span>Cantidad: {item.quantity}</span>
                            {item.size && (
                              <span className="ml-2">• Talla: {item.size}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-sm font-medium text-gray-900">
                          ${(item.price * item.quantity).toFixed(2)}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex items-center justify-center py-4">
                    <span className="text-gray-500">Cargando productos...</span>
                  </div>
                )}
              </div>

              {/* Totals */}
              <div className="border-t border-gray-200 pt-4 space-y-3">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Envío</span>
                  <span>
                    {shipping === 0 ? 'Gratis' : `$${shipping.toFixed(2)}`}
                  </span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Impuestos</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between text-lg font-bold text-gray-900">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {shipping === 0 && (
                <div className="mt-4 p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center text-sm text-green-800">
                    <Check className="w-4 h-4 mr-2" />
                    <span>¡Envío gratuito incluido!</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
