import { authService } from '../utils/api/index';

interface PaymentMethodsConfig {
  orderId: string;
  amount: number;
  onSuccess?: (result: any) => void;
  onError?: (error: string) => void;
}

export class PaymentMethods {
  private config: PaymentMethodsConfig;
  private stripeBtn: HTMLButtonElement | null = null;
  private paypalBtn: HTMLButtonElement | null = null;

  constructor(config: PaymentMethodsConfig) {
    this.config = config;
    this.init();
  }

  private init() {
    this.stripeBtn = document.getElementById(
      'stripe-checkout-btn'
    ) as HTMLButtonElement;
    this.paypalBtn = document.getElementById(
      'paypal-checkout-btn'
    ) as HTMLButtonElement;

    this.setupEventListeners();
    this.enableButtons();
  }

  private setupEventListeners() {
    this.stripeBtn?.addEventListener('click', () =>
      this.handleStripeCheckout()
    );
    this.paypalBtn?.addEventListener('click', () =>
      this.handlePayPalCheckout()
    );
  }

  private enableButtons() {
    if (this.stripeBtn) this.stripeBtn.disabled = false;
    if (this.paypalBtn) this.paypalBtn.disabled = false;
  }

  private showLoading(method: 'stripe' | 'paypal') {
    const btn = method === 'stripe' ? this.stripeBtn : this.paypalBtn;
    const loadingId = method === 'stripe' ? 'stripe-loading' : 'paypal-loading';
    const loading = document.getElementById(loadingId);

    if (btn && loading) {
      btn.querySelector('.button-content')?.classList.add('hidden');
      loading.classList.remove('hidden');
      btn.disabled = true;
    }
  }

  private hideLoading(method: 'stripe' | 'paypal') {
    const btn = method === 'stripe' ? this.stripeBtn : this.paypalBtn;
    const loadingId = method === 'stripe' ? 'stripe-loading' : 'paypal-loading';
    const loading = document.getElementById(loadingId);

    if (btn && loading) {
      btn.querySelector('.button-content')?.classList.remove('hidden');
      loading.classList.add('hidden');
      btn.disabled = false;
    }
  }

  private async handleStripeCheckout() {
    try {
      this.showLoading('stripe');

      if (!authService.isAuthenticated()) {
        throw new Error('Debes iniciar sesión para continuar');
      }

      const response = await fetch('/api/payments/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authService.getToken()}`,
        },
        body: JSON.stringify({
          order_id: this.config.orderId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error creando sesión de pago');
      }

      // Redirigir a Stripe Checkout
      window.location.href = data.url;
    } catch (error) {
      console.error('Error en Stripe checkout:', error);
      this.hideLoading('stripe');
      this.config.onError?.(
        error instanceof Error ? error.message : 'Error procesando pago'
      );
    }
  }

  private async handlePayPalCheckout() {
    try {
      this.showLoading('paypal');

      if (!authService.isAuthenticated()) {
        throw new Error('Debes iniciar sesión para continuar');
      }

      // Crear orden de PayPal
      const response = await fetch('/api/payments/create-paypal-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authService.getToken()}`,
        },
        body: JSON.stringify({
          order_id: this.config.orderId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error creando orden PayPal');
      }

      // Redirigir a PayPal para aprobar el pago
      window.location.href = data.approval_url;
    } catch (error) {
      console.error('Error en PayPal checkout:', error);
      this.hideLoading('paypal');
      this.config.onError?.(
        error instanceof Error ? error.message : 'Error procesando pago'
      );
    }
  }

  public updateOrderId(orderId: string) {
    this.config.orderId = orderId;
  }

  public updateAmount(amount: number) {
    this.config.amount = amount;
  }
}

// Función para inicializar los botones de pago
export function initializePaymentMethods(config: PaymentMethodsConfig) {
  return new PaymentMethods(config);
}

// Función para capturar pago de PayPal (para usar en página de éxito)
export async function capturePayPalPayment(
  paypalOrderId: string,
  orderId: string
) {
  try {
    if (!authService.isAuthenticated()) {
      throw new Error('Debes iniciar sesión para continuar');
    }

    const response = await fetch('/api/payments/capture-paypal-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authService.getToken()}`,
      },
      body: JSON.stringify({
        paypal_order_id: paypalOrderId,
        order_id: orderId,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Error capturando pago PayPal');
    }

    return data;
  } catch (error) {
    console.error('Error capturando pago PayPal:', error);
    throw error;
  }
}
