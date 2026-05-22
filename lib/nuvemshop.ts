/**
 * Cliente para a API Nuvemshop (Tiendanube).
 * Docs: https://tiendanube.github.io/api-documentation/
 */

const AUTH_URL  = 'https://www.nuvemshop.com.br/apps/authorize/token';
const API_BASE  = 'https://api.nuvemshop.com.br/v1';

export interface NuvemshopCredentials {
  storeId: string;
  accessToken: string;
}

// ---------- OAuth ----------

export function buildAuthorizationUrl(): string {
  const clientId = process.env.NUVEMSHOP_CLIENT_ID;
  if (!clientId) throw new Error('NUVEMSHOP_CLIENT_ID não configurado');
  return `https://www.nuvemshop.com.br/apps/${clientId}/authorize`;
}

export async function exchangeCodeForToken(code: string): Promise<{
  access_token: string;
  token_type: string;
  scope: string;
  user_id: number;
}> {
  const res = await fetch(AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id:     process.env.NUVEMSHOP_CLIENT_ID,
      client_secret: process.env.NUVEMSHOP_CLIENT_SECRET,
      grant_type:    'authorization_code',
      code,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Nuvemshop OAuth falhou: ${res.status} ${body}`);
  }
  return res.json();
}

// ---------- API helper ----------

async function apiRequest<T>(
  creds: NuvemshopCredentials,
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE}/${creds.storeId}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type':   'application/json',
      'Authentication': `bearer ${creds.accessToken}`,
      'User-Agent':     `App ${process.env.NUVEMSHOP_CLIENT_ID} - Miva Dashboard`,
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Nuvemshop API ${path}: ${res.status} ${body}`);
  }
  return res.json();
}

// ---------- Produtos ----------

export interface NuvemshopProduct {
  id: number;
  name: { pt: string };
  variants: Array<{
    id: number;
    price: string;
    cost_price: string | null;
    stock: number | null;
    sku: string | null;
  }>;
}

export async function listProducts(creds: NuvemshopCredentials, page = 1): Promise<NuvemshopProduct[]> {
  return apiRequest<NuvemshopProduct[]>(creds, `/products?page=${page}&per_page=200`);
}

// ---------- Pedidos ----------

export interface NuvemshopOrder {
  id: number;
  number: number;
  status: string;
  payment_status: string;
  gateway: string;
  created_at: string;
  total: string;
  subtotal: string;
  customer: {
    id: number;
    name: string;
    email: string;
  } | null;
  products: Array<{
    product_id: number;
    name: string;
    quantity: number;
    price: string;
  }>;
}

export async function listOrders(
  creds: NuvemshopCredentials,
  params: { page?: number; per_page?: number; status?: string } = {},
): Promise<NuvemshopOrder[]> {
  const qs = new URLSearchParams({
    page:     String(params.page     ?? 1),
    per_page: String(params.per_page ?? 200),
    ...(params.status ? { payment_status: params.status } : {}),
  });
  return apiRequest<NuvemshopOrder[]>(creds, `/orders?${qs}`);
}

// ---------- Clientes ----------

export interface NuvemshopCustomer {
  id: number;
  name: string;
  email: string;
  phone: string | null;
}

export async function listCustomers(creds: NuvemshopCredentials, page = 1): Promise<NuvemshopCustomer[]> {
  return apiRequest<NuvemshopCustomer[]>(creds, `/customers?page=${page}&per_page=200`);
}
