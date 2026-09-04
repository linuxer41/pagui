import { auth } from './stores/auth'
import { get } from 'svelte/store'
import { goto } from '$app/navigation'
import { API_URL } from './config'
import { BaseApiClient } from '@pagui/shared'

export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

class AdminApiClient extends BaseApiClient {
  constructor() {
    super(API_URL, {
      getHeaders: () => {
        const token = get(auth).token
        return token ? { Authorization: `Bearer ${token}` } : {}
      },
      onUnauthorized: async () => false,
    })
  }

  async request<T>(endpoint: string, method = 'GET', body?: unknown, options?: Record<string, unknown>): Promise<T> {
    try {
      return await super.request<T>(endpoint, method, body, options)
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error)
      if (msg.includes('401') || msg.includes('Sesión') || msg.includes('Token') || msg.includes('autenticación')) {
        auth.logout()
        goto('/auth/login')
      }
      throw error
    }
  }

  async login(email: string, password: string): Promise<ApiResponse<any>> {
    const raw: ApiResponse<any> = await super.request('/auth/login', 'POST', { email, password }, { retryOnUnauthorized: false })
    const d = raw.data
    auth.login(d.accessToken, d.user)
    return raw
  }

  logout() { auth.logout() }

  getStats(): Promise<ApiResponse<any>> { return this.get('/admin/stats') }

  listUsers(params?: string): Promise<ApiResponse<any>> { return this.get(`/admin/users${params ? `?${params}` : ''}`) }
  getUser(id: string): Promise<ApiResponse<any>> { return this.get(`/admin/users/${id}`, {}) }
  createUser(data: Record<string, unknown>): Promise<ApiResponse<any>> { return this.post('/admin/users', data) }
  updateUser(id: string, data: Record<string, unknown>): Promise<ApiResponse<any>> { return this.put(`/admin/users/${id}`, data) }
  toggleUserStatus(id: string, status: string): Promise<ApiResponse<any>> { return this.put(`/admin/users/${id}/status`, { status }) }

  listTenants(params?: string): Promise<ApiResponse<any>> { return this.get(`/admin/tenants${params ? `?${params}` : ''}`) }
  getTenant(id: string): Promise<ApiResponse<any>> { return this.get(`/admin/tenants/${id}`, {}) }
  createTenant(data: Record<string, unknown>): Promise<ApiResponse<any>> { return this.post('/admin/tenants', data) }
  updateTenant(id: string, data: Record<string, unknown>): Promise<ApiResponse<any>> { return this.put(`/admin/tenants/${id}`, data) }
  toggleTenantStatus(id: string, status: string): Promise<ApiResponse<any>> { return this.put(`/admin/tenants/${id}/status`, { status }) }
  toggleTenantEnvironment(id: string, environment: string): Promise<ApiResponse<any>> { return this.put(`/admin/tenants/${id}/environment`, { environment }) }

  listWallets(params?: string): Promise<ApiResponse<any>> { return this.get(`/admin/wallets${params ? `?${params}` : ''}`) }
  getWallet(id: string): Promise<ApiResponse<any>> { return this.get(`/admin/wallets/${id}`, {}) }
  toggleWalletStatus(id: string, status: string): Promise<ApiResponse<any>> { return this.put(`/admin/wallets/${id}/status`, { status }) }
  creditWallet(id: string, amount: string, description?: string): Promise<ApiResponse<any>> { return this.post(`/admin/wallets/${id}/credit`, { amount, description }) }
  getWalletMovements(id: string, params?: string): Promise<ApiResponse<any>> { return this.get(`/admin/wallets/${id}/movements${params ? `?${params}` : ''}`) }
  transferWalletTenant(id: string, tenantId: string|null): Promise<ApiResponse<any>> { return this.put(`/admin/wallets/${id}/transfer-tenant`, { tenantId }) }
  getWalletPermissions(id: string): Promise<ApiResponse<any>> { return this.get(`/admin/wallets/${id}/permissions`, {}) }
  grantWalletPermission(id: string, userId: string, role?: string): Promise<ApiResponse<any>> { return this.post(`/admin/wallets/${id}/permissions`, { userId, role }) }
  revokeWalletPermission(id: string, userId: string): Promise<ApiResponse<any>> { return this.delete(`/admin/wallets/${id}/permissions/${userId}`, {}) }
  listTransactions(params?: string): Promise<ApiResponse<any>> { return this.get(`/admin/transactions${params ? `?${params}` : ''}`) }
  getTransaction(id: string): Promise<ApiResponse<any>> { return this.get(`/admin/transactions/${id}`, {}) }

  // Recaudaciones por empresa / mes
  listRecaudaciones(params?: string): Promise<ApiResponse<any>> { return this.get(`/admin/recaudaciones${params ? `?${params}` : ''}`) }
  getRecaudacionesDetail(tenantId: string, params?: string): Promise<ApiResponse<any>> { return this.get(`/admin/recaudaciones/${tenantId}${params ? `?${params}` : ''}`) }
  getDebitNote(tenantId: string, params?: string): Promise<ApiResponse<any>> { return this.get(`/admin/recaudaciones/${tenantId}/debit-note${params ? `?${params}` : ''}`) }
  toggleRecaudacionDiscount(tenantId: string, data: { enabled: boolean; threshold?: number; discountRate?: number; baseRate?: number }): Promise<ApiResponse<any>> { return this.put(`/admin/recaudaciones/${tenantId}/discount`, data) }
  listApiKeys(params?: string): Promise<ApiResponse<any>> { return this.get(`/admin/api-keys${params ? `?${params}` : ''}`) }
  getApiKey(id: string): Promise<ApiResponse<any>> { return this.get(`/admin/api-keys/${id}`) }
  createApiKey(data: Record<string, unknown>): Promise<ApiResponse<any>> { return this.post('/admin/api-keys', data) }
  revokeApiKey(id: string): Promise<ApiResponse<any>> { return this.delete(`/admin/api-keys/${id}`) }
  async getDebitNotePdf(tenantId: string, params?: string): Promise<Blob> {
    const token = get(auth).token
    const url = `${API_URL}/admin/recaudaciones/${tenantId}/debit-note/pdf${params ? `?${params}` : ''}`
    const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
    if (!res.ok) {
      const txt = await res.text()
      throw new Error(txt || `Error ${res.status}`)
    }
    return await res.blob()
  }
}

const api = new AdminApiClient()
export default api
