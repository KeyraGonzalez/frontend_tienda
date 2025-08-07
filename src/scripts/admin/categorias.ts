import { authService, adminService } from '../../utils/api/index';

interface Category {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  product_count?: number;
}

let categories: Category[] = [];
let filteredCategories: Category[] = [];

export async function initializeCategoriesPage() {
  try {
    // Verificar autenticación y permisos de admin
    if (!authService.isAuthenticated()) {
      window.location.href = '/login';
      return;
    }

    if (!authService.isAdmin()) {
      showElement('access-denied');
      hideElement('loading');
      return;
    }

    // Mostrar el panel principal
    hideElement('loading');
    showElement('categories-panel');

    // Cargar datos iniciales
    await loadCategories();
    setupEventListeners();
  } catch (error) {
    console.error('Error initializing categories page:', error);
    showError('Error cargando la página de categorías');
  }
}

async function loadCategories() {
  try {
    showElement('categories-loading');
    hideElement('categories-empty');

    console.log('Cargando categorías...');
    const response = await adminService.getCategories();
    console.log('Respuesta recibida:', response);

    // Validación más robusta
    if (response && response.success && Array.isArray(response.categories)) {
      categories = response.categories;
    } else {
      console.warn(
        'Respuesta de categorías no válida, inicializando array vacío'
      );
      categories = [];
    }

    console.log('Categorías procesadas:', categories);

    filteredCategories = [...categories];

    updateStats();
    renderCategories();
  } catch (error) {
    console.error('Error loading categories:', error);
    showError('Error cargando las categorías');
  } finally {
    hideElement('categories-loading');
  }
}

function updateStats() {
  const totalCategories = categories.length;
  const activeCategories = categories.filter((cat) => cat.is_active).length;
  const categoriesWithProducts = categories.filter(
    (cat) => (cat.product_count || 0) > 0
  ).length;

  updateElement('total-categories', totalCategories.toString());
  updateElement('active-categories', activeCategories.toString());
  updateElement('categories-with-products', categoriesWithProducts.toString());
}

function renderCategories() {
  const container = document.getElementById('categories-grid')!;
  console.log('Renderizando categorías:', filteredCategories.length);

  if (filteredCategories.length === 0) {
    console.log('No hay categorías para mostrar');
    showElement('categories-empty');
    container.innerHTML = '';
    return;
  }

  console.log('Mostrando', filteredCategories.length, 'categorías');
  hideElement('categories-empty');

  container.innerHTML = filteredCategories
    .map(
      (category) => `
    <div class="bg-white rounded-lg shadow-sm border-2 border-black overflow-hidden hover:shadow-lg transition-shadow">
      <div class="aspect-w-16 aspect-h-9 bg-gray-100">
        ${
          category.image_url
            ? `<img src="${category.image_url}" alt="${category.name}" class="w-full h-32 object-cover">`
            : `<div class="w-full h-32 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
               <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
               </svg>
             </div>`
        }
      </div>
      
      <div class="p-4">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-lg font-bold text-black tracking-wide uppercase truncate">${
            category.name
          }</h3>
          <span class="px-2 py-1 rounded-full text-xs font-bold tracking-wide uppercase ${
            category.is_active
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }">
            ${category.is_active ? 'Activa' : 'Inactiva'}
          </span>
        </div>
        
        ${
          category.description
            ? `<p class="text-sm text-gray-600 mb-3 line-clamp-2">${category.description}</p>`
            : ''
        }
        
        <div class="flex items-center justify-between text-xs text-gray-500 mb-4">
          <span>${category.product_count || 0} productos</span>
          <span>Creada: ${formatDate(category.created_at)}</span>
        </div>
        
        <div class="flex space-x-2">
          <button onclick="editCategory('${category.id}')" 
                  class="flex-1 bg-black text-white px-3 py-2 rounded-lg text-xs font-bold tracking-wide uppercase hover:bg-gray-800 transition-colors">
            <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Editar
          </button>
          <button onclick="deleteCategory('${category.id}', '${
        category.name
      }')" 
                  class="px-3 py-2 border-2 border-red-600 text-red-600 rounded-lg text-xs font-bold tracking-wide uppercase hover:bg-red-50 transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  `
    )
    .join('');
}

function setupEventListeners() {
  // Botón añadir categoría
  document.getElementById('add-category-btn')?.addEventListener('click', () => {
    openCategoryModal();
  });

  // Botón filtrar
  document
    .getElementById('categories-filter-btn')
    ?.addEventListener('click', () => {
      applyFilters();
    });

  // Búsqueda en tiempo real
  document
    .getElementById('categories-search')
    ?.addEventListener('input', () => {
      applyFilters();
    });

  // Estado filter
  document
    .getElementById('categories-status')
    ?.addEventListener('change', () => {
      applyFilters();
    });

  // Modal events
  document
    .getElementById('close-category-modal')
    ?.addEventListener('click', () => {
      closeCategoryModal();
    });

  document
    .getElementById('cancel-category-btn')
    ?.addEventListener('click', () => {
      closeCategoryModal();
    });

  // Form submit
  document
    .getElementById('category-form')
    ?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await saveCategory();
    });

  // Image upload
  document.getElementById('category-image')?.addEventListener('change', (e) => {
    handleImageUpload(e as InputEvent);
  });

  document.getElementById('remove-image-btn')?.addEventListener('click', () => {
    removeImage();
  });

  // Delete modal
  document
    .getElementById('cancel-delete-btn')
    ?.addEventListener('click', () => {
      closeDeleteModal();
    });

  document
    .getElementById('confirm-delete-btn')
    ?.addEventListener('click', async () => {
      await confirmDelete();
    });
}

function applyFilters() {
  const searchTerm =
    (
      document.getElementById('categories-search') as HTMLInputElement
    )?.value?.toLowerCase() || '';
  const statusFilter =
    (document.getElementById('categories-status') as HTMLSelectElement)
      ?.value || '';

  filteredCategories = categories.filter((category) => {
    const matchesSearch =
      category.name.toLowerCase().includes(searchTerm) ||
      (category.description &&
        category.description.toLowerCase().includes(searchTerm));

    const matchesStatus =
      statusFilter === '' ||
      (statusFilter === 'true' && category.is_active) ||
      (statusFilter === 'false' && !category.is_active);

    return matchesSearch && matchesStatus;
  });

  renderCategories();
}

function openCategoryModal(category?: Category) {
  const modal = document.getElementById('category-modal')!;
  const title = document.getElementById('category-modal-title')!;
  const form = document.getElementById('category-form') as HTMLFormElement;

  if (category) {
    title.textContent = 'Editar Categoría';
    populateForm(category);
  } else {
    title.textContent = 'Añadir Categoría';
    form.reset();
    (document.getElementById('category-active') as HTMLInputElement).checked =
      true;
    resetImagePreview();
  }

  showElement('category-modal');
}

function populateForm(category: Category) {
  (document.getElementById('category-id') as HTMLInputElement).value =
    category.id;
  (document.getElementById('category-name') as HTMLInputElement).value =
    category.name;
  (
    document.getElementById('category-description') as HTMLTextAreaElement
  ).value = category.description || '';
  (document.getElementById('category-active') as HTMLInputElement).checked =
    category.is_active;

  if (category.image_url) {
    showImagePreview(category.image_url);
  } else {
    resetImagePreview();
  }
}

function closeCategoryModal() {
  hideElement('category-modal');
  const form = document.getElementById('category-form') as HTMLFormElement;
  form.reset();
  resetImagePreview();
}

async function saveCategory() {
  try {
    const form = document.getElementById('category-form') as HTMLFormElement;
    const formData = new FormData(form);

    const categoryId = formData.get('id') as string;
    const isEdit = !!categoryId;

    // Preparar datos
    const categoryData = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      is_active: formData.has('is_active'),
    };

    // Manejar imagen si se subió una nueva
    const imageFile = (
      document.getElementById('category-image') as HTMLInputElement
    ).files?.[0];
    if (imageFile) {
      // Aquí deberías subir la imagen a Cloudinary
      // categoryData.image_url = await uploadImageToCloudinary(imageFile);
    }

    let result;
    if (isEdit) {
      result = await adminService.updateCategory(categoryId, categoryData);
    } else {
      result = await adminService.createCategory(categoryData);
    }

    if (result.success) {
      showSuccess(
        isEdit
          ? 'Categoría actualizada exitosamente'
          : 'Categoría creada exitosamente'
      );
      closeCategoryModal();
      await loadCategories();
    } else {
      showError(result.error || 'Error al guardar la categoría');
    }
  } catch (error) {
    console.error('Error saving category:', error);
    showError('Error al guardar la categoría');
  }
}

function handleImageUpload(event: InputEvent) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      showImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }
}

function showImagePreview(src: string) {
  const uploadArea = document.getElementById('image-upload-area')!;
  const previewArea = document.getElementById('image-preview-area')!;
  const preview = document.getElementById(
    'category-image-preview'
  ) as HTMLImageElement;

  preview.src = src;
  hideElement('image-upload-area');
  showElement('image-preview-area');
}

function removeImage() {
  resetImagePreview();
  (document.getElementById('category-image') as HTMLInputElement).value = '';
}

function resetImagePreview() {
  const uploadArea = document.getElementById('image-upload-area')!;
  const previewArea = document.getElementById('image-preview-area')!;

  showElement('image-upload-area');
  hideElement('image-preview-area');
}

// Global functions for buttons
(window as any).editCategory = async (categoryId: string) => {
  if (!Array.isArray(categories)) {
    console.error('Categories is not an array:', categories);
    return;
  }

  const category = categories.find((c) => c.id === categoryId);
  if (category) {
    openCategoryModal(category);
  }
};

let categoryToDelete: string | null = null;

(window as any).deleteCategory = (categoryId: string, categoryName: string) => {
  categoryToDelete = categoryId;
  document.getElementById(
    'delete-message'
  )!.textContent = `¿Estás seguro de que quieres eliminar la categoría "${categoryName}"?`;
  showElement('delete-modal');
};

function closeDeleteModal() {
  hideElement('delete-modal');
  categoryToDelete = null;
}

async function confirmDelete() {
  if (!categoryToDelete) return;

  try {
    const result = await adminService.deleteCategory(categoryToDelete);

    if (result.success) {
      showSuccess('Categoría eliminada exitosamente');
      closeDeleteModal();
      await loadCategories();
    } else {
      showError(result.error || 'Error al eliminar la categoría');
    }
  } catch (error) {
    console.error('Error deleting category:', error);
    showError('Error al eliminar la categoría');
  }
}

// Utility functions
function showElement(id: string) {
  const element = document.getElementById(id);
  if (element) {
    element.classList.remove('hidden');
  }
}

function hideElement(id: string) {
  const element = document.getElementById(id);
  if (element) {
    element.classList.add('hidden');
  }
}

function updateElement(id: string, content: string) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = content;
  }
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function showSuccess(message: string) {
  const toast = document.createElement('div');
  toast.className =
    'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-opacity duration-300 font-bold tracking-wide uppercase';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function showError(message: string) {
  const toast = document.createElement('div');
  toast.className =
    'fixed top-4 right-4 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-opacity duration-300 font-bold tracking-wide uppercase';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
