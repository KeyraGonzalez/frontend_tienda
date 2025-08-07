import { USERS_ENDPOINTS } from './endpoints';
import type {
  User,
  Order,
  Product,
  PaginatedResponse,
} from '../../types/types';
import { authService } from './auth';

class UsersService {
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

  // Obtener perfil del usuario
  async getProfile(): Promise<User> {
    try {
      const response = await fetch(USERS_ENDPOINTS.profile, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error obteniendo perfil');
      }

      return data;
    } catch (error) {
      console.error('Get profile error:', error);
      throw error;
    }
  }

  // Actualizar perfil del usuario
  async updateProfile(profileData: Partial<User>): Promise<User> {
    try {
      const response = await fetch(USERS_ENDPOINTS.updateProfile, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(profileData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error actualizando perfil');
      }

      return data.profile;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  }

  // Obtener órdenes del usuario
  async getUserOrders(params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<PaginatedResponse<Order>> {
    try {
      const queryParams = new URLSearchParams();

      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, value.toString());
          }
        });
      }

      const url = `${USERS_ENDPOINTS.orders}?${queryParams.toString()}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error obteniendo órdenes');
      }

      return data;
    } catch (error) {
      console.error('Get user orders error:', error);
      throw error;
    }
  }

  // Obtener favoritos del usuario
  async getFavorites(params?: {
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Product>> {
    try {
      const queryParams = new URLSearchParams();

      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, value.toString());
          }
        });
      }

      const url = `${USERS_ENDPOINTS.favorites}?${queryParams.toString()}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error obteniendo favoritos');
      }

      return data;
    } catch (error) {
      console.error('Get favorites error:', error);
      throw error;
    }
  }

  // Agregar producto a favoritos
  async addToFavorites(productId: string): Promise<void> {
    try {
      const response = await fetch(USERS_ENDPOINTS.addFavorite(productId), {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error agregando a favoritos');
      }
    } catch (error) {
      console.error('Add to favorites error:', error);
      throw error;
    }
  }

  // Remover producto de favoritos
  async removeFromFavorites(productId: string): Promise<void> {
    try {
      const response = await fetch(USERS_ENDPOINTS.removeFavorite(productId), {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error removiendo de favoritos');
      }
    } catch (error) {
      console.error('Remove from favorites error:', error);
      throw error;
    }
  }

  // Admin: Obtener todos los usuarios
  async getAllUsers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
  }): Promise<PaginatedResponse<User>> {
    try {
      const queryParams = new URLSearchParams();

      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, value.toString());
          }
        });
      }

      const url = `${USERS_ENDPOINTS.adminList}?${queryParams.toString()}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error obteniendo usuarios');
      }

      return data;
    } catch (error) {
      console.error('Get all users error:', error);
      throw error;
    }
  }

  // Admin: Obtener usuario por ID
  async getUserById(userId: string): Promise<User> {
    try {
      const response = await fetch(USERS_ENDPOINTS.adminGetById(userId), {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error obteniendo usuario');
      }

      return data;
    } catch (error) {
      console.error('Get user by ID error:', error);
      throw error;
    }
  }

  // Admin: Actualizar usuario
  async updateUser(userId: string, userData: Partial<User>): Promise<User> {
    try {
      const response = await fetch(USERS_ENDPOINTS.adminUpdate(userId), {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error actualizando usuario');
      }

      return data.user;
    } catch (error) {
      console.error('Update user error:', error);
      throw error;
    }
  }

  // Admin: Eliminar usuario
  async deleteUser(userId: string): Promise<void> {
    try {
      const response = await fetch(USERS_ENDPOINTS.adminDelete(userId), {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error eliminando usuario');
      }
    } catch (error) {
      console.error('Delete user error:', error);
      throw error;
    }
  }

  // Admin: Actualizar estado del usuario
  async updateUserStatus(userId: string, isActive: boolean): Promise<User> {
    try {
      const response = await fetch(USERS_ENDPOINTS.adminUpdateStatus(userId), {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ is_active: isActive }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error actualizando estado del usuario');
      }

      return data.user;
    } catch (error) {
      console.error('Update user status error:', error);
      throw error;
    }
  }

  // ===== MÉTODOS PARA ADMINISTRADORES =====

  // Obtener todos los usuarios (solo admin)
  async getAdminUsers(filters?: {
    page?: number;
    limit?: number;
    role?: string;
    search?: string;
  }): Promise<PaginatedResponse<User>> {
    try {
      const params = new URLSearchParams();
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.role) params.append('role', filters.role);
      if (filters?.search) params.append('search', filters.search);

      const url = `${USERS_ENDPOINTS.adminList}?${params.toString()}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error obteniendo usuarios');
      }

      return data;
    } catch (error) {
      console.error('Get admin users error:', error);
      throw error;
    }
  }

  // Actualizar rol de usuario (solo admin)
  async updateUserRole(userId: number, newRole: string): Promise<User> {
    try {
      const response = await fetch(
        USERS_ENDPOINTS.adminUpdate(userId.toString()),
        {
          method: 'PUT',
          headers: this.getAuthHeaders(),
          body: JSON.stringify({ role: newRole }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error actualizando rol de usuario');
      }

      return data.user;
    } catch (error) {
      console.error('Update user role error:', error);
      throw error;
    }
  }

  // Alternar estado activo/inactivo de usuario (solo admin)
  async toggleUserStatus(userId: number): Promise<User> {
    try {
      const response = await fetch(
        USERS_ENDPOINTS.adminUpdateStatus(userId.toString()),
        {
          method: 'PUT',
          headers: this.getAuthHeaders(),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error cambiando estado de usuario');
      }

      return data.user;
    } catch (error) {
      console.error('Toggle user status error:', error);
      throw error;
    }
  }

  // Obtener detalles de usuario específico (solo admin)
  async getUserDetails(userId: number): Promise<User> {
    try {
      const response = await fetch(
        USERS_ENDPOINTS.adminGetById(userId.toString()),
        {
          method: 'GET',
          headers: this.getAuthHeaders(),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error obteniendo detalles de usuario');
      }

      return data.user;
    } catch (error) {
      console.error('Get user details error:', error);
      throw error;
    }
  }
}

export const usersService = new UsersService();
export default usersService;
