// Configuración de endpoints de la API
const API_BASE_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:5000';

// Endpoints de autenticación
export const AUTH_ENDPOINTS = {
  register: `${API_BASE_URL}/api/auth/register`,
  login: `${API_BASE_URL}/api/auth/login`,
  logout: `${API_BASE_URL}/api/auth/logout`,
  me: `${API_BASE_URL}/api/auth/me`,
  refreshToken: `${API_BASE_URL}/api/auth/refresh-token`,
  changePassword: `${API_BASE_URL}/api/auth/change-password`,
  forgotPassword: `${API_BASE_URL}/api/auth/forgot-password`,
  resetPassword: `${API_BASE_URL}/api/auth/reset-password`,
  verifyEmail: `${API_BASE_URL}/api/auth/verify-email`,
  resendVerification: `${API_BASE_URL}/api/auth/resend-verification-code`,
} as const;

// Endpoints de productos
export const PRODUCTS_ENDPOINTS = {
  list: `${API_BASE_URL}/api/products`,
  getById: (id: string) => `${API_BASE_URL}/api/products/${id}`,
  create: `${API_BASE_URL}/api/products`,
  update: (id: string) => `${API_BASE_URL}/api/products/${id}`,
  delete: (id: string) => `${API_BASE_URL}/api/products/${id}`,
  featured: `${API_BASE_URL}/api/products/featured`,
  search: `${API_BASE_URL}/api/products/search`,
  related: (id: string) => `${API_BASE_URL}/api/products/${id}/related`,
  reviews: (id: string) => `${API_BASE_URL}/api/products/${id}/reviews`,
  createReview: (id: string) => `${API_BASE_URL}/api/products/${id}/reviews`,
  updateReview: (id: string, reviewId: string) =>
    `${API_BASE_URL}/api/products/${id}/reviews/${reviewId}`,
  deleteReview: (id: string, reviewId: string) =>
    `${API_BASE_URL}/api/products/${id}/reviews/${reviewId}`,
  categories: `${API_BASE_URL}/api/products/categories`,
  createCategory: `${API_BASE_URL}/api/products/categories`,
  updateCategory: (id: string) =>
    `${API_BASE_URL}/api/products/categories/${id}`,
  deleteCategory: (id: string) =>
    `${API_BASE_URL}/api/products/categories/${id}`,
  // Admin endpoints
  adminList: `${API_BASE_URL}/api/products/admin/all`,
} as const;

// Endpoints de carrito
export const CART_ENDPOINTS = {
  get: `${API_BASE_URL}/api/cart`,
  add: `${API_BASE_URL}/api/cart/add`,
  update: (itemId: string) => `${API_BASE_URL}/api/cart/update/${itemId}`,
  remove: (itemId: string) => `${API_BASE_URL}/api/cart/remove/${itemId}`,
  clear: `${API_BASE_URL}/api/cart/clear`,
  applyCoupon: `${API_BASE_URL}/api/cart/apply-coupon`,
  removeCoupon: `${API_BASE_URL}/api/cart/remove-coupon`,
} as const;

// Endpoints de órdenes
export const ORDERS_ENDPOINTS = {
  create: `${API_BASE_URL}/api/orders`,
  list: `${API_BASE_URL}/api/orders`,
  getById: (id: string) => `${API_BASE_URL}/api/orders/${id}`,
  cancel: (id: string) => `${API_BASE_URL}/api/orders/${id}/cancel`,
  // Admin endpoints
  adminList: `${API_BASE_URL}/api/orders/admin/all`,
  adminGetById: (id: string) => `${API_BASE_URL}/api/orders/admin/${id}`,
  adminUpdate: (id: string) => `${API_BASE_URL}/api/orders/admin/${id}`,
  adminDelete: (id: string) => `${API_BASE_URL}/api/orders/admin/${id}`,
  updateStatus: (id: string) => `${API_BASE_URL}/api/orders/admin/${id}/status`,
  updateTracking: (id: string) =>
    `${API_BASE_URL}/api/orders/admin/${id}/tracking`,
} as const;

// Endpoints de pagos
export const PAYMENTS_ENDPOINTS = {
  createPaymentIntent: `${API_BASE_URL}/api/payments/create-payment-intent`,
  confirmPayment: `${API_BASE_URL}/api/payments/confirm-payment`,
  createCheckoutSession: `${API_BASE_URL}/api/payments/create-checkout-session`,
  createPayPalOrder: `${API_BASE_URL}/api/payments/create-paypal-order`,
  capturePayPalOrder: `${API_BASE_URL}/api/payments/capture-paypal-order`,
  simulatePayPal: `${API_BASE_URL}/api/payments/simulate-paypal`,
  webhook: `${API_BASE_URL}/api/payments/webhook`,
  history: `${API_BASE_URL}/api/payments/history`,
  config: `${API_BASE_URL}/api/payments/config`,
  stats: `${API_BASE_URL}/api/payments/stats`,
  export: `${API_BASE_URL}/api/payments/export`,
  getById: (id: string) => `${API_BASE_URL}/api/payments/${id}`,
  refund: (id: string) => `${API_BASE_URL}/api/payments/${id}/refund`,
  process: (id: string) => `${API_BASE_URL}/api/payments/${id}/process`,
  // Admin endpoints
  admin: {
    list: `${API_BASE_URL}/api/payments/admin/all`,
    refund: (id: string) => `${API_BASE_URL}/api/payments/admin/refund/${id}`,
  },
} as const;

// Endpoints de usuarios
export const USERS_ENDPOINTS = {
  profile: `${API_BASE_URL}/api/users/profile`,
  updateProfile: `${API_BASE_URL}/api/users/profile`,
  orders: `${API_BASE_URL}/api/users/orders`,
  favorites: `${API_BASE_URL}/api/users/favorites`,
  addFavorite: (productId: string) =>
    `${API_BASE_URL}/api/users/favorites/${productId}`,
  removeFavorite: (productId: string) =>
    `${API_BASE_URL}/api/users/favorites/${productId}`,
  // Admin endpoints
  adminList: `${API_BASE_URL}/api/users`,
  adminGetById: (id: string) => `${API_BASE_URL}/api/users/${id}`,
  adminUpdate: (id: string) => `${API_BASE_URL}/api/users/${id}`,
  adminDelete: (id: string) => `${API_BASE_URL}/api/users/${id}`,
  adminUpdateStatus: (id: string) => `${API_BASE_URL}/api/users/${id}/status`,
} as const;

// Endpoints de uploads
export const UPLOADS_ENDPOINTS = {
  uploadDirectToProduct: (productId: string) =>
    `${API_BASE_URL}/api/uploads/products/${productId}/upload-images`,
  tempImages: `${API_BASE_URL}/api/uploads/temp-images`,
  linkImages: (productId: string) =>
    `${API_BASE_URL}/api/uploads/products/${productId}/link-images`,
  deleteImage: (imageId: string) =>
    `${API_BASE_URL}/api/uploads/images/${imageId}`,
  productImages: (productId: string) =>
    `${API_BASE_URL}/api/uploads/products/${productId}/images`,
  updateImageOrder: (productId: string) =>
    `${API_BASE_URL}/api/uploads/products/${productId}/images/order`,
  cleanupTemp: `${API_BASE_URL}/api/uploads/cleanup-temp`,
} as const;

// Tipos para facilitar el desarrollo
export type ApiEndpoint =
  | keyof typeof AUTH_ENDPOINTS
  | keyof typeof PRODUCTS_ENDPOINTS
  | keyof typeof CART_ENDPOINTS
  | keyof typeof ORDERS_ENDPOINTS
  | keyof typeof PAYMENTS_ENDPOINTS
  | keyof typeof USERS_ENDPOINTS
  | keyof typeof UPLOADS_ENDPOINTS;
