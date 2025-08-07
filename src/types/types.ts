// Tipos de autenticación
export interface User {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  role?: 'cliente' | 'admin' | 'moderador' | 'vendedor'; // Mantenemos para compatibilidad
  rol?: 'cliente' | 'admin' | 'moderador' | 'vendedor'; // Añadimos el campo del backend
  is_admin?: boolean; // Campo para verificar permisos de admin
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  user_metadata?: {
    full_name: string;
    phone?: string;
    rol: 'cliente' | 'admin' | 'moderador' | 'vendedor';
  };
  email_confirmed_at?: string;
}

export interface Session {
  access_token: string;
  token_type: string;
  expires_in: number;
  expires_at: number;
  user: {
    id: string;
    email: string;
  };
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user: User;
  session: Session;
  profile?: any;
  requiresVerification?: boolean;
}

// Tipos de productos
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  original_price?: number;
  category_id: string;
  stock_quantity: number;
  sku: string;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  is_active: boolean;
  featured: boolean;
  is_featured?: boolean; // Alias para compatibilidad
  tags: string[];
  brand?: string;
  rating?: number;
  discount_percentage?: number;
  image_url?: string; // URL de imagen principal
  created_at: string;
  updated_at: string;
  category?: Category;
  images?: ProductImage[];
  product_images?: ProductImage[]; // Alias para compatibilidad con backend
  variants?: ProductVariant[];
}

export interface ProductImage {
  id?: string;
  product_id?: string;
  image_url: string;
  cloudinary_public_id?: string;
  alt_text?: string;
  is_primary: boolean;
  sort_order?: number;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  size?: string;
  color?: string;
  additional_price: number;
  stock_quantity: number;
  sku?: string;
  is_active: boolean;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  product_count?: number; // Número de productos en esta categoría
}

// Tipos de carrito
export interface CartItem {
  id: string;
  user_id: string;
  product_id: string;
  variant_id?: string;
  quantity: number;
  products: {
    id: string;
    name: string;
    price: number;
    stock_quantity: number;
    product_images: {
      image_url: string;
      is_primary: boolean;
    }[];
  };
  product_variants?: {
    id: string;
    size: string;
    color: string;
    additional_price: number;
    stock_quantity: number;
  };
  created_at: string;
  updated_at: string;
}

export interface Cart {
  items: CartItem[];
  summary: {
    subtotal: number;
    tax: number;
    shipping: number;
    total: number;
    itemCount: number;
    discount?: number;
  };
}

// Tipos de órdenes
export interface Order {
  id: string;
  user_id: string;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  total: number;
  subtotal: number;
  shipping: number; // Coincide con el response del backend
  tax: number; // Coincide con el response del backend
  discount: number; // Coincide con el response del backend
  shipping_cost?: number; // Mantenemos para compatibilidad
  tax_amount?: number; // Mantenemos para compatibilidad
  discount_amount?: number; // Mantenemos para compatibilidad
  coupon_code?: string;
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded';
  payment_method: 'credit_card' | 'paypal' | 'bank_transfer';
  payment_intent_id?: string;
  payment_method_details?: any;
  stripe_session_id?: string;
  paypal_order_id?: string;
  shipping_address: any; // El response del backend tiene estructura diferente
  billing_address?: any;
  items?: OrderItem[]; // Para compatibilidad con el tipo original
  order_items?: any[]; // Para coincidir con el response del backend
  tracking_number?: string;
  shipping_carrier?: string;
  notes?: string;
  shipped_at?: string;
  delivered_at?: string;
  confirmed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  variant_id?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  product: Product;
  variant?: ProductVariant;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  full_name: string;
  phone?: string;
}

// Tipos de pagos
export interface Payment {
  id: string;
  order_id: string;
  user_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  transaction_id?: string;
  created_at: string;
  updated_at: string;
}

// Tipos para reviews
export interface Review {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  comment: string;
  created_at: string;
  updated_at: string;
  user: {
    full_name: string;
  };
}

// Tipos para respuestas de API
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  details?: any;
}

export interface PaginatedResponse<T> {
  products?: T[]; // Para compatibilidad con el backend de productos
  users?: T[]; // Para compatibilidad con el backend de usuarios
  orders?: T[]; // Para compatibilidad con el backend de órdenes
  data?: T[]; // Formato genérico
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Tipos de filtros para productos
export interface ProductFilters {
  category?: string;
  min_price?: number;
  max_price?: number;
  search?: string;
  sort_by?:
    | 'featured'
    | 'name'
    | 'price-asc'
    | 'price-desc'
    | 'newest'
    | 'oldest';
  page?: number;
  limit?: number;
  featured?: boolean;
  inStock?: boolean;
  brand?: string;
  sale?: boolean; // Para productos en oferta
  nuevo?: boolean; // Para productos nuevos
}
