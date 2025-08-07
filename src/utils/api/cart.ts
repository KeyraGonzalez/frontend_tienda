import { CART_ENDPOINTS } from './endpoints';
import type { Cart, CartItem } from '../../types/types';
import { authService } from './auth';

class CartService {
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

  // Obtener carrito del usuario
  async getCart(): Promise<Cart> {
    try {
      const response = await fetch(CART_ENDPOINTS.get, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error obteniendo carrito');
      }

      return data;
    } catch (error) {
      console.error('Get cart error:', error);
      throw error;
    }
  }

  // Agregar producto al carrito
  async addToCart(productData: {
    product_id: string;
    variant_id?: string;
    quantity: number;
  }): Promise<CartItem> {
    try {
      const response = await fetch(CART_ENDPOINTS.add, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(productData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error agregando al carrito');
      }

      return data.item;
    } catch (error) {
      console.error('Add to cart error:', error);
      throw error;
    }
  }

  // Actualizar cantidad de item en carrito
  async updateCartItem(itemId: string, quantity: number): Promise<CartItem> {
    try {
      const response = await fetch(CART_ENDPOINTS.update(itemId), {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ quantity }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error actualizando carrito');
      }

      return data.item;
    } catch (error) {
      console.error('Update cart item error:', error);
      throw error;
    }
  }

  // Remover item del carrito
  async removeFromCart(itemId: string): Promise<void> {
    try {
      const response = await fetch(CART_ENDPOINTS.remove(itemId), {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error eliminando del carrito');
      }
    } catch (error) {
      console.error('Remove from cart error:', error);
      throw error;
    }
  }

  // Limpiar carrito
  async clearCart(): Promise<void> {
    try {
      const response = await fetch(CART_ENDPOINTS.clear, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error limpiando carrito');
      }
    } catch (error) {
      console.error('Clear cart error:', error);
      throw error;
    }
  }

  // Aplicar cupón
  async applyCoupon(couponCode: string): Promise<Cart> {
    try {
      const response = await fetch(CART_ENDPOINTS.applyCoupon, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ coupon_code: couponCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error aplicando cupón');
      }

      return data.cart;
    } catch (error) {
      console.error('Apply coupon error:', error);
      throw error;
    }
  }

  // Remover cupón
  async removeCoupon(): Promise<Cart> {
    try {
      const response = await fetch(CART_ENDPOINTS.removeCoupon, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error removiendo cupón');
      }

      return data.cart;
    } catch (error) {
      console.error('Remove coupon error:', error);
      throw error;
    }
  }
}

export const cartService = new CartService();
export default cartService;
