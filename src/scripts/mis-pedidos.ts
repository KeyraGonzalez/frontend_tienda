import { authService, ordersService } from '../utils/api/index';
import type { Order, PaginatedResponse } from '../types/types';

// Estado de la aplicación
let currentPage = 1;
let currentFilters: any = {};
let orders: Order[] = [];
let totalPages = 1;

export async function initializeOrdersPage() {
  const loadingEl = document.getElementById('loading');
  const accessDeniedEl = document.getElementById('access-denied');
  const ordersContentEl = document.getElementById('orders-content');

  try {
    // Verificar autenticación
    if (!authService.isAuthenticated()) {
      loadingEl?.classList.add('hidden');
      accessDeniedEl?.classList.remove('hidden');
      return;
    }

    // Inicializar UI
    setupEventListeners();
    await loadOrders();

    loadingEl?.classList.add('hidden');
    ordersContentEl?.classList.remove('hidden');
  } catch (error) {
    console.error('Error initializing orders page:', error);
    loadingEl?.classList.add('hidden');
    showError('Error al cargar los pedidos');
  }
}

function setupEventListeners() {
  // Filtros
  const filterBtn = document.getElementById('filter-btn');
  const searchInput = document.getElementById(
    'order-search'
  ) as HTMLInputElement;
  const statusSelect = document.getElementById(
    'order-status'
  ) as HTMLSelectElement;
  const dateFromInput = document.getElementById(
    'date-from'
  ) as HTMLInputElement;

  filterBtn?.addEventListener('click', handleFilter);

  // Filtrar al presionar Enter en el campo de búsqueda
  searchInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleFilter();
    }
  });

  // Paginación
  const prevBtn = document.getElementById('prev-page');
  const nextBtn = document.getElementById('next-page');

  prevBtn?.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      loadOrders();
    }
  });

  nextBtn?.addEventListener('click', () => {
    if (currentPage < totalPages) {
      currentPage++;
      loadOrders();
    }
  });

  // Modal
  const closeModalBtn = document.getElementById('close-modal');
  const modal = document.getElementById('order-modal');

  closeModalBtn?.addEventListener('click', hideOrderModal);
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) {
      hideOrderModal();
    }
  });
}

async function handleFilter() {
  const searchInput = document.getElementById(
    'order-search'
  ) as HTMLInputElement;
  const statusSelect = document.getElementById(
    'order-status'
  ) as HTMLSelectElement;
  const dateFromInput = document.getElementById(
    'date-from'
  ) as HTMLInputElement;

  currentFilters = {
    search: searchInput?.value || '',
    status: statusSelect?.value || '',
    date_from: dateFromInput?.value || '',
  };

  currentPage = 1;
  await loadOrders();
}

async function loadOrders() {
  const ordersLoadingEl = document.getElementById('orders-loading');
  const ordersListEl = document.getElementById('orders-list');
  const emptyStateEl = document.getElementById('empty-state');
  const paginationEl = document.getElementById('pagination');

  try {
    ordersLoadingEl?.classList.remove('hidden');
    emptyStateEl?.classList.add('hidden');

    const params = {
      page: currentPage,
      limit: 10,
      ...currentFilters,
    };

    const response: PaginatedResponse<Order> =
      await ordersService.getUserOrders(params);
    orders = response.data || [];
    totalPages = response.pagination?.totalPages || 1;

    ordersLoadingEl?.classList.add('hidden');

    if (orders.length === 0) {
      emptyStateEl?.classList.remove('hidden');
      paginationEl?.classList.add('hidden');
    } else {
      emptyStateEl?.classList.add('hidden');
      renderOrders();
      updatePagination(response);
      paginationEl?.classList.remove('hidden');
    }
  } catch (error) {
    console.error('Error loading orders:', error);
    ordersLoadingEl?.classList.add('hidden');
    showError('Error al cargar los pedidos');
  }
}

function renderOrders() {
  const ordersListEl = document.getElementById('orders-list');
  if (!ordersListEl) return;

  ordersListEl.innerHTML = orders
    .map(
      (order) => `
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div class="p-6">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center space-x-4">
            <div>
              <h3 class="text-lg font-bold text-black tracking-wide uppercase">PEDIDO #${
                order.id?.slice(-8) || 'N/A'
              }</h3>
              <p class="text-sm text-gray-600 font-medium">Realizado el ${formatDate(
                order.created_at
              )}</p>
            </div>
          </div>
          <div class="text-right">
            <p class="text-2xl font-bold text-black">$${
              order.total?.toFixed(2) || '0.00'
            }</p>
            <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${getStatusClass(
              order.status
            )} tracking-wide uppercase">
              ${getStatusText(order.status)}
            </span>
          </div>
        </div>

        <div class="border-t border-gray-200 pt-4">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <p class="text-sm font-bold text-black tracking-wide uppercase">ESTADO</p>
              <p class="text-sm text-gray-600 font-medium">${getStatusText(
                order.status
              )}</p>
            </div>
            <div>
              <p class="text-sm font-bold text-black tracking-wide uppercase">MÉTODO DE PAGO</p>
              <p class="text-sm text-gray-600 font-medium">${getPaymentMethodText(
                order.payment_method
              )}</p>
            </div>
            <div>
              <p class="text-sm font-bold text-black tracking-wide uppercase">PRODUCTOS</p>
              <p class="text-sm text-gray-600 font-medium">${
                (order as any).order_items?.length || 0
              } artículo(s)</p>
            </div>
          </div>

          <!-- Order Items Preview -->
          <div class="space-y-2 mb-4">
            ${
              (order as any).order_items
                ?.slice(0, 3)
                .map(
                  (item: any) => `
              <div class="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg">
                <img 
                  src="${(() => {
                    const images = item.products?.product_images || [];
                    // Buscar imagen primaria primero
                    const primaryImage = images.find(
                      (img: any) => img.is_primary
                    );
                    if (primaryImage) return primaryImage.image_url;
                    // Si no hay imagen primaria, usar la primera disponible ordenada por sort_order
                    const sortedImages = images.sort(
                      (a: any, b: any) =>
                        (a.sort_order || 0) - (b.sort_order || 0)
                    );
                    return sortedImages[0]?.image_url || '/placeholder.jpg';
                  })()}" 
                  alt="${item.products?.name || 'Producto'}"
                  class="w-12 h-12 object-cover rounded"
                  onerror="this.src='/placeholder.jpg'"
                />
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-black truncate">${
                    item.products?.name || 'Producto'
                  }</p>
                  <p class="text-xs text-gray-600">Cantidad: ${
                    item.quantity
                  } • $${item.price?.toFixed(2) || '0.00'}</p>
                </div>
              </div>
            `
                )
                .join('') ||
              '<p class="text-sm text-gray-600">No hay productos</p>'
            }
            ${
              ((order as any).order_items?.length || 0) > 3
                ? `
              <p class="text-xs text-gray-500 font-medium">Y ${
                ((order as any).order_items?.length || 0) - 3
              } producto(s) más...</p>
            `
                : ''
            }
          </div>

          <div class="flex items-center justify-between">
            <div class="flex space-x-3">
              ${
                order.status === 'shipped' || order.status === 'delivered'
                  ? `
                <button class="text-sm text-blue-600 hover:text-blue-800 font-bold tracking-wide uppercase">
                  RASTREAR ENVÍO
                </button>
              `
                  : ''
              }
              ${
                order.status === 'delivered'
                  ? `
                <button class="text-sm text-green-600 hover:text-green-800 font-bold tracking-wide uppercase">
                  DESCARGAR FACTURA
                </button>
              `
                  : ''
              }
            </div>
            <button 
              onclick="showOrderDetail('${order.id}')" 
              class="bg-black text-white px-6 py-2 rounded-lg font-bold hover:bg-gray-800 transition-colors tracking-wide uppercase"
            >
              VER DETALLES
            </button>
          </div>
        </div>
      </div>
    </div>
  `
    )
    .join('');
}

function updatePagination(response: PaginatedResponse<Order>) {
  const paginationInfo = document.getElementById('pagination-info');
  const pageNumbers = document.getElementById('page-numbers');
  const prevBtn = document.getElementById('prev-page') as HTMLButtonElement;
  const nextBtn = document.getElementById('next-page') as HTMLButtonElement;

  if (paginationInfo) {
    const start = (currentPage - 1) * (response.pagination?.limit || 10) + 1;
    const end = Math.min(
      start + (response.pagination?.limit || 10) - 1,
      response.pagination?.total || 0
    );
    paginationInfo.textContent = `Mostrando ${start}-${end} de ${
      response.pagination?.total || 0
    } pedidos`;
  }

  if (prevBtn) {
    prevBtn.disabled = currentPage <= 1;
  }

  if (nextBtn) {
    nextBtn.disabled = currentPage >= totalPages;
  }

  // Generar números de página
  if (pageNumbers) {
    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(`
        <button 
          onclick="goToPage(${i})" 
          class="px-3 py-2 border rounded-lg font-medium tracking-wide uppercase ${
            i === currentPage
              ? 'bg-black text-white border-black'
              : 'border-gray-300 text-gray-600 hover:bg-gray-50'
          }"
        >
          ${i}
        </button>
      `);
    }

    pageNumbers.innerHTML = pages.join('');
  }
}

async function showOrderDetail(orderId: string) {
  const modal = document.getElementById('order-modal');
  const modalContent = document.getElementById('modal-content');
  const modalTitle = document.getElementById('modal-title');

  if (!modal || !modalContent || !modalTitle) return;

  try {
    modal.classList.remove('hidden');
    modalContent.innerHTML =
      '<div class="text-center py-8"><div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div><p class="mt-2 text-gray-600 font-medium tracking-wide">CARGANDO DETALLES...</p></div>';

    const order = await ordersService.getOrderById(orderId);

    modalTitle.textContent = `PEDIDO #${order.id?.slice(-8) || 'N/A'}`;
    modalContent.innerHTML = renderOrderDetail(order);
  } catch (error) {
    console.error('Error loading order detail:', error);
    modalContent.innerHTML =
      '<div class="text-center py-8"><p class="text-red-600 font-medium">Error al cargar los detalles del pedido</p></div>';
  }
}

function renderOrderDetail(order: Order): string {
  return `
    <div class="space-y-6">
      <!-- Order Summary -->
      <div class="bg-gray-50 rounded-lg p-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 class="font-bold text-black mb-4 tracking-wide uppercase">INFORMACIÓN DEL PEDIDO</h3>
            <div class="space-y-2">
              <div class="flex justify-between">
                <span class="text-gray-600 font-medium">Estado:</span>
                <span class="font-bold ${getStatusClass(
                  order.status
                )} tracking-wide uppercase">${getStatusText(
    order.status
  )}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600 font-medium">Fecha:</span>
                <span class="font-medium">${formatDate(order.created_at)}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600 font-medium">Total:</span>
                <span class="font-bold text-lg">$${
                  order.total?.toFixed(2) || '0.00'
                }</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600 font-medium">Método de pago:</span>
                <span class="font-medium">${getPaymentMethodText(
                  order.payment_method
                )}</span>
              </div>
            </div>
          </div>
          <div>
            <h3 class="font-bold text-black mb-4 tracking-wide uppercase">DIRECCIÓN DE ENVÍO</h3>
            <div class="text-sm space-y-1">
              <p class="font-medium">${
                order.shipping_address?.full_name || 'N/A'
              }</p>
              <p class="text-gray-600">${
                order.shipping_address?.street || 'N/A'
              }</p>
              <p class="text-gray-600">${
                order.shipping_address?.city || 'N/A'
              }, ${order.shipping_address?.state || 'N/A'} ${
    order.shipping_address?.postal_code || 'N/A'
  }</p>
              <p class="text-gray-600">${
                order.shipping_address?.country || 'N/A'
              }</p>
              ${
                order.shipping_address?.phone
                  ? `<p class="text-gray-600">Tel: ${order.shipping_address.phone}</p>`
                  : ''
              }
            </div>
          </div>
        </div>
      </div>

      <!-- Order Items -->
      <div>
        <h3 class="font-bold text-black mb-4 tracking-wide uppercase">PRODUCTOS PEDIDOS</h3>
        <div class="space-y-4">
          ${
            (order as any).order_items
              ?.map(
                (item: any) => `
            <div class="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
              <img 
                src="${(() => {
                  const images = item.products?.product_images || [];
                  // Buscar imagen primaria primero
                  const primaryImage = images.find(
                    (img: any) => img.is_primary
                  );
                  if (primaryImage) return primaryImage.image_url;
                  // Si no hay imagen primaria, usar la primera disponible ordenada por sort_order
                  const sortedImages = images.sort(
                    (a: any, b: any) =>
                      (a.sort_order || 0) - (b.sort_order || 0)
                  );
                  return sortedImages[0]?.image_url || '/placeholder.jpg';
                })()}" 
                alt="${item.products?.name || 'Producto'}"
                class="w-20 h-20 object-cover rounded-lg"
                onerror="this.src='/placeholder.jpg'"
              />
              <div class="flex-1">
                <h4 class="font-bold text-black">${
                  item.products?.name || 'Producto'
                }</h4>
                <p class="text-gray-600 text-sm">${
                  item.products?.description || ''
                }</p>
                <div class="flex items-center space-x-4 mt-2">
                  <span class="text-sm text-gray-600">ID: ${
                    item.product_id?.slice(-8) || 'N/A'
                  }</span>
                  ${
                    item.variant_id
                      ? `<span class="text-sm text-gray-600">Variante: ${item.variant_id}</span>`
                      : ''
                  }
                </div>
              </div>
              <div class="text-right">
                <p class="font-bold text-black">$${
                  item.price?.toFixed(2) || '0.00'
                }</p>
                <p class="text-sm text-gray-600">Cantidad: ${item.quantity}</p>
                <p class="text-sm font-bold">Subtotal: $${(
                  (item.price || 0) * item.quantity
                ).toFixed(2)}</p>
              </div>
            </div>
          `
              )
              .join('') ||
            '<p class="text-gray-600">No hay productos en este pedido</p>'
          }
        </div>
      </div>

      <!-- Order Totals -->
      <div class="bg-gray-50 rounded-lg p-6">
        <div class="space-y-2">
          <div class="flex justify-between">
            <span class="text-gray-600 font-medium">Subtotal:</span>
            <span class="font-medium">$${
              order.subtotal?.toFixed(2) || '0.00'
            }</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600 font-medium">Envío:</span>
            <span class="font-medium">$${(
              order.shipping ||
              order.shipping_cost ||
              0
            ).toFixed(2)}</span>
          </div>
          ${
            order.tax || order.tax_amount
              ? `
            <div class="flex justify-between">
              <span class="text-gray-600 font-medium">Impuestos:</span>
              <span class="font-medium">$${(
                order.tax ||
                order.tax_amount ||
                0
              ).toFixed(2)}</span>
            </div>
          `
              : ''
          }
          ${
            order.discount || order.discount_amount
              ? `
            <div class="flex justify-between">
              <span class="text-gray-600 font-medium">Descuento:</span>
              <span class="font-medium text-green-600">-$${(
                order.discount ||
                order.discount_amount ||
                0
              ).toFixed(2)}</span>
            </div>
          `
              : ''
          }
          <div class="border-t border-gray-300 pt-2">
            <div class="flex justify-between">
              <span class="font-bold text-black tracking-wide uppercase">TOTAL:</span>
              <span class="font-bold text-xl text-black">$${
                order.total?.toFixed(2) || '0.00'
              }</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex space-x-4">
        ${
          order.status === 'delivered'
            ? `
          <button class="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-green-700 transition-colors tracking-wide uppercase">
            DESCARGAR FACTURA
          </button>
        `
            : ''
        }
        ${
          order.status === 'shipped' || order.status === 'delivered'
            ? `
          <button class="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors tracking-wide uppercase">
            RASTREAR ENVÍO
          </button>
        `
            : ''
        }
        ${
          order.status === 'pending' || order.status === 'confirmed'
            ? `
          <button class="flex-1 bg-red-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-red-700 transition-colors tracking-wide uppercase">
            CANCELAR PEDIDO
          </button>
        `
            : ''
        }
      </div>
    </div>
  `;
}

function hideOrderModal() {
  const modal = document.getElementById('order-modal');
  modal?.classList.add('hidden');
}

function getStatusClass(status?: string): string {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'confirmed':
      return 'bg-blue-100 text-blue-800';
    case 'shipped':
      return 'bg-purple-100 text-purple-800';
    case 'delivered':
      return 'bg-green-100 text-green-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function getStatusText(status?: string): string {
  switch (status) {
    case 'pending':
      return 'PENDIENTE';
    case 'confirmed':
      return 'CONFIRMADO';
    case 'shipped':
      return 'ENVIADO';
    case 'delivered':
      return 'ENTREGADO';
    case 'cancelled':
      return 'CANCELADO';
    default:
      return 'DESCONOCIDO';
  }
}

function getPaymentMethodText(method?: string): string {
  switch (method) {
    case 'credit_card':
      return 'Tarjeta de Crédito';
    case 'paypal':
      return 'PayPal';
    case 'bank_transfer':
      return 'Transferencia Bancaria';
    default:
      return 'No especificado';
  }
}

function formatDate(dateString?: string): string {
  if (!dateString) return 'N/A';

  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function showError(message: string) {
  // Crear toast de error
  const toast = document.createElement('div');
  toast.className =
    'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 font-bold tracking-wide uppercase';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Funciones globales para usar en el HTML
(window as any).showOrderDetail = showOrderDetail;
(window as any).goToPage = (page: number) => {
  currentPage = page;
  loadOrders();
};
