'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import { cartApi } from '../lib/api/cart';
import toast from 'react-hot-toast';

interface CartItem {
  _id: string;
  productId: {
    _id: string;
    name: string;
    price: number;
    category?: string;
    stock?: number;
    brand?: string;
    images?: Array<{
      url: string;
      publicId: string;
    }>;
    imageUrls?: string[]; // Para compatibilidad con formato legacy
  } | null; // Allow productId to be null
  quantity: number;
  size?: string;
  color?: string;
  price: number; // Price of this specific cart item (might differ from product.price)
}

interface Cart {
  _id: string;
  items: CartItem[];
  totalAmount: number;
  totalItems: number;
}

interface CartContextType {
  cart: Cart | null;
  loading: boolean;
  addToCart: (
    productId: string,
    quantity: number,
    size?: string,
    color?: string
  ) => Promise<void>;
  updateCartItem: (itemId: string, quantity: number) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(false);
  const { isAuthenticated, token } = useAuth();

  useEffect(() => {
    if (isAuthenticated && token) {
      refreshCart();
    } else {
      setCart(null);
    }
  }, [isAuthenticated, token]);

  const refreshCart = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const cartData = await cartApi.getCart(token);
      // Ensure cart always has items array
      const normalizedCart = {
        ...cartData,
        items: cartData?.items || [],
      };
      setCart(normalizedCart);
    } catch (error) {
      console.error('Failed to fetch cart:', error);
      // Set empty cart on error
      setCart({
        _id: '',
        items: [],
        totalAmount: 0,
        totalItems: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (
    productId: string,
    quantity: number,
    size?: string,
    color?: string
  ) => {
    if (!token) {
      toast.error('Please login to add items to cart');
      return;
    }
    try {
      setLoading(true);
      const updatedCart = await cartApi.addToCart(token, {
        productId,
        quantity,
        size,
        color,
      });
      // Ensure cart always has items array
      const normalizedCart = {
        ...updatedCart,
        items: updatedCart?.items || [],
      };
      setCart(normalizedCart);
      toast.success('Item added to cart!');
    } catch (error: any) {
      console.error('Add to cart error:', error);
      const message =
        error.response?.data?.message || 'Failed to add item to cart';
      toast.error(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateCartItem = async (itemId: string, quantity: number) => {
    if (!token) return;
    try {
      setLoading(true);
      const updatedCart = await cartApi.updateCartItem(token, itemId, {
        quantity,
      });
      // Ensure cart always has items array
      const normalizedCart = {
        ...updatedCart,
        items: updatedCart?.items || [],
      };
      setCart(normalizedCart);
      toast.success('Cart updated!');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update cart';
      toast.error(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const removeFromCart = async (itemId: string) => {
    if (!token) return;
    try {
      setLoading(true);
      const updatedCart = await cartApi.removeFromCart(token, itemId);
      // Ensure cart always has items array
      const normalizedCart = {
        ...updatedCart,
        items: updatedCart?.items || [],
      };
      setCart(normalizedCart);
      toast.success('Item removed from cart');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to remove item';
      toast.error(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const clearCart = async () => {
    if (!token) return;
    try {
      setLoading(true);
      await cartApi.clearCart(token);
      setCart({ _id: '', items: [], totalAmount: 0, totalItems: 0 });
      toast.success('Cart cleared');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to clear cart';
      toast.error(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    cart,
    loading,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    refreshCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
