import type { ApiError } from './types'

export interface AuthProvider {
  getHeaders(): Record<string, string>
  onUnauthorized?(): Promise<boolean>
}

export class JwtAuthProvider implements AuthProvider {
  constructor(private getToken: () => string | null) {}

  getHeaders(): Record<string, string> {
    const token = this.getToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  async onUnauthorized(): Promise<boolean> {
    return false
  }
}

export class ApiKeyAuthProvider implements AuthProvider {
  constructor(private apiKey: string) {}

  getHeaders(): Record<string, string> {
    return { 'x-api-key': this.apiKey }
  }
}

import type { TSchema } from '@sinclair/typebox'
import { Value } from '@sinclair/typebox/value'

export interface RequestOptions {
  headers?: Record<string, string>
  timeout?: number
  retryOnUnauthorized?: boolean
  schema?: TSchema
}

const PUBLIC_ENDPOINTS = ['/auth/login', '/auth/forgot-password', '/auth/reset-password']

export class BaseApiClient {
  constructor(
    protected baseUrl: string,
    protected auth: AuthProvider
  ) {}

  async request<T>(endpoint: string, method: string = 'GET', body?: unknown, options?: RequestOptions): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.auth.getHeaders(),
      ...options?.headers,
    }

    const fetchOptions: RequestInit = { method, headers }
    if (body !== undefined && method !== 'GET') {
      fetchOptions.body = JSON.stringify(body)
    }

    const controller = new AbortController()
    const timeoutMs = options?.timeout ?? 30000
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
    fetchOptions.signal = controller.signal

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, fetchOptions)

      const contentType = response.headers.get('content-type') || ''
      let result: any
      if (contentType.includes('application/json')) {
        result = await response.json()
      } else {
        const text = await response.text()
        if (!response.ok) throw new Error(text || `HTTP ${response.status}`)
        return text as T
      }

      if (!response.ok) {
        const err = result as ApiError
        if (response.status === 401 && options?.retryOnUnauthorized !== false && this.auth.onUnauthorized) {
          const refreshed = await this.auth.onUnauthorized()
          if (refreshed) {
            return this.request<T>(endpoint, method, body, { ...options, retryOnUnauthorized: false })
          }
        }
        if (PUBLIC_ENDPOINTS.includes(endpoint) && response.status === 401) {
          throw new Error('Credenciales inválidas')
        }
        throw new Error(err.message || err.error || `Error en la petición`)
      }

      if (options?.schema) {
        try {
          return Value.Decode(options.schema, result) as T
        } catch (err: any) {
          throw new Error(`Response validation failed: ${err.message}`)
        }
      }

      return result as T
    } finally {
      clearTimeout(timeoutId)
    }
  }

  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, 'GET', undefined, options)
  }

  async post<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, 'POST', body, options)
  }

  async put<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, 'PUT', body, options)
  }

  async delete<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, 'DELETE', body, options)
  }
}
