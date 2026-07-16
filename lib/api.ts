import {
  AbandonedCart,
  AnalyticsData,
  Cart,
  CartConfigurationInput,
  CartItem,
  Category,
  Customer,
  CustomerAddress,
  CustomerDetail,
  CustomerSession,
  CustomerWithStats,
  FinanceReport,
  OptionChoice,
  OptionGroup,
  OptionType,
  OptionValue,
  Order,
  Product,
  ProductImage,
  ProductType,
  PromoCode,
  PromoCodeValidateResponse,
  Refund,
  Review,
  ReviewSummary,
  StoreSettings,
  Variant,
} from './types';
import { getAdminAccessToken } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const STORE_ID = process.env.NEXT_PUBLIC_STORE_ID || '';

function buildQuery(params: Record<string, string | number | boolean | null | undefined>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}

// ── Admin token (store admin cookie token) ─────────────────────────────────────
export function getToken(): string | null {
  return getAdminAccessToken();
}

export function setToken(_token: string): void {}

export function clearToken(): void {
  if (typeof window === 'undefined') return;
  document.cookie = 'store_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  document.cookie = 'store_refresh_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
}

// ── Customer session + token ───────────────────────────────────────────────────
export function getCustomerSession(): CustomerSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('customer_session');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getCustomerToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('customer_token');
}

export function setCustomerSession(session: CustomerSession): void {
  if (typeof window === 'undefined') return;
  const { access_token, token_type, ...sessionData } = session;
  localStorage.setItem('customer_session', JSON.stringify(sessionData));
  if (access_token) {
    localStorage.setItem('customer_token', access_token);
  } else {
    localStorage.removeItem('customer_token');
  }
}

export function clearCustomerSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('customer_session');
  localStorage.removeItem('customer_token');
}

export function getCustomerId(): string | null {
  return getCustomerSession()?.customer_id ?? null;
}

export function isAdmin(): boolean {
  const token = getToken();
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const groups: string[] = payload['cognito:groups'] ?? [];
    return groups.some(g => g.includes('admin') || g.includes('staff'));
  } catch {
    return false;
  }
}

// Paths that require a store admin token (vs. a customer token or no token)
const ADMIN_PATH_RE = /^\/(admin|platform)\//;

async function apiFetch<T>(path: string, options: RequestInit = {}, token?: string | null): Promise<T> {
  let resolvedToken: string | null;
  if (token !== undefined) {
    resolvedToken = token;
  } else if (ADMIN_PATH_RE.test(path)) {
    resolvedToken = getAdminAccessToken();
  } else {
    resolvedToken = getToken();
  }
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Store-ID': STORE_ID,
    ...((options.headers as Record<string, string>) || {}),
  };
  if (resolvedToken) {
    headers.Authorization = `Bearer ${resolvedToken}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    clearToken();
    clearCustomerSession();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }

  if (!res.ok) {
    let message = `API error: ${res.status}`;
    try {
      const err = await res.json();
      message = err.detail || err.message || message;
    } catch {}
    throw new Error(message);
  }

  if (res.status === 204) return undefined as unknown as T;
  return res.json();
}

function customerApiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  return apiFetch<T>(path, options, getCustomerToken());
}

// Public endpoints
export function getProducts(params?: {
  skip?: number;
  limit?: number;
  in_stock?: boolean;
  category_id?: string;
}): Promise<Product[]> {
  return apiFetch<Product[]>(`/products${buildQuery(params ?? {})}`);
}

export function getProduct(id: string): Promise<Product> {
  return apiFetch<Product>(`/products/${id}`);
}

export function getCategories(): Promise<Category[]> {
  return apiFetch<Category[]>('/categories');
}

export function getCategory(id: string): Promise<Category> {
  return apiFetch<Category>(`/categories/${id}`);
}

export function getCategoryProducts(id: string, params?: { skip?: number; limit?: number; in_stock?: boolean }): Promise<Product[]> {
  return apiFetch<Product[]>(`/categories/${id}/products${buildQuery(params ?? {})}`);
}

export async function getPublicStoreSettings(): Promise<StoreSettings> {
  const res = await fetch(`${API_URL}/settings`, {
    headers: { 'X-Store-ID': STORE_ID },
  });
  if (!res.ok) return {
    delivery_fee: '0',
    allow_guest_orders: false,
    sender_email: null,
    sender_email_verified: false,
    low_stock_threshold: 5,
    tag_best_seller_enabled: true,
    tag_low_stock_enabled: true,
    tag_limited_time_enabled: true,
    finance_plugin_enabled: false,
    tax_rate: '0',
  };
  return res.json();
}

// Customer auth
export function loginCustomer(email: string, password: string): Promise<CustomerSession> {
  return apiFetch<CustomerSession>('/auth/customer-login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function registerCustomer(data: { email: string; name: string; phone: string; address?: string; password: string }): Promise<Customer> {
  return apiFetch<Customer>('/customers', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function createOrder(data: {
  items: {
    product_id: string;
    quantity: number;
    variant_id?: string | null;
    configuration?: CartConfigurationInput[] | null;
  }[];
  shipping_address?: string;
  notes?: string;
  promo_code?: string;
  guest_info?: {
    name: string;
    phone: string;
    email?: string;
    shipping_address?: string;
  };
}): Promise<Order> {
  // Guest orders have no customer token — pass null explicitly so the backend's
  // optional-bearer dependency correctly handles the unauthenticated case.
  if (data.guest_info) {
    return apiFetch<Order>('/orders', { method: 'POST', body: JSON.stringify(data) }, null);
  }
  return customerApiFetch<Order>('/orders', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function syncCart(items: CartItem[]): Promise<Cart> {
  return customerApiFetch<Cart>('/cart/sync', {
    method: 'PUT',
    body: JSON.stringify({
      items: items.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        ...(item.variant_id ? { variant_id: item.variant_id } : {}),
        ...(item.configuration
          ? {
              configuration: item.configuration.map(entry => ({
                group_id: entry.group_id,
                selected_choice_ids: entry.selected_choices.map(choice => choice.choice_id),
                text_value: entry.text_value,
              })),
            }
          : {}),
      })),
    }),
  });
}

export async function getCart(): Promise<Cart | null> {
  const token = getCustomerToken();
  const res = await fetch(`${API_URL}/cart`, {
    headers: {
      'Content-Type': 'application/json',
      'X-Store-ID': STORE_ID,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (res.status === 404) return null;
  if (res.status === 401) {
    clearToken();
    clearCustomerSession();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }
  if (!res.ok) {
    let message = `API error: ${res.status}`;
    try {
      const err = await res.json();
      message = err.detail || err.message || message;
    } catch {}
    throw new Error(message);
  }
  return res.json();
}

export function getOrder(id: string): Promise<Order> {
  return customerApiFetch<Order>(`/orders/${id}`);
}

export function getMyOrders(): Promise<Order[]> {
  return customerApiFetch<Order[]>('/orders');
}

export function getMyAddresses(): Promise<CustomerAddress[]> {
  return customerApiFetch<CustomerAddress[]>('/addresses');
}

export function createAddress(data: {
  label?: string | null;
  governorate: string;
  district: string;
  city: string;
  street: string;
  building?: string | null;
  floor?: string | null;
  is_default?: boolean;
}): Promise<CustomerAddress> {
  return customerApiFetch<CustomerAddress>('/addresses', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function deleteAddress(id: string): Promise<void> {
  return customerApiFetch<void>(`/addresses/${id}`, { method: 'DELETE' });
}

export function setDefaultAddress(id: string): Promise<CustomerAddress> {
  return customerApiFetch<CustomerAddress>(`/addresses/${id}/default`, { method: 'PATCH' });
}

export function validatePromoCode(code: string, orderTotal: number): Promise<PromoCodeValidateResponse> {
  return apiFetch<PromoCodeValidateResponse>('/promo-codes/validate', {
    method: 'POST',
    body: JSON.stringify({ code, order_total: orderTotal }),
  });
}

// Admin auth is handled by backend-issued Cognito tokens stored in browser cookies.
// The adminLogin function has been removed — use adminSignIn() from lib/auth.ts instead.

// Admin products
export function adminGetProducts(): Promise<Product[]> {
  return apiFetch<Product[]>('/admin/products');
}

export function adminCreateProduct(data: {
  name: string;
  description?: string;
  price: string;
  compare_price?: string;
  cost?: string;
  stock: number;
  sku?: string;
  is_active: boolean;
  product_type?: ProductType;
  category_id?: string | null;
  moq?: number;
  is_best_seller?: boolean;
  is_limited_time?: boolean;
  limited_time_ends_at?: string | null;
}): Promise<Product> {
  return apiFetch<Product>('/admin/products', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function adminUpdateProduct(id: string, data: {
  name?: string;
  description?: string;
  price?: string;
  compare_price?: string | null;
  cost?: string | null;
  stock?: number;
  sku?: string;
  is_active?: boolean;
  product_type?: ProductType;
  category_id?: string | null;
  moq?: number;
  is_best_seller?: boolean;
  is_limited_time?: boolean;
  limited_time_ends_at?: string | null;
}): Promise<Product> {
  return apiFetch<Product>(`/admin/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function adminDeleteProduct(id: string): Promise<void> {
  return apiFetch<void>(`/admin/products/${id}`, { method: 'DELETE' });
}

// Only works for simple/configurable products; variable products return 400.
export function adminUpdateStock(id: string, change: number, reason?: string): Promise<Product> {
  return apiFetch<Product>(`/admin/products/${id}/stock`, {
    method: 'PATCH',
    body: JSON.stringify({ change, reason }),
  });
}

export function adminGetProduct(id: string): Promise<Product> {
  return apiFetch<Product>(`/admin/products/${id}`);
}

// Admin categories
export function adminGetCategories(): Promise<Category[]> {
  return apiFetch<Category[]>('/admin/categories');
}

export function adminCreateCategory(data: {
  name: string;
  slug: string;
  description?: string | null;
  parent_id?: string | null;
  position?: number;
  is_active: boolean;
}): Promise<Category> {
  return apiFetch<Category>('/admin/categories', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function adminUpdateCategory(id: string, data: {
  name?: string;
  slug?: string;
  description?: string | null;
  parent_id?: string | null;
  position?: number;
  is_active?: boolean;
}): Promise<Category> {
  return apiFetch<Category>(`/admin/categories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function adminDeleteCategory(id: string): Promise<void> {
  return apiFetch<void>(`/admin/categories/${id}`, { method: 'DELETE' });
}

// Admin option types
export function adminGetOptionTypes(): Promise<OptionType[]> {
  return apiFetch<OptionType[]>('/admin/option-types');
}

export function adminCreateOptionType(data: { name: string; position?: number }): Promise<OptionType> {
  return apiFetch<OptionType>('/admin/option-types', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function adminUpdateOptionType(id: string, data: { name?: string; position?: number }): Promise<OptionType> {
  return apiFetch<OptionType>(`/admin/option-types/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function adminDeleteOptionType(id: string): Promise<void> {
  return apiFetch<void>(`/admin/option-types/${id}`, { method: 'DELETE' });
}

export function adminAddOptionValue(typeId: string, data: { value: string; display_value?: string | null; position?: number }): Promise<OptionValue> {
  return apiFetch<OptionValue>(`/admin/option-types/${typeId}/values`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function adminUpdateOptionValue(typeId: string, valueId: string, data: {
  value?: string;
  display_value?: string | null;
  position?: number;
}): Promise<OptionValue> {
  return apiFetch<OptionValue>(`/admin/option-types/${typeId}/values/${valueId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function adminDeleteOptionValue(typeId: string, valueId: string): Promise<void> {
  return apiFetch<void>(`/admin/option-types/${typeId}/values/${valueId}`, { method: 'DELETE' });
}

// Admin variant management
export function adminGetVariants(productId: string): Promise<Variant[]> {
  return apiFetch<Variant[]>(`/admin/products/${productId}/variants`);
}

export function adminCreateVariant(productId: string, data: {
  sku?: string;
  price: string;
  compare_price?: string | null;
  stock: number;
  is_active: boolean;
  position?: number;
  option_value_ids: string[];
}): Promise<Variant> {
  return apiFetch<Variant>(`/admin/products/${productId}/variants`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function adminUpdateVariant(productId: string, variantId: string, data: {
  sku?: string | null;
  price?: string;
  compare_price?: string | null;
  stock?: number;
  is_active?: boolean;
  position?: number;
  option_value_ids?: string[];
}): Promise<Variant> {
  return apiFetch<Variant>(`/admin/products/${productId}/variants/${variantId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function adminDeleteVariant(productId: string, variantId: string): Promise<void> {
  return apiFetch<void>(`/admin/products/${productId}/variants/${variantId}`, { method: 'DELETE' });
}

export function adminSetProductOptionTypes(productId: string, option_type_ids: string[]): Promise<Product> {
  return apiFetch<Product>(`/admin/products/${productId}/option-types`, {
    method: 'PUT',
    body: JSON.stringify({ option_type_ids }),
  });
}

// Admin option groups
export function adminGetOptionGroups(productId: string): Promise<OptionGroup[]> {
  return apiFetch<OptionGroup[]>(`/admin/products/${productId}/option-groups`);
}

export function adminCreateOptionGroup(productId: string, data: {
  name: string;
  input_type: 'single' | 'multi' | 'text';
  required: boolean;
  position?: number;
}): Promise<OptionGroup> {
  return apiFetch<OptionGroup>(`/admin/products/${productId}/option-groups`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function adminUpdateOptionGroup(productId: string, groupId: string, data: {
  name?: string;
  input_type?: 'single' | 'multi' | 'text';
  required?: boolean;
  position?: number;
}): Promise<OptionGroup> {
  return apiFetch<OptionGroup>(`/admin/products/${productId}/option-groups/${groupId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function adminDeleteOptionGroup(productId: string, groupId: string): Promise<void> {
  return apiFetch<void>(`/admin/products/${productId}/option-groups/${groupId}`, { method: 'DELETE' });
}

export function adminAddOptionChoice(productId: string, groupId: string, data: {
  label: string;
  price_add_on: string;
  is_default?: boolean;
  position?: number;
}): Promise<OptionChoice> {
  return apiFetch<OptionChoice>(`/admin/products/${productId}/option-groups/${groupId}/choices`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function adminUpdateOptionChoice(productId: string, groupId: string, choiceId: string, data: {
  label?: string;
  price_add_on?: string;
  is_default?: boolean;
  position?: number;
}): Promise<OptionChoice> {
  return apiFetch<OptionChoice>(`/admin/products/${productId}/option-groups/${groupId}/choices/${choiceId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function adminDeleteOptionChoice(productId: string, groupId: string, choiceId: string): Promise<void> {
  return apiFetch<void>(`/admin/products/${productId}/option-groups/${groupId}/choices/${choiceId}`, { method: 'DELETE' });
}

// Admin orders
export function adminGetOrders(): Promise<Order[]> {
  return apiFetch<Order[]>('/admin/orders');
}

export function adminGetOrder(orderId: string): Promise<Order> {
  return apiFetch<Order>(`/admin/orders/${orderId}`);
}

export function adminCreateRefund(orderId: string, data: { amount: string; reason?: string }): Promise<Refund> {
  return apiFetch<Refund>(`/admin/orders/${orderId}/refunds`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function adminUpdateOrderStatus(orderId: string, status: Order['status']): Promise<Order> {
  return apiFetch<Order>(`/admin/orders/${orderId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

// Admin customers
export function adminGetCustomers(): Promise<Customer[]> {
  return apiFetch<Customer[]>('/admin/customers');
}

export function adminGetCustomersWithStats(): Promise<CustomerWithStats[]> {
  return apiFetch<CustomerWithStats[]>('/admin/customers/with-stats');
}

export function adminGetCustomerDetail(id: string): Promise<CustomerDetail> {
  return apiFetch<CustomerDetail>(`/admin/customers/${id}`);
}

// Admin carts
export function adminGetAbandonedCarts(): Promise<AbandonedCart[]> {
  return apiFetch<AbandonedCart[]>('/admin/carts/abandoned');
}

// Admin analytics
export function adminGetAnalytics(
  params: { days?: number; start_date?: string; end_date?: string } = { days: 30 }
): Promise<AnalyticsData> {
  const { days, start_date, end_date } = params;
  if (start_date && end_date) {
    return apiFetch<AnalyticsData>(`/admin/analytics?start_date=${start_date}&end_date=${end_date}`);
  }
  return apiFetch<AnalyticsData>(`/admin/analytics?days=${days ?? 30}`);
}

// Admin finance
export function adminGetFinanceReport(
  params: { days?: number; start_date?: string; end_date?: string } = { days: 30 }
): Promise<FinanceReport> {
  const { days, start_date, end_date } = params;
  if (start_date && end_date) {
    return apiFetch<FinanceReport>(`/admin/finance/report?start_date=${start_date}&end_date=${end_date}`);
  }
  return apiFetch<FinanceReport>(`/admin/finance/report?days=${days ?? 30}`);
}

// Admin settings
export async function getStoreSettings(): Promise<StoreSettings> {
  return apiFetch<StoreSettings>('/admin/settings');
}

export async function updateStoreSettings(data: {
  delivery_fee?: number;
  allow_guest_orders?: boolean;
  sender_email?: string;
  low_stock_threshold?: number;
  tag_best_seller_enabled?: boolean;
  tag_low_stock_enabled?: boolean;
  tag_limited_time_enabled?: boolean;
  tax_rate?: number;
}): Promise<StoreSettings> {
  return apiFetch<StoreSettings>('/admin/settings', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function adminResendSenderVerification(): Promise<StoreSettings> {
  return apiFetch<StoreSettings>('/admin/settings/sender-email/resend', {
    method: 'POST',
  });
}

// Admin promo code CRUD
export function adminGetPromoCodes(): Promise<PromoCode[]> {
  return apiFetch<PromoCode[]>('/admin/promo-codes');
}

export function adminCreatePromoCode(data: {
  code: string;
  description?: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: string;
  min_order_amount?: string;
  max_uses?: number;
  expires_at?: string;
  is_active: boolean;
}): Promise<PromoCode> {
  return apiFetch<PromoCode>('/admin/promo-codes', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function adminUpdatePromoCode(id: string, data: {
  is_active?: boolean;
  description?: string;
  max_uses?: number | null;
  expires_at?: string | null;
}): Promise<PromoCode> {
  return apiFetch<PromoCode>(`/admin/promo-codes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function adminDeletePromoCode(id: string): Promise<void> {
  return apiFetch<void>(`/admin/promo-codes/${id}`, { method: 'DELETE' });
}

// ── Reviews (public) ────────────────────────────────────────────────────────────
export function getProductReviews(productId: string, params?: { skip?: number; limit?: number }): Promise<Review[]> {
  return apiFetch<Review[]>(`/products/${productId}/reviews${buildQuery(params ?? {})}`);
}

export function getProductReviewSummary(productId: string): Promise<ReviewSummary> {
  return apiFetch<ReviewSummary>(`/products/${productId}/reviews/summary`);
}

export function createProductReview(productId: string, data: { rating: number; title?: string; body?: string }): Promise<Review> {
  return customerApiFetch<Review>(`/products/${productId}/reviews`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function getStoreReviews(params?: { skip?: number; limit?: number }): Promise<Review[]> {
  return apiFetch<Review[]>(`/reviews${buildQuery(params ?? {})}`);
}

export function getStoreReviewSummary(): Promise<ReviewSummary> {
  return apiFetch<ReviewSummary>('/reviews/summary');
}

export function createStoreReview(data: { rating: number; title?: string; body?: string }): Promise<Review> {
  return customerApiFetch<Review>('/reviews', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateReview(reviewId: string, data: { rating?: number; title?: string; body?: string }): Promise<Review> {
  return customerApiFetch<Review>(`/reviews/${reviewId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteReview(reviewId: string): Promise<void> {
  return customerApiFetch<void>(`/reviews/${reviewId}`, { method: 'DELETE' });
}

// ── Reviews (admin) ──────────────────────────────────────────────────────────────
export function adminGetReviews(params?: { product_id?: string }): Promise<Review[]> {
  return apiFetch<Review[]>(`/admin/reviews${buildQuery(params ?? {})}`);
}

export function adminModerateReview(reviewId: string, is_hidden: boolean): Promise<Review> {
  return apiFetch<Review>(`/admin/reviews/${reviewId}`, {
    method: 'PATCH',
    body: JSON.stringify({ is_hidden }),
  });
}

export function adminDeleteReview(reviewId: string): Promise<void> {
  return apiFetch<void>(`/admin/reviews/${reviewId}`, { method: 'DELETE' });
}

// ── Product images (public) ────────────────────────────────────────────────────
export function getProductImages(productId: string): Promise<ProductImage[]> {
  return apiFetch<ProductImage[]>(`/products/${productId}/images`);
}

// ── Product images (admin) ─────────────────────────────────────────────────────
export function adminGetProductImages(productId: string): Promise<ProductImage[]> {
  return apiFetch<ProductImage[]>(`/admin/products/${productId}/images`);
}

export async function adminUploadImage(productId: string, file: File, variantId?: string): Promise<ProductImage> {
  const token = getToken();
  const form = new FormData();
  form.append('file', file);
  if (variantId) form.append('variant_id', variantId);

  const res = await fetch(`${API_URL}/admin/products/${productId}/images`, {
    method: 'POST',
    headers: {
      'X-Store-ID': STORE_ID,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: form,
  });

  if (!res.ok) {
    let message = `Upload failed: ${res.status}`;
    try {
      const err = await res.json();
      message = err.detail || err.message || message;
    } catch {}
    throw new Error(message);
  }

  return res.json();
}

export function adminUpdateProductImage(
  productId: string,
  imageId: string,
  data: { position?: number; is_primary?: boolean },
): Promise<ProductImage> {
  return apiFetch<ProductImage>(`/admin/products/${productId}/images/${imageId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function adminDeleteProductImage(productId: string, imageId: string): Promise<void> {
  return apiFetch<void>(`/admin/products/${productId}/images/${imageId}`, { method: 'DELETE' });
}
