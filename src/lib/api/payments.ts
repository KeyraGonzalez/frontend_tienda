import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export interface ProcessPaymentData {
  orderId: string;
  method: 'paypal' | 'stripe';
  paymentDetails?: {
    // For PayPal
    paypalOrderId?: string;
    payerId?: string;
    token?: string;

    // For Stripe
    paymentMethodId?: string;
    customerId?: string;
    savePaymentMethod?: boolean;
  };
}

export interface Payment {
  _id: string;
  paymentId: string;
  orderId: string;
  userId: string;
  amount: number;
  currency: string;
  method: string;
  status:
    | 'pending'
    | 'processing'
    | 'completed'
    | 'failed'
    | 'cancelled'
    | 'refunded';
  transactionId?: string;
  gatewayResponse?: any;
  failureReason?: string;
  refundId?: string;
  refundAmount?: number;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
}

const paymentsApi = {
  processPayment: async (token: string, paymentData: ProcessPaymentData) => {
    const response = await axios.post(
      `${API_URL}/payments/process`,
      paymentData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data.data;
  },

  // Crear sesión de checkout de Stripe
  createStripeCheckoutSession: async (token: string, orderId: string) => {
    const response = await axios.post(
      `${API_URL}/payments/stripe/create-checkout-session`,
      { orderId },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    // Devolver toda la respuesta para que el frontend pueda acceder tanto a data como a otros campos
    return response.data;
  },

  // Crear orden de PayPal
  createPayPalOrder: async (token: string, orderId: string) => {
    const response = await axios.post(
      `${API_URL}/payments/paypal/create-order`,
      { orderId },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },

  // Capturar orden de PayPal
  capturePayPalOrder: async (
    token: string,
    paypalOrderId: string,
    orderId: string
  ) => {
    const response = await axios.post(
      `${API_URL}/payments/paypal/capture-order`,
      { paypalOrderId, orderId },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },

  getUserPayments: async (token: string) => {
    const response = await axios.get(`${API_URL}/payments`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data.data;
  },

  getPaymentByOrder: async (token: string, orderId: string) => {
    const response = await axios.get(`${API_URL}/payments/order/${orderId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data.data;
  },

  refundPayment: async (
    token: string,
    paymentId: string,
    amount?: number,
    reason?: string
  ) => {
    const response = await axios.post(
      `${API_URL}/payments/${paymentId}/refund`,
      {
        amount,
        reason,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data.data;
  },
};

export { paymentsApi };
