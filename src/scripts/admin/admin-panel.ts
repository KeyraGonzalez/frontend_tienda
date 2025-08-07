// Scripts para el panel principal de administración
import {
  authService,
  usersService,
  ordersService,
  productsService,
} from '../../utils/api/index';
import type {
  User,
  Order,
  Product,
  PaginatedResponse,
} from '../../types/types';
import { initializeCategoriesManagement } from './categories';

// Estado de la aplicación
let currentUser: User | null = null;
let currentPage = 1;
let currentFilters: any = {};

// Función de inicialización principal
export async function initializeAdminPanel() {
  const loadingEl = document.getElementById('loading');
  const accessDeniedEl = document.getElementById('access-denied');
  const adminPanelEl = document.getElementById('admin-panel');

  try {
    // Verificar autenticación
    if (!authService.isAuthenticated()) {
      loadingEl?.classList.add('hidden');
      window.location.href =
        '/login?return=' + encodeURIComponent(window.location.pathname);
      return;
    }

    currentUser = authService.getCurrentUser();

    // Verificar permisos de administrador
    if (!authService.isAdmin()) {
      loadingEl?.classList.add('hidden');
      accessDeniedEl?.classList.remove('hidden');
      return;
    }

    // Inicializar UI del administrador
    updateAdminInfo();
    setupEventListeners();

    // Cargar dashboard por defecto
    await loadDashboard();

    loadingEl?.classList.add('hidden');
    adminPanelEl?.classList.remove('hidden');
  } catch (error) {
    console.error('Error initializing admin:', error);
    loadingEl?.classList.add('hidden');
    accessDeniedEl?.classList.remove('hidden');
  }
}

function updateAdminInfo() {
  const adminNameEl = document.getElementById('admin-name');
  const adminInitialsEl = document.getElementById('admin-initials');

  if (adminNameEl) {
    const displayName = authService.getDisplayName(25); // Permitir más caracteres en admin panel
    adminNameEl.textContent = displayName;
  }

  if (adminInitialsEl) {
    const initials = authService.getInitials();
    adminInitialsEl.textContent = initials;
  }
}

function setupEventListeners() {
  // Tab navigation
  const tabButtons = document.querySelectorAll('.admin-tab');
  tabButtons.forEach((button) => {
    button.addEventListener('click', async (e) => {
      const tab = (e.target as HTMLElement).dataset.tab;
      if (tab) {
        await switchTab(tab);
      }
    });
  });

  // Filter buttons
  document
    .getElementById('products-filter-btn')
    ?.addEventListener('click', loadProducts);
  document
    .getElementById('orders-filter-btn')
    ?.addEventListener('click', loadOrders);
  document
    .getElementById('users-filter-btn')
    ?.addEventListener('click', loadUsers);
  document
    .getElementById('payments-filter-btn')
    ?.addEventListener('click', loadPayments);

  // Add buttons
  document
    .getElementById('add-product-btn')
    ?.addEventListener('click', () => showProductModal());
  document
    .getElementById('add-user-btn')
    ?.addEventListener('click', () => showUserModal());

  // Export buttons
  document
    .getElementById('export-orders-btn')
    ?.addEventListener('click', exportOrders);
  document
    .getElementById('export-payments-btn')
    ?.addEventListener('click', exportPayments);

  // Search inputs
  setupSearchInputs();
}

function setupSearchInputs() {
  const searchInputs = [
    'products-search',
    'orders-search',
    'users-search',
    'payments-search',
  ];

  searchInputs.forEach((inputId) => {
    const input = document.getElementById(inputId);
    if (input) {
      let timeout: NodeJS.Timeout;
      input.addEventListener('input', () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          const section = inputId.split('-')[0];
          if (section === 'products') loadProducts();
          else if (section === 'orders') loadOrders();
          else if (section === 'users') loadUsers();
          else if (section === 'payments') loadPayments();
        }, 500);
      });
    }
  });
}

async function switchTab(tab: string) {
  // Update tab buttons
  const tabButtons = document.querySelectorAll('.admin-tab');
  tabButtons.forEach((btn) => {
    btn.classList.remove('active', 'border-black', 'text-black');
    btn.classList.add('border-transparent', 'text-gray-600');
  });

  const activeButton = document.querySelector(`[data-tab="${tab}"]`);
  if (activeButton) {
    activeButton.classList.add('active', 'border-black', 'text-black');
    activeButton.classList.remove('border-transparent', 'text-gray-600');
  }

  // Hide all content
  const tabContents = document.querySelectorAll('.tab-content');
  tabContents.forEach((content) => content.classList.add('hidden'));

  // Show selected content
  const activeContent = document.getElementById(`${tab}-content`);
  if (activeContent) {
    activeContent.classList.remove('hidden');
  }

  // Load content or redirect to dedicated pages
  switch (tab) {
    case 'dashboard':
      await loadDashboard();
      break;
    case 'products':
      window.location.href = '/admin/productos';
      break;
    case 'categories':
      // Inicializar gestión de categorías cuando se abra el tab
      initializeCategoriesManagement();
      break;
    case 'orders':
      window.location.href = '/admin/ordenes';
      break;
    case 'users':
      window.location.href = '/admin/usuarios';
      break;
    case 'payments':
      window.location.href = '/admin/pagos';
      break;
  }
}

async function loadDashboard() {
  try {
    console.log('🚀 Loading dashboard...');

    // Cargar estadísticas generales
    const [usersResponse, ordersResponse, productsResponse] =
      await Promise.allSettled([
        usersService.getAllUsers({ page: 1, limit: 1 }),
        ordersService.getAllOrders({ page: 1, limit: 1 }),
        productsService.getProducts({ page: 1, limit: 1 }),
      ]);

    console.log('📊 Responses:', {
      usersResponse,
      ordersResponse,
      productsResponse,
    });

    // Actualizar contadores
    if (usersResponse.status === 'fulfilled') {
      const totalUsersEl = document.getElementById('total-users');
      if (totalUsersEl) {
        const total = usersResponse.value.pagination?.total?.toString() || '0';
        totalUsersEl.textContent = total;
        console.log('👥 Total users:', total);
      }
    }

    if (ordersResponse.status === 'fulfilled') {
      const totalOrdersEl = document.getElementById('total-orders');
      if (totalOrdersEl) {
        const total = ordersResponse.value.pagination?.total?.toString() || '0';
        totalOrdersEl.textContent = total;
        console.log('📦 Total orders:', total);
      }
    }

    if (productsResponse.status === 'fulfilled') {
      const totalProductsEl = document.getElementById('total-products');
      if (totalProductsEl) {
        const total =
          productsResponse.value.pagination?.total?.toString() || '0';
        totalProductsEl.textContent = total;
        console.log('🛍️ Total products:', total);
      }
    }

    // Calcular ingresos totales basado en órdenes completadas
    if (ordersResponse.status === 'fulfilled') {
      try {
        const allOrdersResponse = await ordersService.getAllOrders({
          limit: 100,
        });
        const completedOrders =
          allOrdersResponse.orders?.filter(
            (order: any) => order.payment_status === 'completed'
          ) || [];

        const totalRevenue = completedOrders.reduce(
          (sum: number, order: any) => sum + (parseFloat(order.total) || 0),
          0
        );

        const totalRevenueEl = document.getElementById('total-revenue');
        if (totalRevenueEl) {
          totalRevenueEl.textContent = `$${totalRevenue.toFixed(2)}`;
          console.log('💰 Total revenue:', totalRevenue);
        }
      } catch (error) {
        console.error('Error calculating revenue:', error);
      }
    }

    // Cargar órdenes recientes
    await loadRecentOrders();
    await loadTopProducts();
  } catch (error) {
    console.error('Error loading dashboard:', error);
  }
}

async function loadRecentOrders() {
  try {
    const response = await ordersService.getAllOrders({ page: 1, limit: 5 });
    const recentOrdersEl = document.getElementById('recent-orders');

    if (recentOrdersEl && response.orders) {
      if (response.orders.length === 0) {
        recentOrdersEl.innerHTML =
          '<p class="text-black text-center">No hay órdenes recientes</p>';
      } else {
        recentOrdersEl.innerHTML = response.orders
          .map(
            (order: any) => `
          <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div>
              <p class="font-bold text-black">#${order.id}</p>
              <p class="text-sm text-gray-600">${
                order.user?.email || order.user_id || 'Usuario'
              }</p>
            </div>
            <div class="text-right">
              <p class="font-bold text-black">$${parseFloat(order.total || 0).toFixed(2)}</p>
              <p class="text-sm text-gray-600">${new Date(
                order.created_at
              ).toLocaleDateString('es-ES')}</p>
            </div>
          </div>
        `
          )
          .join('');
      }
    }
  } catch (error) {
    console.error('Error loading recent orders:', error);
    const recentOrdersEl = document.getElementById('recent-orders');
    if (recentOrdersEl) {
      recentOrdersEl.innerHTML =
        '<p class="text-red-600 text-center">Error al cargar órdenes recientes</p>';
    }
  }
}

async function loadTopProducts() {
  try {
    const response = await productsService.getProducts({
      page: 1,
      limit: 5,
    });
    const topProductsEl = document.getElementById('top-products');

    if (topProductsEl && response.products) {
      if (response.products.length === 0) {
        topProductsEl.innerHTML =
          '<p class="text-neutral-500 text-center">No hay productos disponibles</p>';
      } else {
        topProductsEl.innerHTML = response.products
          .map(
            (product: any) => `
          <div class="flex items-center space-x-3 p-3 bg-neutral-50 rounded-lg">
            <img src="${product.images?.[0]?.image_url || '/placeholder.jpg'}" 
                 alt="${product.name}" 
                 class="w-10 h-10 rounded-lg object-cover">
            <div class="flex-1">
              <p class="font-medium text-neutral-900">${product.name}</p>
              <p class="text-sm text-neutral-500">$${parseFloat(product.price || 0).toFixed(2)}</p>
            </div>
            <div class="text-right">
              <p class="text-sm font-medium text-neutral-900">${
                product.stock_quantity || 0
              } unidades</p>
            </div>
          </div>
        `
          )
          .join('');
      }
    }
  } catch (error) {
    console.error('Error loading top products:', error);
    const topProductsEl = document.getElementById('top-products');
    if (topProductsEl) {
      topProductsEl.innerHTML =
        '<p class="text-red-500 text-center">Error al cargar productos</p>';
    }
  }
}

// Funciones para las tabs que permanecen en el admin principal
async function loadProducts() {
  const tableBody = document.getElementById('products-table-body');
  if (!tableBody) return;

  try {
    tableBody.innerHTML =
      '<tr><td colspan="6" class="px-6 py-4 text-center">Cargando productos...</td></tr>';

    const search =
      (document.getElementById('products-search') as HTMLInputElement)?.value ||
      '';
    const category =
      (document.getElementById('products-category') as HTMLSelectElement)
        ?.value || '';
    const status =
      (document.getElementById('products-status') as HTMLSelectElement)
        ?.value || '';

    const filters: any = { page: currentPage, limit: 10 };
    if (search) filters.search = search;
    if (category) filters.category_id = category;
    if (status) filters.is_active = status === 'true';

    const response = await productsService.getProducts(filters);

    if (!response.products || response.products.length === 0) {
      tableBody.innerHTML =
        '<tr><td colspan="6" class="px-6 py-4 text-center text-neutral-500">No se encontraron productos</td></tr>';
      return;
    }

    tableBody.innerHTML = response.products
      .map(
        (product: any) => `
      <tr>
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="flex items-center">
            <img src="${product.images?.[0]?.image_url || '/placeholder.jpg'}" 
                 alt="${product.name}" 
                 class="w-10 h-10 rounded-lg object-cover mr-3">
            <div>
              <div class="text-sm font-medium text-neutral-900">${
                product.name
              }</div>
              <div class="text-sm text-neutral-500">${
                product.category?.name || 'Sin categoría'
              }</div>
            </div>
          </div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">${
          product.sku || 'N/A'
        }</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">$${
          product.price
        }</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">${
          product.stock_quantity
        }</td>
        <td class="px-6 py-4 whitespace-nowrap">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            product.is_active
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }">
            ${product.is_active ? 'Activo' : 'Inactivo'}
          </span>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
          <button onclick="editProduct('${
            product.id
          }')" class="text-indigo-600 hover:text-indigo-900 mr-3">Editar</button>
          <button onclick="deleteProduct('${
            product.id
          }')" class="text-red-600 hover:text-red-900">Eliminar</button>
        </td>
      </tr>
    `
      )
      .join('');

    updatePagination('products', response.pagination);
  } catch (error) {
    console.error('Error loading products:', error);
    tableBody.innerHTML =
      '<tr><td colspan="6" class="px-6 py-4 text-center text-red-500">Error al cargar productos</td></tr>';
  }
}

async function loadOrders() {
  window.location.href = '/admin/ordenes';
}

async function loadUsers() {
  window.location.href = '/admin/usuarios';
}

async function loadPayments() {
  window.location.href = '/admin/pagos';
}

function updatePagination(section: string, pagination: any) {
  const paginationEl = document.getElementById(`${section}-pagination`);
  if (!paginationEl || !pagination) return;

  paginationEl.innerHTML = `
    <div class="text-sm text-neutral-700">
      Mostrando ${pagination.from || 1} a ${
        pagination.to || pagination.limit
      } de ${pagination.total} resultados
    </div>
    <div class="flex space-x-2">
      <button onclick="changeAdminPage('${section}', ${
        pagination.current_page - 1
      })" 
              ${pagination.current_page <= 1 ? 'disabled' : ''} 
              class="px-3 py-1 border rounded text-sm ${
                pagination.current_page <= 1
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-neutral-50'
              }">
        Anterior
      </button>
      <span class="px-3 py-1 text-sm">${pagination.current_page} de ${
        pagination.last_page
      }</span>
      <button onclick="changeAdminPage('${section}', ${
        pagination.current_page + 1
      })" 
              ${
                pagination.current_page >= pagination.last_page
                  ? 'disabled'
                  : ''
              } 
              class="px-3 py-1 border rounded text-sm ${
                pagination.current_page >= pagination.last_page
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-neutral-50'
              }">
        Siguiente
      </button>
    </div>
  `;
}

function getOrderStatusClass(status: string): string {
  switch (status) {
    case 'pending':
      return 'text-yellow-600';
    case 'processing':
      return 'text-blue-600';
    case 'shipped':
      return 'text-purple-600';
    case 'delivered':
      return 'text-green-600';
    case 'cancelled':
      return 'text-red-600';
    default:
      return 'text-neutral-600';
  }
}

function showToast(
  message: string,
  type: 'success' | 'error' | 'info' = 'success'
) {
  const toast = document.createElement('div');
  toast.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 ${
    type === 'success'
      ? 'bg-green-500 text-white'
      : type === 'error'
        ? 'bg-red-500 text-white'
        : 'bg-blue-500 text-white'
  }`;
  toast.textContent = message;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function showProductModal(product?: any) {
  const action = product ? 'editar' : 'crear';
  showToast(`Modal para ${action} producto - Por implementar`, 'info');
}

function showUserModal(user?: any) {
  const action = user ? 'editar' : 'crear';
  showToast(`Modal para ${action} usuario - Por implementar`, 'info');
}

async function exportOrders() {
  showToast('Exportando órdenes...', 'success');
}

async function exportPayments() {
  showToast('Exportando pagos...', 'success');
}

// Funciones globales para las acciones de admin
declare global {
  interface Window {
    changeAdminPage: (section: string, page: number) => void;
    editProduct: (productId: string) => void;
    deleteProduct: (productId: string) => Promise<void>;
    updateOrderStatus: (orderId: string, status: string) => Promise<void>;
    viewOrder: (orderId: string) => void;
    deleteOrder: (orderId: string) => Promise<void>;
    updateUserRole: (userId: string, role: string) => Promise<void>;
    viewUser: (userId: string) => void;
    toggleUserStatus: (userId: string, currentStatus: boolean) => Promise<void>;
    deleteUser: (userId: string) => Promise<void>;
    viewPayment: (paymentId: string) => void;
    refundPayment: (paymentId: string) => Promise<void>;
  }
}

// Exportar funciones globales
window.changeAdminPage = function (section: string, page: number) {
  currentPage = page;
  switch (section) {
    case 'products':
      loadProducts();
      break;
    case 'orders':
      loadOrders();
      break;
    case 'users':
      loadUsers();
      break;
    case 'payments':
      loadPayments();
      break;
  }
};

window.editProduct = function (productId: string) {
  showProductModal({ id: productId });
};

window.deleteProduct = async function (productId: string) {
  if (confirm('¿Estás seguro de que quieres eliminar este producto?')) {
    try {
      await productsService.deleteProduct(productId);
      showToast('Producto eliminado correctamente', 'success');
      loadProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      showToast('Error al eliminar el producto', 'error');
    }
  }
};

window.updateOrderStatus = async function (orderId: string, status: string) {
  try {
    await ordersService.updateOrderStatus(orderId, status);
    showToast('Estado de la orden actualizado', 'success');
  } catch (error) {
    console.error('Error updating order status:', error);
    showToast('Error al actualizar el estado', 'error');
    loadOrders();
  }
};

window.viewOrder = function (orderId: string) {
  showToast(`Ver detalles de orden #${orderId}`, 'info');
};

window.deleteOrder = async function (orderId: string) {
  if (confirm('¿Estás seguro de que quieres eliminar esta orden?')) {
    try {
      await ordersService.deleteOrder(orderId);
      showToast('Orden eliminada correctamente', 'success');
      loadOrders();
    } catch (error) {
      console.error('Error deleting order:', error);
      showToast('Error al eliminar la orden', 'error');
    }
  }
};

window.updateUserRole = async function (userId: string, role: string) {
  try {
    await usersService.updateUserRole(parseInt(userId), role);
    showToast('Rol del usuario actualizado', 'success');
  } catch (error) {
    console.error('Error updating user role:', error);
    showToast('Error al actualizar el rol', 'error');
    loadUsers();
  }
};

window.viewUser = function (userId: string) {
  showToast(`Ver detalles de usuario #${userId}`, 'info');
};

window.toggleUserStatus = async function (
  userId: string,
  currentStatus: boolean
) {
  const action = currentStatus ? 'desactivar' : 'activar';
  if (confirm(`¿Estás seguro de que quieres ${action} este usuario?`)) {
    try {
      await usersService.toggleUserStatus(parseInt(userId));
      showToast(`Usuario ${action}do correctamente`, 'success');
      loadUsers();
    } catch (error) {
      console.error('Error toggling user status:', error);
      showToast(`Error al ${action} el usuario`, 'error');
    }
  }
};

window.deleteUser = async function (userId: string) {
  if (
    confirm(
      '¿Estás seguro de que quieres eliminar este usuario? Esta acción no se puede deshacer.'
    )
  ) {
    try {
      await usersService.deleteUser(userId);
      showToast('Usuario eliminado correctamente', 'success');
      loadUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      showToast('Error al eliminar el usuario', 'error');
    }
  }
};

window.viewPayment = function (paymentId: string) {
  showToast(`Ver detalles de pago #${paymentId}`, 'info');
};

window.refundPayment = async function (paymentId: string) {
  if (confirm('¿Estás seguro de que quieres reembolsar este pago?')) {
    try {
      showToast('Reembolso procesado correctamente', 'success');
      loadPayments();
    } catch (error) {
      console.error('Error processing refund:', error);
      showToast('Error al procesar el reembolso', 'error');
    }
  }
};
