import { ORDERS_ENDPOINTS } from './endpoints';
import type { Order, PaginatedResponse, Address } from '../../types/types';
import { authService } from './auth';

class OrdersService {
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

  // Crear nueva orden
  async createOrder(orderData: {
    shipping_address: Address;
    billing_address: Address;
    payment_method: 'credit_card' | 'paypal' | 'bank_transfer';
    coupon_code?: string;
    notes?: string;
  }): Promise<Order> {
    try {
      console.log('🛒 Creating order with data:', orderData);
      console.log('🔐 Auth headers:', this.getAuthHeaders());

      const response = await fetch(ORDERS_ENDPOINTS.create, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(orderData),
      });

      console.log('📡 Response status:', response.status);
      console.log(
        '📡 Response headers:',
        Object.fromEntries(response.headers.entries())
      );

      const data = await response.json();
      console.log('📡 Response data:', data);

      if (!response.ok) {
        console.error('❌ Order creation failed:', {
          status: response.status,
          data,
        });
        throw new Error(data.error || data.message || 'Error creando orden');
      }

      console.log('✅ Order created successfully:', data.order);
      return data.order;
    } catch (error) {
      console.error('❌ Create order error:', error);
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

      const url = `${ORDERS_ENDPOINTS.list}?${queryParams.toString()}`;
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

  // Obtener orden por ID
  async getOrderById(orderId: string): Promise<Order> {
    try {
      const response = await fetch(ORDERS_ENDPOINTS.getById(orderId), {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error obteniendo orden');
      }

      return data;
    } catch (error) {
      console.error('Get order by ID error:', error);
      throw error;
    }
  }

  // Cancelar orden
  async cancelOrder(orderId: string): Promise<void> {
    try {
      const response = await fetch(ORDERS_ENDPOINTS.cancel(orderId), {
        method: 'PUT',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error cancelando orden');
      }
    } catch (error) {
      console.error('Cancel order error:', error);
      throw error;
    }
  }

  // Admin: Obtener todas las órdenes
  async getAllOrders(params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
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

      const url = `${ORDERS_ENDPOINTS.adminList}?${queryParams.toString()}`;
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
      console.error('Get all orders error:', error);
      throw error;
    }
  }

  // Admin: Actualizar tracking
  async updateTracking(
    orderId: string,
    trackingNumber: string
  ): Promise<Order> {
    try {
      const response = await fetch(ORDERS_ENDPOINTS.updateTracking(orderId), {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ tracking_number: trackingNumber }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error actualizando tracking');
      }

      return data.order;
    } catch (error) {
      console.error('Update tracking error:', error);
      throw error;
    }
  }

  // ===== MÉTODOS PARA ADMINISTRADORES =====

  // Obtener todas las órdenes (solo admin)
  async getAdminOrders(filters?: {
    page?: number;
    limit?: number;
    status?: string;
    start_date?: string;
    end_date?: string;
    search?: string;
  }): Promise<PaginatedResponse<Order>> {
    try {
      const params = new URLSearchParams();
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.status) params.append('status', filters.status);
      if (filters?.start_date) params.append('start_date', filters.start_date);
      if (filters?.end_date) params.append('end_date', filters.end_date);
      if (filters?.search) params.append('search', filters.search);

      const url = `${ORDERS_ENDPOINTS.adminList}?${params.toString()}`;

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
      console.error('Get admin orders error:', error);
      throw error;
    }
  }

  // Actualizar estado de orden (solo admin)
  async updateOrderStatus(orderId: string, newStatus: string): Promise<Order> {
    try {
      const response = await fetch(ORDERS_ENDPOINTS.adminUpdate(orderId), {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error actualizando estado de orden');
      }

      return data.order;
    } catch (error) {
      console.error('Update order status error:', error);
      throw error;
    }
  }

  // Eliminar orden (solo admin)
  async deleteOrder(orderId: string): Promise<void> {
    try {
      const response = await fetch(ORDERS_ENDPOINTS.adminDelete(orderId), {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error eliminando orden');
      }
    } catch (error) {
      console.error('Delete order error:', error);
      throw error;
    }
  }

  // Obtener detalles de orden específica (solo admin)
  async getOrderDetails(orderId: string): Promise<Order> {
    try {
      const response = await fetch(ORDERS_ENDPOINTS.adminGetById(orderId), {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error obteniendo detalles de orden');
      }

      return data.order;
    } catch (error) {
      console.error('Get order details error:', error);
      throw error;
    }
  }
}

export const ordersService = new OrdersService();
export default ordersService;
