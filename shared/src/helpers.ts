import type { ApiSuccess, ApiListSuccess, ApiError } from './types'

export function ok<T = unknown>(data: T, message?: string): ApiSuccess<T> {
  return { success: true, data, message }
}

export function list<T = unknown>(data: T[], totalCount: number = data.length, message?: string): ApiListSuccess<T> {
  return { success: true, data, totalCount, message }
}

export function fail(error: string, message?: string, details?: unknown): ApiError {
  return { success: false, error, message, details }
}
