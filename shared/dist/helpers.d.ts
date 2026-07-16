import type { ApiSuccess, ApiListSuccess, ApiError } from './types';
export declare function ok<T = unknown>(data: T, message?: string): ApiSuccess<T>;
export declare function list<T = unknown>(data: T[], totalCount?: number, message?: string): ApiListSuccess<T>;
export declare function fail(error: string, message?: string, details?: unknown): ApiError;
//# sourceMappingURL=helpers.d.ts.map