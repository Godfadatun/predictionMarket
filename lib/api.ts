export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const TOKEN_KEY = 'pm_token';

export interface Outcome { id: string; label: string; price: number; shares: number }
export interface Market {
  id: string; slug: string; title: string; description: string; category: string; state: string | null; status: string;
  closesAt: string; resolutionSource: string; resolutionRules: string; liquidityB: number; outcomes: Outcome[]; tradeCount: number; volumeKobo: number;
}
export interface PayoutAccount { bankCode: string; bankName: string | null; accountNumber: string; accountName: string; status: 'PENDING_VERIFICATION' | 'VERIFIED' | 'FAILED'; failureReason: string | null }
export interface Withdrawal { reference: string; amountKobo: number; status: string; source: 'MANUAL' | 'AUTO_PAYOUT'; createdAt: string }
export interface User { id: string; email: string; phone: string; fullName: string; role: 'USER' | 'ADMIN' }
export interface Position {
  id: string; marketId: string; outcomeId: string; shares: number; costKobo: number; payoutKobo: number;
  marketTitle: string; marketSlug: string; marketStatus: string; outcomeLabel: string;
}
export interface Resolution {
  marketId: string; status: string; outcomeId: string | null; isVoid: boolean; sourceUrl: string; note: string | null;
  proposedBy: string; confirmedBy: string | null; proposedAt: string; confirmedAt: string | null;
}
export interface ApiOk<T> { success: true; message: string; data: T; warnings?: string[] }
export class ApiError extends Error { constructor(public code: string, message: string, public status: number) { super(message); } }

export const token = {
  get: () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set: (t: string) => { try { localStorage.setItem(TOKEN_KEY, t); } catch { /* storage blocked */ } },
  clear: () => { try { localStorage.removeItem(TOKEN_KEY); } catch { /* storage blocked */ } },
};

export async function api<T>(path: string, init: { method?: string; body?: unknown; auth?: boolean } = {}): Promise<ApiOk<T>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const t = token.get();
  if (t) headers.Authorization = `Bearer ${t}`;
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { method: init.method ?? 'GET', headers, body: init.body ? JSON.stringify(init.body) : undefined, cache: 'no-store' });
  } catch {
    throw new ApiError('NETWORK', 'Cannot reach the server. Check your connection and try again.', 0);
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) throw new ApiError(json.code ?? `HTTP_${res.status}`, json.message ?? 'Request failed', res.status);
  return json as ApiOk<T>;
}

export const CATEGORIES = [
  { key: 'PRESIDENTIAL', label: 'Presidential' },
  { key: 'GOVERNORSHIP', label: 'Governorship' },
  { key: 'MUSIC', label: 'Music' },
  { key: 'ECONOMY', label: 'Economy' },
  { key: 'SPORTS', label: 'Sports' },
  { key: 'ENTERTAINMENT', label: 'Entertainment' },
] as const;
