export interface CustomerSession {
  customer_id: string;
  email: string;
  name: string | null;
  access_token?: string;
  token_type?: string;
}

export interface CustomerAddress {
  id: string;
  label: string | null;
  governorate: string;
  district: string;
  city: string;
  street: string;
  building: string | null;
  floor: string | null;
  is_default: boolean;
  created_at: string;
}

// ─── Categories ───────────────────────────────────────────────────────────────
export interface CategorySummary {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  position: number;
}

export interface Category {
  id: string;
  store_id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  position: number;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
  subcategories: CategorySummary[];
}

// ─── Option Types (for variable products) ─────────────────────────────────────
export interface OptionValue {
  id: string;
  value: string;
  display_value: string | null;
  position: number;
}

export interface OptionType {
  id: string;
  name: string;
  position: number;
  values: OptionValue[];
}

// ─── Variants (for variable products) ─────────────────────────────────────────
export interface VariantOptionValue {
  option_type_id: string;
  option_type_name: string;
  option_value_id: string;
  value: string;
}

export interface Variant {
  id: string;
  sku: string | null;
  price: string;
  compare_price: string | null;
  stock: number;
  is_active: boolean;
  position: number;
  option_values: VariantOptionValue[];
  created_at: string;
  updated_at: string | null;
}

// ─── Option Groups (for configurable products) ────────────────────────────────
export type InputType = 'single' | 'multi' | 'text';

export interface OptionChoice {
  id: string;
  label: string;
  price_add_on: string;
  is_default: boolean;
  position: number;
}

export interface OptionGroup {
  id: string;
  name: string;
  input_type: InputType;
  required: boolean;
  position: number;
  choices: OptionChoice[];
}

// ─── Products ─────────────────────────────────────────────────────────────────
export type ProductType = 'simple' | 'variable' | 'configurable';

export interface CategoryBrief {
  id: string;
  name: string;
  slug: string;
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
  product_type: ProductType;
  category_id: string | null;
  category: CategoryBrief | null;
  is_active: boolean;
  in_stock: boolean;
  can_change_type: boolean;
  option_types: OptionType[] | null;
  variants: Variant[] | null;
  option_groups: OptionGroup[] | null;
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

export interface AbandonedCart {
  id: string;
  customer_id: string;
  customer_name: string | null;
  customer_email: string | null;
  updated_at: string;
  items: { id: string; product_id: string; product_name: string | null; quantity: number }[];
}

export interface AnalyticsDayPoint {
  date: string;
  revenue: number;
  orders: number;
  new_customers: number;
}

export interface AnalyticsData {
  period_days: number;
  daily_series: AnalyticsDayPoint[];
  kpis: {
    total_revenue: number;
    total_orders: number;
    avg_order_value: number;
    new_customers: number;
    revenue_growth: number | null;
    orders_growth: number | null;
    aov_growth: number | null;
    customers_growth: number | null;
  };
  orders_by_status: Record<string, number>;
  top_products: { name: string; revenue: number; units: number }[];
}

export interface CustomerDetail {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  created_at: string;
  orders: Order[];
  addresses: CustomerAddress[];
  cart: {
    id: string;
    updated_at: string;
    items: { id: string; product_id: string; product_name: string | null; quantity: number }[];
  } | null;
}

// ─── Cart ─────────────────────────────────────────────────────────────────────
export interface CartConfigurationChoiceResponse {
  choice_id: string;
  label: string;
  price_add_on: string;
}

export interface CartConfigurationEntry {
  group_id: string;
  group_name: string;
  input_type: InputType;
  selected_choices: CartConfigurationChoiceResponse[];
  text_value: string | null;
}

export interface CartConfigurationInput {
  group_id: string;
  selected_choice_ids: string[];
  text_value: string | null;
}

export interface CartItem {
  id?: string;
  product_id: string;
  product_name: string | null;
  quantity: number;
  variant_id: string | null;
  variant_label: string | null;
  unit_price: string;
  configuration: CartConfigurationEntry[] | null;
}

export interface Cart {
  id: string;
  customer_id: string;
  updated_at: string;
  items: CartItem[];
}

// ─── Orders ───────────────────────────────────────────────────────────────────
export interface OrderItem {
  id: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  unit_price: string;
  product_name_snapshot: string | null;
  variant_label_snapshot: string | null;
  configuration_snapshot: Record<string, unknown> | null;
}

export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

export interface Order {
  id: string;
  store_id: string;
  customer_id: string;
  status: OrderStatus;
  total_amount: string;
  discount_amount: string;
  delivery_fee: string;
  promo_code_used: string | null;
  shipping_address: string | null;
  notes: string | null;
  items: OrderItem[];
  created_at: string;
  updated_at: string | null;
}

export interface StoreSettings {
  delivery_fee: string;
  allow_guest_orders: boolean;
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

export interface ProductImage {
  id: string;
  product_id: string;
  store_id: string;
  variant_id: string | null;
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
