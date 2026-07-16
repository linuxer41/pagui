export interface ApiSuccess<T = unknown> {
    success: true;
    data: T;
    message?: string;
}
export interface ApiListSuccess<T = unknown> {
    success: true;
    data: T[];
    totalCount: number;
    message?: string;
}
export interface ApiError {
    success: false;
    error: string;
    message?: string;
    details?: unknown;
}
export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiListSuccess<T> | ApiError;
//# sourceMappingURL=types.d.ts.map