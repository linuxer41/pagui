import { auth } from './stores/auth';
import { get } from 'svelte/store';
import { API_URL, APP_CONFIG } from './config';

// Interfaz para respuestas del API
interface ApiResponse<T = any> {
  responseCode: number;
  message?: string;
  [key: string]: any;
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
  responseCode: number;
  transactions: Transaction[];
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  message?: string;
}

// Cliente API usando fetch nativo
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
      // credentials: 'include',
    };
    
    // Añadir body si hay datos y no es GET
    if (data && method !== 'GET') {
      config.body = JSON.stringify(data);
    }
    
    try {
      const response = await fetch(url, config);
      console.log(response);
      
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
  
  // ============ MÉTODOS DE AUTENTICACIÓN ============
  
  // Login - POST /api/authentication/authenticate
  async login(email: string, password: string): Promise<ApiResponse> {
    const response = await this.post<ApiResponse>('/authentication/authenticate', { email, password });

    // Si la autenticación es exitosa, guardar en el store
    if (response.user && response.auth && response.auth.accessToken) {
      const user = response.user;
      const accessToken = response.auth.accessToken;
      const refreshToken = response.auth.refreshToken;
      auth.login(accessToken, user, refreshToken);
    }

    return response;
  }
  
  // Cambiar contraseña - POST /api/users/change-password
  async changePassword(currentPassword: string, newPassword: string, options: RequestOptions = {}): Promise<ApiResponse> {
    return this.post<ApiResponse>('/users/change-password', { currentPassword, newPassword }, options);
  }
  
  // Método para cerrar sesión (solo en el cliente)
  logout() {
    auth.logout();
  }
  
  // ============ MÉTODOS PARA QR ============
  
  // Generar QR - POST /api/qrsimple/generateQR
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

    return this.post<ApiResponse>('/qrsimple/generateQR', apiData, options);
  }
  
  // Cancelar QR - DELETE /api/qrsimple/cancelQR
  async cancelQR(qrId: string, options: RequestOptions = {}): Promise<ApiResponse> {
    return this.delete<ApiResponse>('/qrsimple/cancelQR', { qrId }, options);
  }
  
  // Verificar estado QR - GET /api/qrsimple/v2/statusQR/{id}
  async checkQRStatus(qrId: string, options: RequestOptions = {}): Promise<ApiResponse> {
    return this.get<ApiResponse>(`/qrsimple/v2/statusQR/${qrId}`, options);
  }
  
  // Listar QRs - GET /api/qrsimple/list
  async listQRs(filters: any = {}, options: RequestOptions = {}): Promise<ApiResponse> {
    const queryParams = new URLSearchParams();
    
    if (filters.status) queryParams.append('status', filters.status);
    if (filters.startDate) queryParams.append('startDate', filters.startDate);
    if (filters.endDate) queryParams.append('endDate', filters.endDate);
    if (filters.bankId) queryParams.append('bankId', filters.bankId.toString());
    
    const queryString = queryParams.toString();
    const endpoint = `/qrsimple/list${queryString ? `?${queryString}` : ''}`;
    
    return this.get<ApiResponse>(endpoint, options);
  }
  
  // Obtener pagos (alias para listQRs con estado PAGADO)
  async getPagos(filters: any = {}, options: RequestOptions = {}): Promise<ApiResponse> {
    // Si no se especifica un estado, establecer PAGADO por defecto
    const pagoFilters = { ...filters, status: filters.status || 'PAGADO' };
    return this.listQRs(pagoFilters, options);
  }
  
  // Obtener QRs pagados en una fecha - GET /api/qrsimple/v2/paidQR/{fecha}
  async getPaidQRsByDate(date: string, bankId?: number, options: RequestOptions = {}): Promise<ApiResponse> {
    const endpoint = `/qrsimple/v2/paidQR/${date}${bankId ? `?bankId=${bankId}` : ''}`;
    return this.get<ApiResponse>(endpoint, options);
  }
  
  // Simular pago (solo para desarrollo) - POST /api/qrsimple/simulatePayment
  async simulatePayment(qrId: string, amount?: number, options: RequestOptions = {}): Promise<ApiResponse> {
    const data: any = { qrId };
    if (amount !== undefined) data.amount = amount;
    return this.post<ApiResponse>('/qrsimple/simulatePayment', data, options);
  }
  
  // ============ MÉTODOS PARA TRANSACCIONES Y REPORTES ============
  
  // Obtener transacciones por periodo (para pantalla de resumen)
  async getTransactionsByPeriod(
    periodType: 'weekly' | 'monthly' | 'yearly', 
    year: number, 
    month?: number, 
    week?: number,
    options: RequestOptions = {}
  ): Promise<TransactionsResponse> {
    // Esta es una implementación simulada para desarrollo
    
    // En producción, este método haría una llamada real a la API:
    // return this.get<TransactionsResponse>(`/transactions/stats/${periodType}/${year}${month ? `/${month}` : ''}${week ? `/${week}` : ''}`, options);
    
    // Simulación para desarrollo:
    if (periodType === 'monthly' && month !== undefined) {
      return this.generateMockMonthlyData(year, month);
    } else if (periodType === 'weekly' && week !== undefined) {
      return this.generateMockWeeklyData(year, week);
    } else if (periodType === 'yearly') {
      return this.generateMockYearlyData(year);
    } else {
      throw new Error('Parámetros inválidos para obtener transacciones por período');
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
  } = {}, options: RequestOptions = {}): Promise<TransactionsListResponse> {
    // En producción, este método haría una llamada real a la API
    // const queryParams = new URLSearchParams();
    // if (filters.startDate) queryParams.append('startDate', filters.startDate);
    // if (filters.endDate) queryParams.append('endDate', filters.endDate);
    // if (filters.status) queryParams.append('status', filters.status);
    // if (filters.type) queryParams.append('type', filters.type);
    // if (filters.minAmount !== undefined) queryParams.append('minAmount', filters.minAmount.toString());
    // if (filters.maxAmount !== undefined) queryParams.append('maxAmount', filters.maxAmount.toString());
    // if (filters.page !== undefined) queryParams.append('page', filters.page.toString());
    // if (filters.pageSize !== undefined) queryParams.append('pageSize', filters.pageSize.toString());
    
    // const queryString = queryParams.toString();
    // const endpoint = `/transactions${queryString ? `?${queryString}` : ''}`;
    
    // return this.get<TransactionsListResponse>(endpoint, options);
    
    // Simulación para desarrollo:
    return new Promise((resolve) => {
      setTimeout(() => {
        // Generar transacciones mock
        const mockTransactions = this.generateMockTransactions();
        
        // Aplicar filtros si existen
        let filtered = [...mockTransactions];
        
        if (filters.status) {
          filtered = filtered.filter(tx => tx.status === filters.status);
        }
        
        if (filters.type) {
          filtered = filtered.filter(tx => tx.type === filters.type);
        }
        
        if (filters.startDate) {
          const startDate = new Date(filters.startDate);
          filtered = filtered.filter(tx => new Date(tx.date) >= startDate);
        }
        
        if (filters.endDate) {
          const endDate = new Date(filters.endDate);
          filtered = filtered.filter(tx => new Date(tx.date) <= endDate);
        }
        
        if (filters.minAmount !== undefined) {
          filtered = filtered.filter(tx => tx.amount >= filters.minAmount!);
        }
        
        if (filters.maxAmount !== undefined) {
          filtered = filtered.filter(tx => tx.amount <= filters.maxAmount!);
        }
        
        // Paginación
        const page = filters.page || 1;
        const pageSize = filters.pageSize || 10;
        const startIndex = (page - 1) * pageSize;
        const paginatedTransactions = filtered.slice(startIndex, startIndex + pageSize);
        
        resolve({
          responseCode: 0,
          transactions: paginatedTransactions,
          pagination: {
            page,
            pageSize,
            total: filtered.length,
            totalPages: Math.ceil(filtered.length / pageSize)
          }
        });
      }, 500); // Simular retraso de red
    });
  }
  
  // Obtener detalle de una transacción específica
  async getTransactionDetails(id: string, options: RequestOptions = {}): Promise<ApiResponse> {
    // En producción:
    // return this.get<ApiResponse>(`/transactions/${id}`, options);
    
    // Simulación para desarrollo:
    return new Promise((resolve) => {
      setTimeout(() => {
        const allTransactions = this.generateMockTransactions();
        const transaction = allTransactions.find(tx => tx.id === id);
        
        if (transaction) {
          resolve({
            responseCode: 0,
            transaction
          });
        } else {
          resolve({
            responseCode: 404,
            message: 'Transacción no encontrada'
          });
        }
      }, 300);
    });
  }
  
  // Obtener las transacciones más recientes
  async getRecentTransactions(limit: number = 3, options: RequestOptions = {}): Promise<TransactionsListResponse> {
    // En producción:
    // return this.get<TransactionsListResponse>(`/transactions/recent?limit=${limit}`, options);
    
    // Simulación para desarrollo:
    return new Promise((resolve) => {
      setTimeout(() => {
        const allTransactions = this.generateMockTransactions();
        const sortedTransactions = [...allTransactions].sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        
        resolve({
          responseCode: 0,
          transactions: sortedTransactions.slice(0, limit)
        });
      }, 300);
    });
  }
  
  // Método privado para generar transacciones simuladas
  private generateMockTransactions(): Transaction[] {
    const transactions: Transaction[] = [
      {
        id: 'tx1',
        type: 'incoming',
        amount: 350.00,
        from: 'Carlos Méndez',
        date: new Date().toISOString(),
        status: 'completed',
        reference: 'PAY-12345',
        category: 'income'
      },
      {
        id: 'tx2',
        type: 'outgoing',
        amount: 120.50,
        to: 'Supermercado XYZ',
        date: new Date(Date.now() - 86400000).toISOString(), // ayer
        status: 'completed',
        reference: 'INV-5678',
        category: 'groceries'
      },
      {
        id: 'tx3',
        type: 'incoming',
        amount: 1000.00,
        from: 'Pago Mensual',
        date: new Date(Date.now() - 86400000 * 5).toISOString(), // hace 5 días
        status: 'completed',
        reference: 'SALARY-202305',
        category: 'salary'
      },
      {
        id: 'tx4',
        type: 'incoming',
        amount: 250.75,
        from: 'Ana López',
        date: new Date(Date.now() - 86400000 * 2).toISOString(), // hace 2 días
        status: 'pending',
        reference: 'PAY-67890',
        category: 'services'
      },
      {
        id: 'tx5',
        type: 'outgoing',
        amount: 75.20,
        to: 'Farmacia',
        date: new Date(Date.now() - 86400000 * 3).toISOString(), // hace 3 días
        status: 'canceled',
        reference: 'MED-1234',
        category: 'health'
      },
      {
        id: 'tx6',
        type: 'incoming',
        amount: 520.30,
        from: 'Roberto Jiménez',
        date: new Date(Date.now() - 86400000 * 1).toISOString(), // hace 1 día
        status: 'pending',
        reference: 'INV-9012',
        category: 'services'
      },
      {
        id: 'tx7',
        type: 'outgoing',
        amount: 35.80,
        to: 'Suscripción Mensual',
        date: new Date(Date.now() - 86400000 * 7).toISOString(), // hace 7 días
        status: 'completed',
        reference: 'SUB-3456',
        category: 'entertainment'
      },
      {
        id: 'tx8',
        type: 'outgoing',
        amount: 430.25,
        to: 'Alquiler',
        date: new Date(Date.now() - 86400000 * 10).toISOString(), // hace 10 días
        status: 'completed',
        reference: 'RENT-202305',
        category: 'housing'
      },
      {
        id: 'tx9',
        type: 'incoming',
        amount: 180.00,
        from: 'Reembolso',
        date: new Date(Date.now() - 86400000 * 6).toISOString(), // hace 6 días
        status: 'completed',
        reference: 'REF-7890',
        category: 'refund'
      },
      {
        id: 'tx10',
        type: 'outgoing',
        amount: 65.99,
        to: 'Restaurante La Buena Mesa',
        date: new Date(Date.now() - 86400000 * 4).toISOString(), // hace 4 días
        status: 'completed',
        reference: 'FOOD-1234',
        category: 'dining'
      },
      {
        id: 'tx11',
        type: 'outgoing',
        amount: 22.50,
        to: 'Taxi',
        date: new Date(Date.now() - 86400000 * 8).toISOString(), // hace 8 días
        status: 'completed',
        reference: 'RIDE-5678',
        category: 'transportation'
      },
      {
        id: 'tx12',
        type: 'incoming',
        amount: 150.00,
        from: 'Proyecto Freelance',
        date: new Date(Date.now() - 86400000 * 15).toISOString(), // hace 15 días
        status: 'completed',
        reference: 'PROJ-9012',
        category: 'freelance'
      }
    ];
    
    return transactions;
  }
  
  // ============ MÉTODOS DE SIMULACIÓN DE DATOS ============
  
  // Generar un monto aleatorio dentro de un rango
  private generateRandomAmount(min: number, max: number): number {
    return Math.round((Math.random() * (max - min) + min) * 100) / 100;
  }
  
  // Formatear montos con separador de miles y decimales
  private formatCurrency(amount: number): string {
    return amount.toLocaleString('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
  
  // Obtener nombres de los meses
  private getMonthName(month: number): string {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return months[month];
  }
  
  // Generar datos simulados diarios para un mes específico
  private generateMockMonthlyData(year: number, month: number): TransactionsResponse {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);
    
    const data: TransactionDay[] = [];
    const currentDate = new Date(startDate);
    let totalAmount = 0;
    let totalCount = 0;
    
    // Generar datos para cada día del mes
    while (currentDate <= endDate) {
      const amount = this.generateRandomAmount(100, 1500);
      const count = Math.floor(Math.random() * 10) + 1;
      
      data.push({
        date: new Date(currentDate),
        amount: amount,
        count: count,
        formatted: {
          date: currentDate.toISOString().split('T')[0],
          day: currentDate.getDate(),
          month: this.getMonthName(currentDate.getMonth()).substring(0, 3),
          amount: this.formatCurrency(amount)
        }
      });
      
      totalAmount += amount;
      totalCount += count;
      
      // Avanzar al siguiente día
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return {
      data,
      summary: {
        total: totalAmount,
        count: totalCount,
        period: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          type: 'monthly',
          year,
          month
        }
      },
      responseCode: 200
    };
  }
  
  // Generar datos simulados diarios para una semana específica
  private generateMockWeeklyData(year: number, week: number): TransactionsResponse {
    const firstDayOfYear = new Date(year, 0, 1);
    const startDate = new Date(firstDayOfYear);
    startDate.setDate(firstDayOfYear.getDate() + (week - 1) * 7);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    
    const data: TransactionDay[] = [];
    const currentDate = new Date(startDate);
    let totalAmount = 0;
    let totalCount = 0;
    
    // Generar datos para cada día de la semana
    while (currentDate <= endDate) {
      const amount = this.generateRandomAmount(50, 800);
      const count = Math.floor(Math.random() * 5) + 1;
      
      data.push({
        date: new Date(currentDate),
        amount: amount,
        count: count,
        formatted: {
          date: currentDate.toISOString().split('T')[0],
          day: currentDate.getDate(),
          month: this.getMonthName(currentDate.getMonth()).substring(0, 3),
          amount: this.formatCurrency(amount)
        }
      });
      
      totalAmount += amount;
      totalCount += count;
      
      // Avanzar al siguiente día
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return {
      data,
      summary: {
        total: totalAmount,
        count: totalCount,
        period: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          type: 'weekly',
          year,
          week
        }
      },
      responseCode: 200
    };
  }
  
  // Generar datos simulados mensuales para un año completo
  private generateMockYearlyData(year: number): TransactionsResponse {
    const data: TransactionMonth[] = [];
    let totalAmount = 0;
    let totalCount = 0;
    
    // Generar datos para cada mes del año
    for (let month = 0; month < 12; month++) {
      const amount = this.generateRandomAmount(5000, 25000);
      const count = Math.floor(Math.random() * 30) + 10;
      
      data.push({
        date: new Date(year, month, 1),
        amount: amount,
        count: count,
        formatted: {
          month: this.getMonthName(month),
          amount: this.formatCurrency(amount)
        }
      });
      
      totalAmount += amount;
      totalCount += count;
    }
    
    return {
      data,
      summary: {
        total: totalAmount,
        count: totalCount,
        period: {
          startDate: new Date(year, 0, 1).toISOString().split('T')[0],
          endDate: new Date(year, 11, 31).toISOString().split('T')[0],
          type: 'yearly',
          year
        }
      },
      responseCode: 200
    };
  }
  
  // ============ MÉTODOS PARA API KEYS ============
  
  // Listar API keys - GET /api/api-keys/
  async listApiKeys(options: RequestOptions = {}): Promise<ApiResponse> {
    return this.get<ApiResponse>('/api-keys', options);
  }
  
  // Generar API key - POST /api/api-keys/
  async generateApiKey(data: any, options: RequestOptions = {}): Promise<ApiResponse> {
    return this.post<ApiResponse>('/api-keys', data, options);
  }
  
  // Revocar API key - DELETE /api/api-keys/{id}
  async revokeApiKey(id: number, options: RequestOptions = {}): Promise<ApiResponse> {
    return this.delete<ApiResponse>(`/api-keys/${id}`, undefined, options);
  }
  
  // ============ MÉTODOS PARA USUARIOS ============
  
  // Listar usuarios - GET /api/users/
  async listUsers(options: RequestOptions = {}): Promise<ApiResponse> {
    return this.get<ApiResponse>('/users', options);
  }
  
  // Crear usuario - POST /api/users/
  async createUser(userData: any, options: RequestOptions = {}): Promise<ApiResponse> {
    return this.post<ApiResponse>('/users', userData, options);
  }
  
  // ============ MÉTODOS PARA BANCOS ============
  
  // Listar bancos - GET /api/admin/banks/
  async listBanks(options: RequestOptions = {}): Promise<ApiResponse> {
    return this.get<ApiResponse>('/admin/banks', options);
  }
}

// Exportar una instancia del cliente
const api = new ApiClient();
export default api; 