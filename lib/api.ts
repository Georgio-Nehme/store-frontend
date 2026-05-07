import { Product, Customer, CustomerWithStats, Order, StoreLoginResponse, CustomerSession, PromoCode, PromoCodeValidateResponse, ProductImage, PresignResponse } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const STORE_ID = process.env.NEXT_PUBLIC_STORE_ID || '';

// ── Admin token (JWT for store admin/staff) ────────────────────────────────────
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('store_token');
}

export function setToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('store_token', token);
}

export function clearToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('store_token');
}

// ── Customer session (no JWT — just id/email/name) ────────────────────────────
export function getCustomerSession(): CustomerSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('customer_session');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setCustomerSession(session: CustomerSession): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('customer_session', JSON.stringify(session));
}

export function clearCustomerSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('customer_session');
}

export function getCustomerId(): string | null {
  return getCustomerSession()?.customer_id ?? null;
}

export function isAdmin(): boolean {
  const token = getToken();
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.role === 'admin' || payload.role === 'staff';
  } catch {
    return false;
  }
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Store-ID': STORE_ID,
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

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

// Public endpoints
export function getProducts(): Promise<Product[]> {
  return apiFetch<Product[]>('/products');
}

export function getProduct(id: string): Promise<Product> {
  return apiFetch<Product>(`/products/${id}`);
}

// Customer auth — returns a session object (no JWT)
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

// Customer endpoints (require auth)
export function createOrder(data: {
  customer_id: string;
  items: { product_id: string; quantity: number }[];
  shipping_address?: string;
  notes?: string;
  promo_code?: string;
}): Promise<Order> {
  return apiFetch<Order>('/orders', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function getOrder(id: string): Promise<Order> {
  return apiFetch<Order>(`/orders/${id}`);
}

// Admin endpoints
export function adminLogin(email: string, password: string): Promise<StoreLoginResponse> {
  return apiFetch<StoreLoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function adminGetProducts(): Promise<Product[]> {
  return apiFetch<Product[]>('/admin/products');
}

export function adminCreateProduct(data: {
  name: string;
  description?: string;
  price: string;
  compare_price?: string;
  stock: number;
  sku?: string;
  is_active: boolean;
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
  stock?: number;
  sku?: string;
  is_active?: boolean;
}): Promise<Product> {
  return apiFetch<Product>(`/admin/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function adminDeleteProduct(id: string): Promise<void> {
  return apiFetch<void>(`/admin/products/${id}`, { method: 'DELETE' });
}

export function adminUpdateStock(id: string, change: number, reason?: string): Promise<Product> {
  return apiFetch<Product>(`/admin/products/${id}/stock`, {
    method: 'PATCH',
    body: JSON.stringify({ change, reason }),
  });
}

export function adminGetOrders(): Promise<Order[]> {
  return apiFetch<Order[]>('/admin/orders');
}

export function adminUpdateOrderStatus(orderId: string, status: Order['status']): Promise<Order> {
  return apiFetch<Order>(`/admin/orders/${orderId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export function adminGetCustomers(): Promise<Customer[]> {
  return apiFetch<Customer[]>('/admin/customers');
}

export function adminGetCustomersWithStats(): Promise<CustomerWithStats[]> {
  return apiFetch<CustomerWithStats[]>('/admin/customers/with-stats');
}

// Customer order history (no auth — uses customer_id from session)
export function getMyOrders(customerId: string): Promise<Order[]> {
  return apiFetch<Order[]>(`/orders?customer_id=${customerId}`);
}

// Promo code — validate before checkout
export function validatePromoCode(code: string, orderTotal: number): Promise<PromoCodeValidateResponse> {
  return apiFetch<PromoCodeValidateResponse>('/promo-codes/validate', {
    method: 'POST',
    body: JSON.stringify({ code, order_total: orderTotal }),
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

// ── Product images (public) ────────────────────────────────────────────────────

export function getProductImages(productId: string): Promise<ProductImage[]> {
  return apiFetch<ProductImage[]>(`/products/${productId}/images`);
}

// ── Product images (admin) ─────────────────────────────────────────────────────

export function adminGetProduct(id: string): Promise<Product> {
  return apiFetch<Product>(`/admin/products/${id}`);
}

export function adminGetProductImages(productId: string): Promise<ProductImage[]> {
  return apiFetch<ProductImage[]>(`/admin/products/${productId}/images`);
}

export function adminPresignImage(
  productId: string,
  filename: string,
  contentType: string,
): Promise<PresignResponse> {
  return apiFetch<PresignResponse>(`/admin/products/${productId}/images/presign`, {
    method: 'POST',
    body: JSON.stringify({ filename, content_type: contentType }),
  });
}

/** Upload a file directly to S3 using the presigned PUT URL — no auth headers. */
export async function uploadImageToS3(uploadUrl: string, file: File): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  });
  if (!res.ok) throw new Error(`S3 upload failed: ${res.status}`);
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
