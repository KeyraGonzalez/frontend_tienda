// Script para manejar el modal mejorado de productos con tabs
import { authService, adminService } from '../../utils/api/index';

// Variables globales del modal
let currentTab = 'basic';
let currentImages: File[] = [];

export function initProductModal() {
  setupTabNavigation();
  setupImageHandling();
  setupFormValidation();
  setupFormProgress();
  loadCategories(); // Agregar carga de categorías
}

function setupTabNavigation() {
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabPanels = document.querySelectorAll('.tab-panel');
  const prevBtn = document.getElementById('prev-tab-btn');
  const nextBtn = document.getElementById('next-tab-btn');

  const tabs = ['basic', 'images']; // Solo 2 pestañas ahora
  let currentTabIndex = 0;

  // Tab button navigation
  tabButtons.forEach((button, index) => {
    button.addEventListener('click', () => {
      switchToTab(tabs[index]);
      currentTabIndex = index;
      updateNavigationButtons();
    });
  });

  // Navigation buttons
  prevBtn?.addEventListener('click', () => {
    if (currentTabIndex > 0) {
      currentTabIndex--;
      switchToTab(tabs[currentTabIndex]);
      updateNavigationButtons();
    }
  });

  nextBtn?.addEventListener('click', () => {
    if (currentTabIndex < tabs.length - 1) {
      currentTabIndex++;
      switchToTab(tabs[currentTabIndex]);
      updateNavigationButtons();
    }
  });

  function switchToTab(tabName: string) {
    currentTab = tabName;

    // Update tab buttons
    tabButtons.forEach((btn) => {
      btn.classList.remove('active', 'border-black', 'text-black');
      btn.classList.add('border-transparent', 'text-gray-500');
    });

    const activeButton = document.querySelector(`[data-tab="${tabName}"]`);
    if (activeButton) {
      activeButton.classList.add('active', 'border-black', 'text-black');
      activeButton.classList.remove('border-transparent', 'text-gray-500');
    }

    // Update tab panels
    tabPanels.forEach((panel) => {
      panel.classList.add('hidden');
      panel.classList.remove('active');
    });

    const activePanel = document.getElementById(`tab-${tabName}`);
    if (activePanel) {
      activePanel.classList.remove('hidden');
      activePanel.classList.add('active');
    }

    updateFormProgress();
  }

  function updateNavigationButtons() {
    if (prevBtn && nextBtn) {
      (prevBtn as HTMLButtonElement).disabled = currentTabIndex === 0;
      (nextBtn as HTMLButtonElement).disabled =
        currentTabIndex === tabs.length - 1;

      if (currentTabIndex === tabs.length - 1) {
        nextBtn.textContent = 'Finalizar';
      } else {
        nextBtn.textContent = 'Siguiente →';
      }
    }
  }

  // Initialize first tab
  switchToTab('basic');
  updateNavigationButtons();
}

function setupImageHandling() {
  const imageInput = document.getElementById(
    'product-images'
  ) as HTMLInputElement;
  const imagePreview = document.getElementById('image-preview');

  if (!imageInput || !imagePreview) return;

  // Handle file selection
  imageInput.addEventListener('change', (e) => {
    const files = Array.from((e.target as HTMLInputElement).files || []);
    currentImages = [...currentImages, ...files];
    updateImagePreview();
  });

  // Handle drag and drop
  const uploadArea = imageInput.closest('.border-dashed');
  if (uploadArea) {
    uploadArea.addEventListener('dragover', (e: Event) => {
      e.preventDefault();
      uploadArea.classList.add('border-black', 'bg-gray-50');
    });

    uploadArea.addEventListener('dragleave', (e: Event) => {
      e.preventDefault();
      uploadArea.classList.remove('border-black', 'bg-gray-50');
    });

    uploadArea.addEventListener('drop', (e: Event) => {
      e.preventDefault();
      const dragEvent = e as DragEvent;
      uploadArea.classList.remove('border-black', 'bg-gray-50');

      const files = Array.from(dragEvent.dataTransfer?.files || []);
      const imageFiles = files.filter((file: File) =>
        file.type.startsWith('image/')
      );
      currentImages = [...currentImages, ...imageFiles];
      updateImagePreview();
    });
  }

  function updateImagePreview() {
    if (!imagePreview) return;

    if (currentImages.length === 0) {
      imagePreview.innerHTML = `
        <div class="flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-300 rounded-lg p-4">
          <span class="text-sm">Las imágenes aparecerán aquí</span>
        </div>
      `;
      return;
    }

    imagePreview.innerHTML = currentImages
      .map((file, index) => {
        const url = URL.createObjectURL(file);
        return `
        <div class="relative group">
          <img src="${url}" alt="Preview ${
          index + 1
        }" class="w-full h-24 object-cover rounded-lg border-2 border-black">
          <div class="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
            <button type="button" onclick="removeImage(${index})" class="bg-red-600 text-white p-2 rounded-full hover:bg-red-700 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
              </svg>
            </button>
          </div>
          ${
            index === 0
              ? '<div class="absolute top-1 left-1 bg-black text-white text-xs px-2 py-1 rounded">Principal</div>'
              : ''
          }
        </div>
      `;
      })
      .join('');
  }

  // Global function for removing images
  (window as any).removeImage = (index: number) => {
    currentImages.splice(index, 1);
    updateImagePreview();
    updateFormProgress();
  };
}

function setupFormValidation() {
  // Real-time validation for required fields
  const requiredFields = [
    'product-name',
    'product-price',
    'product-stock',
    'product-category',
  ];

  requiredFields.forEach((fieldId) => {
    const field = document.getElementById(fieldId) as HTMLInputElement;
    if (field) {
      field.addEventListener('input', updateFormProgress);
      field.addEventListener('blur', validateField);
    }
  });

  // Auto-generate SKU from product name
  const nameInput = document.getElementById('product-name') as HTMLInputElement;
  const skuInput = document.getElementById('product-sku') as HTMLInputElement;

  if (nameInput && skuInput) {
    nameInput.addEventListener('input', () => {
      if (!skuInput.value) {
        const sku = nameInput.value
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
        skuInput.value = sku.toUpperCase();
      }
    });
  }

  // Auto-generate slug from product name
  const slugInput = document.getElementById('product-slug') as HTMLInputElement;
  if (nameInput && slugInput) {
    nameInput.addEventListener('input', () => {
      if (!slugInput.value) {
        const slug = nameInput.value
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
        slugInput.value = slug;
      }
    });
  }

  // Character count for SEO fields
  const metaTitleInput = document.getElementById(
    'product-meta-title'
  ) as HTMLInputElement;
  const metaDescInput = document.getElementById(
    'product-meta-description'
  ) as HTMLTextAreaElement;

  if (metaTitleInput) {
    metaTitleInput.addEventListener('input', () => {
      const count = metaTitleInput.value.length;
      const counter = document.getElementById('meta-title-count');
      if (counter) {
        counter.textContent = count.toString();
        counter.style.color = count > 60 ? '#ef4444' : '#6b7280';
      }
    });
  }

  if (metaDescInput) {
    metaDescInput.addEventListener('input', () => {
      const count = metaDescInput.value.length;
      const counter = document.getElementById('meta-description-count');
      if (counter) {
        counter.textContent = count.toString();
        counter.style.color = count > 160 ? '#ef4444' : '#6b7280';
      }
    });
  }
}

function validateField(e: Event) {
  const field = e.target as HTMLInputElement;
  const isValid = field.checkValidity();

  if (!isValid) {
    field.classList.add('border-red-500');
    field.classList.remove('border-black');
  } else {
    field.classList.remove('border-red-500');
    field.classList.add('border-black');
  }
}

function setupFormProgress() {
  updateFormProgress();
}

function updateFormProgress() {
  const progressBar = document.getElementById('progress-bar');
  const progressText = document.getElementById('form-progress');

  if (!progressBar || !progressText) return;

  // Calculate completion percentage
  const requiredFields = [
    'product-name',
    'product-price',
    'product-stock',
    'product-category',
  ];

  let completedFields = 0;
  let totalFields = requiredFields.length;

  // Check required fields
  requiredFields.forEach((fieldId) => {
    const field = document.getElementById(fieldId) as HTMLInputElement;
    if (field && field.value.trim()) {
      completedFields++;
    }
  });

  // Check if images are uploaded
  if (currentImages.length > 0) {
    completedFields++;
    totalFields++;
  } else {
    totalFields++;
  }

  // Check optional but important fields
  const optionalFields = ['product-description', 'product-sku'];
  let optionalCompleted = 0;

  optionalFields.forEach((fieldId) => {
    const field = document.getElementById(fieldId) as HTMLInputElement;
    if (field && field.value.trim()) {
      optionalCompleted++;
    }
  });

  // Add bonus for optional fields
  const bonusPercentage = (optionalCompleted / optionalFields.length) * 20;
  const basePercentage = (completedFields / totalFields) * 80;
  const totalPercentage = Math.min(100, basePercentage + bonusPercentage);

  progressBar.style.width = `${totalPercentage}%`;
  progressText.textContent = `${Math.round(totalPercentage)}%`;

  // Change color based on completion
  if (totalPercentage < 50) {
    progressBar.className =
      'bg-red-500 h-2 rounded-full transition-all duration-300';
  } else if (totalPercentage < 80) {
    progressBar.className =
      'bg-yellow-500 h-2 rounded-full transition-all duration-300';
  } else {
    progressBar.className =
      'bg-green-500 h-2 rounded-full transition-all duration-300';
  }
}

// Función para cargar categorías en el select
async function loadCategories() {
  try {
    const categorySelect = document.getElementById(
      'product-category'
    ) as HTMLSelectElement;
    if (!categorySelect) {
      console.warn('No se encontró el select de categorías');
      return;
    }

    console.log('Cargando categorías para el modal de productos...');
    const response = await adminService.getCategories();
    console.log('Categorías recibidas:', response);

    if (response.success && response.categories) {
      // Limpiar opciones existentes excepto la primera
      categorySelect.innerHTML =
        '<option value="">Seleccionar categoría</option>';

      // Agregar categorías
      response.categories.forEach((category: any) => {
        if (category.is_active) {
          const option = document.createElement('option');
          option.value = category.id;
          option.textContent = category.name;
          categorySelect.appendChild(option);
        }
      });

      console.log(
        `Se cargaron ${response.categories.length} categorías en el modal`
      );
    } else {
      console.error('Error en la respuesta de categorías:', response);
    }
  } catch (error) {
    console.error('Error cargando categorías:', error);
  }
}

// Export functions for global use
export { setupImageHandling, updateFormProgress };
