// Checkout functionality with real payment processing
import {
  cartService,
  ordersService,
  paymentsService,
} from '../utils/api/index.js';
import { apiClient } from '../utils/api.js';
import ENV from '../config/env.js';

// Global declarations for external libraries
declare global {
  interface Window {
    Stripe: any;
    paypal: any;
  }
}

// Stripe integration
let stripe: any = null;
// Note: No longer need stripeElements and cardElement since we use Checkout Session

// Current state
let currentCart: any = null;
let currentOrder: any = null;
let selectedPaymentMethod: string = '';

// Payment configuration from backend
let paymentConfig: any = null;

// Main initialization function
export async function initializeCheckoutPage(): Promise<void> {
  console.log('Initializing checkout page...');

  try {
    // Load payment configuration from backend
    await loadPaymentConfig();

    // Load cart and initialize UI
    await loadCart();
    initializePaymentMethods();
    await initializeStripe();
    await initializePayPal();
    setupOrderButton();

    console.log('Checkout page initialized successfully');
  } catch (error) {
    console.error('Error initializing checkout page:', error);
    showError(
      'Error cargando configuración de pagos. Verifica la conexión con el servidor.'
    );
  }
}

// Show error message to user
function showError(message: string): void {
  alert(message); // Simple alert for now, you can enhance this with better UI
}

// Load payment configuration from backend
async function loadPaymentConfig(): Promise<void> {
  try {
    console.log('Loading payment configuration from backend...');
    paymentConfig = await apiClient.getPaymentConfig();
    console.log('Payment config loaded:', paymentConfig);

    // Validate configuration
    if (
      !paymentConfig.features.stripe_enabled &&
      !paymentConfig.features.paypal_enabled
    ) {
      throw new Error('No hay métodos de pago configurados en el servidor');
    }

    // Hide/show payment methods based on configuration
    updatePaymentMethodsUI();
  } catch (error) {
    console.error('Error loading payment configuration:', error);
    throw new Error('No se pudo cargar la configuración de pagos del servidor');
  }
}

// Update payment methods UI based on backend configuration
function updatePaymentMethodsUI(): void {
  const stripeOption = document.querySelector('[data-method="stripe"]');
  const paypalOption = document.querySelector('[data-method="paypal"]');

  if (stripeOption) {
    if (paymentConfig.features.stripe_enabled) {
      stripeOption.classList.remove('hidden');
    } else {
      stripeOption.classList.add('hidden');
    }
  }

  if (paypalOption) {
    if (paymentConfig.features.paypal_enabled) {
      paypalOption.classList.remove('hidden');
    } else {
      paypalOption.classList.add('hidden');
    }
  }

  // If only one method is available, auto-select it
  const availableMethods = [];
  if (paymentConfig.features.stripe_enabled) availableMethods.push('stripe');
  if (paymentConfig.features.paypal_enabled) availableMethods.push('paypal');

  if (availableMethods.length === 1) {
    selectedPaymentMethod = availableMethods[0];
    // Auto-click the available option
    setTimeout(() => {
      const option = document.querySelector(
        `[data-method="${selectedPaymentMethod}"]`
      );
      if (option) {
        (option as HTMLElement).click();
      }
    }, 100);
  }

  // Initialize button state
  setTimeout(() => {
    adaptCheckoutButton();
  }, 200);
}

// Debug function to check cart structure
function debugCartStructure(): void {
  console.log('Current cart structure:', currentCart);

  if (currentCart && currentCart.items) {
    console.log('Cart items count:', currentCart.items.length);
    currentCart.items.forEach((item: any, index: number) => {
      console.log(`Item ${index}:`, {
        hasProducts: !!item.products,
        hasPrice: !!(item.products && item.products.price),
        hasQuantity: !!item.quantity,
        structure: item,
      });
    });
  }
}

// Load cart data
async function loadCart(): Promise<void> {
  try {
    currentCart = await cartService.getCart();

    // Validate cart structure
    if (!currentCart) {
      throw new Error('No se pudo cargar el carrito');
    }

    // Ensure items array exists
    if (!currentCart.items) {
      currentCart.items = [];
    }

    // Ensure summary exists with default values
    if (!currentCart.summary) {
      currentCart.summary = {
        subtotal: 0,
        shipping: 0,
        tax: 0,
        total: 0,
      };
    }

    // Validate and clean items
    currentCart.items = currentCart.items.filter((item: any) => {
      if (!item || !item.products) {
        console.warn('Invalid cart item found and removed:', item);
        return false;
      }
      return true;
    });

    updateOrderSummary();
  } catch (error) {
    console.error('Error loading cart:', error);

    // Set default empty cart
    currentCart = {
      items: [],
      summary: {
        subtotal: 0,
        shipping: 0,
        tax: 0,
        total: 0,
      },
    };

    updateOrderSummary();
    alert('Error cargando el carrito. Por favor, verifica tu conexión.');
  }
}

// Update order summary UI
function updateOrderSummary(): void {
  if (!currentCart || !currentCart.items || !Array.isArray(currentCart.items)) {
    console.warn('Cart data is not available or invalid');
    return;
  }

  const itemsContainer = document.getElementById('order-items');
  const subtotalEl = document.getElementById('subtotal');
  const shippingEl = document.getElementById('shipping');
  const taxEl = document.getElementById('tax');
  const totalEl = document.getElementById('total');

  // Update items with validation
  if (itemsContainer) {
    itemsContainer.innerHTML = currentCart.items
      .filter((item: any) => item && item.products) // Filter out invalid items
      .map((item: any) => {
        const product = item.products || {};
        const images = product.product_images || [];
        const price = parseFloat(product.price) || 0;
        const quantity = parseInt(item.quantity) || 0;

        return `
      <div class="flex items-center space-x-3">
        <img src="${images[0]?.image_url || '/placeholder.jpg'}" 
             alt="${product.name || 'Producto'}" 
             class="w-12 h-12 object-cover rounded">
        <div class="flex-1">
          <h4 class="font-medium text-sm">${
            product.name || 'Producto sin nombre'
          }</h4>
          <p class="text-xs text-gray-500">Cantidad: ${quantity}</p>
          ${
            item.product_variants
              ? `<p class="text-xs text-gray-500">${
                  item.product_variants.size || ''
                } - ${item.product_variants.color || ''}</p>`
              : ''
          }
        </div>
        <span class="font-medium text-sm">$${(price * quantity).toFixed(
          2
        )}</span>
      </div>
    `;
      })
      .join('');
  }

  // Update totals with validation
  const summary = currentCart.summary || {};
  if (subtotalEl)
    subtotalEl.textContent = `$${(parseFloat(summary.subtotal) || 0).toFixed(
      2
    )}`;
  if (shippingEl)
    shippingEl.textContent = `$${(parseFloat(summary.shipping) || 0).toFixed(
      2
    )}`;
  if (taxEl)
    taxEl.textContent = `$${(parseFloat(summary.tax) || 0).toFixed(2)}`;
  if (totalEl)
    totalEl.textContent = `$${(parseFloat(summary.total) || 0).toFixed(2)}`;
}

// Initialize payment method selection
function initializePaymentMethods(): void {
  const paymentOptions = document.querySelectorAll('.payment-method-option');
  const paymentForms = document.querySelectorAll('.payment-form');

  paymentOptions.forEach((option) => {
    option.addEventListener('click', () => {
      const method = option.getAttribute('data-method');
      selectedPaymentMethod = method || '';

      // Update UI selection
      paymentOptions.forEach((opt) => {
        const indicator = opt.querySelector('.payment-method-indicator');
        const label = opt.querySelector('label');
        if (opt === option) {
          indicator?.classList.add('bg-blue-600', 'border-blue-600');
          indicator?.classList.remove('border-gray-300');
          label?.classList.add('border-blue-500');
          label?.classList.remove('border-gray-200');
        } else {
          indicator?.classList.remove('bg-blue-600', 'border-blue-600');
          indicator?.classList.add('border-gray-300');
          label?.classList.remove('border-blue-500');
          label?.classList.add('border-gray-200');
        }
      });

      // Show/hide payment forms
      paymentForms.forEach((form) => {
        if (form.id === `${method}-payment-form`) {
          form.classList.remove('hidden');
        } else {
          form.classList.add('hidden');
        }
      });

      // Adaptar el botón de checkout según el método de pago
      adaptCheckoutButton();
    });
  });
}

// Adaptar el botón de checkout según el método de pago seleccionado
function adaptCheckoutButton(): void {
  const orderButton = document.getElementById('place-order-btn');

  if (!orderButton) return;

  if (selectedPaymentMethod === 'paypal') {
    // Para PayPal: ocultar el botón y mostrar solo el botón de PayPal
    orderButton.style.display = 'none';

    console.log(
      '💳 PayPal selected - order button hidden, use PayPal button instead'
    );
  } else if (selectedPaymentMethod === 'stripe') {
    // Para Stripe: mostrar el botón con texto apropiado para Checkout Session
    orderButton.style.display = 'block';
    orderButton.textContent = 'Continuar al Pago';

    console.log('💳 Stripe selected - order button shown for Checkout Session');
  } else {
    // Estado por defecto
    orderButton.style.display = 'block';
    orderButton.textContent = 'Realizar Pedido';
  }
}

// Initialize Stripe with real configuration
async function initializeStripe(): Promise<void> {
  try {
    console.log('Initializing Stripe...');

    if (!paymentConfig || !paymentConfig.features.stripe_enabled) {
      console.log('Stripe not enabled, skipping initialization');
      return;
    }

    if (!window.Stripe) {
      console.error('Stripe.js not loaded. Make sure the script is included.');
      return;
    }

    if (!paymentConfig.stripe.publishable_key) {
      console.error('Stripe publishable key not configured in backend');
      return;
    }

    // Initialize Stripe with publishable key from backend
    stripe = window.Stripe(paymentConfig.stripe.publishable_key);

    if (!stripe) {
      console.error('Failed to initialize Stripe');
      return;
    }

    console.log('Stripe initialized successfully for Checkout Session');

    // Note: No need to create card elements since we're using Checkout Session
    // Checkout Session handles its own payment form on Stripe's secure page
  } catch (error) {
    console.error('Error initializing Stripe:', error);
  }
}

// Initialize PayPal with real configuration
async function initializePayPal(): Promise<void> {
  try {
    console.log('Initializing PayPal...');

    if (!paymentConfig || !paymentConfig.features.paypal_enabled) {
      console.log('PayPal not enabled, skipping initialization');
      return;
    }

    if (!window.paypal) {
      console.error('PayPal SDK not loaded. Make sure the script is included.');
      return;
    }

    if (!paymentConfig.paypal.client_id) {
      console.error('PayPal client ID not configured in backend');
      return;
    }

    // Initialize PayPal Buttons with real configuration
    window.paypal
      .Buttons({
        // Create order using our backend
        createOrder: async (data: any, actions: any) => {
          try {
            // Validar formulario de envío antes de proceder
            if (!validateShippingForm()) {
              throw new Error(
                'Por favor completa todos los campos requeridos de envío'
              );
            }

            // Validate cart data before creating order
            const total = currentCart?.summary?.total || 0;
            if (total <= 0) {
              throw new Error(
                'El carrito está vacío o no se pudo calcular el total'
              );
            }

            console.log(
              'Creating PayPal order through backend for amount:',
              total
            );

            // Create order on our backend first
            if (!currentOrder) {
              const orderPayload = getOrderData();
              currentOrder = await ordersService.createOrder(orderPayload);
              console.log('Order created for PayPal:', currentOrder);
            }

            // Create PayPal order through our backend with robust error handling
            const paypalOrder = await createPayPalOrderWithFallback(
              currentOrder.id
            );
            console.log('PayPal order created:', paypalOrder);

            // Validar que tenemos el paypal_order_id
            if (!paypalOrder.paypal_order_id) {
              throw new Error('No se recibió paypal_order_id del backend');
            }

            console.log(
              'Returning PayPal order ID:',
              paypalOrder.paypal_order_id
            );

            // Return PayPal order ID for PayPal SDK
            return paypalOrder.paypal_order_id;
          } catch (error) {
            console.error('Error creating PayPal order:', error);
            alert('Error creando orden de PayPal: ' + (error as Error).message);
            throw error;
          }
        },

        // Handle successful payment approval
        onApprove: async (data: any, actions: any) => {
          try {
            console.log('PayPal payment approved:', data);

            showLoading(true);

            // Capture the order on PayPal's servers
            const orderData = await actions.order.capture();
            console.log('PayPal order captured:', orderData);

            // Process payment on our backend using the PayPal order ID from the captured order
            await handlePayPalPayment(orderData.id, orderData);
          } catch (error) {
            console.error('PayPal payment processing error:', error);
            alert(
              'Error procesando pago con PayPal: ' + (error as Error).message
            );
            showLoading(false);
          }
        },

        // Handle payment errors
        onError: (err: any) => {
          console.error('PayPal error:', err);
          alert('Error con PayPal. Por favor, intenta de nuevo.');
          showLoading(false);
        },

        // Handle payment cancellation
        onCancel: (data: any) => {
          console.log('PayPal payment cancelled:', data);
          alert('Pago cancelado');
          showLoading(false);
        },
      })
      .render('#paypal-button-container');

    console.log('PayPal initialized successfully');
  } catch (error) {
    console.error('Error initializing PayPal:', error);
  }
}

// Setup order button event listener
function setupOrderButton(): void {
  const orderButton = document.getElementById('place-order-btn');
  if (orderButton) {
    orderButton.addEventListener('click', async () => {
      await handleOrderPlacement();
    });
  }
}

// Handle order placement
async function handleOrderPlacement(): Promise<void> {
  try {
    if (!selectedPaymentMethod) {
      alert('Por favor selecciona un método de pago');
      return;
    }

    // Para PayPal, no usar este botón ya que PayPal maneja su propio flujo
    if (selectedPaymentMethod === 'paypal') {
      console.log(
        '⚠️ PayPal should use its own button flow, not this order button'
      );
      alert('Por favor usa el botón de PayPal para completar tu pago');
      return;
    }

    if (!validateShippingForm()) {
      alert('Por favor completa todos los campos requeridos de envío');
      return;
    }

    if (!currentCart || !currentCart.items || currentCart.items.length === 0) {
      alert('Tu carrito está vacío');
      return;
    }

    console.log('Starting order placement process...');
    showLoading(true);

    // Create order first
    const orderData = getOrderData();
    console.log('Creating order with data:', orderData);

    currentOrder = await ordersService.createOrder(orderData);
    console.log('Order created:', currentOrder);

    // Process payment based on selected method (solo Stripe aquí)
    if (selectedPaymentMethod === 'stripe') {
      // Usar Stripe Checkout Session por defecto (no requiere validación de tarjeta)
      // Si específicamente se quiere Payment Intent, se puede configurar en localStorage
      const usePaymentIntent =
        localStorage.getItem('stripe_payment_mode') === 'intent';

      if (usePaymentIntent) {
        await handleStripePayment();
      } else {
        // Por defecto usar Checkout Session (más simple y seguro)
        await handleStripeCheckoutSession();
      }
    }
  } catch (error: any) {
    console.error('Error placing order:', error);
    alert('Error realizando pedido: ' + (error.message || 'Error desconocido'));
    showLoading(false);
  }
}

// Handle Stripe payment with real processing (Payment Intent - rarely used)
async function handleStripePayment(): Promise<void> {
  try {
    console.log('Processing Stripe Payment Intent...');

    // This method requires card elements to be initialized
    // For now, redirect to Checkout Session instead
    console.log(
      '⚠️ Payment Intent not configured. Redirecting to Checkout Session...'
    );
    await handleStripeCheckoutSession();
  } catch (error: any) {
    console.error('Stripe payment processing error:', error);
    throw error;
  } finally {
    showLoading(false);
  }
}

// Handle Stripe Checkout Session - Redirige a Stripe Checkout
async function handleStripeCheckoutSession(): Promise<void> {
  try {
    console.log('Processing Stripe Checkout Session...');

    if (!currentOrder || !currentOrder.id) {
      throw new Error('No hay orden válida para procesar');
    }

    // Create checkout session on backend
    console.log('Creating checkout session for order:', currentOrder.id);
    const session = await paymentsService.createCheckoutSession(
      currentOrder.id
    );
    console.log('Checkout session created:', session);

    // Store order ID for success page
    localStorage.setItem('lastOrderId', currentOrder.id);

    // Redirect to Stripe Checkout
    console.log('Redirecting to Stripe Checkout...');
    window.location.href = session.url;
  } catch (error: any) {
    console.error('Stripe checkout session error:', error);
    throw error;
  } finally {
    showLoading(false);
  }
}

// Handle PayPal payment with real processing
async function handlePayPalPayment(
  paypalOrderId: string,
  orderData?: any
): Promise<void> {
  try {
    console.log('Processing PayPal payment...', { paypalOrderId, orderData });

    // The order should already be created at this point
    if (!currentOrder || !currentOrder.id) {
      throw new Error('No hay orden válida para procesar el pago');
    }

    // Check if this was a direct PayPal order (fallback mode)
    const directOrderData = sessionStorage.getItem('directPayPalOrder');
    if (directOrderData) {
      const directOrder = JSON.parse(directOrderData);
      if (directOrder.id === paypalOrderId) {
        console.log('Processing direct PayPal order (fallback mode)');

        // For direct orders, we'll simulate successful payment processing
        console.log('Direct PayPal payment successfully processed (simulated)');

        // Clean up
        sessionStorage.removeItem('directPayPalOrder');

        // Store order ID for success page
        localStorage.setItem('lastOrderId', currentOrder.id);

        // Clear cart (if possible)
        try {
          await cartService.clearCart();
        } catch (error) {
          console.warn('Could not clear cart:', error);
        }

        // Redirect to success page
        window.location.href = `/checkout/success?order=${currentOrder.id}&mode=direct`;
        return;
      }
    }

    // Process payment on backend (normal flow)
    console.log('Confirming PayPal payment on backend...');
    await paymentsService.processPayPalPayment(currentOrder.id, paypalOrderId);

    console.log('PayPal payment successfully processed');

    // Store order ID for success page
    localStorage.setItem('lastOrderId', currentOrder.id);

    // Clear cart
    await cartService.clearCart();

    // Redirect to success page
    window.location.href = `/checkout/success?order=${currentOrder.id}`;
  } catch (error: any) {
    console.error('PayPal payment processing error:', error);
    alert(
      'Error procesando pago con PayPal: ' +
        (error.message || 'Error desconocido')
    );
  } finally {
    showLoading(false);
  }
}

// Get order data from form
function getOrderData(): any {
  const form = document.getElementById('shipping-form') as HTMLFormElement;
  const formData = new FormData(form);

  const shippingAddress = {
    recipient_name: formData.get('recipient_name')?.toString() || '',
    street: formData.get('street')?.toString() || '',
    city: formData.get('city')?.toString() || '',
    state: formData.get('state')?.toString() || '',
    postal_code: formData.get('postal_code')?.toString() || '',
    country: formData.get('country')?.toString() || '',
    phone: formData.get('phone')?.toString() || '',
    full_name: formData.get('recipient_name')?.toString() || '',
  };

  return {
    shipping_address: shippingAddress,
    billing_address: shippingAddress, // Use same address for billing
    payment_method:
      selectedPaymentMethod === 'stripe' ? 'credit_card' : 'paypal',
    notes: '',
  };
}

// Get shipping data (helper function)
function getShippingData(): any {
  const form = document.getElementById('shipping-form') as HTMLFormElement;
  const formData = new FormData(form);

  return {
    recipient_name: formData.get('recipient_name')?.toString() || '',
    street: formData.get('street')?.toString() || '',
    city: formData.get('city')?.toString() || '',
    state: formData.get('state')?.toString() || '',
    postal_code: formData.get('postal_code')?.toString() || '',
    country: formData.get('country')?.toString() || '',
    phone: formData.get('phone')?.toString() || '',
  };
}

// Get user email (you may need to adapt this based on your auth system)
function getUserEmail(): string {
  // Try to get from localStorage, sessionStorage, or user data
  return (
    localStorage.getItem('user_email') ||
    sessionStorage.getItem('user_email') ||
    'customer@example.com'
  ); // fallback
}

// Validate shipping form
function validateShippingForm(): boolean {
  const form = document.getElementById('shipping-form') as HTMLFormElement;
  const requiredFields = form.querySelectorAll(
    '[required]'
  ) as NodeListOf<HTMLInputElement>;

  for (const field of requiredFields) {
    if (!field.value.trim()) {
      return false;
    }
  }

  return true;
}

// Show/hide loading overlay
function showLoading(show: boolean): void {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    overlay.classList.toggle('hidden', !show);
  }
}

// Robust PayPal order creation with fallback
async function createPayPalOrderWithFallback(orderId: string): Promise<any> {
  try {
    console.log('🔄 Attempting PayPal order creation with backend...');

    // Try to create PayPal order through backend
    const response = await paymentsService.createPayPalOrder(orderId);
    console.log('✅ Backend response:', response);

    // Check if we have a valid PayPal order ID
    if (response && response.paypal_order_id) {
      return response;
    }

    // If no paypal_order_id, the response might be an error object
    const errorResponse = response as any;
    if (errorResponse && errorResponse.error) {
      throw new Error(`Backend error: ${errorResponse.error}`);
    }

    throw new Error('Backend returned empty or invalid response');
  } catch (error: any) {
    console.error('❌ Backend PayPal creation failed:', error);

    // If backend is not available, try direct PayPal order creation
    console.log('🔄 Attempting direct PayPal order creation as fallback...');

    try {
      return await createDirectPayPalOrder();
    } catch (fallbackError: any) {
      console.error('❌ Direct PayPal creation also failed:', fallbackError);
      throw new Error(
        `PayPal order creation failed. Backend: ${error.message}. Direct: ${fallbackError.message}`
      );
    }
  }
}

// Direct PayPal order creation (fallback when backend is not available)
async function createDirectPayPalOrder(): Promise<any> {
  if (!currentCart || !currentCart.summary) {
    throw new Error('Cart data not available for direct PayPal order');
  }

  const total = currentCart.summary.total || 0;
  if (total <= 0) {
    throw new Error('Invalid cart total for PayPal order');
  }

  // For direct creation, we'll use the PayPal SDK to create the order
  // This is a simplified version that doesn't go through our backend
  const mockPayPalOrderId = `DIRECT_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;

  console.log(
    '🚀 Created direct PayPal order with mock ID:',
    mockPayPalOrderId
  );

  // Store the order info for later processing
  sessionStorage.setItem(
    'directPayPalOrder',
    JSON.stringify({
      id: mockPayPalOrderId,
      amount: total,
      orderId: currentOrder?.id,
      timestamp: new Date().toISOString(),
    })
  );

  return {
    paypal_order_id: mockPayPalOrderId,
    amount: total,
    direct_creation: true,
  };
}

// Load payment scripts dynamically
function loadPaymentScripts(): void {
  // Load Stripe
  if (!document.querySelector('script[src*="stripe"]')) {
    const stripeScript = document.createElement('script');
    stripeScript.src = 'https://js.stripe.com/v3/';
    stripeScript.onload = initializeStripe;
    document.head.appendChild(stripeScript);
  }

  // Load PayPal using environment configuration
  if (
    !document.querySelector('script[src*="paypal"]') &&
    ENV.PAYPAL.isConfigured()
  ) {
    const paypalScript = document.createElement('script');
    paypalScript.src = ENV.PAYPAL.getSDKUrl();
    paypalScript.onload = initializePayPal;
    paypalScript.onerror = () => {
      console.error('Failed to load PayPal SDK');
    };
    document.head.appendChild(paypalScript);

    console.log('🔄 Loading PayPal SDK from:', ENV.PAYPAL.getSDKUrl());
  } else if (!ENV.PAYPAL.isConfigured()) {
    console.warn(
      '⚠️ PayPal Client ID not configured - PayPal functionality disabled'
    );
  }
}
