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

    // Extraer los datos del carrito desde la estructura anidada
    let cartData = null;

    if (
      response.data.success &&
      response.data.data &&
      response.data.data.success &&
      response.data.data.data
    ) {
      cartData = response.data.data.data;
    } else if (response.data.data && response.data.data.data) {
      cartData = response.data.data.data;
    } else if (response.data.data) {
      cartData = response.data.data;
    } else {
      cartData = response.data;
    }

    return cartData;
  },

  addToCart: async (token: string, data: AddToCartData) => {
    const response = await axios.post(`${API_URL}/cart/add`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    // Manejar estructura anidada similar
    if (
      response.data.success &&
      response.data.data &&
      response.data.data.success &&
      response.data.data.data
    ) {
      return response.data.data.data;
    } else if (response.data.data && response.data.data.data) {
      return response.data.data.data;
    } else {
      return response.data.data || response.data;
    }
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

    // Manejar estructura anidada similar
    if (
      response.data.success &&
      response.data.data &&
      response.data.data.success &&
      response.data.data.data
    ) {
      return response.data.data.data;
    } else if (response.data.data && response.data.data.data) {
      return response.data.data.data;
    } else {
      return response.data.data || response.data;
    }
  },

  removeFromCart: async (token: string, itemId: string) => {
    const response = await axios.delete(`${API_URL}/cart/item/${itemId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    // Manejar estructura anidada similar
    if (
      response.data.success &&
      response.data.data &&
      response.data.data.success &&
      response.data.data.data
    ) {
      return response.data.data.data;
    } else if (response.data.data && response.data.data.data) {
      return response.data.data.data;
    } else {
      return response.data.data || response.data;
    }
  },

  clearCart: async (token: string) => {
    const response = await axios.delete(`${API_URL}/cart/clear`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    // Manejar estructura anidada similar
    if (
      response.data.success &&
      response.data.data &&
      response.data.data.success &&
      response.data.data.data
    ) {
      return response.data.data.data;
    } else if (response.data.data && response.data.data.data) {
      return response.data.data.data;
    } else {
      return response.data.data || response.data;
    }
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
