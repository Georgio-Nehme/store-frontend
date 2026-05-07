export interface CustomerSession {
  customer_id: string;
  email: string;
  name: string | null;
}

export interface Product {
  id: string;
  store_id: string;
  name: string;
  description: string | null;
  price: string;
  compare_price: string | null;
  stock: number;
  sku: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface Customer {
  id: string;
  store_id: string;
  email: string;
  name: string | null;
  phone: string | null;
  address: string | null;
  created_at: string;
}

export interface CustomerWithStats extends Customer {
  order_count: number;
  total_spent: string;
}

export interface OrderItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: string;
}

export interface Order {
  id: string;
  store_id: string;
  customer_id: string;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  total_amount: string;
  discount_amount: string;
  promo_code_used: string | null;
  shipping_address: string | null;
  notes: string | null;
  items: OrderItem[];
  created_at: string;
  updated_at: string | null;
}

export interface PromoCode {
  id: string;
  store_id: string;
  code: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: string;
  min_order_amount: string | null;
  max_uses: number | null;
  uses_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface PromoCodeValidateResponse {
  valid: boolean;
  discount_amount: string;
  final_total: string;
  message: string;
}

export interface StoreLoginResponse {
  access_token: string;
  token_type: string;
  role: string;
  store_id: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface ProductImage {
  id: string;
  product_id: string;
  store_id: string;
  status: 'pending' | 'processing' | 'ready' | 'failed';
  position: number;
  is_primary: boolean;
  small_url: string | null;
  medium_url: string | null;
  large_url: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface PresignResponse {
  image_id: string;
  upload_url: string;
  s3_key: string;
  expires_in: number;
}
