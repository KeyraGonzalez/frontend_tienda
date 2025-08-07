// Scripts para la gestión de pagos en el panel de administración
import { authService, ordersService } from '../../utils/api/index';

// Estado de la aplicación para pagos
let currentPage = 1;
let currentFilters: any = {};
let currentUser: any = null;

// API functions para pagos basadas en órdenes
const api = {
  // Obtener pagos con filtros (basado en órdenes con pagos completados)
  async getPayments(filters: any = {}) {
    const params = {
      page: filters.page || 1,
      limit: filters.limit || 10,
      // Para pagos, nos enfocamos en órdenes con payment_status completado
      // No filtraremos por status de orden específico aquí
      ...filters,
    };

    return ordersService.getAllOrders(params);
  },

  // Obtener estadísticas de pagos (basado en órdenes)
  async getPaymentStats() {
    // Obtener todas las órdenes para calcular estadísticas
    // Usamos límite de 100 que es el máximo permitido
    const allOrders = await ordersService.getAllOrders({
      limit: 100,
    });
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

    const orders = allOrders.orders || [];

    // Filtrar solo órdenes con pagos completados
    const completedPaymentOrders = orders.filter(
      (order: any) => order.payment_status === 'completed'
    );

    // Calcular ingresos de hoy
    const todayRevenue = completedPaymentOrders
      .filter((order: any) => new Date(order.created_at) >= startOfToday)
      .reduce((sum: number, order: any) => sum + (order.total || 0), 0);

    // Calcular ingresos del mes
    const monthRevenue = completedPaymentOrders
      .filter((order: any) => new Date(order.created_at) >= startOfMonth)
      .reduce((sum: number, order: any) => sum + (order.total || 0), 0);

    // Obtener pagos pendientes (payment_status pending)
    const pendingPaymentOrders = orders.filter(
      (order: any) => order.payment_status === 'pending'
    );
    const pendingCount = pendingPaymentOrders.length;

    return {
      today: todayRevenue,
      month: monthRevenue,
      pending: pendingCount,
      totalOrders: orders.length,
    };
  },

  // Obtener detalles de un pago específico (orden)
  async getPayment(orderId: string) {
    return ordersService.getOrderById(orderId);
  },

  // Exportar pagos (basado en órdenes completadas)
  async exportPayments(filters: any = {}) {
    const params = {
      ...filters,
      status: 'completed',
      export: true,
    };

    // Para exportar, podríamos usar el servicio de órdenes
    // Por ahora retornamos los datos como JSON
    const data = await this.getPayments(params);
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    return blob;
  },
};

// Función de inicialización
export async function initializePagosPage() {
  const loadingEl = document.getElementById('loading');
  const accessDeniedEl = document.getElementById('access-denied');
  const paymentsPanelEl = document.getElementById('payments-panel');

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

    // Inicializar UI de gestión de pagos
    setupEventListeners();
    await loadPayments();
    await loadPaymentStats();

    loadingEl?.classList.add('hidden');
    paymentsPanelEl?.classList.remove('hidden');
  } catch (error) {
    console.error('Error initializing payments page:', error);
    loadingEl?.classList.add('hidden');
    accessDeniedEl?.classList.remove('hidden');
  }
}

// Configurar event listeners
function setupEventListeners() {
  // Filtros
  const filterBtn = document.getElementById('payments-filter-btn');
  filterBtn?.addEventListener('click', loadPayments);

  // Exportar
  const exportBtn = document.getElementById('export-payments-btn');
  exportBtn?.addEventListener('click', exportPayments);

  // Búsqueda en tiempo real
  const searchInput = document.getElementById('payments-search');
  if (searchInput) {
    let timeout: NodeJS.Timeout;
    searchInput.addEventListener('input', () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        loadPayments();
      }, 500);
    });
  }

  // Cambios en filtros
  const statusFilter = document.getElementById('payments-status');
  const methodFilter = document.getElementById('payments-method');
  const dateFilter = document.getElementById('payments-date-from');

  [statusFilter, methodFilter, dateFilter].forEach((filter) => {
    filter?.addEventListener('change', loadPayments);
  });
}

async function loadPayments() {
  const tableBody = document.getElementById('payments-table-body');
  if (!tableBody) return;

  try {
    tableBody.innerHTML =
      '<tr><td colspan="8" class="px-6 py-4 text-center text-black">Cargando pagos...</td></tr>';

    // Obtener filtros
    const search =
      (document.getElementById('payments-search') as HTMLInputElement)?.value ||
      '';
    const status =
      (document.getElementById('payments-status') as HTMLSelectElement)
        ?.value || '';
    const method =
      (document.getElementById('payments-method') as HTMLSelectElement)
        ?.value || '';
    const dateFrom =
      (document.getElementById('payments-date-from') as HTMLInputElement)
        ?.value || '';

    const filters: any = { page: currentPage, limit: 10 };
    if (search) filters.search = search;
    if (status) filters.status = status;
    if (method) filters.method = method;
    if (dateFrom) filters.start_date = dateFrom;

    currentFilters = filters;

    // Cargar pagos desde el backend
    const response = await api.getPayments(filters);
    const payments = response.orders || [];
    const totalCount = response.pagination?.total || 0;

    if (payments.length === 0) {
      tableBody.innerHTML =
        '<tr><td colspan="8" class="px-6 py-4 text-center text-gray-500">No se encontraron órdenes</td></tr>';
      updatePagination(0, 0);
      return;
    }

    // Renderizar pagos
    tableBody.innerHTML = payments
      .map((payment: any) => renderPaymentRow(payment))
      .join('');

    // Actualizar paginación
    updatePagination(totalCount, payments.length);

    // Configurar event listeners para botones de acción
    setupPaymentActionListeners();
  } catch (error) {
    console.error('Error loading payments:', error);
    tableBody.innerHTML =
      '<tr><td colspan="8" class="px-6 py-4 text-center text-red-600">Error cargando pagos</td></tr>';
  }
}

// Renderizar una fila de pago
function renderPaymentRow(order: any): string {
  return `
    <tr class="hover:bg-gray-50">
      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-black">
        #${order.id}
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-black">
        <a href="/admin/ordenes?search=${
          order.id
        }" class="text-blue-600 hover:text-blue-900 underline">
          #${order.id}
        </a>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-black">
        ${order.user?.email || order.user_id || 'N/A'}
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-black font-bold">
        $${parseFloat(order.total || 0).toFixed(2)}
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-black">
        <span class="capitalize font-medium">${order.payment_method || 'N/A'}</span>
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${getPaymentStatusClass(
          order.payment_status
        )}">
          ${getPaymentStatusText(order.payment_status)}
        </span>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-black">
        ${new Date(order.created_at).toLocaleDateString('es-ES')}
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <div class="flex space-x-2">
          <button onclick="viewPayment('${order.id}')" 
                  class="bg-black text-white px-3 py-1 rounded text-xs hover:bg-gray-800 transition-colors font-bold uppercase">
            Ver
          </button>
        </div>
      </td>
    </tr>
  `;
}

// Obtener clase CSS para el estado del pago
function getPaymentStatusClass(status: string | null | undefined): string {
  if (!status) return 'bg-gray-100 text-gray-800';

  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'failed':
      return 'bg-red-100 text-red-800';
    case 'refunded':
      return 'bg-gray-100 text-gray-800';
    case 'processing':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

// Obtener texto para el estado del pago
function getPaymentStatusText(status: string | null | undefined): string {
  if (!status) return 'Sin información';

  switch (status) {
    case 'completed':
      return 'Completado';
    case 'pending':
      return 'Pendiente';
    case 'failed':
      return 'Fallido';
    case 'refunded':
      return 'Reembolsado';
    case 'processing':
      return 'Procesando';
    default:
      return 'Desconocido';
  }
}

// Cargar estadísticas de pagos
async function loadPaymentStats() {
  try {
    const stats = await api.getPaymentStats();

    const todayEl = document.getElementById('payments-today');
    if (todayEl) todayEl.textContent = `$${stats.today?.toFixed(2) || '0.00'}`;

    const monthEl = document.getElementById('payments-month');
    if (monthEl) monthEl.textContent = `$${stats.month?.toFixed(2) || '0.00'}`;

    const pendingEl = document.getElementById('payments-pending');
    if (pendingEl) pendingEl.textContent = stats.pending?.toString() || '0';

    // Removido: refunds section según solicitud del usuario
  } catch (error) {
    console.error('Error loading payment stats:', error);
    // Valores por defecto en caso de error
    document.getElementById('payments-today')!.textContent = '$0.00';
    document.getElementById('payments-month')!.textContent = '$0.00';
    document.getElementById('payments-pending')!.textContent = '0';
  }
}

// Configurar event listeners para acciones de pagos
function setupPaymentActionListeners() {
  // Los botones se configuran dinámicamente en renderPaymentRow
}

// Actualizar paginación
function updatePagination(totalCount: number, currentCount: number) {
  const paginationEl = document.getElementById('payments-pagination');
  if (!paginationEl) return;

  const totalPages = Math.ceil(totalCount / 10);
  const startIndex = (currentPage - 1) * 10 + 1;
  const endIndex = Math.min(currentPage * 10, totalCount);

  paginationEl.innerHTML = `
    <div class="text-sm text-black font-medium">
      Mostrando ${startIndex} a ${endIndex} de ${totalCount} pagos
    </div>
    <div class="flex space-x-2">
      <button onclick="changePaymentPage(${currentPage - 1})" 
              ${currentPage <= 1 ? 'disabled' : ''} 
              class="px-3 py-1 border-2 border-black rounded text-sm font-bold ${
                currentPage <= 1
                  ? 'opacity-50 cursor-not-allowed bg-gray-200'
                  : 'hover:bg-gray-100 bg-white text-black'
              }">
        Anterior
      </button>
      <span class="px-3 py-1 text-sm font-bold">${currentPage} de ${totalPages}</span>
      <button onclick="changePaymentPage(${currentPage + 1})" 
              ${currentPage >= totalPages ? 'disabled' : ''} 
              class="px-3 py-1 border-2 border-black rounded text-sm font-bold ${
                currentPage >= totalPages
                  ? 'opacity-50 cursor-not-allowed bg-gray-200'
                  : 'hover:bg-gray-100 bg-white text-black'
              }">
        Siguiente
      </button>
    </div>
  `;
}

// Exportar pagos
async function exportPayments() {
  try {
    showToast('Preparando exportación...', 'info');

    const blob = await api.exportPayments(currentFilters);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `pagos_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    showToast('Archivo exportado correctamente', 'success');
  } catch (error) {
    console.error('Error exporting payments:', error);
    showToast('Error al exportar pagos', 'error');
  }
}

// Mostrar notificación toast
function showToast(
  message: string,
  type: 'success' | 'error' | 'info' = 'success'
) {
  const toast = document.createElement('div');
  toast.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 font-bold ${
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

// Funciones globales para las acciones
declare global {
  interface Window {
    changePaymentPage: (page: number) => void;
    viewPayment: (paymentId: string) => void;
    refundPayment: (paymentId: string) => Promise<void>;
    processPayment: (paymentId: string) => Promise<void>;
  }
}

window.changePaymentPage = function (page: number) {
  currentPage = page;
  loadPayments();
};

window.viewPayment = async function (paymentId: string) {
  try {
    const payment = await api.getPayment(paymentId);

    // Crear modal para mostrar detalles del pago
    const modal = document.createElement('div');
    modal.className =
      'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="bg-white rounded-lg p-6 max-w-lg w-full mx-4 border-2 border-black">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-bold text-black uppercase">Detalles del Pago #${
            payment.id
          }</h3>
          <button onclick="this.closest('.fixed').remove()" class="text-black hover:text-gray-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="space-y-3">
          <div class="flex justify-between">
            <span class="font-bold text-black">Orden:</span>
            <span class="text-black">#${payment.id}</span>
          </div>
          <div class="flex justify-between">
            <span class="font-bold text-black">Cliente:</span>
            <span class="text-black">${payment.user_id}</span>
          </div>
          <div class="flex justify-between">
            <span class="font-bold text-black">Monto:</span>
            <span class="text-black font-bold">$${payment.total.toFixed(2)}</span>
          </div>
          <div class="flex justify-between">
            <span class="font-bold text-black">Método:</span>
            <span class="text-black capitalize">${payment.payment_method}</span>
          </div>
          <div class="flex justify-between">
            <span class="font-bold text-black">Estado:</span>
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${getPaymentStatusClass(
              payment.payment_status
            )}">
              ${getPaymentStatusText(payment.payment_status)}
            </span>
          </div>
          <div class="flex justify-between">
            <span class="font-bold text-black">Detalles de Pago:</span>
            <span class="text-black text-sm">${JSON.stringify(payment.payment_method_details || {}, null, 2)}</span>
          </div>
          <div class="flex justify-between">
            <span class="font-bold text-black">Fecha:</span>
            <span class="text-black">${new Date(
              payment.created_at
            ).toLocaleString('es-ES')}</span>
          </div>
        </div>
        <div class="mt-6 flex justify-end">
          <button onclick="this.closest('.fixed').remove()" 
                  class="bg-black text-white px-4 py-2 rounded-lg font-bold hover:bg-gray-800 transition-colors uppercase">
            Cerrar
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  } catch (error) {
    console.error('Error loading payment details:', error);
    showToast('Error al cargar detalles del pago', 'error');
  }
};
