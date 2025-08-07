import {
  AUTH_ENDPOINTS,
  PRODUCTS_ENDPOINTS,
  ORDERS_ENDPOINTS,
  USERS_ENDPOINTS,
  PAYMENTS_ENDPOINTS,
} from './endpoints';

const API_BASE_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:5000';

// Endpoints específicos de admin
const ADMIN_ENDPOINTS = {
  stats: `${API_BASE_URL}/api/admin/stats`,
  categories: `${API_BASE_URL}/api/products/categories`, // Corregido: usar la ruta correcta
  products: `${API_BASE_URL}/api/admin/products`,
  users: `${API_BASE_URL}/api/admin/users`,
  orders: `${API_BASE_URL}/api/admin/orders`,
} as const;

export interface AdminStatsResponse {
  success: boolean;
  stats: {
    totalProducts: number;
    activeProducts: number;
    lowStockProducts: number;
    featuredProducts: number;
    totalCategories: number;
    activeCategories: number;
    categoriesWithProducts: number;
    totalUsers: number;
    totalOrders: number;
    totalRevenue: number;
  };
}

export interface CategoriesResponse {
  success: boolean;
  categories: Array<{
    id: string;
    name: string;
    description?: string;
    image_url?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    product_count?: number;
  }>;
}

export interface CategoryCreateData {
  name: string;
  description?: string;
  image_url?: string;
  is_active: boolean;
}

export interface ApiResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: any;
}

class AdminService {
  private async request(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<any> {
    const token = localStorage.getItem('auth_token'); // Corregido: usar 'auth_token' en lugar de 'access_token'
    console.log('Token disponible:', token ? 'Sí' : 'No');
    console.log('Endpoint:', endpoint);

    const defaultHeaders = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };

    console.log('Headers enviados:', defaultHeaders);

    const response = await fetch(endpoint, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    console.log(
      'Respuesta del servidor:',
      response.status,
      response.statusText
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Estadísticas del dashboard
  async getStats(): Promise<AdminStatsResponse> {
    try {
      return await this.request(ADMIN_ENDPOINTS.stats);
    } catch (error) {
      console.error('Error getting admin stats:', error);
      throw new Error('Error obteniendo estadísticas');
    }
  }

  // Gestión de Categorías
  async getCategories(): Promise<CategoriesResponse> {
    try {
      return await this.request(ADMIN_ENDPOINTS.categories);
    } catch (error) {
      console.error('Error getting categories:', error);
      throw new Error('Error obteniendo categorías');
    }
  }

  async createCategory(categoryData: CategoryCreateData): Promise<ApiResponse> {
    try {
      return await this.request(ADMIN_ENDPOINTS.categories, {
        method: 'POST',
        body: JSON.stringify(categoryData),
      });
    } catch (error) {
      console.error('Error creating category:', error);
      throw new Error('Error creando categoría');
    }
  }

  async updateCategory(
    id: string,
    categoryData: Partial<CategoryCreateData>
  ): Promise<ApiResponse> {
    try {
      return await this.request(`${ADMIN_ENDPOINTS.categories}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(categoryData),
      });
    } catch (error) {
      console.error('Error updating category:', error);
      throw new Error('Error actualizando categoría');
    }
  }

  async deleteCategory(id: string): Promise<ApiResponse> {
    try {
      return await this.request(`${ADMIN_ENDPOINTS.categories}/${id}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Error deleting category:', error);
      throw new Error('Error eliminando categoría');
    }
  }

  // Gestión de Productos (mejorada)
  async getProducts(filters?: {
    search?: string;
    category?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<any> {
    try {
      const params = new URLSearchParams();
      if (filters?.search) params.append('search', filters.search);
      if (filters?.category) params.append('category', filters.category);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());

      const queryString = params.toString();
      const url = `${ADMIN_ENDPOINTS.products}${
        queryString ? `?${queryString}` : ''
      }`;

      return await this.request(url);
    } catch (error) {
      console.error('Error getting products:', error);
      throw new Error('Error obteniendo productos');
    }
  }

  async createProduct(productData: FormData): Promise<ApiResponse> {
    try {
      const token = localStorage.getItem('access_token');

      const response = await fetch(ADMIN_ENDPOINTS.products, {
        method: 'POST',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: productData, // FormData para manejar archivos
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error creating product:', error);
      throw new Error('Error creando producto');
    }
  }

  async updateProduct(id: string, productData: FormData): Promise<ApiResponse> {
    try {
      const token = localStorage.getItem('access_token');

      const response = await fetch(`${ADMIN_ENDPOINTS.products}/${id}`, {
        method: 'PUT',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: productData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error updating product:', error);
      throw new Error('Error actualizando producto');
    }
  }

  async deleteProduct(id: string): Promise<ApiResponse> {
    try {
      return await this.request(`${ADMIN_ENDPOINTS.products}/${id}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Error deleting product:', error);
      throw new Error('Error eliminando producto');
    }
  }

  // Gestión de Usuarios
  async getUsers(filters?: {
    search?: string;
    role?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<any> {
    try {
      const params = new URLSearchParams();
      if (filters?.search) params.append('search', filters.search);
      if (filters?.role) params.append('role', filters.role);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());

      const queryString = params.toString();
      const url = `${ADMIN_ENDPOINTS.users}${
        queryString ? `?${queryString}` : ''
      }`;

      return await this.request(url);
    } catch (error) {
      console.error('Error getting users:', error);
      throw new Error('Error obteniendo usuarios');
    }
  }

  async updateUser(id: string, userData: any): Promise<ApiResponse> {
    try {
      return await this.request(`${ADMIN_ENDPOINTS.users}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(userData),
      });
    } catch (error) {
      console.error('Error updating user:', error);
      throw new Error('Error actualizando usuario');
    }
  }

  async deleteUser(id: string): Promise<ApiResponse> {
    try {
      return await this.request(`${ADMIN_ENDPOINTS.users}/${id}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      throw new Error('Error eliminando usuario');
    }
  }

  // Gestión de Órdenes
  async getOrders(filters?: {
    search?: string;
    status?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    limit?: number;
  }): Promise<any> {
    try {
      const params = new URLSearchParams();
      if (filters?.search) params.append('search', filters.search);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.date_from) params.append('date_from', filters.date_from);
      if (filters?.date_to) params.append('date_to', filters.date_to);
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());

      const queryString = params.toString();
      const url = `${ADMIN_ENDPOINTS.orders}${
        queryString ? `?${queryString}` : ''
      }`;

      return await this.request(url);
    } catch (error) {
      console.error('Error getting orders:', error);
      throw new Error('Error obteniendo órdenes');
    }
  }

  async updateOrderStatus(id: string, status: string): Promise<ApiResponse> {
    try {
      return await this.request(`${ADMIN_ENDPOINTS.orders}/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
    } catch (error) {
      console.error('Error updating order status:', error);
      throw new Error('Error actualizando estado de orden');
    }
  }
}

export const adminService = new AdminService();
