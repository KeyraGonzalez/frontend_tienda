import { PRODUCTS_ENDPOINTS, UPLOADS_ENDPOINTS } from './endpoints';
import type {
  Product,
  ProductFilters,
  Category,
  Review,
  PaginatedResponse,
} from '../../types/types';
import { authService } from './auth';

class ProductsService {
  private getAuthHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    const token = authService.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  // Obtener lista de productos con filtros
  async getProducts(
    filters?: ProductFilters
  ): Promise<PaginatedResponse<Product>> {
    try {
      const queryParams = new URLSearchParams();

      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, value.toString());
          }
        });
      }

      const url = `${PRODUCTS_ENDPOINTS.list}?${queryParams.toString()}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error obteniendo productos');
      }

      // Normalizar la respuesta: el backend devuelve 'products' pero el frontend espera 'data'
      if (data.products && !data.data) {
        data.data = data.products;
      }

      console.log('🔧 Normalized products response:', data);
      return data;
    } catch (error) {
      console.error('Get products error:', error);
      throw error;
    }
  }

  // Obtener producto por ID
  async getProductById(id: string): Promise<Product> {
    try {
      const response = await fetch(PRODUCTS_ENDPOINTS.getById(id), {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error obteniendo producto');
      }

      return data;
    } catch (error) {
      console.error('Get product by ID error:', error);
      throw error;
    }
  }

  // Obtener productos destacados
  async getFeaturedProducts(): Promise<Product[]> {
    try {
      const response = await fetch(PRODUCTS_ENDPOINTS.featured, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error obteniendo productos destacados');
      }

      return data;
    } catch (error) {
      console.error('Get featured products error:', error);
      throw error;
    }
  }

  // Buscar productos
  async searchProducts(query: string): Promise<Product[]> {
    try {
      const response = await fetch(
        `${PRODUCTS_ENDPOINTS.search}?q=${encodeURIComponent(query)}`,
        {
          method: 'GET',
          headers: this.getAuthHeaders(),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error buscando productos');
      }

      return data;
    } catch (error) {
      console.error('Search products error:', error);
      throw error;
    }
  }

  // Obtener productos relacionados
  async getRelatedProducts(productId: string): Promise<Product[]> {
    try {
      const response = await fetch(PRODUCTS_ENDPOINTS.related(productId), {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || 'Error obteniendo productos relacionados'
        );
      }

      return data;
    } catch (error) {
      console.error('Get related products error:', error);
      throw error;
    }
  }

  // Obtener categorías
  async getCategories(): Promise<Category[]> {
    try {
      const response = await fetch(PRODUCTS_ENDPOINTS.categories, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      const data = await response.json();
      console.log('🔧 Raw categories response:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Error obteniendo categorías');
      }

      // Manejar diferentes estructuras de respuesta
      let categories: Category[] = [];
      if (Array.isArray(data)) {
        categories = data;
      } else if (data.categories) {
        categories = data.categories;
      } else if (data.data) {
        categories = data.data;
      }

      console.log('🔧 Processed categories:', categories);
      return categories;
    } catch (error) {
      console.error('Get categories error:', error);
      return []; // Return empty array as fallback
    }
  }

  // Crear producto (admin)
  async createProduct(productData: Partial<Product>): Promise<Product> {
    try {
      const response = await fetch(PRODUCTS_ENDPOINTS.create, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(productData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error creando producto');
      }

      return data.product;
    } catch (error) {
      console.error('Create product error:', error);
      throw error;
    }
  }

  // Actualizar producto (admin)
  async updateProduct(
    id: string,
    productData: Partial<Product>
  ): Promise<Product> {
    try {
      const response = await fetch(PRODUCTS_ENDPOINTS.update(id), {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(productData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error actualizando producto');
      }

      return data.product;
    } catch (error) {
      console.error('Update product error:', error);
      throw error;
    }
  }

  // Eliminar producto (admin)
  async deleteProduct(id: string): Promise<void> {
    try {
      const response = await fetch(PRODUCTS_ENDPOINTS.delete(id), {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error eliminando producto');
      }
    } catch (error) {
      console.error('Delete product error:', error);
      throw error;
    }
  }

  // Obtener reseñas de producto
  async getProductReviews(productId: string): Promise<Review[]> {
    try {
      const response = await fetch(PRODUCTS_ENDPOINTS.reviews(productId), {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error obteniendo reseñas');
      }

      return data;
    } catch (error) {
      console.error('Get product reviews error:', error);
      throw error;
    }
  }

  // Crear reseña
  async createReview(
    productId: string,
    reviewData: { rating: number; comment: string }
  ): Promise<Review> {
    try {
      const response = await fetch(PRODUCTS_ENDPOINTS.createReview(productId), {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(reviewData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error creando reseña');
      }

      return data.review;
    } catch (error) {
      console.error('Create review error:', error);
      throw error;
    }
  }

  // Crear categoría (admin)
  async createCategory(categoryData: Partial<Category>): Promise<Category> {
    try {
      const response = await fetch(PRODUCTS_ENDPOINTS.createCategory, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(categoryData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error creando categoría');
      }

      return data.category;
    } catch (error) {
      console.error('Create category error:', error);
      throw error;
    }
  }

  // Actualizar categoría (admin)
  async updateCategory(
    categoryId: string,
    categoryData: Partial<Category>
  ): Promise<Category> {
    try {
      const response = await fetch(
        PRODUCTS_ENDPOINTS.updateCategory(categoryId),
        {
          method: 'PUT',
          headers: this.getAuthHeaders(),
          body: JSON.stringify(categoryData),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error actualizando categoría');
      }

      return data.category;
    } catch (error) {
      console.error('Update category error:', error);
      throw error;
    }
  }

  // Eliminar categoría (admin)
  async deleteCategory(
    categoryId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(
        PRODUCTS_ENDPOINTS.deleteCategory(categoryId),
        {
          method: 'DELETE',
          headers: this.getAuthHeaders(),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error eliminando categoría');
      }

      return data;
    } catch (error) {
      console.error('Delete category error:', error);
      throw error;
    }
  }

  // ===== MÉTODOS ADICIONALES PARA ADMINISTRADORES =====

  // Obtener productos para administración (con filtros admin)
  async getAdminProducts(filters?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    status?: string;
  }): Promise<PaginatedResponse<Product>> {
    try {
      const queryParams = new URLSearchParams();

      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, value.toString());
          }
        });
      }

      const url = `${PRODUCTS_ENDPOINTS.adminList}?${queryParams.toString()}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error obteniendo productos');
      }

      return data;
    } catch (error) {
      console.error('Get admin products error:', error);
      throw error;
    }
  }

  // ===== MÉTODOS DE GESTIÓN DE IMÁGENES =====

  // Subir imágenes directamente al producto
  async uploadDirectToProduct(
    productId: string,
    files: File[]
  ): Promise<{
    message: string;
    images: Array<{
      id: string;
      url: string;
      publicId: string;
      originalName: string;
      size: number;
    }>;
  }> {
    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('images', file);
      });

      console.log(
        '📤 Uploading',
        files.length,
        'images directly to product:',
        productId
      );
      console.log(
        '📍 Endpoint URL:',
        UPLOADS_ENDPOINTS.uploadDirectToProduct(productId)
      );

      // Para FormData, solo incluir Authorization header, no Content-Type
      const headers: HeadersInit = {};
      const token = authService.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      console.log('🔑 Token available:', !!token);
      console.log(
        '🔑 Token value (first 10 chars):',
        token ? token.substring(0, 10) + '...' : 'null'
      );

      const response = await fetch(
        UPLOADS_ENDPOINTS.uploadDirectToProduct(productId),
        {
          method: 'POST',
          headers,
          body: formData,
        }
      );

      console.log('📤 Response status:', response.status);

      const data = await response.json();
      console.log('📤 Response data:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Error subiendo imágenes al producto');
      }

      console.log('✅ Upload direct to product successful:', data);
      return data;
    } catch (error) {
      console.error('Upload direct to product error:', error);
      throw error;
    }
  }

  // Subir imágenes temporales
  async uploadTempImages(files: File[]): Promise<{
    message: string;
    images: Array<{
      id: string;
      url: string;
      publicId: string;
      originalName: string;
      size: number;
    }>;
  }> {
    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('images', file);
      });

      console.log('📤 Uploading', files.length, 'images to temp endpoint...');
      console.log('📍 Endpoint URL:', UPLOADS_ENDPOINTS.tempImages);

      // Para FormData no se debe incluir Content-Type header
      // El navegador lo establece automáticamente con el boundary correcto
      const response = await fetch(UPLOADS_ENDPOINTS.tempImages, {
        method: 'POST',
        body: formData,
      });

      console.log('📤 Response status:', response.status);

      const data = await response.json();
      console.log('📤 Response data:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Error subiendo imágenes');
      }

      console.log('✅ Upload successful:', data);
      return data;
    } catch (error) {
      console.error('Upload temp images error:', error);
      throw error;
    }
  }

  // Vincular imágenes a producto
  async linkImagesToProduct(
    productId: string,
    images: Array<{ id: string; url?: string; publicId?: string }>
  ): Promise<{ message: string; linkedCount: number }> {
    try {
      console.log('🔗 Linking images to product:', productId);
      console.log(
        '📍 Link endpoint URL:',
        UPLOADS_ENDPOINTS.linkImages(productId)
      );

      const response = await fetch(UPLOADS_ENDPOINTS.linkImages(productId), {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ images }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error vinculando imágenes al producto');
      }

      console.log('✅ Link successful:', data);
      return data;
    } catch (error) {
      console.error('Link images to product error:', error);
      throw error;
    }
  }

  // Eliminar imagen
  async deleteImage(imageId: string): Promise<{ message: string }> {
    try {
      console.log('🗑️ Deleting image:', imageId);
      console.log(
        '📍 Delete endpoint URL:',
        UPLOADS_ENDPOINTS.deleteImage(imageId)
      );

      const response = await fetch(UPLOADS_ENDPOINTS.deleteImage(imageId), {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error eliminando imagen');
      }

      const data = await response.json();
      console.log('✅ Delete successful:', data);
      return data;
    } catch (error) {
      console.error('Delete image error:', error);
      throw error;
    }
  }

  // Obtener imágenes de producto
  async getProductImages(productId: string): Promise<{
    images: Array<{
      id: string;
      image_url: string;
      alt_text: string;
      is_primary: boolean;
      sort_order: number;
    }>;
  }> {
    try {
      const response = await fetch(UPLOADS_ENDPOINTS.productImages(productId), {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error obteniendo imágenes del producto');
      }

      return data;
    } catch (error) {
      console.error('Get product images error:', error);
      throw error;
    }
  }

  // Actualizar orden de imágenes
  async updateImageOrder(
    productId: string,
    imageOrders: Array<{
      imageId: string;
      sortOrder: number;
      isPrimary?: boolean;
    }>
  ): Promise<{ message: string }> {
    try {
      const response = await fetch(
        UPLOADS_ENDPOINTS.updateImageOrder(productId),
        {
          method: 'PUT',
          headers: this.getAuthHeaders(),
          body: JSON.stringify({ imageOrders }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error actualizando orden de imágenes');
      }

      return data;
    } catch (error) {
      console.error('Update image order error:', error);
      throw error;
    }
  }

  // Limpiar imágenes temporales
  async cleanupTempImages(): Promise<{
    message: string;
    cleanedCount: number;
  }> {
    try {
      const response = await fetch(UPLOADS_ENDPOINTS.cleanupTemp, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || 'Error en limpieza de imágenes temporales'
        );
      }

      return data;
    } catch (error) {
      console.error('Cleanup temp images error:', error);
      throw error;
    }
  }
}

export const productsService = new ProductsService();
export default productsService;
