// Gestión de categorías en el admin panel
import { productsService } from '../../utils/api/products';
import type { Category } from '../../types/types';

// Estado de la gestión de categorías
let allCategories: Category[] = [];
let currentEditingCategory: Category | null = null;

// Inicializar gestión de categorías
export function initializeCategoriesManagement() {
  console.log('🗂️ Inicializando gestión de categorías...');

  // Verificar que el tab de categorías esté visible
  const categoriesContent = document.getElementById('categories-content');
  if (!categoriesContent) {
    console.error('❌ No se encontró el contenido del tab de categorías');
    return;
  }

  if (categoriesContent.classList.contains('hidden')) {
    console.warn('⚠️ El tab de categorías está oculto');
  }

  // Configurar event listeners
  setupCategoriesEventListeners();

  // Cargar categorías iniciales
  loadCategories();
}

// Configurar event listeners
function setupCategoriesEventListeners() {
  console.log('🔧 Configurando event listeners de categorías...');

  // Botón añadir categoría
  const addCategoryBtn = document.getElementById('add-category-btn');
  console.log('➕ Botón añadir categoría:', addCategoryBtn);
  if (addCategoryBtn) {
    addCategoryBtn.addEventListener('click', () => {
      openCategoryModal();
    });
  }

  // Cerrar modal
  const closeModalBtn = document.getElementById('close-category-modal');
  const cancelBtn = document.getElementById('cancel-category');
  console.log('❌ Botones cerrar modal:', { closeModalBtn, cancelBtn });
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', closeCategoryModal);
  }
  if (cancelBtn) {
    cancelBtn.addEventListener('click', closeCategoryModal);
  }

  // Formulario de categoría
  const categoryForm = document.getElementById('category-form');
  console.log('📝 Formulario de categoría:', categoryForm);
  if (categoryForm) {
    categoryForm.addEventListener('submit', handleCategorySubmit);
  }

  // Filtros
  const filterBtn = document.getElementById('categories-filter-btn');
  console.log('🔍 Botón filtrar:', filterBtn);
  if (filterBtn) {
    filterBtn.addEventListener('click', applyFilters);
  }

  // Búsqueda en tiempo real
  const searchInput = document.getElementById('categories-search');
  console.log('🔍 Campo de búsqueda:', searchInput);
  if (searchInput) {
    searchInput.addEventListener('input', debounce(applyFilters, 300));
  }

  console.log('✅ Event listeners configurados correctamente');
}

// Cargar categorías
async function loadCategories() {
  try {
    console.log('📂 Cargando categorías...');
    showLoadingState();

    const categoriesResponse = await productsService.getCategories();
    console.log('🔍 Respuesta de categorías:', categoriesResponse);

    // Manejar diferentes estructuras de respuesta
    if (Array.isArray(categoriesResponse)) {
      allCategories = categoriesResponse;
    } else if ((categoriesResponse as any).categories) {
      allCategories = (categoriesResponse as any).categories;
    } else if ((categoriesResponse as any).data) {
      allCategories = (categoriesResponse as any).data;
    } else {
      allCategories = [];
    }

    console.log('📋 Categorías procesadas:', allCategories);
    renderCategories();
    console.log('✅ Categorías cargadas:', allCategories.length);
  } catch (error) {
    console.error('❌ Error cargando categorías:', error);
    showErrorState('Error cargando categorías');
  }
}

// Renderizar categorías
function renderCategories() {
  const tbody = document.getElementById('categories-table-body');
  if (!tbody) return;

  if (allCategories.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="px-6 py-8 text-center text-gray-500">
          <svg class="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
          </svg>
          <p class="font-medium">No hay categorías disponibles</p>
          <p class="text-sm">Crea tu primera categoría para empezar</p>
        </td>
      </tr>
    `;
    return;
  }

  const categoriesHTML = allCategories
    .map(
      (category) => `
    <tr class="hover:bg-gray-50">
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="flex items-center">
          ${
            category.image_url
              ? `<img class="h-10 w-10 rounded object-cover mr-3" src="${category.image_url}" alt="${category.name}">`
              : `<div class="h-10 w-10 rounded bg-gray-200 flex items-center justify-center mr-3">
              <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
              </svg>
            </div>`
          }
          <div>
            <div class="text-sm font-bold text-black">${category.name}</div>
            <div class="text-sm text-gray-500">ID: ${category.id}</div>
          </div>
        </div>
      </td>
      <td class="px-6 py-4">
        <div class="text-sm text-gray-900 max-w-xs truncate">${category.description || 'Sin descripción'}</div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
          ${category.product_count || 0} productos
        </span>
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <span class="px-2 inline-flex text-xs leading-5 font-bold rounded-full ${
          category.is_active
            ? 'bg-green-100 text-green-800'
            : 'bg-red-100 text-red-800'
        }">
          ${category.is_active ? 'Activa' : 'Inactiva'}
        </span>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        ${new Date(category.created_at).toLocaleDateString('es-ES')}
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <div class="flex space-x-2">
          <button onclick="editCategory('${category.id}')" class="text-black hover:text-gray-600 font-bold">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
          </button>
          <button onclick="toggleCategoryStatus('${category.id}')" class="text-${category.is_active ? 'red' : 'green'}-600 hover:text-${category.is_active ? 'red' : 'green'}-700 font-bold">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              ${
                category.is_active
                  ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728"/>'
                  : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>'
              }
            </svg>
          </button>
          <button onclick="deleteCategory('${category.id}')" class="text-red-600 hover:text-red-700 font-bold">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
        </div>
      </td>
    </tr>
  `
    )
    .join('');

  tbody.innerHTML = categoriesHTML;
}

// Abrir modal de categoría
function openCategoryModal(category?: Category) {
  const modal = document.getElementById('category-modal');
  const title = document.getElementById('category-modal-title');
  const form = document.getElementById('category-form') as HTMLFormElement;

  if (!modal || !title || !form) return;

  currentEditingCategory = category || null;

  if (category) {
    title.textContent = 'Editar Categoría';
    (document.getElementById('category-id') as HTMLInputElement).value =
      category.id;
    (document.getElementById('category-name') as HTMLInputElement).value =
      category.name;
    (
      document.getElementById('category-description') as HTMLTextAreaElement
    ).value = category.description || '';
    (document.getElementById('category-image-url') as HTMLInputElement).value =
      category.image_url || '';
    (document.getElementById('category-active') as HTMLInputElement).checked =
      category.is_active;
  } else {
    title.textContent = 'Añadir Categoría';
    form.reset();
  }

  modal.classList.remove('hidden');
}

// Cerrar modal de categoría
function closeCategoryModal() {
  const modal = document.getElementById('category-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
  currentEditingCategory = null;
}

// Manejar envío del formulario
async function handleCategorySubmit(event: Event) {
  event.preventDefault();

  const form = event.target as HTMLFormElement;
  const formData = new FormData(form);

  const categoryData = {
    name: formData.get('name') as string,
    description: formData.get('description') as string,
    image_url: formData.get('image_url') as string,
    is_active: formData.get('is_active') === 'on',
  };

  try {
    if (currentEditingCategory) {
      // Actualizar categoría existente
      await productsService.updateCategory(
        currentEditingCategory.id,
        categoryData
      );
      console.log('✅ Categoría actualizada');
    } else {
      // Crear nueva categoría
      await productsService.createCategory(categoryData);
      console.log('✅ Categoría creada');
    }

    closeCategoryModal();
    loadCategories();
    showNotification('Categoría guardada exitosamente', 'success');
  } catch (error) {
    console.error('❌ Error guardando categoría:', error);
    showNotification('Error guardando categoría', 'error');
  }
}

// Aplicar filtros
function applyFilters() {
  const searchTerm =
    (
      document.getElementById('categories-search') as HTMLInputElement
    )?.value.toLowerCase() || '';
  const statusFilter = (
    document.getElementById('categories-status') as HTMLSelectElement
  )?.value;

  let filteredCategories = [...allCategories];

  // Filtro de búsqueda
  if (searchTerm) {
    filteredCategories = filteredCategories.filter(
      (category) =>
        category.name.toLowerCase().includes(searchTerm) ||
        category.description?.toLowerCase().includes(searchTerm)
    );
  }

  // Filtro de estado
  if (statusFilter !== '') {
    const isActive = statusFilter === 'true';
    filteredCategories = filteredCategories.filter(
      (category) => category.is_active === isActive
    );
  }

  // Renderizar categorías filtradas
  const originalCategories = allCategories;
  allCategories = filteredCategories;
  renderCategories();
  allCategories = originalCategories;
}

// Estados de la UI
function showLoadingState() {
  const tbody = document.getElementById('categories-table-body');
  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="px-6 py-4 text-center">
          <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-black"></div>
          <span class="ml-2 text-gray-600">Cargando categorías...</span>
        </td>
      </tr>
    `;
  }
}

function showErrorState(message: string) {
  const tbody = document.getElementById('categories-table-body');
  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="px-6 py-4 text-center text-red-600">
          <svg class="w-12 h-12 mx-auto mb-4 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/>
          </svg>
          <p class="font-medium">${message}</p>
          <button onclick="loadCategories()" class="mt-2 text-sm text-blue-600 hover:text-blue-700">Reintentar</button>
        </td>
      </tr>
    `;
  }
}

function showNotification(message: string, type: 'success' | 'error') {
  // Implementar sistema de notificaciones
  console.log(`${type.toUpperCase()}: ${message}`);
}

// Funciones globales para botones
(window as any).editCategory = async (categoryId: string) => {
  const category = allCategories.find((c) => c.id === categoryId);
  if (category) {
    openCategoryModal(category);
  }
};

(window as any).toggleCategoryStatus = async (categoryId: string) => {
  try {
    const category = allCategories.find((c) => c.id === categoryId);
    if (!category) return;

    await productsService.updateCategory(categoryId, {
      ...category,
      is_active: !category.is_active,
    });

    loadCategories();
    showNotification(
      `Categoría ${category.is_active ? 'desactivada' : 'activada'}`,
      'success'
    );
  } catch (error) {
    console.error('Error toggling category status:', error);
    showNotification('Error actualizando estado de la categoría', 'error');
  }
};

(window as any).deleteCategory = async (categoryId: string) => {
  const category = allCategories.find((c) => c.id === categoryId);
  if (!category) return;

  if (
    !confirm(
      `¿Estás seguro de que quieres eliminar la categoría "${category.name}"?`
    )
  ) {
    return;
  }

  try {
    await productsService.deleteCategory(categoryId);
    loadCategories();
    showNotification('Categoría eliminada exitosamente', 'success');
  } catch (error) {
    console.error('Error deleting category:', error);
    showNotification('Error eliminando categoría', 'error');
  }
};

(window as any).loadCategories = loadCategories;

// Función para probar desde la consola
(window as any).testCategoriesLoad = async function () {
  console.log('🧪 Testing categories load...');
  await loadCategories();
};

// Función para debug
(window as any).debugCategories = function () {
  console.log('🐛 Debug info:');
  console.log('- allCategories:', allCategories);
  console.log(
    '- categories-table-body:',
    document.getElementById('categories-table-body')
  );
  console.log(
    '- categories-content visible:',
    !document.getElementById('categories-content')?.classList.contains('hidden')
  );
  console.log('- Número de categorías:', allCategories.length);
};

// Utility functions
function debounce(func: Function, wait: number) {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
