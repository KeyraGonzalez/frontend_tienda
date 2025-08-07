// Checkout success page functionality
import {
  ordersService,
  paymentsService,
  cartService,
} from '../utils/api/index.js';

let currentOrder: any = null;

// Main initialization function
export async function initializeCheckoutSuccessPage(): Promise<void> {
  console.log('🎉 Initializing checkout success page');
  await loadOrderDetails();
  initializeButtons();
  showSuccessMessage();

  // Limpiar carrito por si no se hizo en el proceso de checkout
  try {
    await cartService.clearCart();
    console.log('🛒 Cart cleared after successful payment');
  } catch (error) {
    console.log('ℹ️ Cart was already cleared or error clearing:', error);
  }
}

function showSuccessMessage(): void {
  // Mostrar mensaje de éxito específico basado en el método de pago
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('session_id');

  if (sessionId) {
    // Si tenemos session_id, significa que se usó Stripe Checkout
    console.log('✅ Payment completed via Stripe Checkout Session');

    // Agregar mensaje especial para Stripe Checkout
    const successMessage = document.querySelector('.min-h-screen .max-w-2xl');
    if (successMessage) {
      const stripeMessage = document.createElement('div');
      stripeMessage.className =
        'bg-green-50 border border-green-200 rounded-lg p-4 mb-6';
      stripeMessage.innerHTML = `
        <div class="flex items-center">
          <svg class="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
          </svg>
          <div>
            <h3 class="text-sm font-medium text-green-800">Pago procesado por Stripe</h3>
            <p class="text-sm text-green-700 mt-1">Tu transacción ha sido completada de forma segura.</p>
          </div>
        </div>
      `;

      // Insertar después del icono de éxito
      const firstCard = successMessage.querySelector('.bg-white');
      if (firstCard) {
        successMessage.insertBefore(stripeMessage, firstCard);
      }
    }
  }
}

async function loadOrderDetails(): Promise<void> {
  try {
    // Get order ID from URL params or localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const orderId =
      urlParams.get('order') || localStorage.getItem('lastOrderId');
    const sessionId = urlParams.get('session_id'); // Para Stripe Checkout Session
    const paymentIntentId = urlParams.get('payment_intent'); // Para Payment Intent

    console.log('🔍 Loading order details:', {
      orderId,
      sessionId,
      paymentIntentId,
    });

    if (!orderId) {
      console.error('No order ID found');
      window.location.href = '/';
      return;
    }

    // Load order details
    currentOrder = await ordersService.getOrderById(orderId);
    console.log('📦 Order loaded:', currentOrder);

    if (currentOrder) {
      updateOrderDetails();
      await loadPaymentDetails(
        orderId,
        sessionId || undefined,
        paymentIntentId || undefined
      );
    }

    // Clear the stored order ID
    localStorage.removeItem('lastOrderId');
  } catch (error) {
    console.error('Error loading order details:', error);
    // Redirect to orders page if can't load specific order
    window.location.href = '/perfil';
  }
}

function updateOrderDetails(): void {
  if (!currentOrder) return;

  // Update order summary
  const orderNumber = document.getElementById('order-number');
  const orderDate = document.getElementById('order-date');
  const orderStatus = document.getElementById('order-status');
  const orderTotal = document.getElementById('order-total');

  if (orderNumber)
    orderNumber.textContent = currentOrder.id.slice(-8).toUpperCase();
  if (orderDate)
    orderDate.textContent = new Date(
      currentOrder.created_at
    ).toLocaleDateString('es-ES');
  if (orderStatus) {
    orderStatus.textContent = getStatusText(currentOrder.status);
    orderStatus.className = `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
      currentOrder.status
    )}`;
  }
  if (orderTotal) orderTotal.textContent = `$${currentOrder.total.toFixed(2)}`;

  // Update order items
  const itemsContainer = document.getElementById('order-items');
  if (itemsContainer && currentOrder.order_items) {
    console.log('🛍️ Processing order items:', currentOrder.order_items);

    itemsContainer.innerHTML = currentOrder.order_items
      .map((item: any) => {
        console.log('📦 Processing item:', item);

        // Obtener la primera imagen, ordenada por is_primary y sort_order
        const images = item.products?.product_images || [];
        const sortedImages = images.sort((a: any, b: any) => {
          // Primero las primarias
          if (a.is_primary && !b.is_primary) return -1;
          if (!a.is_primary && b.is_primary) return 1;
          // Luego por sort_order
          return (a.sort_order || 0) - (b.sort_order || 0);
        });

        const primaryImage = sortedImages[0]?.image_url || '/placeholder.jpg';

        return `
          <div class="flex items-center space-x-3 py-2 border-b border-gray-100 last:border-b-0">
            <img src="${primaryImage}" 
                 alt="${item.products?.name || 'Producto'}" 
                 class="w-16 h-16 object-cover rounded-lg shadow-sm">
            <div class="flex-1">
              <h4 class="font-medium text-gray-900">${
                item.products?.name || 'Producto'
              }</h4>
              <p class="text-sm text-gray-500">Cantidad: ${item.quantity}</p>
              ${
                item.product_variants
                  ? `
                <div class="flex space-x-2 text-xs text-gray-500 mt-1">
                  ${
                    item.product_variants.size
                      ? `<span class="bg-gray-100 px-2 py-1 rounded">${item.product_variants.size}</span>`
                      : ''
                  }
                  ${
                    item.product_variants.color
                      ? `<span class="bg-gray-100 px-2 py-1 rounded">${item.product_variants.color}</span>`
                      : ''
                  }
                </div>
              `
                  : ''
              }
            </div>
            <div class="text-right">
              <p class="font-medium text-gray-900">$${(
                item.price * item.quantity
              ).toFixed(2)}</p>
              <p class="text-sm text-gray-500">$${item.price.toFixed(2)} c/u</p>
            </div>
          </div>
        `;
      })
      .join('');
  } else if (itemsContainer && currentOrder.items) {
    // Fallback para la estructura anterior por compatibilidad
    console.log('🛍️ Using fallback items structure:', currentOrder.items);

    itemsContainer.innerHTML = currentOrder.items
      .map((item: any) => {
        const images = item.products?.product_images || [];
        const sortedImages = images.sort((a: any, b: any) => {
          if (a.is_primary && !b.is_primary) return -1;
          if (!a.is_primary && b.is_primary) return 1;
          return (a.sort_order || 0) - (b.sort_order || 0);
        });

        const primaryImage = sortedImages[0]?.image_url || '/placeholder.jpg';

        return `
          <div class="flex items-center space-x-3 py-2 border-b border-gray-100 last:border-b-0">
            <img src="${primaryImage}" 
                 alt="${item.products?.name || 'Producto'}" 
                 class="w-16 h-16 object-cover rounded-lg shadow-sm">
            <div class="flex-1">
              <h4 class="font-medium text-gray-900">${
                item.products?.name || 'Producto'
              }</h4>
              <p class="text-sm text-gray-500">Cantidad: ${item.quantity}</p>
              ${
                item.product_variants
                  ? `
                <div class="flex space-x-2 text-xs text-gray-500 mt-1">
                  ${
                    item.product_variants.size
                      ? `<span class="bg-gray-100 px-2 py-1 rounded">${item.product_variants.size}</span>`
                      : ''
                  }
                  ${
                    item.product_variants.color
                      ? `<span class="bg-gray-100 px-2 py-1 rounded">${item.product_variants.color}</span>`
                      : ''
                  }
                </div>
              `
                  : ''
              }
            </div>
            <div class="text-right">
              <p class="font-medium text-gray-900">$${(
                item.price * item.quantity
              ).toFixed(2)}</p>
              <p class="text-sm text-gray-500">$${item.price.toFixed(2)} c/u</p>
            </div>
          </div>
        `;
      })
      .join('');
  }

  // Update shipping information
  const shippingContainer = document.getElementById('shipping-info');
  if (shippingContainer && currentOrder.shipping_address) {
    const addr = currentOrder.shipping_address;
    shippingContainer.innerHTML = `
      <div class="text-sm">
        <p class="font-medium">${addr.recipient_name || addr.full_name}</p>
        <p>${addr.street}</p>
        <p>${addr.city}, ${addr.state} ${addr.postal_code}</p>
        <p>${addr.country}</p>
        ${
          addr.phone
            ? `<p class="mt-1 text-gray-600">Teléfono: ${addr.phone}</p>`
            : ''
        }
      </div>
    `;
  }
}

async function loadPaymentDetails(
  orderId: string,
  sessionId?: string,
  paymentIntentId?: string
): Promise<void> {
  try {
    console.log('💳 Loading payment details:', {
      orderId,
      sessionId,
      paymentIntentId,
    });

    const payments = await paymentsService.getPaymentHistory(1, 10);
    const orderPayment = payments.payments.find(
      (p: any) => p.order_id === orderId
    );

    const paymentContainer = document.getElementById('payment-info');
    if (paymentContainer) {
      if (orderPayment) {
        // Determinar el método de pago usado
        let paymentMethod = orderPayment.payment_method;
        let transactionId = orderPayment.external_id;

        // Si tenemos session_id, significa que se usó Stripe Checkout Session
        if (sessionId) {
          paymentMethod = 'stripe_checkout';
          transactionId = sessionId;
        } else if (paymentIntentId) {
          paymentMethod = 'stripe_intent';
          transactionId = paymentIntentId;
        }

        paymentContainer.innerHTML = `
          <div class="text-sm space-y-2">
            <div class="flex justify-between">
              <span class="text-gray-600">Método de pago:</span>
              <span class="font-medium">${getPaymentMethodText(
                paymentMethod
              )}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Estado del pago:</span>
              <span class="font-medium ${
                orderPayment.status === 'completed' || sessionId
                  ? 'text-green-600'
                  : 'text-yellow-600'
              }">
                ${
                  sessionId
                    ? 'Completado'
                    : getPaymentStatusText(orderPayment.status)
                }
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Monto:</span>
              <span class="font-medium">$${orderPayment.amount.toFixed(
                2
              )}</span>
            </div>
            ${
              transactionId
                ? `
              <div class="flex justify-between">
                <span class="text-gray-600">ID de transacción:</span>
                <span class="font-mono text-xs">${transactionId}</span>
              </div>
            `
                : ''
            }
            ${
              sessionId
                ? `
              <div class="flex justify-between">
                <span class="text-gray-600">Stripe Session:</span>
                <span class="font-mono text-xs">${sessionId}</span>
              </div>
            `
                : ''
            }
          </div>
        `;
      } else {
        // Si no hay información de pago pero tenemos session_id, mostrar información básica
        if (sessionId) {
          paymentContainer.innerHTML = `
            <div class="text-sm space-y-2">
              <div class="flex justify-between">
                <span class="text-gray-600">Método de pago:</span>
                <span class="font-medium">Stripe Checkout</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Estado del pago:</span>
                <span class="font-medium text-green-600">Completado</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Session ID:</span>
                <span class="font-mono text-xs">${sessionId}</span>
              </div>
            </div>
          `;
        } else {
          paymentContainer.innerHTML = `
            <div class="text-sm text-gray-600">
              <p>Información de pago no disponible</p>
            </div>
          `;
        }
      }
    }
  } catch (error) {
    console.error('Error loading payment details:', error);
  }
}

function initializeButtons(): void {
  const continueShoppingBtn = document.getElementById('continue-shopping-btn');

  continueShoppingBtn?.addEventListener('click', () => {
    window.location.href = '/productos';
  });
}

function getStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    pending: 'Pendiente',
    confirmed: 'Confirmado',
    processing: 'Procesando',
    shipped: 'Enviado',
    delivered: 'Entregado',
    cancelled: 'Cancelado',
    refunded: 'Reembolsado',
  };
  return statusMap[status] || status;
}

function getStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    processing: 'bg-purple-100 text-purple-800',
    shipped: 'bg-indigo-100 text-indigo-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    refunded: 'bg-gray-100 text-gray-800',
  };
  return colorMap[status] || 'bg-gray-100 text-gray-800';
}

function getPaymentMethodText(method: string): string {
  const methodMap: Record<string, string> = {
    stripe: 'Stripe - Tarjeta de Crédito/Débito',
    stripe_checkout: 'Stripe Checkout - Tarjeta de Crédito/Débito',
    stripe_intent: 'Stripe - Tarjeta de Crédito/Débito',
    paypal: 'PayPal',
    card: 'Tarjeta de Crédito/Débito',
    credit_card: 'Tarjeta de Crédito/Débito',
    bank_transfer: 'Transferencia Bancaria',
  };
  return methodMap[method] || method.charAt(0).toUpperCase() + method.slice(1);
}

function getPaymentStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    pending: 'Pendiente',
    completed: 'Completado',
    failed: 'Fallido',
    refunded: 'Reembolsado',
    partially_refunded: 'Reembolso Parcial',
  };
  return statusMap[status] || status;
}
