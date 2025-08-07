// Scripts para la página de inicio de sesión
import { authService } from '../../utils/api/index';

// Tipos para el formulario de login
interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

interface LoginFormElements extends HTMLFormControlsCollection {
  email: HTMLInputElement;
  password: HTMLInputElement;
  'remember-me': HTMLInputElement;
}

interface LoginForm extends HTMLFormElement {
  elements: LoginFormElements;
}

// Estado de la aplicación de login
let isLoading = false;

// Función de inicialización
export function initializeLoginPage(): void {
  // Verificar si ya está autenticado
  if (authService.isAuthenticated()) {
    redirectToReturnUrl();
    return;
  }

  setupEventListeners();
  setupFormValidation();
  loadRememberedData();
}

// Configurar event listeners
function setupEventListeners(): void {
  const loginForm = document.getElementById('login-form') as LoginForm;

  if (loginForm) {
    loginForm.addEventListener('submit', handleLoginSubmit);
  }

  // Manejar botones de redes sociales
  setupSocialLogin();

  // Limpiar errores al escribir
  const inputs = loginForm?.querySelectorAll(
    'input[type="email"], input[type="password"]'
  );
  inputs?.forEach((input) => {
    input.addEventListener('input', clearErrors);
  });
}

// Manejar envío del formulario de login
async function handleLoginSubmit(event: Event): Promise<void> {
  event.preventDefault();

  if (isLoading) return;

  const form = event.target as LoginForm;
  const submitButton = form.querySelector(
    'button[type="submit"]'
  ) as HTMLButtonElement;

  try {
    isLoading = true;
    setLoadingState(submitButton, true);
    clearErrors();

    const credentials = extractCredentials(form);

    // Validar formulario
    if (!validateCredentials(credentials)) {
      return;
    }

    // Solo enviar email y password al servidor
    await authService.login({
      email: credentials.email,
      password: credentials.password,
    });

    // Manejar "Remember Me" localmente si está marcado
    if (credentials.rememberMe) {
      // Guardar preferencia de recordar usuario en localStorage
      localStorage.setItem('rememberMe', 'true');
      localStorage.setItem('rememberedEmail', credentials.email);
    } else {
      localStorage.removeItem('rememberMe');
      localStorage.removeItem('rememberedEmail');
    }

    // Mostrar éxito y redirigir
    showSuccess('Inicio de sesión exitoso. Redirigiendo...');

    // Update header auth state if function is available
    if (typeof (window as any).updateHeaderAuth === 'function') {
      (window as any).updateHeaderAuth();
    }

    setTimeout(() => {
      redirectToReturnUrl();
    }, 1000);
  } catch (error) {
    console.error('Login error:', error);
    handleLoginError(error);
  } finally {
    isLoading = false;
    setLoadingState(submitButton, false);
  }
}

// Extraer credenciales del formulario
function extractCredentials(form: LoginForm): LoginCredentials {
  return {
    email: form.elements.email.value.trim(),
    password: form.elements.password.value,
    rememberMe: form.elements['remember-me'].checked,
  };
}

// Validar credenciales
function validateCredentials(credentials: LoginCredentials): boolean {
  const errors: string[] = [];

  if (!credentials.email) {
    errors.push('El correo electrónico es requerido');
  } else if (!isValidEmail(credentials.email)) {
    errors.push('El correo electrónico no es válido');
  }

  if (!credentials.password) {
    errors.push('La contraseña es requerida');
  } else if (credentials.password.length < 6) {
    errors.push('La contraseña debe tener al menos 6 caracteres');
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
  const emailInput = document.getElementById('email') as HTMLInputElement;
  const passwordInput = document.getElementById('password') as HTMLInputElement;

  if (emailInput) {
    emailInput.addEventListener('blur', () => {
      const email = emailInput.value.trim();
      if (email && !isValidEmail(email)) {
        showFieldError(emailInput, 'El correo electrónico no es válido');
      } else {
        clearFieldError(emailInput);
      }
    });
  }

  if (passwordInput) {
    passwordInput.addEventListener('blur', () => {
      const password = passwordInput.value;
      if (password && password.length < 6) {
        showFieldError(
          passwordInput,
          'La contraseña debe tener al menos 6 caracteres'
        );
      } else {
        clearFieldError(passwordInput);
      }
    });
  }
}

// Configurar login con redes sociales
function setupSocialLogin(): void {
  const googleBtn = document.getElementById('google-login');
  const facebookBtn = document.getElementById('facebook-login');

  googleBtn?.addEventListener('click', () => {
    showInfo('Función de Google no implementada aún');
  });

  facebookBtn?.addEventListener('click', () => {
    showInfo('Función de Facebook no implementada aún');
  });
}

// Manejar errores de login
function handleLoginError(error: unknown): void {
  let errorMessage = 'Error al iniciar sesión. Por favor, intenta nuevamente.';

  if (error instanceof Error) {
    if (
      error.message.includes('verificar tu email') ||
      error.message.includes('verify') ||
      error.message.includes('email_confirmed_at')
    ) {
      // Error específico de email no verificado
      const email = (document.getElementById('email') as HTMLInputElement)
        ?.value;
      errorMessage = error.message;

      // Agregar botón para ir a verificación
      if (email) {
        const verifyUrl = `/verify-email?email=${encodeURIComponent(email)}`;
        errorMessage += `<br><br><a href="${verifyUrl}" class="font-bold text-black hover:text-gray-600 transition duration-200 tracking-wide uppercase">IR A VERIFICACIÓN DE EMAIL</a>`;
      }
    } else if (
      error.message.includes('401') ||
      error.message.includes('unauthorized')
    ) {
      errorMessage =
        'Credenciales incorrectas. Verifica tu email y contraseña.';
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

// Redirigir a la URL de retorno
function redirectToReturnUrl(): void {
  const returnUrl =
    new URLSearchParams(window.location.search).get('return') || '/';
  window.location.href = returnUrl;
}

// Estados de carga
function setLoadingState(button: HTMLButtonElement, loading: boolean): void {
  if (loading) {
    button.disabled = true;
    button.innerHTML = `
      <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Iniciando sesión...
    `;
  } else {
    button.disabled = false;
    button.textContent = 'Iniciar sesión';
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
  const form = document.getElementById('login-form');
  if (!form) return;

  // Remover mensaje anterior
  const existingMessage = document.getElementById('login-message');
  existingMessage?.remove();

  const messageDiv = document.createElement('div');
  messageDiv.id = 'login-message';

  const bgColor =
    type === 'error'
      ? 'bg-red-50 border-red-200'
      : type === 'success'
      ? 'bg-green-50 border-green-200'
      : 'bg-blue-50 border-blue-200';

  const textColor =
    type === 'error'
      ? 'text-red-800'
      : type === 'success'
      ? 'text-green-800'
      : 'text-blue-800';

  const iconColor =
    type === 'error'
      ? 'text-red-400'
      : type === 'success'
      ? 'text-green-400'
      : 'text-blue-400';

  messageDiv.className = `mt-4 p-4 ${bgColor} border rounded-md`;
  messageDiv.innerHTML = `
    <div class="flex">
      <div class="flex-shrink-0">
        <svg class="h-5 w-5 ${iconColor}" viewBox="0 0 20 20" fill="currentColor">
          ${
            type === 'error'
              ? '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />'
              : type === 'success'
              ? '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />'
              : '<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />'
          }
        </svg>
      </div>
      <div class="ml-3">
        <p class="text-sm ${textColor}">${message}</p>
      </div>
    </div>
  `;

  form.appendChild(messageDiv);

  // Auto-remover después de unos segundos (excepto errores)
  if (type !== 'error') {
    setTimeout(() => {
      messageDiv.remove();
    }, 5000);
  }
}

function clearErrors(): void {
  const existingMessage = document.getElementById('login-message');
  existingMessage?.remove();

  // Limpiar errores de campos individuales
  document.querySelectorAll('.field-error').forEach((el) => el.remove());
  document.querySelectorAll('.border-red-500').forEach((el) => {
    el.classList.remove('border-red-500');
    el.classList.add('border-neutral-300');
  });
}

function showFieldError(input: HTMLInputElement, message: string): void {
  clearFieldError(input);

  input.classList.add('border-red-500');
  input.classList.remove('border-neutral-300');

  const errorDiv = document.createElement('div');
  errorDiv.className = 'field-error mt-1 text-sm text-red-600';
  errorDiv.textContent = message;

  input.parentNode?.appendChild(errorDiv);
}

// Cargar datos recordados
function loadRememberedData(): void {
  const rememberMe = localStorage.getItem('rememberMe');
  const rememberedEmail = localStorage.getItem('rememberedEmail');

  if (rememberMe === 'true' && rememberedEmail) {
    const emailInput = document.getElementById('email') as HTMLInputElement;
    const rememberCheckbox = document.getElementById(
      'remember-me'
    ) as HTMLInputElement;

    if (emailInput) {
      emailInput.value = rememberedEmail;
    }

    if (rememberCheckbox) {
      rememberCheckbox.checked = true;
    }
  }
}

function clearFieldError(input: HTMLInputElement): void {
  input.classList.remove('border-red-500');
  input.classList.add('border-neutral-300');

  const errorDiv = input.parentNode?.querySelector('.field-error');
  errorDiv?.remove();
}

// Hacer la función disponible globalmente
declare global {
  interface Window {
    initializeLoginPage: () => void;
  }
}

window.initializeLoginPage = initializeLoginPage;
