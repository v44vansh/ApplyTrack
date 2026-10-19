import { Activity, Application } from '../types'

const configuredApiBase = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '')
const supabaseEnvConfigured = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)
const apiBase = configuredApiBase ?? (import.meta.env.PROD && !supabaseEnvConfigured ? '' : undefined)

export const isApiConfigured = Boolean(configuredApiBase) || (import.meta.env.PROD && !supabaseEnvConfigured)

export type SessionUser = { id: string; email: string; name: string }
export type WorkspaceSnapshot = { applications: Application[]; activities: Activity[]; revision: string }

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (apiBase === undefined) throw new Error('API is not configured')
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.message ?? body.error ?? `Request failed (${response.status})`)
  return body as T
}

export const authApi = {
  me: () => request<{ user: SessionUser }>('/api/auth/me'),
  login: (email: string, password: string) => request<{ user: SessionUser }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (name: string, email: string, password: string) => request<{ user: SessionUser }>('/api/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) }),
  logout: () => request<{ ok: true }>('/api/auth/logout', { method: 'POST' }),
}

export const workspaceApi = {
  load: () => request<WorkspaceSnapshot>('/api/workspace'),
  create: (application: Application) => request<Application>('/api/applications', { method: 'POST', body: JSON.stringify(application) }),
  update: (id: string, patch: Partial<Application>) => request<Application>(`/api/applications/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  remove: (id: string) => request<{ ok: true }>(`/api/applications/${id}`, { method: 'DELETE' }),
}
