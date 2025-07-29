import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export interface AddToCartData {
  productId: string;
  quantity: number;
  size?: string;
  color?: string;
}

export interface UpdateCartItemData {
  quantity?: number;
  size?: string;
  color?: string;
}

const cartApi = {
  getCart: async (token: string) => {
    const response = await axios.get(`${API_URL}/cart`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
return (
  response.data.data?.data ||
  response.data.data ||
  response.data ||
  response.data.data?.data?.data ||
  response.data.data?.data?.data?.data ||
    response.data.data?.data?.data?.data ||
    response.data.data?.data?.data?.data?.data ||
    response.data.data?.data?.data?.data?.data?.data    
);
  },

  addToCart: async (token: string, data: AddToCartData) => {
    const response = await axios.post(`${API_URL}/cart/add`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data.data || response.data;
  },

  updateCartItem: async (
    token: string,
    itemId: string,
    data: UpdateCartItemData
  ) => {
    const response = await axios.patch(`${API_URL}/cart/item/${itemId}`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data.data || response.data;
  },

  removeFromCart: async (token: string, itemId: string) => {
    const response = await axios.delete(`${API_URL}/cart/item/${itemId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data.data || response.data;
  },

  clearCart: async (token: string) => {
    const response = await axios.delete(`${API_URL}/cart/clear`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data.data || response.data;
  },

  debugCart: async (token: string) => {
    const response = await axios.get(`${API_URL}/cart/debug`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data.data || response.data;
  },
};

export { cartApi };
