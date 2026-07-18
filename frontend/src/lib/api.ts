import { auth } from './stores/auth';
import { get } from 'svelte/store';
import { goto } from '$app/navigation';
import { API_URL } from './config';
import { BaseApiClient, JwtAuthProvider } from '@pagui/shared';

// ---- Generic response wrapper ----
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedData<T> {
  data: T[];
  totalCount: number;
  page?: number;
  pageSize?: number;
}

// ---- Domain interfaces ----
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
  metadata?: Record<string, unknown>;
}

export interface QRGenerated {
  qrId: string;
  qrImage: string;
  transactionId: string;
  amount: number;
  currency: string;
  dueDate: string;
  singleUse: boolean;
  modifyAmount: boolean;
  status: string;
}

export interface QRDetail {
  qrId: string;
  qrImage: string;
  transactionId: string;
  amount: number;
  currency: string;
  description: string;
  dueDate: string;
  singleUse: boolean;
  modifyAmount: boolean;
  status: 'active' | 'paid' | 'expired' | 'cancelled';
  payments?: QRPayment[];
}

export interface QRPayment {
  id: string;
  amount: number;
  currency: string;
  paymentDate: string;
  senderName?: string;
  senderDocumentId?: string;
  senderAccount?: string;
}

export interface TransactionsListData {
  transactions: Transaction[];
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface Wallet {
  id: string;
  walletNumber: string;
  name: string;
  type: string;
  level: string;
  currency: string;
  balance: number;
  availableBalance: number;
  heldBalance: number;
  tenantId: string | null;
  status: string;
  isDefault: boolean;
  isCollection: boolean;
}

export interface WalletMovement {
  id: string;
  walletId: string;
  transactionId: string;
  amount: number;
  currency: string;
  type: 'credit' | 'debit';
  description: string;
  date: string;
  balance: number;
  reference?: string;
}

export interface WalletStats {
  wallet: {
    id: number;
    walletNumber: string;
    type: string;
    currency: string;
    balance: number;
    availableBalance: number;
    status: string;
  };
  today: { amount: number; growthPercentage: number };
  thisWeek: { amount: number; growthPercentage: number };
  thisMonth: { amount: number; growthPercentage: number };
  recentMovements: {
    id: number;
    walletId: number;
    movementType: string;
    amount: number;
    description: string;
    reference: string;
    createdAt: string;
    qrId?: string;
    transactionId?: string;
    paymentDate?: string;
    paymentTime?: string;
    currency?: string;
    senderName?: string;
    senderDocumentId?: string;
    senderAccount?: string;
    senderBankCode?: string;
  }[];
}

export interface UserProfile {
  id: number;
  email: string;
  fullName: string;
  role: number;
  status: string;
}

export interface LoginData {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  user: UserProfile;
  wallets: import('./stores/auth').Wallet[];
}

export interface ApiKey {
  id: number;
  apiKey: string;
  walletId: number;
  description: string | null;
  permissions: Record<string, boolean>;
  expiresAt: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface HealthStatus {
  status: string;
  version?: string;
  timestamp: string;
  uptime?: number;
}

export interface HealthApiStatus {
  status: string;
  database: string;
  timestamp: string;
}

export interface NFCData {
  nfcId: string;
  payload: {
    nfcId: string;
    senderWalletId: string;
    receiverWalletId: string;
    amount: number;
    timestamp: number;
    nonce: string;
    signature: string;
  };
  qrData: string;
}

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  isActive: boolean;
  lastSentAt?: string;
  lastError?: string;
}

export interface KYCStatus {
  status: string;
  level: string;
  documentType?: string;
  notes?: string;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

export interface TransferResult {
  transferId: string;
  status: string;
}

// ---- ApiClient ----
const publicEndpoints = ['/auth/login', '/auth/otp/login', '/auth/otp/complete', '/auth/send-otp', '/auth/register', '/auth/forgot-password', '/auth/reset-password'];

function createAuthProvider() {
  return new JwtAuthProvider(() => {
    const authStore = get(auth);
    return authStore.token || null;
  })
}

class ApiClient extends BaseApiClient {
  constructor() {
    super(API_URL, createAuthProvider());
  }

  async request<T>(endpoint: string, method: string = 'GET', body?: unknown, options?: Record<string, unknown>): Promise<T> {
    const isPublic = publicEndpoints.some(e => endpoint.startsWith(e));
    const opts: Record<string, unknown> = { ...options, retryOnUnauthorized: !isPublic }

    if (options?.apiKey) {
      opts.headers = { ...(opts.headers as Record<string, string> || {}), 'X-API-Key': options.apiKey as string }
    }

    try {
      const result = await super.request<T>(endpoint, method, body, opts);
      return result;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      if (!isPublic && (msg.includes('Sesión') || msg.includes('Token') || msg.includes('autenticación') || msg.includes('credenciales'))) {
        auth.logout();
        goto('/auth/login');
      }
      throw error;
    }
  }

  async login(email: string, password: string): Promise<ApiResponse<LoginData>> {
    const raw: ApiResponse<LoginData> = await super.request('/auth/login', 'POST', { email, password }, { retryOnUnauthorized: false })
    const d = raw.data
    auth.login(d.accessToken, d.user, d.refreshToken, (d as any)?.wallets || [])
    return raw
  }

  async loginWithOTP(phone: string, code: string): Promise<ApiResponse<LoginData & { needsRegistration?: boolean; tempToken?: string }>> {
    return super.request('/auth/otp/login', 'POST', { phone, code }, { retryOnUnauthorized: false })
  }

  async completeOTPRegistration(phone: string, name: string, documentId: string, tempToken: string): Promise<ApiResponse<LoginData>> {
    const raw: ApiResponse<LoginData> = await super.request('/auth/otp/complete', 'POST', { phone, name, documentId, tempToken }, { retryOnUnauthorized: false })
    const d = raw.data
    auth.login(d.accessToken, d.user, d.refreshToken, (d as any)?.wallets || [])
    return raw
  }

  async sendOTP(phone: string): Promise<ApiResponse<{ code: string }>> {
    return super.request('/auth/send-otp', 'POST', { phone }, { retryOnUnauthorized: false })
  }

  async refreshToken(): Promise<boolean> {
    try {
      const authStore = get(auth);
      if (!authStore.refreshToken) return false;
      const raw: ApiResponse<LoginData> = await super.request('/auth/refresh', 'POST', { refreshToken: authStore.refreshToken }, { retryOnUnauthorized: false });
      const d = raw.data;
      auth.login(d.accessToken, authStore.user!, d.refreshToken, authStore.wallets || []);
      return true;
    } catch {
      return false;
    }
  }

  logout() {
    auth.logout();
  }

  async changePassword(currentPassword: string, newPassword: string, options?: Record<string, unknown>): Promise<ApiResponse<null>> {
    return this.post('/auth/change-password', { currentPassword, newPassword }, options);
  }

  async requestPasswordReset(email: string): Promise<ApiResponse<null>> {
    return this.post('/auth/forgot-password', { email });
  }

  async resetPassword(token: string, newPassword: string): Promise<ApiResponse<null>> {
    return this.post('/auth/reset-password', { token, newPassword });
  }

  getQR(qrId: string, options?: Record<string, unknown>): Promise<ApiResponse<QRDetail>> {
    return this.get(`/qr/${qrId}`, options);
  }

  async generateQR(qrData: Record<string, unknown>, options?: Record<string, unknown>): Promise<ApiResponse<QRGenerated>> {
    const apiData: Record<string, unknown> = {
      transactionId: (qrData.transactionId as string) || new Date().getTime().toString(),
      amount: qrData.amount ?? Number(qrData.monto),
    };
    if (qrData.description || qrData.descripcion) apiData.description = qrData.description || qrData.descripcion;
    if (qrData.bankId) apiData.bankId = qrData.bankId;
    if (qrData.dueDate) apiData.dueDate = qrData.dueDate;
    if (typeof qrData.singleUse !== 'undefined') apiData.singleUse = qrData.singleUse;
    if (typeof qrData.modifyAmount !== 'undefined') apiData.modifyAmount = qrData.modifyAmount;
    if (qrData.walletId) apiData.walletId = qrData.walletId;
    return this.post('/qr/generate', apiData, options);
  }

  cancelQR(qrId: string, options?: Record<string, unknown>): Promise<ApiResponse<null>> {
    return this.delete('/qr/cancelQR', { qrId }, options);
  }

  getQRPayments(qrId: string, options?: Record<string, unknown>): Promise<ApiResponse<{ payments: QRPayment[] }>> {
    return this.get(`/qr/${qrId}/payments`, options);
  }

  checkQRStatus(qrId: string, options?: Record<string, unknown>): Promise<ApiResponse<{ status: string }>> {
    return this.get(`/qr/${qrId}/status`, options);
  }

  async listQRs(filters: Record<string, unknown> = {}, options?: Record<string, unknown>): Promise<ApiResponse<QRDetail[]>> {
    const queryParams = new URLSearchParams();
    if (filters.status) queryParams.append('status', filters.status as string);
    if (filters.startDate) queryParams.append('startDate', filters.startDate as string);
    if (filters.endDate) queryParams.append('endDate', filters.endDate as string);
    if (filters.bankId) queryParams.append('bankId', filters.bankId.toString());
    const qs = queryParams.toString();
    return this.get(`/qr/list${qs ? `?${qs}` : ''}`, options);
  }

  async getPagos(filters: Record<string, unknown> = {}, options?: Record<string, unknown>): Promise<ApiResponse<QRDetail[]>> {
    return this.listQRs({ ...filters, status: filters.status || 'PAGADO' }, options);
  }

  getPaidQRsByDate(date: string, bankId?: number, options?: Record<string, unknown>): Promise<ApiResponse<QRPayment[]>> {
    const endpoint = `/qr/v2/paidQR/${date}${bankId ? `?bankId=${bankId}` : ''}`;
    return this.get(endpoint, options);
  }

  async getTransactionsByPeriod(periodType: 'weekly' | 'monthly' | 'yearly', year: number, month?: number, week?: number, walletId?: string | number, options?: Record<string, unknown>): Promise<ApiResponse<TransactionsResponse>> {
    const base = `/transactions/stats/${periodType}/${year}${periodType === 'monthly' && month !== undefined ? `/${month}` : ''}`;
    const params: string[] = []
    if (periodType === 'weekly' && week !== undefined) params.push(`week=${week}`)
    if (walletId !== undefined) params.push(`walletId=${walletId}`)
    const qs = params.length > 0 ? `?${params.join('&')}` : ''
    return this.get(`${base}${qs}`, options);
  }

  async getCollectionsStats(periodType: 'weekly' | 'monthly' | 'yearly', year: number, month?: number, week?: number, walletId?: string | number): Promise<ApiResponse<TransactionsResponse>> {
    const base = `/collections/stats/${periodType}/${year}${periodType === 'monthly' && month !== undefined ? `/${month}` : ''}`;
    const params: string[] = []
    if (periodType === 'weekly' && week !== undefined) params.push(`week=${week}`)
    if (walletId !== undefined) params.push(`walletId=${walletId}`)
    const qs = params.length > 0 ? `?${params.join('&')}` : ''
    return this.get(`${base}${qs}`);
  }

  async listTransactions(filters: Record<string, unknown> = {}, options?: Record<string, unknown>): Promise<ApiResponse<TransactionsListData>> {
    const queryParams = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) {
      if (v !== undefined && v !== null) queryParams.append(k, String(v));
    }
    const qs = queryParams.toString();
    return this.get(`/transactions${qs ? `?${qs}` : ''}`, options);
  }

  getTransactionDetails(id: string, options?: Record<string, unknown>): Promise<ApiResponse<Transaction>> {
    return this.get(`/transactions/${id}`, options);
  }

  getRecentTransactions(limit: number = 3, options?: Record<string, unknown>): Promise<ApiResponse<TransactionsListData>> {
    return this.listTransactions({ page: 1, pageSize: limit }, options);
  }
  listApiKeys(walletId: string): Promise<ApiResponse<ApiKey[]>> { return this.get(`/api-keys?walletId=${walletId}`); }

  generateApiKey(data: Record<string, unknown>): Promise<ApiResponse<ApiKey>> { return this.post('/api-keys', data); }

  revokeApiKey(id: number): Promise<ApiResponse<null>> { return this.delete(`/api-keys/${id}`); }
  listUsers(options?: Record<string, unknown>): Promise<ApiResponse<UserProfile[]>> { return this.get('/users', options); }
  createUser(userData: Record<string, unknown>, options?: Record<string, unknown>): Promise<ApiResponse<UserProfile>> { return this.post('/users', userData, options); }

  async updateProfile(profileData: Record<string, unknown>, options?: Record<string, unknown>): Promise<ApiResponse<UserProfile>> {
    if (profileData.profileImage) {
      const formData = new FormData();
      if (profileData.fullName) formData.append('fullName', profileData.fullName as string);
      if (profileData.phone) formData.append('phone', profileData.phone as string);
      formData.append('profileImage', profileData.profileImage as Blob);
      const headers: Record<string, string> = {};
      const authStore = get(auth);
      if (authStore.token) headers['Authorization'] = `Bearer ${authStore.token}`;
      const response = await fetch(`${API_URL}/users/profile`, { method: 'PUT', headers, body: formData });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Error actualizando perfil');
      return result;
    }
    return this.put('/users/profile', profileData, options);
  }

  checkServerHealth(): Promise<ApiResponse<HealthStatus>> { return this.get('/', {}); }
  checkSystemHealth(): Promise<ApiResponse<HealthStatus>> { return this.get('/health', {}); }
  checkApiHealth(): Promise<ApiResponse<HealthApiStatus>> { return this.get('/health/api', {}); }

  getWallets(options?: Record<string, unknown>): Promise<ApiResponse<Wallet[]>> { return this.get('/wallets/', options); }
  getWallet(walletId: string, options?: Record<string, unknown>): Promise<ApiResponse<Wallet>> { return this.get(`/wallets/${walletId}`, options); }
  getWalletMovements(walletId: string, page: number = 1, pageSize: number = 20, options?: Record<string, unknown>): Promise<ApiResponse<WalletMovement[]>> {
    return this.get(`/wallets/${walletId}/movements?page=${page}&pageSize=${pageSize}`, options);
  }
  getWalletStats(walletId: string, options?: Record<string, unknown>): Promise<ApiResponse<WalletStats>> { return this.get(`/wallets/${walletId}/stats`, options); }

  getSSEStats(options?: Record<string, unknown>): Promise<ApiResponse<{ connectedClients: number }>> { return this.get('/events/stats', options); }

  transferP2P(data: Record<string, unknown>, idempotencyKey?: string, options?: Record<string, unknown>): Promise<ApiResponse<TransferResult>> {
    return this.post('/transfers/p2p', data, { ...options, ...(idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : {}) });
  }

  listWallets(options?: Record<string, unknown>): Promise<ApiResponse<Wallet[]>> { return this.get('/wallets', options); }
  createWallet(data: Record<string, unknown>, options?: Record<string, unknown>): Promise<ApiResponse<Wallet>> { return this.post('/wallets', data, options); }

  prepareNFC(data: Record<string, unknown>, options?: Record<string, unknown>): Promise<ApiResponse<NFCData>> { return this.post('/nfc/prepare', data, options); }
  processNFC(data: Record<string, unknown>, options?: Record<string, unknown>): Promise<ApiResponse<TransferResult>> { return this.post('/nfc/process', data, options); }
  listWebhooks(walletId: string): Promise<ApiResponse<Webhook[]>> { return this.get(`/webhooks?walletId=${walletId}`); }

  registerWebhook(data: Record<string, unknown>): Promise<ApiResponse<Webhook>> { return this.post('/webhooks', data); }

  deleteWebhook(id: string, walletId: string): Promise<ApiResponse<null>> { return this.delete(`/webhooks/${id}?walletId=${walletId}`); }
  submitKYC(data: Record<string, unknown>, options?: Record<string, unknown>): Promise<ApiResponse<null>> { return this.post('/kyc/submit', data, options); }
  getKYCStatus(options?: Record<string, unknown>): Promise<ApiResponse<KYCStatus>> { return this.get('/kyc/status', options); }

  registerBiometric(data: Record<string, unknown>, options?: Record<string, unknown>): Promise<ApiResponse<{ deviceId: string }>> { return this.post('/auth/biometric/register', data, options); }
  unregisterBiometric(deviceId: string, options?: Record<string, unknown>): Promise<ApiResponse<null>> { return this.post(`/auth/biometric/unregister/${deviceId}`, {}, options); }
  biometricLogin(biometricKeyHash: string): Promise<ApiResponse<{ accessToken: string; refreshToken: string }>> { return this.post('/auth/biometric/login', { biometricKeyHash }); }

  register(data: { fullName: string; email: string; company: string; phone: string; message?: string }): Promise<ApiResponse<{ id: string }>> {
    return this.post('/auth/register', data);
  }

  listNotifications(options?: Record<string, unknown>): Promise<ApiResponse<Notification[]>> { return this.get('/notifications', options); }
  markNotificationRead(id: string, options?: Record<string, unknown>): Promise<ApiResponse<null>> { return this.post(`/notifications/${id}/read`, {}, options); }
  markAllNotificationsRead(options?: Record<string, unknown>): Promise<ApiResponse<null>> { return this.post('/notifications/read-all', {}, options); }
  getUnreadNotificationCount(options?: Record<string, unknown>): Promise<ApiResponse<{ count: number }>> { return this.get('/notifications/unread-count', options); }

  getHealthStats(options?: Record<string, unknown>): Promise<ApiResponse<HealthStatus>> { return this.get('/health/stats', options); }
  getHealthMetrics(options?: Record<string, unknown>): Promise<ApiResponse<unknown>> { return this.get('/health/metrics', options); }
  getHealthMigrations(options?: Record<string, unknown>): Promise<ApiResponse<unknown>> { return this.get('/health/migrations', options); }

  listSettlements(options?: Record<string, unknown>): Promise<ApiResponse<{ settlements: any[]; totalCount: number }>> { return this.get('/settlements', options); }
  getPendingSettlements(options?: Record<string, unknown>): Promise<ApiResponse<{ pendingTotal: number; settlements: any[] }>> { return this.get('/settlements/pending', options); }

  createCollectionWallet(): Promise<ApiResponse<any>> { return this.post('/wallets/collection'); }
  getCollectionWallet(): Promise<ApiResponse<any>> { return this.get('/wallets/collection'); }
  setCollectionWallet(id: string): Promise<ApiResponse<any>> { return this.put(`/wallets/${id}/set-collection`); }

  saveCollectionConfig(data: Record<string, unknown>): Promise<ApiResponse<any>> { return this.post('/collection/config', data); }
  getCollectionConfig(): Promise<ApiResponse<any>> { return this.get('/collection/config'); }
  listBanecoCredentials(): Promise<ApiResponse<any[]>> { return this.get('/baneco-credentials'); }
  createBanecoCredential(data: Record<string, unknown>): Promise<ApiResponse<any>> { return this.post('/baneco-credentials', data); }
  deleteBanecoCredential(id: string): Promise<ApiResponse<null>> { return this.delete(`/baneco-credentials/${id}`); }
  testBanecoCredential(data: Record<string, unknown>): Promise<ApiResponse<{ success: boolean }>> { return this.post('/baneco-credentials/test', data); }
  listBanks(): Promise<ApiResponse<{code: string; name: string}[]>> { return this.get('/banks'); }
  listBankAccounts(): Promise<ApiResponse<any[]>> { return this.get('/bank-accounts'); }
  createBankAccount(data: Record<string, unknown>): Promise<ApiResponse<any>> { return this.post('/bank-accounts', data); }
  deleteBankAccount(id: string): Promise<ApiResponse<null>> { return this.delete(`/bank-accounts/${id}`); }

  createManualLiquidation(data: { bankAccountId: string; amount: number }): Promise<ApiResponse<any>> { return this.post('/liquidations/manual', data); }
  listLiquidations(): Promise<ApiResponse<{ settlements: any[]; totalCount: number }>> { return this.get('/liquidations'); }

  listDirectTransactions(): Promise<ApiResponse<{ items: any[]; totalCount: number }>> { return this.get('/direct-transactions'); }
  getPendingDirectCommissions(): Promise<ApiResponse<{ pendingTotal: number; items: any[] }>> { return this.get('/direct-transactions/pending'); }
  markDirectCommissionPaid(id: string): Promise<ApiResponse<null>> { return this.put(`/direct-transactions/${id}/pay`); }

  listTenants(): Promise<ApiResponse<any[]>> { return this.get('/tenants'); }
}

const api = new ApiClient();
export default api;
