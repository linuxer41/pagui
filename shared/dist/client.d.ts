export interface AuthProvider {
    getHeaders(): Record<string, string>;
    onUnauthorized?(): Promise<boolean>;
}
export declare class JwtAuthProvider implements AuthProvider {
    private getToken;
    constructor(getToken: () => string | null);
    getHeaders(): Record<string, string>;
    onUnauthorized(): Promise<boolean>;
}
export declare class ApiKeyAuthProvider implements AuthProvider {
    private apiKey;
    constructor(apiKey: string);
    getHeaders(): Record<string, string>;
}
import type { TSchema } from '@sinclair/typebox';
export interface RequestOptions {
    headers?: Record<string, string>;
    timeout?: number;
    retryOnUnauthorized?: boolean;
    schema?: TSchema;
}
export declare class BaseApiClient {
    protected baseUrl: string;
    protected auth: AuthProvider;
    constructor(baseUrl: string, auth: AuthProvider);
    request<T>(endpoint: string, method?: string, body?: unknown, options?: RequestOptions): Promise<T>;
    get<T>(endpoint: string, options?: RequestOptions): Promise<T>;
    post<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T>;
    put<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T>;
    delete<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T>;
}
//# sourceMappingURL=client.d.ts.map