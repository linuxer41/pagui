import { auth } from './stores/auth';
import { company } from './stores/company';
import { get } from 'svelte/store';
import { API_URL, APP_CONFIG } from './config';

// Interfaz para respuestas del API (nueva estructura)
interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

// Opciones para las peticiones
interface RequestOptions {
  token?: string;
  apiKey?: string;
}

// Interfaces para los datos de transacciones
export interface TransactionDay {
  date: Date;
  amount: number;
  count: number;
  formatted: {
    date: string;
    day: number;
    month: string;
    amount: string;
  };
}

export interface TransactionMonth {
  date: Date;
  amount: number;
  count: number;
  formatted: {
    month: string;
    amount: string;
  };
}

export interface TransactionSummary {
  total: number;
  count: number;
  period: {
    startDate: string;
    endDate: string;
    type: 'weekly' | 'monthly' | 'yearly';
    year: number;
    month?: number;
    week?: number;
  };
}

export interface TransactionsResponse {
  data: TransactionDay[] | TransactionMonth[];
  summary: TransactionSummary;
  responseCode: number;
}

// Interfaz para una transacción individual
export interface Transaction {
  id: string;
  type: 'incoming' | 'outgoing';
  amount: number;
  from?: string;
  to?: string;
  date: string;
  status: 'completed' | 'pending' | 'canceled';
  reference?: string;
  category?: string;
  metadata?: Record<string, any>;
}

// Interfaz para respuesta de listado de transacciones
export interface TransactionsListResponse {
  transactions: Transaction[];
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// Cliente API usando fetch nativo (actualizado para nueva API)
class ApiClient {
  // Método genérico para realizar peticiones
  private async request<T>(
    endpoint: string, 
    method: string = 'GET', 
    data?: any, 
    options: RequestOptions = {}
  ): Promise<T> {
    const url = `${API_URL}${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Obtener token del store de autenticación si no se proporciona en options
    if (!options.token) {
      const authStore = get(auth);
      if (authStore.token) {
        headers['Authorization'] = `Bearer ${authStore.token}`;
      }
    } else {
      headers['Authorization'] = `Bearer ${options.token}`;
    }

    // Añadir API key si existe
    if (options.apiKey) {
      headers['X-API-Key'] = options.apiKey;
    }
    
    const config: RequestInit = {
      method,
      headers,
    };
    
    // Añadir body si hay datos y no es GET
    if (data && method !== 'GET') {
      config.body = JSON.stringify(data);
    }
    
    try {
      const response = await fetch(url, config);
      console.log('API Response:', response);
      
      // Verificar si la respuesta es JSON
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const result = await response.json();
        
        // Verificar si hay error en la respuesta
        if (!response.ok) {
          throw new Error(result.message || 'Error en la petición');
        }
        
        return result as T;
      } else {
        // Si no es JSON, devolver el texto
        const text = await response.text();
        
        if (!response.ok) {
          throw new Error(text || 'Error en la petición');
        }
        
        return text as unknown as T;
      }
    } catch (error) {
      console.error('Error en petición API:', error);
      throw error;
    }
  }
  
  // Métodos para cada tipo de petición
  async get<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, 'GET', undefined, options);
  }
  
  async post<T>(endpoint: string, data: any, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, 'POST', data, options);
  }
  
  async put<T>(endpoint: string, data: any, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, 'PUT', data, options);
  }
  
  async delete<T>(endpoint: string, data?: any, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, 'DELETE', data, options);
  }
  
  // ============ MÉTODOS DE AUTENTICACIÓN (ACTUALIZADOS) ============
  
  // Login - POST /auth/login (nuevo endpoint)
  async login(email: string, password: string): Promise<ApiResponse> {
    const response = await this.post<ApiResponse>('/auth/login', { email, password });

    // Si la autenticación es exitosa, guardar en el store
    if (response.success && response.data) {
      const { user, accessToken, refreshToken } = response.data;
      
      // Guardar información de usuario y tokens
      if (user && accessToken) {
        auth.login(accessToken, user, refreshToken);
      }
      
      // Guardar información de la empresa si existe
      if (response.data.company) {
        company.setCompany(response.data.company);
      }
    }

    return response;
  }
  
  // Cambiar contraseña - POST /auth/change-password (nuevo endpoint)
  async changePassword(currentPassword: string, newPassword: string, options: RequestOptions = {}): Promise<ApiResponse> {
    return this.post<ApiResponse>('/auth/change-password', { currentPassword, newPassword }, options);
  }
  
  // Solicitar restablecimiento de contraseña
  async requestPasswordReset(email: string): Promise<ApiResponse> {
    return this.post<ApiResponse>('/auth/forgot-password', { email });
  }
  
  // Restablecer contraseña con token
  async resetPassword(token: string, newPassword: string): Promise<ApiResponse> {
    return this.post<ApiResponse>('/auth/reset-password', { token, newPassword });
  }

  // Método para cerrar sesión (solo en el cliente)
  logout() {
    auth.logout();
  }
  
  // ============ MÉTODOS PARA QR (ACTUALIZADOS) ============

  async getQR(qrId: string, options: RequestOptions = {}): Promise<ApiResponse> {
    return this.get<ApiResponse>(`/qr/${qrId}`, options);
  }
  
  // Generar QR - POST /qr/generate (mantiene endpoint)
  async generateQR(qrData: any, options: RequestOptions = {}): Promise<ApiResponse> {
    const apiData: any = {
      transactionId: qrData.transactionId || new Date().getTime().toString(),
      amount: qrData.amount ?? Number(qrData.monto),
    };
    if (qrData.description || qrData.descripcion) apiData.description = qrData.description || qrData.descripcion;
    if (qrData.bankId) apiData.bankId = qrData.bankId;
    if (qrData.dueDate) apiData.dueDate = qrData.dueDate;
    if (typeof qrData.singleUse !== 'undefined') apiData.singleUse = qrData.singleUse;
    if (typeof qrData.modifyAmount !== 'undefined') apiData.modifyAmount = qrData.modifyAmount;

    return this.post<ApiResponse>('/qr/generate', apiData, options);
  }
  
  // Cancelar QR - DELETE /qr/cancelQR (mantiene endpoint)
  async cancelQR(qrId: string, options: RequestOptions = {}): Promise<ApiResponse> {
    return this.delete<ApiResponse>('/qr/cancelQR', { qrId }, options);
  }
  
  // Verificar estado QR - GET /qr/{id}/status (mantiene endpoint)
  async checkQRStatus(qrId: string, options: RequestOptions = {}): Promise<ApiResponse> {
    return this.get<ApiResponse>(`/qr/${qrId}/status`, options);
  }
  
  // Listar QRs - GET /qr/list (mantiene endpoint)
  async listQRs(filters: any = {}, options: RequestOptions = {}): Promise<ApiResponse> {
    const queryParams = new URLSearchParams();
    
    if (filters.status) queryParams.append('status', filters.status);
    if (filters.startDate) queryParams.append('startDate', filters.startDate);
    if (filters.endDate) queryParams.append('endDate', filters.endDate);
    if (filters.bankId) queryParams.append('bankId', filters.bankId.toString());
    
    const queryString = queryParams.toString();
    const endpoint = `/qr/list${queryString ? `?${queryString}` : ''}`;
    
    return this.get<ApiResponse>(endpoint, options);
  }
  
  // Obtener pagos (alias para listQRs con estado PAGADO)
  async getPagos(filters: any = {}, options: RequestOptions = {}): Promise<ApiResponse> {
    // Si no se especifica un estado, establecer PAGADO por defecto
    const pagoFilters = { ...filters, status: filters.status || 'PAGADO' };
    return this.listQRs(pagoFilters, options);
  }
  
  // Obtener QRs pagados en una fecha - GET /qr/v2/paidQR/{fecha} (mantiene endpoint)
  async getPaidQRsByDate(date: string, bankId?: number, options: RequestOptions = {}): Promise<ApiResponse> {
    const endpoint = `/qr/v2/paidQR/${date}${bankId ? `?bankId=${bankId}` : ''}`;
    return this.get<ApiResponse>(endpoint, options);
  }
  
  // Simular pago (solo para desarrollo) - POST /qr/simulatePayment (mantiene endpoint)
  async simulatePayment(qrId: string, amount?: number, options: RequestOptions = {}): Promise<ApiResponse> {
    const data: any = { qrId };
    if (amount !== undefined) data.amount = amount;
    return this.post<ApiResponse>('/qr/simulatePayment', data, options);
  }
  
  // ============ MÉTODOS PARA TRANSACCIONES Y REPORTES (ACTUALIZADOS) ============
  
  // Obtener transacciones por periodo (para pantalla de resumen)
  async getTransactionsByPeriod(
    periodType: 'weekly' | 'monthly' | 'yearly', 
    year: number, 
    month?: number, 
    week?: number,
    options: RequestOptions = {}
  ): Promise<TransactionsResponse> {
    // Construir la URL para el endpoint de estadísticas
    const endpoint = `/transactions/stats/${periodType}/${year}${month !== undefined ? `/${month}` : ''}${week !== undefined ? `/${week}` : ''}`;
    
    try {
      // Intentar hacer la llamada real a la API
      return this.get<TransactionsResponse>(endpoint, options);
    } catch (error) {
      console.error('Error al obtener transacciones por periodo:', error);
      throw error;
    }
  }
  
  // Listar todas las transacciones con filtros opcionales
  async listTransactions(filters: {
    startDate?: string;
    endDate?: string;
    status?: string;
    type?: string;
    minAmount?: number;
    maxAmount?: number;
    page?: number;
    pageSize?: number;
  } = {}, options: RequestOptions = {}): Promise<ApiResponse<TransactionsListResponse>> {
    const queryParams = new URLSearchParams();
    if (filters.startDate) queryParams.append('startDate', filters.startDate);
    if (filters.endDate) queryParams.append('endDate', filters.endDate);
    if (filters.status) queryParams.append('status', filters.status);
    if (filters.type) queryParams.append('type', filters.type);
    if (filters.minAmount !== undefined) queryParams.append('minAmount', filters.minAmount.toString());
    if (filters.maxAmount !== undefined) queryParams.append('maxAmount', filters.maxAmount.toString());
    if (filters.page !== undefined) queryParams.append('page', filters.page.toString());
    if (filters.pageSize !== undefined) queryParams.append('pageSize', filters.pageSize.toString());
    
    const queryString = queryParams.toString();
    const endpoint = `/transactions${queryString ? `?${queryString}` : ''}`;
    
    return this.get<ApiResponse<TransactionsListResponse>>(endpoint, options);
  }
  
  // Obtener detalle de una transacción específica
  async getTransactionDetails(id: string, options: RequestOptions = {}): Promise<ApiResponse> {
    return this.get<ApiResponse>(`/transactions/${id}`, options);
  }
  
  // Obtener las transacciones más recientes
  async getRecentTransactions(limit: number = 3, options: RequestOptions = {}): Promise<ApiResponse<TransactionsListResponse>> {
    // Usar el endpoint de listTransactions con un límite pequeño y ordenado por fecha reciente
    return this.listTransactions({
      page: 1,
      pageSize: limit
    }, options);
  }
  

  // ============ MÉTODOS PARA API KEYS (ACTUALIZADOS) ============
  
  // Listar API keys - GET /apikeys (nuevo endpoint)
  async listApiKeys(options: RequestOptions = {}): Promise<ApiResponse> {
    return this.get<ApiResponse>('/apikeys', options);
  }
  
  // Generar API key - POST /apikeys (nuevo endpoint)
  async generateApiKey(data: any, options: RequestOptions = {}): Promise<ApiResponse> {
    return this.post<ApiResponse>('/apikeys', data, options);
  }
  
  // Revocar API key - DELETE /apikeys/{id} (nuevo endpoint)
  async revokeApiKey(id: number, options: RequestOptions = {}): Promise<ApiResponse> {
    return this.delete<ApiResponse>(`/apikeys/${id}`, undefined, options);
  }
  
  // ============ MÉTODOS PARA USUARIOS (ACTUALIZADOS) ============
  
  // Listar usuarios - GET /users/ (nuevo endpoint)
  async listUsers(options: RequestOptions = {}): Promise<ApiResponse> {
    return this.get<ApiResponse>('/users', options);
  }
  
  // Crear usuario - POST /users/ (nuevo endpoint)
  async createUser(userData: any, options: RequestOptions = {}): Promise<ApiResponse> {
    return this.post<ApiResponse>('/users', userData, options);
  }
  
  // Actualizar perfil de usuario - PUT /users/profile (nuevo endpoint)
  async updateProfile(profileData: {
    fullName?: string,
    phone?: string,
    profileImage?: File | null
  }, options: RequestOptions = {}): Promise<ApiResponse> {
    // Si hay una imagen, necesitamos usar FormData
    if (profileData.profileImage) {
      const formData = new FormData();
      if (profileData.fullName) formData.append('fullName', profileData.fullName);
      if (profileData.phone) formData.append('phone', profileData.phone);
      formData.append('profileImage', profileData.profileImage);
      
      const url = `${API_URL}/users/profile`;
      
      const headers: HeadersInit = {};
      
      // Obtener token del store de autenticación si no se proporciona en options
      if (!options.token) {
        const authStore = get(auth);
        if (authStore.token) {
          headers['Authorization'] = `Bearer ${authStore.token}`;
        }
      } else {
        headers['Authorization'] = `Bearer ${options.token}`;
      }
      
      try {
        const response = await fetch(url, {
          method: 'PUT',
          headers,
          body: formData
        });
        
        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.message || 'Error actualizando perfil');
        }
        
        return result;
      } catch (error) {
        console.error('Error actualizando perfil:', error);
        throw error;
      }
    } else {
      // Si no hay imagen, podemos usar el método PUT normal
      return this.put<ApiResponse>('/users/profile', profileData, options);
    }
  }
  
  // ============ MÉTODOS PARA BANCOS (ACTUALIZADOS) ============
  
  // Listar bancos - GET /admin/banks/ (mantiene endpoint)
  async listBanks(options: RequestOptions = {}): Promise<ApiResponse> {
    return this.get<ApiResponse>('/admin/banks', options);
  }

  // ============ MÉTODOS PARA HEALTH CHECK ============
  
  // Verificar estado del servidor - GET / (nuevo endpoint)
  async checkServerHealth(): Promise<ApiResponse> {
    return this.get<ApiResponse>('/', {});
  }
  
  // Verificar estado del sistema - GET /health (nuevo endpoint)
  async checkSystemHealth(): Promise<ApiResponse> {
    return this.get<ApiResponse>('/health', {});
  }
  
  // Verificar estado de la API - GET /health/api (nuevo endpoint)
  async checkApiHealth(): Promise<ApiResponse> {
    return this.get<ApiResponse>('/health/api', {});
  }
}

// Exportar una instancia del cliente
const api = new ApiClient();
export default api; 