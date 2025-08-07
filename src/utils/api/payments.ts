import { apiClient } from '../api';
import type {
  Payment,
  PaymentIntent,
  CreateOrderData,
  PaymentProcessData,
} from '../../types';

export interface PaymentHistory {
  payments: Payment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaymentResponse {
  message: string;
  order: any;
  payment: Payment;
}

class PaymentsService {
  // Crear intención de pago con Stripe
  async createPaymentIntent(orderId: string): Promise<PaymentIntent> {
    try {
      return await apiClient.createPaymentIntent(orderId);
    } catch (error: any) {
      throw new Error(error.message || 'Error creando intención de pago');
    }
  }

  // Crear sesión de checkout con Stripe
  async createCheckoutSession(
    orderId: string
  ): Promise<{ url: string; session_id: string }> {
    try {
      return await apiClient.createCheckoutSession(orderId);
    } catch (error: any) {
      throw new Error(error.message || 'Error creando sesión de checkout');
    }
  }

  // Crear orden con PayPal
  async createPayPalOrder(
    orderId: string
  ): Promise<{ paypal_order_id: string; approval_url?: string }> {
    try {
      return await apiClient.createPayPalOrder(orderId);
    } catch (error: any) {
      throw new Error(error.message || 'Error creando orden de PayPal');
    }
  }

  // Confirmar pago con Stripe
  async confirmStripePayment(
    paymentIntentId: string,
    orderId: string
  ): Promise<PaymentResponse> {
    try {
      return await apiClient.confirmPayment(paymentIntentId, orderId);
    } catch (error: any) {
      throw new Error(error.message || 'Error confirmando pago');
    }
  }

  // Procesar pago con PayPal (simulado)
  async processPayPalPayment(
    orderId: string,
    paypalOrderId: string
  ): Promise<PaymentResponse> {
    try {
      return await apiClient.processPayPalPayment(orderId, paypalOrderId);
    } catch (error: any) {
      throw new Error(error.message || 'Error procesando pago con PayPal');
    }
  }

  // Obtener historial de pagos
  async getPaymentHistory(
    page: number = 1,
    limit: number = 10,
    status?: string
  ): Promise<PaymentHistory> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(status && { status }),
      });

      return await apiClient.getPaymentHistory(params.toString());
    } catch (error: any) {
      throw new Error(error.message || 'Error obteniendo historial de pagos');
    }
  }

  // Métodos de administrador
  async getAllPayments(
    page: number = 1,
    limit: number = 20,
    status?: string,
    method?: string,
    search?: string
  ): Promise<PaymentHistory> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(status && { status }),
        ...(method && { method }),
        ...(search && { search }),
      });

      return await apiClient.getAllPayments(params.toString());
    } catch (error: any) {
      throw new Error(error.message || 'Error obteniendo todos los pagos');
    }
  }

  async processRefund(
    paymentId: string,
    amount?: number,
    reason?: string
  ): Promise<any> {
    try {
      return await apiClient.processRefund(paymentId, {
        ...(amount && { amount }),
        ...(reason && { reason }),
      });
    } catch (error: any) {
      throw new Error(error.message || 'Error procesando reembolso');
    }
  }
}

export const paymentsService = new PaymentsService();
export default paymentsService;
