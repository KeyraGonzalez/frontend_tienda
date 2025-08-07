// Tipos de autenticación
export interface User {
  id: string;
  email: string;
  user_metadata: {
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
  tags: string[];
  created_at: string;
  updated_at: string;
  category?: Category;
  images?: ProductImage[];
  variants?: ProductVariant[];
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  cloudinary_public_id?: string;
  alt_text?: string;
  is_primary: boolean;
  sort_order: number;
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
  shipping_cost: number;
  tax_amount: number;
  discount_amount: number;
  coupon_code?: string;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  payment_method: 'credit_card' | 'paypal' | 'bank_transfer';
  shipping_address: Address;
  billing_address: Address;
  items: OrderItem[];
  tracking_number?: string;
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
  external_id?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface PaymentIntent {
  client_secret: string;
  payment_intent_id: string;
}

export interface PaymentMethod {
  id: string;
  type: 'stripe' | 'paypal';
  name: string;
  description: string;
  enabled: boolean;
}

export interface CreateOrderData {
  shipping_address: Address;
  billing_address?: Address;
  payment_method: 'card' | 'paypal' | 'transfer' | 'cash_on_delivery';
  notes?: string;
  coupon_code?: string;
}

export interface PaymentProcessData {
  order_id: string;
  payment_method: 'stripe' | 'paypal';
  payment_data?: any;
}
