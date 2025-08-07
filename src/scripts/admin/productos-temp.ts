// Scripts para la gestión de productos en el panel de administración
import { authService, productsService } from '../../utils/api/index';

// Estado de la aplicación para productos
let currentPage = 1;
let currentFilters: any = {};
let currentUser: any = null;
let tempImages: any[] = [];
let currentEditingProduct: any = null;

// Función de inicialización
export async function initializeProductosPage() {
  const loadingEl = document.getElementById('loading');
  const accessDeniedEl = document.getElementById('access-denied');
  const productsPanelEl = document.getElementById('products-panel');

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

    // Inicializar UI de gestión de productos
    setupEventListeners();
    await loadProducts();
    await loadProductStats();
    await loadCategories();

    loadingEl?.classList.add('hidden');
    productsPanelEl?.classList.remove('hidden');
  } catch (error) {
    console.error('Error initializing products page:', error);
    loadingEl?.classList.add('hidden');
    accessDeniedEl?.classList.remove('hidden');
  }
}

// Configurar event listeners
function setupEventListeners() {
  // Filtros
  const filterBtn = document.getElementById('products-filter-btn');
  filterBtn?.addEventListener('click', loadProducts);

  // Botón agregar producto
  const addBtn = document.getElementById('add-product-btn');
  addBtn?.addEventListener('click', () => showProductModal());

  // Modal eventos
  const modal = document.getElementById('product-modal');
  const closeModalBtn = document.getElementById('close-product-modal');
  const cancelBtn = document.getElementById('cancel-product-btn');
  const form = document.getElementById('product-form');

  closeModalBtn?.addEventListener('click', hideProductModal);
  cancelBtn?.addEventListener('click', hideProductModal);
  form?.addEventListener('submit', handleProductSubmit);

  // Upload de imágenes
  const imageInput = document.getElementById('product-images');
  imageInput?.addEventListener('change', handleImageUpload);

  // Búsqueda en tiempo real
  const searchInput = document.getElementById('products-search');
  if (searchInput) {
    let timeout: NodeJS.Timeout;
    searchInput.addEventListener('input', () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        loadProducts();
      }, 500);
    });
  }
}

async function loadProducts() {
  const tableBody = document.getElementById('products-table-body');
  if (!tableBody) return;

  try {
    tableBody.innerHTML =
      '<tr><td colspan="7" class="px-6 py-4 text-center">Cargando productos...</td></tr>';

    // Obtener filtros
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
    if (search.trim()) filters.search = search.trim();
    if (category) filters.category = category;
    // Removemos el filtro de status por ahora para evitar errores de validación
    // if (status !== '') filters.is_active = status === 'true';

    console.log('🔍 Loading products with filters:', filters);
    const response = await productsService.getProducts(filters);

    console.log('📦 Full products response:', response);
    console.log('📦 Response data:', response.data);
    console.log('📦 Response products:', response.products);

    // El backend devuelve 'products' pero ahora lo normalizamos en el servicio
    const products = response.data || [];

    if (!products || products.length === 0) {
      console.log('❌ No products found - products array is empty or null');
      tableBody.innerHTML =
        '<tr><td colspan="7" class="px-6 py-4 text-center text-neutral-500">No se encontraron productos</td></tr>';
      return;
    }

    tableBody.innerHTML = products
      .map(
        (product: any) => `
      <tr class="hover:bg-neutral-50">
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="flex items-center">
            <img src="${
              product.product_images?.[0]?.image_url || '/placeholder.jpg'
            }" 
                 alt="${product.name}" 
                 class="w-12 h-12 rounded-lg object-cover mr-3">
            <div>
              <div class="text-sm font-medium text-neutral-900">${
                product.name
              }</div>
              <div class="text-sm text-neutral-500">${
                product.sku || 'Sin SKU'
              }</div>
            </div>
          </div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
          ${product.categories?.name || 'Sin categoría'}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-neutral-900 font-medium">
          $${parseFloat(product.price).toFixed(2)}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
          <span class="${
            product.stock_quantity <= 5 ? 'text-red-600 font-medium' : ''
          }">
            ${product.stock_quantity}
          </span>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            product.featured
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-neutral-100 text-neutral-800'
          }">
            ${product.featured ? 'Destacado' : 'Normal'}
          </span>
        </td>
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
          <div class="flex space-x-2">
            <button onclick="editProduct('${product.id}')" 
                    class="text-indigo-600 hover:text-indigo-900 transition-colors">
              Editar
            </button>
            <button onclick="viewProductImages('${product.id}')" 
                    class="text-blue-600 hover:text-blue-900 transition-colors">
              Imágenes
            </button>
            <button onclick="toggleProductStatus('${product.id}', ${
          product.is_active
        })" 
                    class="text-yellow-600 hover:text-yellow-900 transition-colors">
              ${product.is_active ? 'Desactivar' : 'Activar'}
            </button>
            <button onclick="deleteProduct('${product.id}')" 
                    class="text-red-600 hover:text-red-900 transition-colors">
              Eliminar
            </button>
          </div>
        </td>
      </tr>
    `
      )
      .join('');

    updatePagination(response.pagination);
  } catch (error) {
    console.error('Error loading products:', error);
    tableBody.innerHTML =
      '<tr><td colspan="7" class="px-6 py-4 text-center text-red-500">Error al cargar productos</td></tr>';
    showToast('Error al cargar productos', 'error');
  }
}

async function loadProductStats() {
  try {
    console.log('🔍 Loading product stats...');

    // Obtener estadísticas básicas con el límite máximo permitido
    const response = await productsService.getProducts({
      page: 1,
      limit: 100, // Máximo permitido por el backend
    });

    console.log('📊 Product stats response:', response);
    const products = response.data || [];

    // Total productos (usar el valor de paginación que incluye todos)
    const totalEl = document.getElementById('total-products');
    if (totalEl) {
      totalEl.textContent = response.pagination?.total?.toString() || '0';
    }

    // Productos activos (usar el total de la paginación)
    const activeEl = document.getElementById('active-products');
    if (activeEl) {
      const activeCount = products.filter(
        (product: any) => product.is_active !== false
      ).length;
      activeEl.textContent =
        response.pagination?.total?.toString() || activeCount.toString();
    }

    // Productos con stock bajo (productos con stock <= 10)
    const lowStockEl = document.getElementById('low-stock-products');
    if (lowStockEl) {
      const lowStockCount = products.filter(
        (product: any) => product.stock_quantity && product.stock_quantity <= 10
      ).length;
      lowStockEl.textContent = lowStockCount.toString();
    }

    // Productos destacados
    const featuredEl = document.getElementById('featured-products');
    if (featuredEl) {
      const featuredCount = products.filter(
        (product: any) => product.featured === true
      ).length;
      featuredEl.textContent = featuredCount.toString();
    }
  } catch (error) {
    console.error('Error loading product stats:', error);

    // Valores por defecto en caso de error
    const elements = [
      'total-products',
      'active-products',
      'low-stock-products',
      'featured-products',
    ];

    elements.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = '0';
    });
  }
}

async function loadCategories() {
  try {
    console.log('🔍 Loading categories...');
    const response = await productsService.getCategories();
    console.log('🔍 Categories response:', response);

    // Llenar select de filtro
    const filterSelect = document.getElementById(
      'products-category'
    ) as HTMLSelectElement;
    if (filterSelect) {
      filterSelect.innerHTML = '<option value="">Todas las categorías</option>';
      if (response && Array.isArray(response)) {
        response.forEach((category: any) => {
          filterSelect.innerHTML += `<option value="${category.id}">${category.name}</option>`;
        });
      }
    }

    // Llenar select del modal
    const modalSelect = document.getElementById(
      'product-category'
    ) as HTMLSelectElement;
    if (modalSelect) {
      modalSelect.innerHTML = '<option value="">Seleccionar categoría</option>';
      if (response && Array.isArray(response)) {
        response.forEach((category: any) => {
          modalSelect.innerHTML += `<option value="${category.id}">${category.name}</option>`;
        });
      }
    }
  } catch (error) {
    console.error('Error loading categories:', error);
    // Agregar opciones por defecto en caso de error
    const selects = ['products-category', 'product-category'];
    selects.forEach((selectId) => {
      const select = document.getElementById(selectId) as HTMLSelectElement;
      if (select) {
        select.innerHTML = `
          <option value="">Todas las categorías</option>
          <option value="ropa">Ropa</option>
          <option value="accesorios">Accesorios</option>
          <option value="zapatos">Zapatos</option>
        `;
      }
    });
  }
}

function showProductModal(product?: any) {
  const modal = document.getElementById('product-modal');
  const title = document.getElementById('product-modal-title');
  const form = document.getElementById('product-form') as HTMLFormElement;

  if (!modal || !title || !form) return;

  currentEditingProduct = product;
  tempImages = [];

  // Configurar título
  title.textContent = product ? 'Editar Producto' : 'Crear Producto';

  // Limpiar formulario
  form.reset();
  clearImagePreview();

  // Si es edición, llenar campos
  if (product) {
    (document.getElementById('product-id') as HTMLInputElement).value =
      product.id;
    (document.getElementById('product-name') as HTMLInputElement).value =
      product.name || '';
    (
      document.getElementById('product-description') as HTMLTextAreaElement
    ).value = product.description || '';
    (document.getElementById('product-price') as HTMLInputElement).value =
      product.price || '';
    (document.getElementById('product-category') as HTMLSelectElement).value =
      product.category_id || '';
    (document.getElementById('product-stock') as HTMLInputElement).value =
      product.stock_quantity || '';
    (document.getElementById('product-sku') as HTMLInputElement).value =
      product.sku || '';
    (document.getElementById('product-weight') as HTMLInputElement).value =
      product.weight || '';
    (document.getElementById('product-featured') as HTMLInputElement).checked =
      product.featured || false;
    (document.getElementById('product-active') as HTMLInputElement).checked =
      product.is_active !== false;

    // Cargar imágenes existentes
    if (product.product_images) {
      displayExistingImages(product.product_images);
    }
  }

  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function hideProductModal() {
  const modal = document.getElementById('product-modal');
  if (modal) {
    modal.classList.add('hidden');
    document.body.style.overflow = 'auto';
    currentEditingProduct = null;
    tempImages = [];
    clearImagePreview();
  }
}

async function handleProductSubmit(e: Event) {
  e.preventDefault();

  const form = e.target as HTMLFormElement;
  const formData = new FormData(form);
  const saveBtn = document.getElementById(
    'save-product-btn'
  ) as HTMLButtonElement;

  if (!saveBtn) return;

  try {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Guardando...';

    const productData: any = {
      name: formData.get('name'),
      description: formData.get('description'),
      price: parseFloat(formData.get('price') as string),
      category_id: formData.get('category_id'),
      stock_quantity: parseInt(formData.get('stock_quantity') as string),
      sku: formData.get('sku'),
      weight: formData.get('weight')
        ? parseFloat(formData.get('weight') as string)
        : undefined,
      featured: formData.get('featured') === 'on',
    };

    let product;
    if (currentEditingProduct) {
      // Actualizar producto existente
      product = await productsService.updateProduct(
        currentEditingProduct.id,
        productData
      );
      showToast('Producto actualizado correctamente', 'success');
    } else {
      // Crear nuevo producto
      product = await productsService.createProduct(productData);
      showToast('Producto creado correctamente', 'success');
    }

    // Subir imágenes si hay
    if (tempImages.length > 0) {
      await uploadProductImages(product.id);
    }

    hideProductModal();
    await loadProducts();
    await loadProductStats();
  } catch (error) {
    console.error('Error saving product:', error);
    showToast('Error al guardar el producto', 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Guardar';
  }
}

async function handleImageUpload(e: Event) {
  const input = e.target as HTMLInputElement;
  const files = input.files;

  if (!files || files.length === 0) return;

  const preview = document.getElementById('image-preview');
  if (!preview) return;

  try {
    showToast('Subiendo imágenes...', 'info');

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        showToast(`${file.name} no es una imagen válida`, 'error');
        continue;
      }

      // Validar tamaño (5MB)
      if (file.size > 5 * 1024 * 1024) {
        showToast(`${file.name} excede el tamaño máximo de 5MB`, 'error');
        continue;
      }

      // Crear preview
      const imageContainer = document.createElement('div');
      imageContainer.className = 'relative group';

      const img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      img.className =
        'w-20 h-20 object-cover rounded-lg border border-neutral-200';

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className =
        'absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity';
      removeBtn.innerHTML = '×';
      removeBtn.onclick = () => {
        tempImages = tempImages.filter((img) => img.file !== file);
        imageContainer.remove();
      };

      imageContainer.appendChild(img);
      imageContainer.appendChild(removeBtn);
      preview.appendChild(imageContainer);

      // Agregar a tempImages
      tempImages.push({
        file,
        preview: img.src,
        name: file.name,
        size: file.size,
      });
    }

    showToast(`${files.length} imagen(es) preparada(s) para subir`, 'success');
  } catch (error) {
    console.error('Error handling image upload:', error);
    showToast('Error al procesar las imágenes', 'error');
  }

  // Limpiar input
  input.value = '';
}

async function uploadProductImages(productId: string) {
  if (tempImages.length === 0) return;

  try {
    console.log('📤 Starting upload process for', tempImages.length, 'images');

    // Extraer archivos de tempImages
    const files = tempImages.map((img) => img.file);

    // Subir imágenes temporales usando el servicio
    const uploadResult = await productsService.uploadTempImages(files);

    // Vincular imágenes al producto
    const linkResult = await productsService.linkImagesToProduct(
      productId,
      uploadResult.images
    );

    console.log('✅ Image upload and linking completed successfully');
    showToast('Imágenes subidas correctamente', 'success');
  } catch (error) {
    console.error('Error uploading images:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Error desconocido';
    showToast('Error al subir las imágenes: ' + errorMessage, 'error');
  }
}

function displayExistingImages(images: any[]) {
  const preview = document.getElementById('image-preview');
  if (!preview) return;

  images.forEach((image) => {
    const imageContainer = document.createElement('div');
    imageContainer.className = 'relative group';

    const img = document.createElement('img');
    img.src = image.image_url;
    img.className =
      'w-20 h-20 object-cover rounded-lg border border-neutral-200';

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className =
      'absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity';
    removeBtn.innerHTML = '×';
    removeBtn.onclick = () => deleteProductImage(image.id, imageContainer);

    const primaryBadge = document.createElement('div');
    if (image.is_primary) {
      primaryBadge.className =
        'absolute top-1 left-1 bg-blue-500 text-white text-xs px-1 rounded';
      primaryBadge.textContent = 'Principal';
      imageContainer.appendChild(primaryBadge);
    }

    imageContainer.appendChild(img);
    imageContainer.appendChild(removeBtn);
    preview.appendChild(imageContainer);
  });
}

async function deleteProductImage(imageId: string, container: HTMLElement) {
  if (!confirm('¿Estás seguro de que quieres eliminar esta imagen?')) return;

  try {
    // Usar el servicio para eliminar la imagen
    await productsService.deleteImage(imageId);

    container.remove();
    showToast('Imagen eliminada correctamente', 'success');
  } catch (error) {
    console.error('Error deleting image:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Error desconocido';
    showToast('Error al eliminar la imagen: ' + errorMessage, 'error');
  }
}

function clearImagePreview() {
  const preview = document.getElementById('image-preview');
  if (preview) {
    preview.innerHTML = '';
  }
}

function updatePagination(pagination: any) {
  const paginationEl = document.getElementById('products-pagination');
  if (!paginationEl || !pagination) return;

  const { page, totalPages, total } = pagination;

  paginationEl.innerHTML = `
    <div class="text-sm text-neutral-700">
      Mostrando ${(page - 1) * 10 + 1} a ${Math.min(
    page * 10,
    total
  )} de ${total} productos
    </div>
    <div class="flex space-x-2">
      <button onclick="changeProductPage(${page - 1})" 
              ${page <= 1 ? 'disabled' : ''} 
              class="px-3 py-1 border rounded text-sm ${
                page <= 1
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-neutral-50'
              }">
        Anterior
      </button>
      <span class="px-3 py-1 text-sm">${page} de ${totalPages}</span>
      <button onclick="changeProductPage(${page + 1})" 
              ${page >= totalPages ? 'disabled' : ''} 
              class="px-3 py-1 border rounded text-sm ${
                page >= totalPages
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-neutral-50'
              }">
        Siguiente
      </button>
    </div>
  `;
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

// Funciones globales para las acciones
declare global {
  interface Window {
    changeProductPage: (page: number) => void;
    editProduct: (productId: string) => void;
    viewProductImages: (productId: string) => void;
    toggleProductStatus: (productId: string, currentStatus: boolean) => void;
    deleteProduct: (productId: string) => Promise<void>;
  }
}

window.changeProductPage = function (page: number) {
  currentPage = page;
  loadProducts();
};

window.editProduct = async function (productId: string) {
  try {
    const product = await productsService.getProductById(productId);
    showProductModal(product);
  } catch (error) {
    console.error('Error loading product:', error);
    showToast('Error al cargar el producto', 'error');
  }
};

window.viewProductImages = function (productId: string) {
  // TODO: Implementar modal de vista de imágenes
  showToast(`Ver imágenes del producto ${productId}`, 'info');
};

window.toggleProductStatus = async function (
  productId: string,
  currentStatus: boolean
) {
  const action = currentStatus ? 'desactivar' : 'activar';
  if (!confirm(`¿Estás seguro de que quieres ${action} este producto?`)) return;

  try {
    await productsService.updateProduct(productId, {
      is_active: !currentStatus,
    });
    showToast(`Producto ${action}do correctamente`, 'success');
    loadProducts();
    loadProductStats();
  } catch (error) {
    console.error('Error toggling product status:', error);
    showToast(`Error al ${action} el producto`, 'error');
  }
};

window.deleteProduct = async function (productId: string) {
  if (
    !confirm(
      '¿Estás seguro de que quieres eliminar este producto? Esta acción no se puede deshacer.'
    )
  )
    return;

  try {
    await productsService.deleteProduct(productId);
    showToast('Producto eliminado correctamente', 'success');
    loadProducts();
    loadProductStats();
  } catch (error) {
    console.error('Error deleting product:', error);
    showToast('Error al eliminar el producto', 'error');
  }
};
