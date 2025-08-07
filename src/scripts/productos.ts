import { productsService } from '../utils/api/products';
import type { Product, Category, ProductFilters } from '../types/types';
import {
  getProductImageUrl,
  optimizeCloudinaryUrl,
} from '../utils/image-helpers';

let currentFilters: ProductFilters = {
  page: 1,
  limit: 12,
};
let allProducts: Product[] = [];
let allCategories: Category[] = [];
let isLoading = false;

export async function initializeProductsFilters() {
  try {
    console.log('🚀 Inicializando página de productos...');

    // Inicializar filtros desde URL
    initializeFiltersFromURL();

    await Promise.all([loadCategories(), loadProducts()]);

    setupEventListeners();

    console.log('✅ Página de productos inicializada correctamente');
  } catch (error) {
    console.error('❌ Error inicializando página de productos:', error);
    showErrorMessage('Error cargando la página de productos');
  }
}

// Inicializar filtros desde la URL
function initializeFiltersFromURL() {
  const urlParams = new URLSearchParams(window.location.search);

  currentFilters = {
    page: parseInt(urlParams.get('page') || '1'),
    limit: parseInt(urlParams.get('limit') || '12'),
    category: urlParams.get('categoria') || undefined,
    search: urlParams.get('search') || undefined,
    min_price: urlParams.get('precio_min')
      ? parseFloat(urlParams.get('precio_min')!)
      : undefined,
    max_price: urlParams.get('precio_max')
      ? parseFloat(urlParams.get('precio_max')!)
      : undefined,
    sort_by:
      (urlParams.get('orden') as ProductFilters['sort_by']) || 'featured',
    brand: urlParams.get('marca') || undefined,
  };

  // Manejar filtros especiales SALE y NUEVO
  if (urlParams.get('sale') === 'true') {
    currentFilters.sale = true;
    currentFilters.sort_by = 'price-desc'; // Mostrar ofertas ordenadas por precio
  }

  if (urlParams.get('nuevo') === 'true') {
    currentFilters.nuevo = true;
    currentFilters.sort_by = 'newest'; // Mostrar productos más recientes
  }

  console.log('📊 Filtros iniciales desde URL:', currentFilters);
}

// Cargar categorías
async function loadCategories() {
  try {
    console.log('📂 Cargando categorías...');
    allCategories = await productsService.getCategories();
    renderCategoryFilters();
    console.log('✅ Categorías cargadas:', allCategories.length);
  } catch (error) {
    console.error('❌ Error cargando categorías:', error);
    allCategories = [];
  }
}

// Cargar productos
async function loadProducts() {
  if (isLoading) return;

  try {
    isLoading = true;
    showLoadingState();

    console.log('🛍️ Cargando productos con filtros:', currentFilters);
    const response = await productsService.getProducts(currentFilters);

    allProducts = response.data || response.products || [];

    // Debug: Log de productos para verificar estructura de imágenes
    console.log('🔍 Estructura de productos:', allProducts.slice(0, 2));
    console.log('🔍 Imágenes del primer producto:', allProducts[0]?.images);

    // Renderizar productos
    renderProducts();

    // Actualizar paginación
    console.log('📄 Response pagination data:', response.pagination);

    // Asegurar que siempre tengamos datos de paginación válidos
    const paginationData = response.pagination || {};
    const fallbackPagination = {
      current_page: currentFilters.page || 1,
      last_page:
        Math.ceil(allProducts.length / (currentFilters.limit || 12)) || 1,
      ...paginationData, // Esto sobreescribirá los valores fallback si existen en la respuesta
      total: paginationData.total ?? allProducts.length,
    };

    updatePagination(fallbackPagination);

    // Actualizar contador de resultados
    updateResultsCounter(fallbackPagination.total || allProducts.length);

    console.log('✅ Productos cargados:', allProducts.length);
  } catch (error) {
    console.error('❌ Error cargando productos:', error);
    showErrorMessage('Error cargando productos');
    showEmptyState();
  } finally {
    isLoading = false;
    hideLoadingState();
  }
}

// Configurar event listeners
function setupEventListeners() {
  // Filtros de categoría
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.matches('[data-category-filter]')) {
      e.preventDefault();
      const category = target.getAttribute('data-category-filter');
      applyFilter('category', category === 'all' ? undefined : category);
    }
  });

  // Filtros de precio
  const priceCheckboxes = document.querySelectorAll(
    'input[name="price-range"]'
  );
  priceCheckboxes.forEach((checkbox) => {
    checkbox.addEventListener('change', handlePriceFilter);
  });

  // Filtros de marca
  const brandCheckboxes = document.querySelectorAll('input[name="brand"]');
  brandCheckboxes.forEach((checkbox) => {
    checkbox.addEventListener('change', handleBrandFilter);
  });

  // Selector de ordenamiento
  const sortSelect = document.querySelector(
    'select[data-sort]'
  ) as HTMLSelectElement;
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      applyFilter('sort_by', target.value);
    });
  }

  // Botón limpiar filtros
  const clearFiltersBtn = document.querySelector('[data-clear-filters]');
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', clearAllFilters);
  }

  // Botón filtros móvil
  const mobileFilterBtn = document.querySelector('[data-mobile-filters]');
  const mobileFilterModal = document.querySelector(
    '[data-mobile-filter-modal]'
  );
  const closeMobileFilterBtn = document.querySelector(
    '[data-close-mobile-filters]'
  );

  if (mobileFilterBtn && mobileFilterModal) {
    mobileFilterBtn.addEventListener('click', () => {
      mobileFilterModal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    });
  }

  if (closeMobileFilterBtn && mobileFilterModal) {
    closeMobileFilterBtn.addEventListener('click', () => {
      mobileFilterModal.classList.add('hidden');
      document.body.style.overflow = '';
    });
  }

  // Búsqueda en tiempo real
  const searchInput = document.querySelector(
    'input[data-search]'
  ) as HTMLInputElement;
  if (searchInput) {
    let searchTimeout: NodeJS.Timeout;
    searchInput.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        applyFilter('search', target.value || undefined);
      }, 500);
    });
  }
}

// Aplicar filtro individual
function applyFilter(key: keyof ProductFilters, value: any) {
  console.log(`🔧 Aplicando filtro ${key}:`, value);

  // Actualizar filtros
  currentFilters = {
    ...currentFilters,
    [key]: value,
    page: 1, // Reset página al cambiar filtros
  };

  // Actualizar URL
  updateURL();

  // Recargar productos
  loadProducts();

  // Actualizar UI de filtros
  updateFilterUI();
}

// Manejar filtros de precio
function handlePriceFilter() {
  const checkedPrices = document.querySelectorAll(
    'input[name="price-range"]:checked'
  ) as NodeListOf<HTMLInputElement>;

  if (checkedPrices.length === 0) {
    currentFilters.min_price = undefined;
    currentFilters.max_price = undefined;
  } else {
    // Combinar rangos de precio seleccionados
    let minPrice = Infinity;
    let maxPrice = 0;

    checkedPrices.forEach((checkbox) => {
      const range = checkbox.value;
      const [min, max] = range
        .split('-')
        .map((v) => (v === 'more' ? Infinity : parseFloat(v)));
      if (min < minPrice) minPrice = min;
      if (max > maxPrice && max !== Infinity) maxPrice = max;
    });

    currentFilters.min_price = minPrice === Infinity ? undefined : minPrice;
    currentFilters.max_price = maxPrice === 0 ? undefined : maxPrice;
  }

  currentFilters.page = 1;
  updateURL();
  loadProducts();
}

// Manejar filtros de marca
function handleBrandFilter() {
  const checkedBrands = document.querySelectorAll(
    'input[name="brand"]:checked'
  ) as NodeListOf<HTMLInputElement>;

  if (checkedBrands.length === 0) {
    currentFilters.brand = undefined;
  } else {
    const brands = Array.from(checkedBrands).map((cb) => cb.value);
    currentFilters.brand = brands.join(',');
  }

  currentFilters.page = 1;
  updateURL();
  loadProducts();
}

// Limpiar todos los filtros
function clearAllFilters() {
  console.log('🧹 Limpiando todos los filtros');

  currentFilters = {
    page: 1,
    limit: 12,
    sort_by: 'featured' as ProductFilters['sort_by'],
  };

  // Limpiar checkboxes
  document.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
    (cb as HTMLInputElement).checked = false;
  });

  // Limpiar búsqueda
  const searchInput = document.querySelector(
    'input[data-search]'
  ) as HTMLInputElement;
  if (searchInput) searchInput.value = '';

  // Reset selector de orden
  const sortSelect = document.querySelector(
    'select[data-sort]'
  ) as HTMLSelectElement;
  if (sortSelect) sortSelect.value = 'featured';

  updateURL();
  loadProducts();
  updateFilterUI();
}

// Actualizar URL sin recargar página
function updateURL() {
  const params = new URLSearchParams();

  Object.entries(currentFilters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (key === 'category') params.set('categoria', value.toString());
      else if (key === 'search') params.set('search', value.toString());
      else if (key === 'min_price') params.set('precio_min', value.toString());
      else if (key === 'max_price') params.set('precio_max', value.toString());
      else if (key === 'sort_by') params.set('orden', value.toString());
      else if (key === 'brand') params.set('marca', value.toString());
      else params.set(key, value.toString());
    }
  });

  const newURL = `${window.location.pathname}${
    params.toString() ? '?' + params.toString() : ''
  }`;
  window.history.replaceState({}, '', newURL);
}

// Renderizar filtros de categoría
function renderCategoryFilters() {
  const categoryContainer = document.querySelector('[data-category-filters]');
  if (!categoryContainer) return;

  const categoryLinks = allCategories
    .map(
      (category) => `
    <a href="#" 
       data-category-filter="${category.id}"
       class="block text-sm transition-colors py-1 ${
         currentFilters.category === category.id
           ? 'text-black font-bold'
           : 'text-gray-600 hover:text-black'
       }">
      ${category.name}
    </a>
  `
    )
    .join('');

  categoryContainer.innerHTML = `
    <a href="#" 
       data-category-filter="all"
       class="block text-sm transition-colors py-1 ${
         !currentFilters.category
           ? 'text-black font-bold'
           : 'text-gray-600 hover:text-black'
       }">
      Todas las categorías
    </a>
    ${categoryLinks}
  `;
}

// Renderizar productos
function renderProducts() {
  const productGrid = document.querySelector('[data-products-grid]');
  if (!productGrid) return;

  if (allProducts.length === 0) {
    showEmptyState();
    return;
  }

  const productsHTML = allProducts
    .map((product) => {
      const imageUrl = getProductImageUrl(product);
      const optimizedImageUrl = optimizeCloudinaryUrl(imageUrl, 400, 300);

      console.log(`📷 Producto "${product.name}" - URL imagen:`, imageUrl);
      console.log(`📷 URL optimizada:`, optimizedImageUrl);

      return `
    <div class="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300 group">
      <div class="relative overflow-hidden">
        <img 
          src="${optimizedImageUrl}" 
          alt="${product.name}"
          class="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
          onerror="console.error('Error cargando imagen:', this.src); this.src='/placeholder.jpg';"
        />
        ${
          product.is_featured || product.featured
            ? '<div class="absolute top-2 left-2 bg-black text-white px-2 py-1 text-xs font-bold uppercase tracking-wide">Destacado</div>'
            : ''
        }
        ${
          product.discount_percentage
            ? `<div class="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 text-xs font-bold uppercase tracking-wide">-${product.discount_percentage}%</div>`
            : ''
        }
      </div>
      
      <div class="p-4">
        <h3 class="text-lg font-semibold text-black mb-2 line-clamp-2">${
          product.name
        }</h3>
        <p class="text-gray-600 text-sm mb-3 line-clamp-2">${
          product.description || ''
        }</p>
        
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2">
            ${
              product.original_price && product.original_price > product.price
                ? `<span class="text-gray-400 line-through text-sm">$${product.original_price.toFixed(
                    2
                  )}</span>`
                : ''
            }
            <span class="text-xl font-bold text-black">$${product.price.toFixed(
              2
            )}</span>
          </div>
          
          <div class="flex items-center space-x-1">
            ${Array.from(
              { length: 5 },
              (_, i) => `
              <svg class="w-4 h-4 ${
                i < Math.floor(product.rating || 0)
                  ? 'text-yellow-400'
                  : 'text-gray-300'
              }" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
              </svg>
            `
            ).join('')}
            <span class="text-sm text-gray-600 ml-1">(${
              product.rating || 0
            })</span>
          </div>
        </div>
        
        <div class="mt-4 flex items-center justify-between">
          <a href="/productos/${product.id}" 
             class="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors font-medium text-sm tracking-wide uppercase">
            Ver Detalles
          </a>
       
        </div>
      </div>
    </div>
  `;
    })
    .join('');

  productGrid.innerHTML = productsHTML;
}

// Mostrar estado de carga
function showLoadingState() {
  const productGrid = document.querySelector('[data-products-grid]');
  if (!productGrid) return;

  productGrid.innerHTML = `
    <div class="col-span-full flex items-center justify-center py-12">
      <div class="text-center">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-black mb-4"></div>
        <p class="text-black font-medium tracking-wide uppercase">Cargando productos...</p>
      </div>
    </div>
  `;
}

// Ocultar estado de carga
function hideLoadingState() {
  // La función renderProducts() se encarga de esto
}

// Mostrar estado vacío
function showEmptyState() {
  const productGrid = document.querySelector('[data-products-grid]');
  if (!productGrid) return;

  productGrid.innerHTML = `
    <div class="col-span-full bg-white rounded-lg shadow-sm p-12 text-center">
      <svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path>
      </svg>
      <h3 class="text-lg font-medium text-black mb-2">No se encontraron productos</h3>
      <p class="text-gray-600 mb-4">
        ${
          currentFilters.search
            ? `No hay productos que coincidan con "${currentFilters.search}"`
            : 'No hay productos disponibles con los filtros seleccionados'
        }
      </p>
      <button onclick="clearAllFilters()" 
              class="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800 transition-colors font-medium tracking-wide uppercase">
        Limpiar Filtros
      </button>
    </div>
  `;
}

// Mostrar mensaje de error
function showErrorMessage(message: string) {
  // Implementar toast o notificación
  console.error(message);
}

// Actualizar contador de resultados
function updateResultsCounter(total: number) {
  const counter = document.querySelector('[data-results-counter]');
  if (counter) {
    counter.textContent = `${total} ${
      total === 1 ? 'producto encontrado' : 'productos encontrados'
    }`;
  }
}

// Actualizar paginación
function updatePagination(pagination: any) {
  const paginationContainer = document.querySelector('[data-pagination]');
  if (!paginationContainer) return;

  console.log('🔍 Pagination object received:', pagination);

  // Manejar diferentes estructuras de paginación
  let current_page = 1;
  let last_page = 1;
  let total = 0;

  if (pagination) {
    // Intentar diferentes propiedades que podrían existir
    current_page =
      pagination.current_page ||
      pagination.currentPage ||
      pagination.page ||
      currentFilters.page ||
      1;
    last_page =
      pagination.last_page ||
      pagination.lastPage ||
      pagination.totalPages ||
      pagination.total_pages ||
      1;
    total = pagination.total || pagination.totalCount || pagination.count || 0;
  }

  console.log('📊 Pagination values:', { current_page, last_page, total });

  const hasPrev = current_page > 1;
  const hasNext = current_page < last_page;

  let paginationHTML = '';

  if (total > 0) {
    paginationHTML = `
      <div class="flex items-center justify-between">
        <div class="text-sm text-gray-700 font-medium">
          Página ${current_page} de ${last_page} (${total} productos)
        </div>
        <div class="flex space-x-2">
          ${
            hasPrev
              ? `
            <button onclick="changePage(${current_page - 1})" 
                    class="px-3 py-1 border-2 border-black rounded-md text-sm hover:bg-gray-50 transition-colors font-medium tracking-wide uppercase">
              Anterior
            </button>
          `
              : ''
          }
          
          ${Array.from({ length: Math.min(5, last_page) }, (_, i) => {
            const page =
              Math.max(1, Math.min(current_page - 2, last_page - 4)) + i;
            if (page > last_page) return '';

            return `
              <button onclick="changePage(${page})" 
                      class="px-3 py-1 border-2 rounded-md text-sm transition-colors font-medium tracking-wide uppercase ${
                        page === current_page
                          ? 'bg-black text-white border-black'
                          : 'border-black hover:bg-gray-50'
                      }">
                ${page}
              </button>
            `;
          }).join('')}
          
          ${
            hasNext
              ? `
            <button onclick="changePage(${current_page + 1})" 
                    class="px-3 py-1 border-2 border-black rounded-md text-sm hover:bg-gray-50 transition-colors font-medium tracking-wide uppercase">
              Siguiente
            </button>
          `
              : ''
          }
        </div>
      </div>
    `;
  } else {
    // Si no hay productos, mostrar mensaje
    paginationHTML = `
      <div class="text-center text-gray-500 py-4">
        <p class="font-medium">No se encontraron productos</p>
      </div>
    `;
  }

  paginationContainer.innerHTML = paginationHTML;
}

// Actualizar UI de filtros
function updateFilterUI() {
  // Actualizar enlaces de categoría
  document.querySelectorAll('[data-category-filter]').forEach((link) => {
    const category = link.getAttribute('data-category-filter');
    if (category === 'all' && !currentFilters.category) {
      link.className =
        'block text-sm transition-colors py-1 text-black font-bold';
    } else if (category === currentFilters.category) {
      link.className =
        'block text-sm transition-colors py-1 text-black font-bold';
    } else {
      link.className =
        'block text-sm transition-colors py-1 text-gray-600 hover:text-black';
    }
  });

  // Actualizar selector de orden
  const sortSelect = document.querySelector(
    'select[data-sort]'
  ) as HTMLSelectElement;
  if (sortSelect && currentFilters.sort_by) {
    sortSelect.value = currentFilters.sort_by;
  }
}

// Cambiar página
function changePage(page: number) {
  if (page < 1) return;
  applyFilter('page', page);
}

// Agregar al carrito rápido
function addToCartQuick(productId: number) {
  // Implementar lógica de agregar al carrito
  console.log('Agregando producto al carrito:', productId);
  // Aquí se integrará con el cart manager global
}

// Funciones globales
declare global {
  interface Window {
    changePage: (page: number) => void;
    clearAllFilters: () => void;
    addToCartQuick: (productId: number) => void;
  }
}

window.changePage = changePage;
window.clearAllFilters = clearAllFilters;
window.addToCartQuick = addToCartQuick;
