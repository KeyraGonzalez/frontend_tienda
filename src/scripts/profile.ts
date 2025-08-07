import { authService } from '../utils/api/index';
import type { User } from '../types/types';

interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  role: string;
  created_at?: string;
  user_metadata?: {
    full_name?: string;
    phone?: string;
  };
}

export class ProfileManager {
  private currentUser: UserProfile | null = null;
  private currentTab: string = 'profile';

  constructor() {
    this.initializeProfile();
  }

  private async initializeProfile() {
    try {
      // Verificar autenticación
      if (!authService.isAuthenticated()) {
        window.location.href = '/login';
        return;
      }

      // Cargar datos del usuario
      await this.loadUserData();
      this.setupEventListeners();
      this.renderProfile();
      this.loadInitialTab();
    } catch (error) {
      console.error('Error initializing profile:', error);
      this.showError('Error al cargar el perfil');
    }
  }

  private async loadUserData() {
    // Primero intentar desde el servicio de auth
    let user = await authService.getCurrentUser();

    // Si no hay datos completos, intentar desde localStorage
    if (!user?.full_name) {
      const userProfile = localStorage.getItem('user_profile');
      const userData = localStorage.getItem('user_data');

      if (userProfile) {
        const profileData = JSON.parse(userProfile);
        user = { ...user, ...profileData };
      } else if (userData) {
        const storedData = JSON.parse(userData);
        user = { ...user, ...storedData };
      }
    }

    if (user) {
      // Asegurar que 'role' siempre sea string
      this.currentUser = {
        ...user,
        role: user.role ?? 'cliente', // Valor por defecto si no existe
      };
    } else {
      this.currentUser = null;
    }
  }

  private renderProfile() {
    if (!this.currentUser) return;

    // Actualizar header del perfil
    this.updateProfileHeader();

    // Mostrar/ocultar botón de administración según el rol
    this.updateAdminAccess();

    // Cargar datos en formularios
    this.populateProfileForm();
  }

  private updateProfileHeader() {
    const userNameElement = document.getElementById('user-name');
    const userEmailElement = document.getElementById('user-email');
    const userInitialsElement = document.getElementById('user-initials');
    const userRoleElement = document.getElementById('user-role');

    if (userNameElement && this.currentUser) {
      const displayName =
        this.currentUser.full_name ||
        this.currentUser.user_metadata?.full_name ||
        this.currentUser.email.split('@')[0] ||
        'Usuario';
      userNameElement.textContent = displayName;
    }

    if (userEmailElement && this.currentUser) {
      userEmailElement.textContent = this.currentUser.email;
    }

    if (userInitialsElement && this.currentUser) {
      const nameForInitials =
        this.currentUser.full_name ||
        this.currentUser.user_metadata?.full_name ||
        this.currentUser.email.split('@')[0] ||
        'Usuario';

      const initials = nameForInitials
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);

      userInitialsElement.textContent = initials;
    }

    if (userRoleElement && this.currentUser) {
      const roleText = this.getRoleDisplayText(this.currentUser.role);
      const roleClass = this.getRoleClass(this.currentUser.role);

      userRoleElement.textContent = roleText;
      userRoleElement.className = `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleClass}`;
    }
  }

  private updateAdminAccess() {
    const adminNavElement = document.getElementById('admin-nav');

    if (adminNavElement) {
      // Usar el servicio de auth para verificar si es admin
      if (authService.isAdmin()) {
        adminNavElement.classList.remove('hidden');
      } else {
        adminNavElement.classList.add('hidden');
      }
    }
  }

  private populateProfileForm() {
    if (!this.currentUser) return;

    // Campos del formulario de perfil
    const fullNameInput = document.getElementById(
      'full_name'
    ) as HTMLInputElement;
    const emailInput = document.getElementById('email') as HTMLInputElement;
    const phoneInput = document.getElementById('phone') as HTMLInputElement;

    if (fullNameInput) {
      fullNameInput.value =
        this.currentUser.full_name ||
        this.currentUser.user_metadata?.full_name ||
        '';
    }

    if (emailInput) {
      emailInput.value = this.currentUser.email;
    }

    if (phoneInput) {
      phoneInput.value =
        this.currentUser.phone || this.currentUser.user_metadata?.phone || '';
    }
  }

  private setupEventListeners() {
    // Navegación por tabs
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach((button) => {
      button.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const tabName = target.dataset.tab;
        if (tabName) {
          this.switchTab(tabName);
        }
      });
    });

    // Formulario de perfil
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
      profileForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveProfile();
      });
    }

    // Cambio de contraseña
    const passwordForm = document.getElementById('password-form');
    if (passwordForm) {
      passwordForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.changePassword();
      });
    }
  }

  private switchTab(tabName: string) {
    // Actualizar botones
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach((button) => {
      const target = button as HTMLElement;
      if (target.dataset.tab === tabName) {
        target.className =
          'tab-button w-full text-left px-3 py-2 rounded-md text-sm font-medium text-primary-600 bg-primary-50 hover:bg-primary-100';
      } else {
        target.className =
          'tab-button w-full text-left px-3 py-2 rounded-md text-sm font-medium text-neutral-600 hover:bg-neutral-50';
      }
    });

    // Mostrar contenido del tab
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach((content) => {
      content.classList.add('hidden');
    });

    const activeTab = document.getElementById(`${tabName}-tab`);
    if (activeTab) {
      activeTab.classList.remove('hidden');
    }

    this.currentTab = tabName;

    // Cargar contenido específico del tab
    switch (tabName) {
      case 'orders':
        this.loadOrders();
        break;
      case 'favorites':
        this.loadFavorites();
        break;
      case 'addresses':
        this.loadAddresses();
        break;
    }
  }

  private loadInitialTab() {
    // Verificar si hay un tab específico en la URL
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab') || 'profile';
    this.switchTab(tab);
  }

  private async saveProfile() {
    try {
      const fullNameInput = document.getElementById(
        'full_name'
      ) as HTMLInputElement;
      const phoneInput = document.getElementById('phone') as HTMLInputElement;

      const updatedData = {
        full_name: fullNameInput?.value || '',
        phone: phoneInput?.value || '',
      };

      // Actualizar datos locales
      if (this.currentUser) {
        this.currentUser.full_name = updatedData.full_name;
        this.currentUser.phone = updatedData.phone;

        // Guardar en localStorage
        localStorage.setItem('user_profile', JSON.stringify(this.currentUser));
      }

      // Aquí iría la llamada al API cuando esté disponible
      // await userService.updateProfile(updatedData);

      this.showSuccess('Perfil actualizado correctamente');

      // Actualizar header del perfil
      this.updateProfileHeader();

      // Actualizar header global si existe la función
      if (window.updateHeaderUserInfo) {
        window.updateHeaderUserInfo(this.currentUser);
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      this.showError('Error al guardar el perfil');
    }
  }

  private async changePassword() {
    try {
      const currentPasswordInput = document.getElementById(
        'current_password'
      ) as HTMLInputElement;
      const newPasswordInput = document.getElementById(
        'new_password'
      ) as HTMLInputElement;
      const confirmPasswordInput = document.getElementById(
        'confirm_password'
      ) as HTMLInputElement;

      const currentPassword = currentPasswordInput?.value;
      const newPassword = newPasswordInput?.value;
      const confirmPassword = confirmPasswordInput?.value;

      // Validaciones
      if (!currentPassword || !newPassword || !confirmPassword) {
        this.showError('Todos los campos son obligatorios');
        return;
      }

      if (newPassword !== confirmPassword) {
        this.showError('Las contraseñas no coinciden');
        return;
      }

      if (newPassword.length < 8) {
        this.showError('La contraseña debe tener al menos 8 caracteres');
        return;
      }

      // Aquí iría la llamada al API
      // await authService.changePassword(currentPassword, newPassword);

      this.showSuccess('Contraseña cambiada correctamente');

      // Limpiar formulario
      if (currentPasswordInput) currentPasswordInput.value = '';
      if (newPasswordInput) newPasswordInput.value = '';
      if (confirmPasswordInput) confirmPasswordInput.value = '';
    } catch (error) {
      console.error('Error changing password:', error);
      this.showError('Error al cambiar la contraseña');
    }
  }

  private async loadOrders() {
    const ordersContainer = document.getElementById('orders-list');
    if (!ordersContainer) return;

    try {
      // Mostrar loading
      ordersContainer.innerHTML =
        '<div class="text-center py-8">Cargando pedidos...</div>';

      //  const orders = await orderService.getUserOrders();

      // Datos de ejemplo mientras no hay API
      const mockOrders = [
        {
          id: '1',
          date: '2024-01-15',
          status: 'delivered',
          total: 89.99,
          items: 3,
        },
        {
          id: '2',
          date: '2024-01-10',
          status: 'shipped',
          total: 156.5,
          items: 5,
        },
      ];

      this.renderOrders(mockOrders);
    } catch (error) {
      console.error('Error loading orders:', error);
      ordersContainer.innerHTML =
        '<div class="text-center py-8 text-red-600">Error al cargar pedidos</div>';
    }
  }

  private renderOrders(orders: any[]) {
    const ordersContainer = document.getElementById('orders-list');
    if (!ordersContainer) return;

    if (orders.length === 0) {
      ordersContainer.innerHTML = `
        <div class="text-center py-12">
          <svg class="mx-auto h-12 w-12 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          <h3 class="mt-2 text-sm font-medium text-neutral-900">No tienes pedidos</h3>
          <p class="mt-1 text-sm text-neutral-500">Comienza a explorar nuestros productos</p>
          <div class="mt-6">
            <a href="/productos" class="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors">
              Explorar productos
            </a>
          </div>
        </div>
      `;
      return;
    }

    const ordersHTML = orders
      .map(
        (order) => `
      <div class="border border-neutral-200 rounded-lg p-4 hover:bg-neutral-50 transition-colors">
        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium text-neutral-900">Pedido #${order.id}</p>
            <p class="text-sm text-neutral-500">${new Date(
              order.date
            ).toLocaleDateString()}</p>
          </div>
          <div class="text-right">
            <p class="font-medium text-neutral-900">$${order.total}</p>
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${this.getOrderStatusClass(
              order.status
            )}">
              ${this.getOrderStatusText(order.status)}
            </span>
          </div>
        </div>
        <div class="mt-2 flex items-center justify-between">
          <p class="text-sm text-neutral-500">${order.items} artículos</p>
          <button class="text-primary-600 hover:text-primary-700 text-sm font-medium">
            Ver detalles
          </button>
        </div>
      </div>
    `
      )
      .join('');

    ordersContainer.innerHTML = ordersHTML;
  }

  private async loadFavorites() {
    // Implementar carga de favoritos
    const favoritesContainer = document.getElementById('favorites-list');
    if (favoritesContainer) {
      favoritesContainer.innerHTML =
        '<div class="text-center py-8">Cargando favoritos...</div>';
    }
  }

  private async loadAddresses() {
    // Implementar carga de direcciones
    const addressesContainer = document.getElementById('addresses-list');
    if (addressesContainer) {
      addressesContainer.innerHTML =
        '<div class="text-center py-8">Cargando direcciones...</div>';
    }
  }

  private getRoleDisplayText(role: string): string {
    const roleMap: Record<string, string> = {
      admin: 'Administrador',
      cliente: 'Cliente',
      moderador: 'Moderador',
      vendedor: 'Vendedor',
    };
    return roleMap[role] || 'Cliente';
  }

  private getRoleClass(role: string): string {
    const classMap: Record<string, string> = {
      admin: 'bg-purple-100 text-purple-800',
      cliente: 'bg-green-100 text-green-800',
      moderador: 'bg-blue-100 text-blue-800',
      vendedor: 'bg-yellow-100 text-yellow-800',
    };
    return classMap[role] || 'bg-green-100 text-green-800';
  }

  private getOrderStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      pending: 'Pendiente',
      confirmed: 'Confirmado',
      shipped: 'Enviado',
      delivered: 'Entregado',
      cancelled: 'Cancelado',
    };
    return statusMap[status] || status;
  }

  private getOrderStatusClass(status: string): string {
    const classMap: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      shipped: 'bg-purple-100 text-purple-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return classMap[status] || 'bg-neutral-100 text-neutral-800';
  }

  private showSuccess(message: string) {
    this.showToast(message, 'success');
  }

  private showError(message: string) {
    this.showToast(message, 'error');
  }

  private showToast(message: string, type: 'success' | 'error') {
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 px-4 py-2 rounded-lg shadow-lg z-50 transition-opacity duration-300 ${
      type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
    }`;
    toast.textContent = message;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}

// Función para inicializar el perfil
export function initializeProfile() {
  return new ProfileManager();
}

// Declaraciones globales para TypeScript
declare global {
  interface Window {
    updateHeaderUserInfo?: (user: any) => void;
  }
}
