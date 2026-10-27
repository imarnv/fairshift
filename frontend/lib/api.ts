/* One fetch wrapper for every call. The token lives in localStorage so a worker
   on a shared basic phone stays signed in for their shift (it expires in 12 h). */

const BASE = process.env.NEXT_PUBLIC_API_BASE ?? '';
const KEY = 'ss_token';

export const session = {
  get: () => { try { return localStorage.getItem(KEY); } catch { return null; } },
  set: (t: string) => { try { localStorage.setItem(KEY, t); } catch { /* private mode: lasts this page only */ } },
  clear: () => { try { localStorage.removeItem(KEY); } catch { /* nothing stored */ } },
};

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = session.get();
  const res = await fetch(`${BASE}${path}`, {
    method: init.method ?? (init.body === undefined ? 'GET' : 'POST'),
    headers: {
      ...(init.body !== undefined && { 'Content-Type': 'application/json' }),
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  if (res.status === 401 && path !== '/api/auth/login') {
    session.clear();
    window.location.href = '/login/';
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = typeof data.detail === 'string' ? data.detail : '';
    throw new ApiError(res.status, detail);
  }
  return data as T;
}

/* Response shapes, mirroring backend/app. */

export type Reason = { code: string; value?: number; points?: number };
export type Fatigue = { level: 'ok' | 'medium' | 'high'; week_hours: number; reasons: Reason[] };
export type Me = {
  id: string; name: string; role: 'worker' | 'manager'; lang: Lang; trade: string; checked_in: boolean;
  site: { id: string; name: string; sector: string } | null;
};
export type Payslip = {
  period: string; days_worked: number; regular_hours: number; overtime_hours: number; hourly_rate: number;
  lines: { key: string; amount: number; detail: string }[]; gross: number; net: number;
  payment: PaymentView | null;
};
export type PaymentView = { status: 'created' | 'paid' | 'failed'; amount: number; payment_id: string | null; paid_at: string | null };
export type Payroll = {
  month: string; enabled: boolean; mode: 'sandbox' | 'production';
  workers: { id: string; name: string; trade: string; site_id: string; net: number; hours: number; payment: PaymentView | null }[];
};
export type HazardView = {
  id: string; site: string; site_id: string; category: string; severity: string; description: string;
  location: string; status: 'open' | 'in_progress' | 'resolved'; channel: string; created: string;
  reporter: string; due: string; overdue: boolean; met_deadline: boolean; level: number; assigned_to: string;
};
export type Credential = { id: string; skill: string; issuer: string; issued: string; token: string };
export type WorkerStatus = {
  id: string; name: string; trade: string; site_id: string; lang: Lang; checked_in: boolean; on_site_since: string | null;
  fatigue: Fatigue; quit_risk: { score: number; level: string; reasons: Reason[] };
};
export type SiteCard = {
  id: string; name: string; sector: string; city: string; code: string; workers: number; on_site: number;
  open_hazards: number; overdue_hazards: number; rating: number | null; fairness_index: number;
};
export type Overview = {
  workers: number; on_site: number; fatigue_high: number; quit_risk_high: number; open_hazards: number;
  overdue_hazards: number; week_hours: number; daily_hours: { date: string; hours: number }[]; sites: SiteCard[];
};
export type FeedbackGroup = {
  site_id: string; site: string; responses: number; people: number; hidden: boolean; needed?: number;
  average?: number; topics?: Record<string, number>; comments?: string[];
};
export type Lang = 'en' | 'hi' | 'ta' | 'te' | 'kn';
