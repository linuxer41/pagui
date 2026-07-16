import { auth } from './stores/auth';
import { company } from './stores/company';
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

export interface Account {
  id: string;
  accountNumber: string;
  accountType: string;
  currency: string;
  balance: number;
  availableBalance: number;
  thirdBankCredentialId?: number;
  userEmail: string;
  userFullName: string;
  userPhone?: string;
  userAddress?: string;
}

export interface AccountMovement {
  id: string;
  accountId: string;
  transactionId: string;
  amount: number;
  currency: string;
  type: 'credit' | 'debit';
  description: string;
  date: string;
  balance: number;
  reference?: string;
}

export interface AccountStats {
  account: {
    id: number;
    accountNumber: string;
    accountType: string;
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
    accountId: number;
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
  accounts: import('./stores/auth').Account[];
  company?: Record<string, unknown>;
}

export interface ApiKey {
  id: number;
  name: string;
  key: string;
  createdAt: string;
  lastUsedAt?: string;
  isActive: boolean;
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

export interface Wallet {
  id: string;
  name: string;
  type: string;
  currency: string;
  balance: number;
  availableBalance: number;
}

export interface Subscription {
  id: string;
  amount: number;
  intervalType: string;
  description?: string;
  isActive: boolean;
  startDate: string;
  endDate?: string;
  lastProcessedAt?: string;
}

export interface Merchant {
  id: string;
  businessName: string;
  businessCategory: string;
  taxId: string;
  isVerified: boolean;
  isActive: boolean;
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

export interface FraudAlert {
  id: string;
  type: string;
  severity: string;
  message: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface FXRate {
  base: string;
  target: string;
  rate: number;
  updatedAt: string;
}

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  isActive: boolean;
  lastSentAt?: string;
  lastError?: string;
}

export interface ReconciliationItem {
  id: string;
  accountId: string;
  status: string;
  discrepancy?: number;
  createdAt: string;
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

export interface FeeRule {
  id: string;
  name: string;
  percentage: number;
  minAmount?: number;
  maxAmount?: number;
}

export interface SplitPayResult {
  splitGroupId: string;
  transactions: { transferId: string; recipientWalletId: string; amount: number }[];
}

export interface TransferResult {
  transferId: string;
  status: string;
}

// ---- ApiClient ----
const publicEndpoints = ['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password'];

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
    auth.login(d.accessToken, d.user, d.refreshToken, (d as any)?.accounts || [])
    if (d.company) company.setCompany(d.company as any)
    return raw
  }

  async refreshToken(): Promise<boolean> {
    try {
      const authStore = get(auth);
      if (!authStore.refreshToken) return false;
      const raw: ApiResponse<LoginData> = await super.request('/auth/refresh', 'POST', { refreshToken: authStore.refreshToken }, { retryOnUnauthorized: false });
      const d = raw.data;
      auth.login(d.accessToken, authStore.user!, d.refreshToken, authStore.accounts || []);
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

  simulatePayment(qrId: string, amount?: number, options?: Record<string, unknown>): Promise<ApiResponse<null>> {
    return this.post('/qr/simulatePayment', { qrId, ...(amount !== undefined ? { amount } : {}) }, options);
  }

  async getTransactionsByPeriod(periodType: 'weekly' | 'monthly' | 'yearly', year: number, month?: number, week?: number, options?: Record<string, unknown>): Promise<ApiResponse<TransactionsResponse>> {
    const endpoint = `/transactions/stats/${periodType}/${year}${month !== undefined ? `/${month}` : ''}${week !== undefined ? `/${week}` : ''}`;
    return this.get(endpoint, options);
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

  listApiKeys(options?: Record<string, unknown>): Promise<ApiResponse<ApiKey[]>> { return this.get('/apikeys', options); }
  generateApiKey(data: Record<string, unknown>, options?: Record<string, unknown>): Promise<ApiResponse<ApiKey>> { return this.post('/apikeys', data, options); }
  revokeApiKey(id: number, options?: Record<string, unknown>): Promise<ApiResponse<null>> { return this.delete(`/apikeys/${id}`, undefined, options); }

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

  listBanks(options?: Record<string, unknown>): Promise<ApiResponse<unknown[]>> { return this.get('/admin/banks', options); }

  checkServerHealth(): Promise<ApiResponse<HealthStatus>> { return this.get('/', {}); }
  checkSystemHealth(): Promise<ApiResponse<HealthStatus>> { return this.get('/health', {}); }
  checkApiHealth(): Promise<ApiResponse<HealthApiStatus>> { return this.get('/health/api', {}); }

  getAccounts(options?: Record<string, unknown>): Promise<ApiResponse<Account[]>> { return this.get('/accounts/', options); }
  getAccount(accountId: string, options?: Record<string, unknown>): Promise<ApiResponse<Account>> { return this.get(`/accounts/${accountId}`, options); }
  getAccountMovements(accountId: string, page: number = 1, pageSize: number = 20, options?: Record<string, unknown>): Promise<ApiResponse<AccountMovement[]>> {
    return this.get(`/accounts/${accountId}/movements?page=${page}&pageSize=${pageSize}`, options);
  }
  getAccountStats(accountId: string, options?: Record<string, unknown>): Promise<ApiResponse<AccountStats>> { return this.get(`/accounts/${accountId}/stats`, options); }

  getSSEStats(options?: Record<string, unknown>): Promise<ApiResponse<{ connectedClients: number }>> { return this.get('/events/stats', options); }

  transferP2P(data: Record<string, unknown>, idempotencyKey?: string, options?: Record<string, unknown>): Promise<ApiResponse<TransferResult>> {
    return this.post('/transfers/p2p', data, { ...options, ...(idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : {}) });
  }

  listWallets(options?: Record<string, unknown>): Promise<ApiResponse<Wallet[]>> { return this.get('/wallets', options); }
  createWallet(data: Record<string, unknown>, options?: Record<string, unknown>): Promise<ApiResponse<Wallet>> { return this.post('/wallets', data, options); }

  listSubscriptions(options?: Record<string, unknown>): Promise<ApiResponse<Subscription[]>> { return this.get('/subscriptions', options); }
  createSubscription(data: Record<string, unknown>, options?: Record<string, unknown>): Promise<ApiResponse<Subscription>> { return this.post('/subscriptions', data, options); }
  cancelSubscription(id: string, options?: Record<string, unknown>): Promise<ApiResponse<null>> { return this.post(`/subscriptions/${id}/cancel`, {}, options); }

  splitPay(data: Record<string, unknown>, options?: Record<string, unknown>): Promise<ApiResponse<SplitPayResult>> { return this.post('/split/pay', data, options); }
  splitCalculate(total: number, percentages: number[], options?: Record<string, unknown>): Promise<ApiResponse<{ items: { walletId: string; amount: number; percentage: number }[] }>> { return this.post('/split/calculate', { total, percentages }, options); }

  registerMerchant(data: Record<string, unknown>, options?: Record<string, unknown>): Promise<ApiResponse<Merchant>> { return this.post('/merchants/register', data, options); }
  getMerchantQR(merchantId: string, options?: Record<string, unknown>): Promise<ApiResponse<{ qrData: string; qrImage: string }>> { return this.get(`/merchants/${merchantId}/qr`, options); }
  merchantPay(data: Record<string, unknown>, options?: Record<string, unknown>): Promise<ApiResponse<TransferResult>> { return this.post('/merchants/pay', data, options); }

  registerCashAgent(data: Record<string, unknown>, options?: Record<string, unknown>): Promise<ApiResponse<{ agentId: string; walletId: string }>> { return this.post('/cash/agents/register', data, options); }
  cashTransaction(data: Record<string, unknown>, options?: Record<string, unknown>): Promise<ApiResponse<TransferResult>> { return this.post('/cash/transaction', data, options); }
  getNearbyAgents(lat: number, lng: number, radius?: number, options?: Record<string, unknown>): Promise<ApiResponse<{ data: unknown[] }>> {
    return this.get(`/cash/agents/nearby?lat=${lat}&lng=${lng}&radius=${radius || 5}`, options);
  }

  prepareNFC(data: Record<string, unknown>, options?: Record<string, unknown>): Promise<ApiResponse<NFCData>> { return this.post('/nfc/prepare', data, options); }
  processNFC(data: Record<string, unknown>, options?: Record<string, unknown>): Promise<ApiResponse<TransferResult>> { return this.post('/nfc/process', data, options); }

  createWalletBackup(walletId: string, options?: Record<string, unknown>): Promise<ApiResponse<{ seedPhrase: string }>> { return this.post(`/wallet/${walletId}/backup`, {}, options); }
  verifyWalletBackup(walletId: string, options?: Record<string, unknown>): Promise<ApiResponse<null>> { return this.post(`/wallet/${walletId}/backup/verify`, {}, options); }
  getWalletBackupStatus(walletId: string, options?: Record<string, unknown>): Promise<ApiResponse<{ status: string; verified: boolean }>> { return this.get(`/wallet/${walletId}/backup`, options); }

  getFraudAlerts(options?: Record<string, unknown>): Promise<ApiResponse<FraudAlert[]>> { return this.get('/fraud/alerts', options); }
  resolveFraudAlert(alertId: string, options?: Record<string, unknown>): Promise<ApiResponse<null>> { return this.post(`/fraud/alerts/${alertId}/resolve`, {}, options); }

  getFXRates(options?: Record<string, unknown>): Promise<ApiResponse<{ rates: FXRate[]; currencies: string[] }>> { return this.get('/fx/rates', options); }
  getFXRate(base: string, target: string, options?: Record<string, unknown>): Promise<ApiResponse<FXRate>> { return this.get(`/fx/rate/${base}/${target}`, options); }
  convertCurrency(data: Record<string, unknown>, options?: Record<string, unknown>): Promise<ApiResponse<{ result: number }>> { return this.post('/fx/convert', data, options); }

  listWebhooks(options?: Record<string, unknown>): Promise<ApiResponse<Webhook[]>> { return this.get('/webhooks', options); }
  registerWebhook(data: Record<string, unknown>, options?: Record<string, unknown>): Promise<ApiResponse<Webhook>> { return this.post('/webhooks', data, options); }
  deleteWebhook(id: string, options?: Record<string, unknown>): Promise<ApiResponse<null>> { return this.delete(`/webhooks/${id}`, undefined, options); }

  getPendingReconciliations(options?: Record<string, unknown>): Promise<ApiResponse<ReconciliationItem[]>> { return this.get('/reconciliation/pending', options); }
  reconcileAccount(accountId: string, options?: Record<string, unknown>): Promise<ApiResponse<null>> { return this.post(`/reconciliation/account/${accountId}`, {}, options); }
  getReconciliationLogs(accountId: string, options?: Record<string, unknown>): Promise<ApiResponse<ReconciliationItem[]>> { return this.get(`/reconciliation/logs/${accountId}`, options); }

  submitKYC(data: Record<string, unknown>, options?: Record<string, unknown>): Promise<ApiResponse<null>> { return this.post('/kyc/submit', data, options); }
  getKYCStatus(options?: Record<string, unknown>): Promise<ApiResponse<KYCStatus>> { return this.get('/kyc/status', options); }

  registerBiometric(data: Record<string, unknown>, options?: Record<string, unknown>): Promise<ApiResponse<{ deviceId: string }>> { return this.post('/auth/biometric/register', data, options); }
  unregisterBiometric(deviceId: string, options?: Record<string, unknown>): Promise<ApiResponse<null>> { return this.post(`/auth/biometric/unregister/${deviceId}`, {}, options); }
  biometricLogin(biometricKeyHash: string): Promise<ApiResponse<{ accessToken: string; refreshToken: string }>> { return this.post('/auth/biometric/login', { biometricKeyHash }); }

  register(data: { fullName: string; email: string; company: string; phone: string; message?: string }): Promise<ApiResponse<{ id: string }>> {
    return this.post('/auth/register', data);
  }

  getPCIStatus(options?: Record<string, unknown>): Promise<ApiResponse<unknown>> { return this.get('/compliance/pci', options); }
  runDataRetention(dryRun: boolean = false, options?: Record<string, unknown>): Promise<ApiResponse<unknown>> {
    if (dryRun) return this.get('/compliance/retention/dry-run', options);
    return this.post('/compliance/retention/run', {}, options);
  }
  getRetentionStatus(options?: Record<string, unknown>): Promise<ApiResponse<unknown>> { return this.get('/compliance/retention/status', options); }

  listNotifications(options?: Record<string, unknown>): Promise<ApiResponse<Notification[]>> { return this.get('/notifications', options); }
  markNotificationRead(id: string, options?: Record<string, unknown>): Promise<ApiResponse<null>> { return this.post(`/notifications/${id}/read`, {}, options); }
  markAllNotificationsRead(options?: Record<string, unknown>): Promise<ApiResponse<null>> { return this.post('/notifications/read-all', {}, options); }
  getUnreadNotificationCount(options?: Record<string, unknown>): Promise<ApiResponse<{ count: number }>> { return this.get('/notifications/unread-count', options); }

  registerPushToken(data: Record<string, unknown>, options?: Record<string, unknown>): Promise<ApiResponse<null>> { return this.post('/push/register', data, options); }

  listFees(options?: Record<string, unknown>): Promise<ApiResponse<FeeRule[]>> { return this.get('/fees', options); }

  getHealthStats(options?: Record<string, unknown>): Promise<ApiResponse<HealthStatus>> { return this.get('/health/stats', options); }
  getHealthMetrics(options?: Record<string, unknown>): Promise<ApiResponse<unknown>> { return this.get('/health/metrics', options); }
  getHealthMigrations(options?: Record<string, unknown>): Promise<ApiResponse<unknown>> { return this.get('/health/migrations', options); }

  listBankCredentials(options?: Record<string, unknown>): Promise<ApiResponse<any[]>> { return this.get('/bank-credentials', options); }
  createBankCredential(data: Record<string, unknown>, options?: Record<string, unknown>): Promise<ApiResponse<any>> { return this.post('/bank-credentials', data, options); }
  deleteBankCredential(id: string, options?: Record<string, unknown>): Promise<ApiResponse<null>> { return this.delete(`/bank-credentials/${id}`, options); }
  testBankCredential(data: Record<string, unknown>, options?: Record<string, unknown>): Promise<ApiResponse<{ success: boolean }>> { return this.post('/bank-credentials/test', data, options); }

  listSettlements(options?: Record<string, unknown>): Promise<ApiResponse<{ settlements: any[]; totalCount: number }>> { return this.get('/settlements', options); }
  getPendingSettlements(options?: Record<string, unknown>): Promise<ApiResponse<{ pendingTotal: number; settlements: any[] }>> { return this.get('/settlements/pending', options); }
}

const api = new ApiClient();
export default api;
