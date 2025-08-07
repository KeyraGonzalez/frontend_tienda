// Scripts para la página de registro
import { authService } from '../../utils/api/index';

// Tipos para el formulario de registro
interface RegisterData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
  newsletter?: boolean;
}

interface RegisterFormElements extends HTMLFormControlsCollection {
  fullName: HTMLInputElement;
  email: HTMLInputElement;
  password: HTMLInputElement;
  confirmPassword: HTMLInputElement;
  terms: HTMLInputElement;
  newsletter: HTMLInputElement;
}

interface RegisterForm extends HTMLFormElement {
  elements: RegisterFormElements;
}

// Estado de la aplicación de registro
let isLoading = false;

// Función de inicialización
export function initializeRegisterPage(): void {
  // Verificar si ya está autenticado
  if (authService.isAuthenticated()) {
    window.location.href = '/';
    return;
  }

  setupEventListeners();
  setupFormValidation();
  setupPasswordStrengthIndicator();
}

// Configurar event listeners
function setupEventListeners(): void {
  const registerForm = document.getElementById('register-form') as RegisterForm;

  if (registerForm) {
    registerForm.addEventListener('submit', handleRegisterSubmit);
  }

  // Manejar botones de redes sociales
  setupSocialRegister();

  // Validación en tiempo real
  const inputs = registerForm?.querySelectorAll('input');
  inputs?.forEach((input) => {
    input.addEventListener('input', clearErrors);
  });
}

// Manejar envío del formulario de registro
async function handleRegisterSubmit(event: Event): Promise<void> {
  event.preventDefault();

  if (isLoading) return;

  const form = event.target as RegisterForm;
  const submitButton = form.querySelector(
    'button[type="submit"]'
  ) as HTMLButtonElement;

  try {
    isLoading = true;
    setLoadingState(submitButton, true);
    clearErrors();

    const registerData = extractRegisterData(form);

    // Validar formulario
    if (!validateRegisterData(registerData)) {
      return;
    }

    // Registrar usuario
    const { name, email, password } = registerData;
    const result = await authService.register({
      full_name: name,
      email,
      password,
    });

    // Verificar si requiere verificación de email
    if (result.requiresVerification) {
      showSuccess(
        'Registro exitoso. Se ha enviado un código de verificación a tu email. Debes verificar tu email antes de poder iniciar sesión.'
      );

      // Redirigir a página de verificación de email después de un breve delay
      setTimeout(() => {
        // Crear URL con email como parámetro para precompletarlo
        const verifyUrl = `/verify-email?email=${encodeURIComponent(email)}`;
        window.location.href = verifyUrl;
      }, 2000);
    } else {
      // Si por alguna razón no requiere verificación, proceder normalmente
      showSuccess('Registro exitoso. Redirigiendo...');
      setTimeout(() => {
        window.location.href = '/login';
      }, 1500);
    }
  } catch (error) {
    console.error('Register error:', error);
    handleRegisterError(error);
  } finally {
    isLoading = false;
    setLoadingState(submitButton, false);
  }
}

// Extraer datos del formulario
function extractRegisterData(form: RegisterForm): RegisterData {
  return {
    name: form.elements.fullName.value.trim(),
    email: form.elements.email.value.trim(),
    password: form.elements.password.value,
    confirmPassword: form.elements.confirmPassword.value,
    acceptTerms: form.elements.terms.checked,
    newsletter: form.elements.newsletter?.checked || false,
  };
}

// Validar datos de registro
function validateRegisterData(data: RegisterData): boolean {
  const errors: string[] = [];

  // Validar nombre
  if (!data.name) {
    errors.push('El nombre es requerido');
  } else if (data.name.length < 2) {
    errors.push('El nombre debe tener al menos 2 caracteres');
  }

  // Validar email
  if (!data.email) {
    errors.push('El correo electrónico es requerido');
  } else if (!isValidEmail(data.email)) {
    errors.push('El correo electrónico no es válido');
  }

  // Validar contraseña
  if (!data.password) {
    errors.push('La contraseña es requerida');
  } else {
    const passwordValidation = validatePassword(data.password);
    if (!passwordValidation.isValid) {
      errors.push(...passwordValidation.errors);
    }
  }

  // Validar confirmación de contraseña
  if (!data.confirmPassword) {
    errors.push('La confirmación de contraseña es requerida');
  } else if (data.password !== data.confirmPassword) {
    errors.push('Las contraseñas no coinciden');
  }

  // Validar términos y condiciones
  if (!data.acceptTerms) {
    errors.push('Debes aceptar los términos y condiciones');
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

// Validar fortaleza de contraseña
function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
  strength: number;
} {
  const errors: string[] = [];
  let strength = 0;

  if (password.length < 8) {
    errors.push('La contraseña debe tener al menos 8 caracteres');
  } else {
    strength += 1;
  }

  if (!/[a-z]/.test(password)) {
    errors.push('La contraseña debe contener al menos una letra minúscula');
  } else {
    strength += 1;
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('La contraseña debe contener al menos una letra mayúscula');
  } else {
    strength += 1;
  }

  if (!/\d/.test(password)) {
    errors.push('La contraseña debe contener al menos un número');
  } else {
    strength += 1;
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    // No es obligatorio, pero suma puntos
  } else {
    strength += 1;
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength,
  };
}

// Configurar validación en tiempo real
function setupFormValidation(): void {
  const nameInput = document.getElementById('fullName') as HTMLInputElement;
  const emailInput = document.getElementById('email') as HTMLInputElement;
  const passwordInput = document.getElementById('password') as HTMLInputElement;
  const confirmPasswordInput = document.getElementById(
    'confirmPassword'
  ) as HTMLInputElement;

  if (nameInput) {
    nameInput.addEventListener('blur', () => {
      const name = nameInput.value.trim();
      if (name && name.length < 2) {
        showFieldError(nameInput, 'El nombre debe tener al menos 2 caracteres');
      } else {
        clearFieldError(nameInput);
      }
    });
  }

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
    passwordInput.addEventListener('input', () => {
      updatePasswordStrength(passwordInput.value);
    });

    passwordInput.addEventListener('blur', () => {
      const password = passwordInput.value;
      if (password) {
        const validation = validatePassword(password);
        if (!validation.isValid) {
          showFieldError(passwordInput, validation.errors[0]);
        } else {
          clearFieldError(passwordInput);
        }
      }
    });
  }

  if (confirmPasswordInput && passwordInput) {
    confirmPasswordInput.addEventListener('blur', () => {
      const password = passwordInput.value;
      const confirmPassword = confirmPasswordInput.value;

      if (confirmPassword && password !== confirmPassword) {
        showFieldError(confirmPasswordInput, 'Las contraseñas no coinciden');
      } else {
        clearFieldError(confirmPasswordInput);
      }
    });
  }
}

// Configurar indicador de fortaleza de contraseña
function setupPasswordStrengthIndicator(): void {
  const passwordInput = document.getElementById('password') as HTMLInputElement;
  if (!passwordInput) return;

  // Crear indicador de fortaleza
  const strengthIndicator = document.createElement('div');
  strengthIndicator.id = 'password-strength';
  strengthIndicator.className = 'mt-2';
  strengthIndicator.innerHTML = `
    <div class="text-xs text-neutral-600 mb-1">Fortaleza de la contraseña:</div>
    <div class="flex space-x-1">
      <div class="flex-1 h-2 bg-neutral-200 rounded"></div>
      <div class="flex-1 h-2 bg-neutral-200 rounded"></div>
      <div class="flex-1 h-2 bg-neutral-200 rounded"></div>
      <div class="flex-1 h-2 bg-neutral-200 rounded"></div>
      <div class="flex-1 h-2 bg-neutral-200 rounded"></div>
    </div>
    <div class="text-xs mt-1" id="strength-text"></div>
  `;

  passwordInput.parentNode?.appendChild(strengthIndicator);
}

// Actualizar indicador de fortaleza de contraseña
function updatePasswordStrength(password: string): void {
  const strengthIndicator = document.getElementById('password-strength');
  const strengthText = document.getElementById('strength-text');

  if (!strengthIndicator || !strengthText) return;

  const validation = validatePassword(password);
  const bars = strengthIndicator.querySelectorAll('.flex-1');

  // Resetear barras
  bars.forEach((bar) => {
    bar.className = 'flex-1 h-2 bg-neutral-200 rounded';
  });

  if (password.length === 0) {
    strengthText.textContent = '';
    return;
  }

  // Colorear barras según fortaleza
  const colors = [
    'bg-red-500',
    'bg-orange-500',
    'bg-yellow-500',
    'bg-blue-500',
    'bg-green-500',
  ];
  const labels = ['Muy débil', 'Débil', 'Regular', 'Fuerte', 'Muy fuerte'];

  for (let i = 0; i < validation.strength && i < bars.length; i++) {
    bars[i].className = `flex-1 h-2 ${
      colors[Math.min(i, colors.length - 1)]
    } rounded`;
  }

  strengthText.textContent =
    labels[Math.min(validation.strength - 1, labels.length - 1)] || 'Muy débil';
  strengthText.className = `text-xs mt-1 ${
    validation.strength >= 3
      ? 'text-green-600'
      : validation.strength >= 2
      ? 'text-yellow-600'
      : 'text-red-600'
  }`;
}

// Configurar registro con redes sociales
function setupSocialRegister(): void {
  const googleBtn = document.getElementById('google-register');
  const facebookBtn = document.getElementById('facebook-register');

  googleBtn?.addEventListener('click', () => {
    showInfo('Función de Google no implementada aún');
  });

  facebookBtn?.addEventListener('click', () => {
    showInfo('Función de Facebook no implementada aún');
  });
}

// Manejar errores de registro
function handleRegisterError(error: unknown): void {
  let errorMessage = 'Error al crear la cuenta. Por favor, intenta nuevamente.';

  if (error instanceof Error) {
    if (error.message.includes('409') || error.message.includes('exists')) {
      errorMessage = 'Ya existe una cuenta con este correo electrónico.';
    } else if (
      error.message.includes('400') ||
      error.message.includes('validation')
    ) {
      errorMessage = 'Datos inválidos. Verifica la información ingresada.';
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
  if (loading) {
    button.disabled = true;
    button.innerHTML = `
      <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Creando cuenta...
    `;
  } else {
    button.disabled = false;
    button.textContent = 'Crear cuenta';
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
  const form = document.getElementById('register-form');
  if (!form) return;

  // Remover mensaje anterior
  const existingMessage = document.getElementById('register-message');
  existingMessage?.remove();

  const messageDiv = document.createElement('div');
  messageDiv.id = 'register-message';

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
  const existingMessage = document.getElementById('register-message');
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

function clearFieldError(input: HTMLInputElement): void {
  input.classList.remove('border-red-500');
  input.classList.add('border-neutral-300');

  const errorDiv = input.parentNode?.querySelector('.field-error');
  errorDiv?.remove();
}

// Hacer la función disponible globalmente
declare global {
  interface Window {
    initializeRegisterPage: () => void;
  }
}

window.initializeRegisterPage = initializeRegisterPage;
