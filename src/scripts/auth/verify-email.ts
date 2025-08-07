// Scripts para la página de verificación de email
import { authService } from '../../utils/api/index';

// Tipos para el formulario de verificación
interface VerifyEmailData {
  email: string;
  code: string;
}

interface VerifyFormElements extends HTMLFormControlsCollection {
  email: HTMLInputElement;
  verificationCode: HTMLInputElement;
}

interface VerifyForm extends HTMLFormElement {
  elements: VerifyFormElements;
}

// Estado de la aplicación
let isLoading = false;
let resendCooldown = 0;
let countdownInterval: number | null = null;

// Función de inicialización
export function initializeVerifyEmailPage(): void {
  // Verificar si ya está autenticado
  if (authService.isAuthenticated()) {
    window.location.href = '/';
    return;
  }

  setupEventListeners();
  setupFormValidation();
  loadEmailFromURL();
  setupCodeInput();
}

// Configurar event listeners
function setupEventListeners(): void {
  const verifyForm = document.getElementById('verify-form') as VerifyForm;
  const resendBtn = document.getElementById('resendBtn') as HTMLButtonElement;

  if (verifyForm) {
    verifyForm.addEventListener('submit', handleVerifySubmit);
  }

  if (resendBtn) {
    resendBtn.addEventListener('click', handleResendCode);
  }

  // Limpiar errores al escribir
  const codeInput = document.getElementById(
    'verificationCode'
  ) as HTMLInputElement;
  if (codeInput) {
    codeInput.addEventListener('input', clearErrors);
  }
}

// Manejar envío del formulario de verificación
async function handleVerifySubmit(event: Event): Promise<void> {
  event.preventDefault();

  if (isLoading) return;

  const form = event.target as VerifyForm;
  const submitButton = form.querySelector(
    'button[type="submit"]'
  ) as HTMLButtonElement;

  try {
    isLoading = true;
    setLoadingState(submitButton, true);
    clearErrors();

    const verifyData = extractVerifyData(form);

    // Validar formulario
    if (!validateVerifyData(verifyData)) {
      return;
    }

    // Verificar código
    const result = await authService.verifyEmail({
      email: verifyData.email,
      code: verifyData.code,
    });

    // Mostrar éxito
    showSuccess('¡Email verificado exitosamente! Redirigiendo...');

    // Update header auth state if function is available
    if (typeof (window as any).updateHeaderAuth === 'function') {
      (window as any).updateHeaderAuth();
    }

    // Redirigir después de un breve delay
    setTimeout(() => {
      // Verificar si hay una URL de retorno
      const returnUrl =
        new URLSearchParams(window.location.search).get('return') || '/';
      window.location.href = returnUrl;
    }, 2000);
  } catch (error) {
    console.error('Verify email error:', error);
    handleVerifyError(error);
  } finally {
    isLoading = false;
    setLoadingState(submitButton, false);
  }
}

// Manejar reenvío de código
async function handleResendCode(): Promise<void> {
  if (resendCooldown > 0) return;

  const emailInput = document.getElementById('email') as HTMLInputElement;
  const resendBtn = document.getElementById('resendBtn') as HTMLButtonElement;

  if (!emailInput || !emailInput.value) {
    showError(
      'Email no encontrado. Por favor, regresa a la página de registro.'
    );
    return;
  }

  try {
    setResendLoading(resendBtn, true);

    await authService.resendVerificationCode({ email: emailInput.value });

    showSuccess('Código reenviado exitosamente. Revisa tu email.');
    startResendCooldown();
  } catch (error) {
    console.error('Resend code error:', error);
    if (error instanceof Error) {
      showError(error.message);
    } else {
      showError('Error al reenviar código. Intenta nuevamente.');
    }
  } finally {
    setResendLoading(resendBtn, false);
  }
}

// Extraer datos del formulario
function extractVerifyData(form: VerifyForm): VerifyEmailData {
  return {
    email: form.elements.email.value.trim(),
    code: form.elements.verificationCode.value.trim(),
  };
}

// Validar datos de verificación
function validateVerifyData(data: VerifyEmailData): boolean {
  const errors: string[] = [];

  if (!data.email) {
    errors.push('Email es requerido');
  } else if (!isValidEmail(data.email)) {
    errors.push('Email no es válido');
  }

  if (!data.code) {
    errors.push('Código de verificación es requerido');
  } else if (data.code.length !== 6) {
    errors.push('El código debe tener 6 dígitos');
  } else if (!/^\d{6}$/.test(data.code)) {
    errors.push('El código debe contener solo números');
  }

  if (errors.length > 0) {
    showError(errors.join('<br>'));
    return false;
  }

  return true;
}

// Validar formato de email
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Configurar validación en tiempo real
function setupFormValidation(): void {
  const codeInput = document.getElementById(
    'verificationCode'
  ) as HTMLInputElement;

  if (codeInput) {
    codeInput.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      let value = target.value.replace(/\D/g, ''); // Solo números

      if (value.length > 6) {
        value = value.slice(0, 6);
      }

      target.value = value;

      // Auto-submit si tiene 6 dígitos
      if (value.length === 6) {
        const form = document.getElementById('verify-form') as HTMLFormElement;
        if (form && !isLoading) {
          setTimeout(() => {
            form.dispatchEvent(
              new Event('submit', { bubbles: true, cancelable: true })
            );
          }, 300);
        }
      }
    });

    codeInput.addEventListener('keydown', (e) => {
      // Permitir solo números, backspace, delete, tab, escape, enter
      if (
        ![8, 9, 27, 13, 46].includes(e.keyCode) &&
        !(e.keyCode >= 48 && e.keyCode <= 57) &&
        !(e.keyCode >= 96 && e.keyCode <= 105)
      ) {
        e.preventDefault();
      }
    });
  }
}

// Configurar input de código para mejor UX
function setupCodeInput(): void {
  const codeInput = document.getElementById(
    'verificationCode'
  ) as HTMLInputElement;

  if (codeInput) {
    // Focus automático
    codeInput.focus();

    // Seleccionar todo al hacer focus
    codeInput.addEventListener('focus', () => {
      codeInput.select();
    });

    // Pegar código desde clipboard
    codeInput.addEventListener('paste', (e) => {
      e.preventDefault();
      const paste = (e.clipboardData || (window as any).clipboardData).getData(
        'text'
      );
      const numbers = paste.replace(/\D/g, '').slice(0, 6);
      codeInput.value = numbers;

      if (numbers.length === 6) {
        setTimeout(() => {
          const form = document.getElementById(
            'verify-form'
          ) as HTMLFormElement;
          if (form && !isLoading) {
            form.dispatchEvent(
              new Event('submit', { bubbles: true, cancelable: true })
            );
          }
        }, 100);
      }
    });
  }
}

// Cargar email desde URL
function loadEmailFromURL(): void {
  const urlParams = new URLSearchParams(window.location.search);
  const email = urlParams.get('email');

  if (email) {
    const emailInput = document.getElementById('email') as HTMLInputElement;
    const emailDisplay = document.getElementById('emailDisplay') as HTMLElement;

    if (emailInput) {
      emailInput.value = email;
    }

    if (emailDisplay) {
      emailDisplay.textContent = email;
    }
  }
}

// Iniciar cooldown de reenvío
function startResendCooldown(): void {
  resendCooldown = 120; // 2 minutos
  const resendBtn = document.getElementById('resendBtn') as HTMLButtonElement;
  const resendTimer = document.getElementById('resendTimer') as HTMLElement;
  const countdown = document.getElementById('countdown') as HTMLElement;

  if (resendBtn) {
    resendBtn.disabled = true;
    resendBtn.textContent = 'CÓDIGO ENVIADO';
  }

  if (resendTimer) {
    resendTimer.classList.remove('hidden');
  }

  countdownInterval = window.setInterval(() => {
    resendCooldown--;

    if (countdown) {
      countdown.textContent = resendCooldown.toString();
    }

    if (resendCooldown <= 0) {
      if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
      }

      if (resendBtn) {
        resendBtn.disabled = false;
        resendBtn.textContent = 'REENVIAR CÓDIGO';
      }

      if (resendTimer) {
        resendTimer.classList.add('hidden');
      }
    }
  }, 1000);
}

// Manejar errores de verificación
function handleVerifyError(error: unknown): void {
  let errorMessage =
    'Error al verificar código. Por favor, intenta nuevamente.';

  if (error instanceof Error) {
    if (
      error.message.includes('inválido') ||
      error.message.includes('expirado')
    ) {
      errorMessage = 'Código inválido o expirado. Solicita un nuevo código.';
    } else if (error.message.includes('429')) {
      errorMessage =
        'Demasiados intentos. Espera unos minutos antes de intentar nuevamente.';
    } else if (
      error.message.includes('network') ||
      error.message.includes('fetch')
    ) {
      errorMessage = 'Error de conexión. Verifica tu conexión a internet.';
    } else {
      errorMessage = error.message;
    }
  }

  showError(errorMessage);
}

// Estados de carga
function setLoadingState(button: HTMLButtonElement, loading: boolean): void {
  const submitText = document.getElementById('submitText') as HTMLElement;
  const submitLoader = document.getElementById('submitLoader') as HTMLElement;

  if (loading) {
    button.disabled = true;
    if (submitText) submitText.classList.add('hidden');
    if (submitLoader) submitLoader.classList.remove('hidden');
  } else {
    button.disabled = false;
    if (submitText) submitText.classList.remove('hidden');
    if (submitLoader) submitLoader.classList.add('hidden');
  }
}

function setResendLoading(button: HTMLButtonElement, loading: boolean): void {
  if (loading) {
    button.disabled = true;
    button.textContent = 'ENVIANDO...';
  } else if (resendCooldown <= 0) {
    button.disabled = false;
    button.textContent = 'REENVIAR CÓDIGO';
  }
}

// Funciones de UI para mensajes
function showError(message: string): void {
  showMessage(message, 'error');
}

function showSuccess(message: string): void {
  showMessage(message, 'success');
}

function showInfo(message: string): void {
  showMessage(message, 'info');
}

function showMessage(
  message: string,
  type: 'error' | 'success' | 'info'
): void {
  const verifyMessages = document.getElementById(
    'verifyMessages'
  ) as HTMLElement;
  const verifyError = document.getElementById('verifyError') as HTMLElement;
  const verifySuccess = document.getElementById('verifySuccess') as HTMLElement;

  if (!verifyMessages || !verifyError || !verifySuccess) return;

  // Limpiar mensajes anteriores
  verifyError.classList.add('hidden');
  verifySuccess.classList.add('hidden');
  verifyMessages.classList.add('hidden');

  // Mostrar nuevo mensaje
  if (type === 'error') {
    verifyError.innerHTML = message;
    verifyError.classList.remove('hidden');
    verifyMessages.classList.remove('hidden');
  } else if (type === 'success') {
    verifySuccess.innerHTML = message;
    verifySuccess.classList.remove('hidden');
    verifyMessages.classList.remove('hidden');
  }

  // Auto-remover después de unos segundos (excepto errores)
  if (type !== 'error') {
    setTimeout(() => {
      verifyMessages.classList.add('hidden');
    }, 5000);
  }
}

function clearErrors(): void {
  const verifyMessages = document.getElementById(
    'verifyMessages'
  ) as HTMLElement;
  if (verifyMessages) {
    verifyMessages.classList.add('hidden');
  }
}

// Hacer la función disponible globalmente
declare global {
  interface Window {
    initializeVerifyEmailPage: () => void;
  }
}

window.initializeVerifyEmailPage = initializeVerifyEmailPage;
