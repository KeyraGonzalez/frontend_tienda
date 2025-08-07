const API_BASE_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:5000';

export class ApiClient {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  private getAuthHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Obtener token del localStorage
    const token = localStorage.getItem('auth_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const config: RequestInit = {
      headers: {
        ...this.getAuthHeaders(),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('Error parsing JSON response:', parseError);
        throw new Error(
          `Server returned invalid JSON. Status: ${response.status}`
        );
      }

      if (!response.ok) {
        const errorMessage =
          data?.error ||
          data?.message ||
          `HTTP error! status: ${response.status}`;
        console.error('API error response:', { status: response.status, data });
        throw new Error(errorMessage);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', { url, error });
      throw error;
    }
  }

  // Métodos de autenticación
  async login(email: string, password: string) {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(email: string, password: string, name: string) {
    return this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  }

  // Métodos de productos
  async getProducts(params?: URLSearchParams) {
    const query = params ? `?${params.toString()}` : '';
    return this.request(`/api/products${query}`);
  }

  async getProduct(id: number) {
    return this.request(`/api/products/${id}`);
  }

  async getCategories() {
    return this.request('/api/products/categories');
  }

  // Métodos de carrito
  async addToCart(
    productId: number,
    quantity: number,
    size: string,
    color: string
  ) {
    return this.request('/api/cart', {
      method: 'POST',
      body: JSON.stringify({ productId, quantity, size, color }),
    });
  }

  async getCart() {
    return this.request('/api/cart');
  }

  async updateCartItem(itemId: number, quantity: number) {
    return this.request(`/api/cart/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify({ quantity }),
    });
  }

  async removeFromCart(itemId: number) {
    return this.request(`/api/cart/${itemId}`, {
      method: 'DELETE',
    });
  }

  // Métodos de órdenes
  async createOrder(items: any[]) {
    return this.request('/api/orders', {
      method: 'POST',
      body: JSON.stringify({ items }),
    });
  }

  async getOrders() {
    return this.request('/api/orders');
  }

  async getOrder(id: number) {
    return this.request(`/api/orders/${id}`);
  }

  // Métodos de pagos
  async getPaymentConfig(): Promise<any> {
    return this.request('/api/payments/config', {
      method: 'GET',
    });
  }

  async createPaymentIntent(orderId: string): Promise<any> {
    return this.request('/api/payments/create-payment-intent', {
      method: 'POST',
      body: JSON.stringify({ order_id: orderId }),
    });
  }

  async createCheckoutSession(orderId: string): Promise<any> {
    return this.request('/api/payments/create-checkout-session', {
      method: 'POST',
      body: JSON.stringify({ order_id: orderId }),
    });
  }

  async createPayPalOrder(orderId: string): Promise<any> {
    return this.request('/api/payments/create-paypal-order', {
      method: 'POST',
      body: JSON.stringify({ order_id: orderId }),
    });
  }

  async confirmPayment(paymentIntentId: string, orderId: string): Promise<any> {
    return this.request('/api/payments/confirm-payment', {
      method: 'POST',
      body: JSON.stringify({
        payment_intent_id: paymentIntentId,
        order_id: orderId,
      }),
    });
  }

  async processPayPalPayment(
    orderId: string,
    paypalOrderId: string
  ): Promise<any> {
    return this.request('/api/payments/process-paypal', {
      method: 'POST',
      body: JSON.stringify({
        order_id: orderId,
        paypal_order_id: paypalOrderId,
      }),
    });
  }

  async getPaymentHistory(params?: string): Promise<any> {
    return this.request(`/api/payments/history${params ? `?${params}` : ''}`);
  }

  async getAllPayments(params?: string): Promise<any> {
    return this.request(`/api/payments/admin/all${params ? `?${params}` : ''}`);
  }

  async processRefund(paymentId: string, data: any): Promise<any> {
    return this.request(`/api/payments/admin/refund/${paymentId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export const apiClient = new ApiClient();
