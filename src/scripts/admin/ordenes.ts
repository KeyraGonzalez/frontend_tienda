// Scripts para la gestión de órdenes en el panel de administración
import { authService, ordersService } from '../../utils/api/index';
import type { Order } from '../../types/types';

// Estado de la aplicación para órdenes
let currentPage = 1;
let currentFilters: any = {};
let currentUser: any = null;

// Función de inicialización
export async function initializeOrdenesPage() {
  console.log('🚀 Initializing orders page...');

  const loadingEl = document.getElementById('loading');
  const accessDeniedEl = document.getElementById('access-denied');
  const ordersPanelEl = document.getElementById('orders-panel');

  try {
    // Verificar autenticación
    console.log('🔐 Checking authentication...');
    if (!authService.isAuthenticated()) {
      console.log('❌ Not authenticated, redirecting to login');
      loadingEl?.classList.add('hidden');
      window.location.href =
        '/login?return=' + encodeURIComponent(window.location.pathname);
      return;
    }

    currentUser = authService.getCurrentUser();
    console.log('👤 Current user:', currentUser);

    // Verificar permisos de administrador
    console.log('🛡️ Checking admin permissions...');
    if (!authService.isAdmin()) {
      console.log('❌ No admin permissions');
      loadingEl?.classList.add('hidden');
      accessDeniedEl?.classList.remove('hidden');
      return;
    }

    console.log('✅ Admin permissions confirmed');

    // Inicializar UI de gestión de órdenes
    console.log('🎛️ Setting up event listeners...');
    setupEventListeners();

    console.log('📦 Loading orders...');
    await loadOrders();

    console.log('📊 Loading order statistics...');
    await loadOrderStats();

    console.log('🎨 Showing orders panel...');
    loadingEl?.classList.add('hidden');
    ordersPanelEl?.classList.remove('hidden');

    console.log('✅ Orders page initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing orders page:', error);
    loadingEl?.classList.add('hidden');
    accessDeniedEl?.classList.remove('hidden');
  }
}

// Configurar event listeners
function setupEventListeners() {
  // Filtros
  const filterBtn = document.getElementById('orders-filter-btn');
  filterBtn?.addEventListener('click', loadOrders);

  // Búsqueda en tiempo real
  const searchInput = document.getElementById(
    'orders-search'
  ) as HTMLInputElement;
  if (searchInput) {
    let timeout: NodeJS.Timeout;
    searchInput.addEventListener('input', () => {
      clearTimeout(timeout);
      timeout = setTimeout(loadOrders, 500);
    });
  }

  // Exportar
  const exportBtn = document.getElementById('export-orders-btn');
  exportBtn?.addEventListener('click', exportOrders);

  // Limpiar filtros
  const clearBtn = document.getElementById('clear-filters-btn');
  clearBtn?.addEventListener('click', clearFilters);
}

// Cargar estadísticas de órdenes
async function loadOrderStats() {
  try {
    console.log('📊 Loading order statistics...');

    // Usar un límite más grande para obtener más datos para estadísticas
    const response = await ordersService.getAllOrders({ page: 1, limit: 100 });
    console.log('📊 Stats response:', response);

    // ⭐ CORRECCIÓN: Usar response.orders en lugar de response.data
    const orders = response.orders || [];
    console.log('📊 Orders for stats:', orders.length);

    // Calcular estadísticas
    const today = new Date().toDateString();
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();

    const todayOrders = orders.filter(
      (order: any) => new Date(order.created_at).toDateString() === today
    );

    const monthOrders = orders.filter((order: any) => {
      const orderDate = new Date(order.created_at);
      return (
        orderDate.getMonth() === thisMonth &&
        orderDate.getFullYear() === thisYear
      );
    });

    const pendingOrders = orders.filter(
      (order: any) => order.status === 'pending'
    );

    const totalRevenue = orders.reduce(
      (sum: number, order: any) => sum + parseFloat(order.total || 0),
      0
    );

    console.log('📊 Calculated stats:', {
      today: todayOrders.length,
      month: monthOrders.length,
      pending: pendingOrders.length,
      revenue: totalRevenue,
    });

    // Actualizar UI
    updateStatElement('orders-today', todayOrders.length.toString());
    updateStatElement('orders-month', monthOrders.length.toString());
    updateStatElement('orders-pending', pendingOrders.length.toString());
    updateStatElement('orders-revenue', `$${totalRevenue.toFixed(2)}`);
  } catch (error) {
    console.error('Error loading order stats:', error);
    // En caso de error, mostrar 0s
    updateStatElement('orders-today', '0');
    updateStatElement('orders-month', '0');
    updateStatElement('orders-pending', '0');
    updateStatElement('orders-revenue', '$0.00');
  }
}

// Cargar órdenes con filtros
export async function loadOrders() {
  const tableBody = document.getElementById('orders-table-body');
  const loadingEl = document.getElementById('orders-loading');

  if (!tableBody) return;

  try {
    // Mostrar loading
    showLoading(true);

    // Obtener filtros
    const filters = getCurrentFilters();

    console.log('🔍 Loading orders with filters:', filters);
    const response = await ordersService.getAllOrders(filters);
    console.log('📦 Orders response:', response);

    // ⭐ CORRECCIÓN: La respuesta tiene estructura { orders: [...], pagination: {...} }
    if (!response.orders || response.orders.length === 0) {
      showEmptyState();
      return;
    }

    renderOrdersTable(response.orders);
    updatePagination(response.pagination);
  } catch (error) {
    console.error('Error loading orders:', error);
    showErrorState();
  } finally {
    showLoading(false);
  }
}

// Obtener filtros actuales
function getCurrentFilters() {
  const search =
    (document.getElementById('orders-search') as HTMLInputElement)?.value || '';
  const status =
    (document.getElementById('orders-status') as HTMLSelectElement)?.value ||
    '';
  const dateFrom =
    (document.getElementById('orders-date-from') as HTMLInputElement)?.value ||
    '';
  const dateTo =
    (document.getElementById('orders-date-to') as HTMLInputElement)?.value ||
    '';

  const filters: any = { page: currentPage, limit: 10 };
  if (search) filters.search = search;
  if (status) filters.status = status;
  if (dateFrom) filters.start_date = dateFrom;
  if (dateTo) filters.end_date = dateTo;

  return filters;
}

// Renderizar tabla de órdenes
function renderOrdersTable(orders: any[]) {
  const tableBody = document.getElementById('orders-table-body');
  if (!tableBody) return;

  console.log('🎨 Rendering orders table with', orders.length, 'orders');
  console.log('🎨 First order sample:', orders[0]);

  tableBody.innerHTML = orders
    .map(
      (order: any) => `
    <tr class="hover:bg-neutral-50 transition-colors">
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="text-sm font-medium text-neutral-900">#${order.id.substring(0, 8)}</div>
        <div class="text-sm text-neutral-500">${new Date(
          order.created_at
        ).toLocaleDateString()}</div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="flex items-center">
          <div class="w-8 h-8 bg-black rounded-full flex items-center justify-center mr-3">
            <span class="text-white font-medium text-xs">
              ${(order.usuarios?.full_name || order.usuarios?.email || 'U')
                .substring(0, 2)
                .toUpperCase()}
            </span>
          </div>
          <div>
            <div class="text-sm font-medium text-black">${
              order.usuarios?.full_name || 'Usuario'
            }</div>
            <div class="text-sm text-gray-500">${
              order.usuarios?.email || 'Sin email'
            }</div>
          </div>
        </div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="text-sm font-medium text-black">$${parseFloat(
          order.total
        ).toFixed(2)}</div>
        <div class="text-sm text-gray-500">${
          order.order_items?.length || 0
        } productos</div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <select onchange="updateOrderStatus('${order.id}', this.value)" 
                class="text-xs border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-black ${getOrderStatusClass(
                  order.status
                )}">
          <option value="pending" ${
            order.status === 'pending' ? 'selected' : ''
          }>Pendiente</option>
          <option value="processing" ${
            order.status === 'processing' ? 'selected' : ''
          }>Procesando</option>
          <option value="confirmed" ${
            order.status === 'confirmed' ? 'selected' : ''
          }>Confirmado</option>
          <option value="shipped" ${
            order.status === 'shipped' ? 'selected' : ''
          }>Enviado</option>
          <option value="delivered" ${
            order.status === 'delivered' ? 'selected' : ''
          }>Entregado</option>
          <option value="cancelled" ${
            order.status === 'cancelled' ? 'selected' : ''
          }>Cancelado</option>
        </select>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        ${
          order.shipping_address
            ? `${order.shipping_address.city}, ${order.shipping_address.state}`
            : 'Sin dirección'
        }
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <div class="flex space-x-2">
          <button onclick="viewOrderDetails('${order.id}')" 
                  class="text-indigo-600 hover:text-indigo-900 transition-colors">
            Ver
          </button>
          <button onclick="downloadOrderInvoice('${order.id}')" 
                  class="text-green-600 hover:text-green-900 transition-colors">
            PDF
          </button>
          <button onclick="deleteOrder('${order.id}')" 
                  class="text-red-600 hover:text-red-900 transition-colors">
            Eliminar
          </button>
        </div>
      </td>
    </tr>
  `
    )
    .join('');
}

// Funciones de utilidad
function updateStatElement(id: string, value: string) {
  console.log(`📊 Updating stat element ${id} with value: ${value}`);
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
    console.log(`✅ Updated ${id} successfully`);
  } else {
    console.error(`❌ Element with id '${id}' not found`);
  }
}

function showLoading(show: boolean) {
  const loadingEl = document.getElementById('orders-loading');
  const tableBody = document.getElementById('orders-table-body');

  if (show) {
    if (tableBody)
      tableBody.innerHTML =
        '<tr><td colspan="6" class="px-6 py-4 text-center"><div class="flex items-center justify-center"><div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mr-2"></div>Cargando órdenes...</div></td></tr>';
  }
}

function showEmptyState() {
  const tableBody = document.getElementById('orders-table-body');
  if (tableBody) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="px-6 py-12 text-center">
          <div class="text-neutral-400 mb-2">
            <svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p class="text-neutral-500 font-medium">No se encontraron órdenes</p>
          <p class="text-neutral-400 text-sm">Intenta ajustar los filtros de búsqueda</p>
        </td>
      </tr>
    `;
  }
}

function showErrorState() {
  const tableBody = document.getElementById('orders-table-body');
  if (tableBody) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="px-6 py-12 text-center text-red-500">
          <div class="text-red-400 mb-2">
            <svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p class="font-medium">Error al cargar las órdenes</p>
          <button onclick="window.location.reload()" class="mt-2 text-sm bg-red-100 text-red-700 px-3 py-1 rounded-md hover:bg-red-200 transition-colors">
            Reintentar
          </button>
        </td>
      </tr>
    `;
  }
}

function updatePagination(pagination: any) {
  const paginationEl = document.getElementById('orders-pagination');
  if (!paginationEl || !pagination) return;

  console.log('📄 Updating pagination with:', pagination);

  // Calcular valores para la paginación
  const currentPage = pagination.page || 1;
  const totalPages = pagination.totalPages || 1;
  const total = pagination.total || 0;
  const limit = pagination.limit || 10;

  // Calcular rango mostrado
  const from = (currentPage - 1) * limit + 1;
  const to = Math.min(currentPage * limit, total);

  paginationEl.innerHTML = `
    <div class="text-sm text-black font-medium">
      Mostrando ${from} a ${to} de ${total} órdenes
    </div>
    <div class="flex items-center space-x-2">
      <button onclick="changePage(${currentPage - 1})" 
              ${currentPage <= 1 ? 'disabled' : ''} 
              class="px-3 py-1 border-2 border-black rounded-lg text-sm font-bold transition-colors ${
                currentPage <= 1
                  ? 'opacity-50 cursor-not-allowed bg-gray-100'
                  : 'hover:bg-gray-200'
              }">
        Anterior
      </button>
      <span class="px-3 py-1 text-sm font-bold text-black">
        Página ${currentPage} de ${totalPages}
      </span>
      <button onclick="changePage(${currentPage + 1})" 
              ${currentPage >= totalPages ? 'disabled' : ''} 
              class="px-3 py-1 border-2 border-black rounded-lg text-sm font-bold transition-colors ${
                currentPage >= totalPages
                  ? 'opacity-50 cursor-not-allowed bg-gray-100'
                  : 'hover:bg-gray-200'
              }">
        Siguiente
      </button>
    </div>
  `;
}

function getOrderStatusClass(status: string): string {
  switch (status) {
    case 'pending':
      return 'text-yellow-700 bg-yellow-50 border-yellow-200';
    case 'processing':
      return 'text-blue-700 bg-blue-50 border-blue-200';
    case 'confirmed':
      return 'text-green-700 bg-green-50 border-green-200';
    case 'shipped':
      return 'text-purple-700 bg-purple-50 border-purple-200';
    case 'delivered':
      return 'text-green-700 bg-green-50 border-green-200';
    case 'cancelled':
      return 'text-red-700 bg-red-50 border-red-200';
    default:
      return 'text-neutral-700 bg-neutral-50 border-neutral-200';
  }
}

function clearFilters() {
  const searchInput = document.getElementById(
    'orders-search'
  ) as HTMLInputElement;
  const statusSelect = document.getElementById(
    'orders-status'
  ) as HTMLSelectElement;
  const dateFromInput = document.getElementById(
    'orders-date-from'
  ) as HTMLInputElement;
  const dateToInput = document.getElementById(
    'orders-date-to'
  ) as HTMLInputElement;

  if (searchInput) searchInput.value = '';
  if (statusSelect) statusSelect.value = '';
  if (dateFromInput) dateFromInput.value = '';
  if (dateToInput) dateToInput.value = '';

  currentPage = 1;
  loadOrders();
}

async function exportOrders() {
  try {
    showToast('Preparando exportación...', 'info');

    const filters = getCurrentFilters();
    filters.limit = 100; // Exportar más registros

    const response = await ordersService.getAllOrders(filters);

    // Crear CSV
    const csvData = [
      ['ID', 'Cliente', 'Email', 'Total', 'Estado', 'Fecha', 'Dirección'].join(
        ','
      ),
      ...(response.data
        ? response.data.map((order: any) =>
            [
              order.id,
              `"${(order.user as any)?.full_name || 'Sin nombre'}"`,
              `"${(order.user as any)?.email || 'Sin email'}"`,
              order.total,
              order.status,
              new Date(order.created_at).toLocaleDateString(),
              `"${
                order.shipping_address
                  ? `${order.shipping_address.street}, ${order.shipping_address.city}`
                  : 'Sin dirección'
              }"`,
            ].join(',')
          )
        : []),
    ].join('\n');

    // Descargar archivo
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ordenes_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    showToast('Órdenes exportadas correctamente', 'success');
  } catch (error) {
    console.error('Error exporting orders:', error);
    showToast('Error al exportar órdenes', 'error');
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

// Funciones globales para llamadas desde HTML
declare global {
  interface Window {
    changePage: (page: number) => void;
    updateOrderStatus: (orderId: string, status: string) => Promise<void>;
    viewOrderDetails: (orderId: string) => void;
    downloadOrderInvoice: (orderId: string) => void;
    deleteOrder: (orderId: string) => Promise<void>;
  }
}

// Exportar funciones globales
window.changePage = function (page: number) {
  currentPage = page;
  loadOrders();
};

window.updateOrderStatus = async function (orderId: string, status: string) {
  try {
    await ordersService.updateOrderStatus(orderId, status);
    showToast('Estado de la orden actualizado', 'success');
  } catch (error) {
    console.error('Error updating order status:', error);
    showToast('Error al actualizar el estado', 'error');
    loadOrders(); // Recargar para revertir cambios
  }
};

window.viewOrderDetails = function (orderId: string) {
  // TODO: Implementar modal o página de detalles
  showToast(`Ver detalles de orden #${orderId} - Por implementar`, 'info');
};

window.downloadOrderInvoice = function (orderId: string) {
  // TODO: Implementar descarga de factura
  showToast(
    `Descargando factura de orden #${orderId} - Por implementar`,
    'info'
  );
};

window.deleteOrder = async function (orderId: string) {
  if (
    confirm(
      '¿Estás seguro de que quieres eliminar esta orden? Esta acción no se puede deshacer.'
    )
  ) {
    try {
      await ordersService.deleteOrder(orderId);
      showToast('Orden eliminada correctamente', 'success');
      loadOrders();
      loadOrderStats(); // Actualizar estadísticas
    } catch (error) {
      console.error('Error deleting order:', error);
      showToast('Error al eliminar la orden', 'error');
    }
  }
};
