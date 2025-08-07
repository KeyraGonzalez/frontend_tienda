// Payment configuration functionality for real payment processing
import ENV from '../config/env.js';

// Global state
let currentConfig: any = {};

// Main initialization function
export async function initializePaymentSetup(): Promise<void> {
  console.log('Initializing payment setup...');

  // Log current environment configuration
  ENV.logConfig();

  loadSavedConfig();
  initializeEventListeners();
}

// Also export for backwards compatibility
export async function initializePaymentConfigPage(): Promise<void> {
  return initializePaymentSetup();
}

function loadSavedConfig(): void {
  // Load configuration from environment and localStorage (environment takes priority)
  const stripeKey = localStorage.getItem('stripe_publishable_key') || '';
  const stripeWebhook = localStorage.getItem('stripe_webhook_secret') || '';
  const paypalClientId =
    ENV.PAYPAL.CLIENT_ID || localStorage.getItem('paypal_client_id') || '';
  const paypalEnv =
    ENV.PAYPAL.ENVIRONMENT ||
    localStorage.getItem('paypal_environment') ||
    'sandbox';

  const stripeKeyEl = document.getElementById(
    'stripe-publishable-key'
  ) as HTMLInputElement;
  const stripeWebhookEl = document.getElementById(
    'stripe-webhook-secret'
  ) as HTMLInputElement;
  const paypalClientIdEl = document.getElementById(
    'paypal-client-id'
  ) as HTMLInputElement;
  const paypalEnvEl = document.getElementById(
    'paypal-environment'
  ) as HTMLSelectElement;

  if (stripeKey && stripeKeyEl) {
    stripeKeyEl.value = stripeKey;
  }
  if (stripeWebhook && stripeWebhookEl) {
    stripeWebhookEl.value = stripeWebhook;
  }
  if (paypalClientId && paypalClientIdEl) {
    paypalClientIdEl.value = paypalClientId;
  }
  if (paypalEnvEl) {
    paypalEnvEl.value = paypalEnv;
  }
}

function initializeEventListeners(): void {
  const saveBtn = document.getElementById('save-config-btn');
  const testBtn = document.getElementById('test-config-btn');

  saveBtn?.addEventListener('click', saveConfiguration);
  testBtn?.addEventListener('click', testConfiguration);
}

function saveConfiguration(): void {
  const stripeKeyEl = document.getElementById(
    'stripe-publishable-key'
  ) as HTMLInputElement;
  const stripeWebhookEl = document.getElementById(
    'stripe-webhook-secret'
  ) as HTMLInputElement;
  const paypalClientIdEl = document.getElementById(
    'paypal-client-id'
  ) as HTMLInputElement;
  const paypalEnvEl = document.getElementById(
    'paypal-environment'
  ) as HTMLSelectElement;

  const stripeKey = stripeKeyEl?.value || '';
  const stripeWebhook = stripeWebhookEl?.value || '';
  const paypalClientId = paypalClientIdEl?.value || '';
  const paypalEnv = paypalEnvEl?.value || '';

  // Validate required fields
  if (!stripeKey && !paypalClientId) {
    showStatus('Por favor, configura al menos un método de pago', 'error');
    return;
  }

  // Save to localStorage
  if (stripeKey) {
    localStorage.setItem('stripe_publishable_key', stripeKey);
  }
  if (stripeWebhook) {
    localStorage.setItem('stripe_webhook_secret', stripeWebhook);
  }
  if (paypalClientId) {
    localStorage.setItem('paypal_client_id', paypalClientId);
  }
  localStorage.setItem('paypal_environment', paypalEnv);

  showStatus('Configuración guardada exitosamente', 'success');

  // Update payment scripts on checkout page
  updatePaymentScripts();
}

function testConfiguration(): void {
  const stripeKeyEl = document.getElementById(
    'stripe-publishable-key'
  ) as HTMLInputElement;
  const paypalClientIdEl = document.getElementById(
    'paypal-client-id'
  ) as HTMLInputElement;

  const stripeKey = stripeKeyEl?.value || '';
  const paypalClientId = paypalClientIdEl?.value || '';

  const testResults: string[] = [];

  // Test Stripe
  if (stripeKey) {
    if (stripeKey.startsWith('pk_test_') || stripeKey.startsWith('pk_live_')) {
      testResults.push('✅ Clave de Stripe válida');
    } else {
      testResults.push('❌ Formato de clave de Stripe inválido');
    }
  }

  // Test PayPal
  if (paypalClientId) {
    if (paypalClientId.length > 10) {
      testResults.push('✅ Client ID de PayPal válido');
    } else {
      testResults.push('❌ Client ID de PayPal parece inválido');
    }
  }

  if (testResults.length === 0) {
    showStatus('No hay configuración para probar', 'error');
  } else {
    showStatus(testResults.join('<br>'), 'info');
  }
}

function updatePaymentScripts(): void {
  // This would be used to dynamically update payment scripts
  // In a real application, you might need to reload the page or update script tags
  console.log('Payment configuration updated');

  // Show notification that user might need to refresh checkout page
  showStatus(
    'Configuración actualizada. Es recomendable refrescar la página de checkout para aplicar los cambios.',
    'info'
  );
}

type StatusType = 'success' | 'error' | 'info';

function showStatus(message: string, type: StatusType): void {
  const statusEl = document.getElementById('status-message');
  if (!statusEl) return;

  const colorClasses: Record<StatusType, string> = {
    success: 'bg-green-50 text-green-800 border border-green-200',
    error: 'bg-red-50 text-red-800 border border-red-200',
    info: 'bg-blue-50 text-blue-800 border border-blue-200',
  };

  statusEl.className = `mt-4 p-3 rounded-lg ${colorClasses[type]}`;
  statusEl.innerHTML = message;
  statusEl.classList.remove('hidden');

  // Auto-hide after 5 seconds
  setTimeout(() => {
    statusEl.classList.add('hidden');
  }, 5000);
}
