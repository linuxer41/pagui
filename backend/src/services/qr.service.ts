import { format } from 'date-fns';
import { Static } from 'elysia';
import QRCode from 'qrcode';
import { BanecoApi } from '../banks';
import { pool, query } from '../config/database';
import { BANECO_NotifyPaymentQRRequestSchema, BANECO_NotifyPaymentQRResponseSchema } from '../schemas/baneco.scheamas';
import { QRRequest } from '../schemas/qr.schemas';
import cryptoService, { CryptoService } from './crypto.service';
import { logActivity } from './monitor.service';
import { ApiError } from '../utils/error';

enum BANK_DB_ID {
  BANCO_ECONOMICO = 1,
  BANCO_BNB = 2,
  BANCO_VISA = 3
}

interface PaymentRequest {
  qrId: string;
  transactionId: string;
  currency: string;
  amount: number;
  senderBankCode: string;
  senderName: string;
  senderDocumentId: string;
  senderAccount: string;
  description?: string;
  branchCode?: string;
}


interface QRResponse {
  qrId?: string;
  qrImage?: string;
}

interface PaymentQR {
  qrId: string;
  transactionId: string;
  paymentDate: string;
  paymentTime: string;
  currency: string;
  amount: number;
  senderBankCode: string;
  senderName: string;
  senderDocumentId: string;
  senderAccount: string;
  description?: string;
}

interface QRFilters {
  status?: string;
  startDate?: string;
  endDate?: string;
  bankId?: string | number;
}

interface QRListItem {
  qrId: string;
  transactionId: string;
  createdAt: string;
  dueDate: string;
  currency: string;
  amount: number;
  status: string;
  description?: string;
  bankName: string;
  bankId: number;
  singleUse: boolean;
  modifyAmount: boolean;
  payments?: PaymentQR[];
}

interface QRListResponse {
  qrList: QRListItem[];
  totalCount: number;
}

// Constantes para códigos de banco según documentación
const BANCO_ECONOMICO_CODE = '1016';
const BANCO_BNB_CODE = '1020';
const BANCO_VISA_CODE = '1025';

// Interfaces para respuestas de la API de Baneco
interface BanecoQRResponse {
  qrId: string;
  qrImage: string;
  responseCode: number;
  message: string;
}

interface BanecoStatusResponse {
  statusQrCode: number;
  payment: any[];
  responseCode: number;
  message: string;
}

interface BankConfig {
  id: number;
  environment: number;
  accountNumber: string;
  aesKey: string;
  testApiUrl: string;
  prodApiUrl: string;
  bankCode: string;
  bankName: string;
  companyName: string;
}
class QrService {
  private cryptoService: CryptoService;
  
  constructor() {
    // Inicializar el servicio de criptografía
    this.cryptoService = new CryptoService(process.env.CRYPTO_KEY || 'default-encryption-key');
  }
  
  /**
   * Obtiene la configuración de Baneco para una empresa específica
   * @param companyId ID de la empresa
   * @returns Configuración de Baneco para la empresa
   */
  private async getBankConfig(companyId: number, bankCode: string): Promise<{
    username: string;
    password: string;
    accountNumber: string;
    apiBaseUrl: string;
    aesKey: string;
    merchantId: string;
  }> {
    // Obtener la configuración de la empresa con el banco
    const configQuery = await query(`
      SELECT 
        cbc.account_number  as "accountNumber",
        cbc.merchant_id as "merchantId",
        cbc.environment as "environment",
        cbc.additional_config as "additionalConfig",
        b.test_api_url as "testApiUrl",
        b.prod_api_url as "prodApiUrl"
      FROM company_bank cbc
      JOIN banks b ON cbc.bank_id = b.id
      WHERE cbc.company_id = $1 
        AND b.code = $2 
        AND cbc.status = 'ACTIVE'
        AND b.status = 'ACTIVE'
        AND cbc.deleted_at IS NULL
    `, [companyId, bankCode]);
    if (configQuery.rowCount === 0) {
      throw new ApiError('No existe configuración activa de Banco Económico para esta empresa', 400);
    }
    
    const config = configQuery.rows[0];
    const accountNumber = config.accountNumber;
    
    const additionalConfig = config.additionalConfig || {};
    const username = additionalConfig.username;
    const password = additionalConfig.password;
    
    const merchantId = config.merchantId;
    // Use a default AES key if needed
    const aesKey = '6F09E3167E1D40829207B01041A65B12';
    const apiBaseUrl = config.environment === 2 ? config.testApiUrl : config.prodApiUrl;
    
    if (!username || !password) {
      throw new ApiError('Credenciales de Banco Económico no configuradas', 400);
    }
    
    return {
      username,
      password,
      accountNumber,
      apiBaseUrl,
      aesKey,
      merchantId
    };
  }
  
  async generateQR(
    companyId: number,
    qrData: QRRequest,
    userId?: number,
    bankId?: number,
    
  ): Promise<QRResponse> {
    console.log({companyId, bankId, qrData, userId});
    const currency = 'BOB';
    // Verificar que la empresa existe y tiene configuración para el banco seleccionado
    const configCheck = await query<BankConfig>(`
      SELECT 
        cbc.id,
        cbc.environment,
        cbc.account_number as "accountNumber",
        cbc.additional_config as "additionalConfig",
        b.test_api_url as "testApiUrl", 
        b.prod_api_url as "prodApiUrl",
        b.code as "bankCode",
        b.name as "bankName",
        c.name as "companyName"
      FROM company_bank cbc
      JOIN banks b ON cbc.bank_id = b.id
      JOIN companies c ON cbc.company_id = c.id
      WHERE cbc.company_id = $1
        AND ($2::INTEGER IS NULL OR cbc.bank_id = $2::INTEGER)
        AND cbc.status = 'ACTIVE'
        AND cbc.deleted_at IS NULL
        AND b.deleted_at IS NULL
    `, [companyId, bankId ?? null]);
    
    if (configCheck.rowCount === 0) {
      await logActivity(
        'QR_GENERATE_ERROR',
        { 
          companyId, 
          bankId,
          error: 'No bank configuration found'
        },
        'ERROR',
        companyId,
        userId
      );
      
      throw new ApiError('No existe configuración activa del banco seleccionado para esta empresa', 400);
    }
    
    const bankConfig = configCheck.rows[0];
    console.log({bankCode: bankConfig.bankCode, BANCO_ECONOMICO_CODE});
    // Verificar el tipo de banco y usar la API correspondiente
    if (bankConfig.bankCode === BANCO_ECONOMICO_CODE) {
      // Obtener configuración de Baneco
      const config = await this.getBankConfig(companyId, bankConfig.bankCode);
      
      // Crear cliente API de Baneco
      const banecoApi = new BanecoApi(config.apiBaseUrl, config.aesKey);
      
      // Obtener token de autenticación
      const token = await banecoApi.getToken(config.username, config.password);
      // Generar QR
      const qrResult = await banecoApi.generateQr(
        token,
        qrData.transactionId,
        config.accountNumber,
        qrData.amount,
        {
          description: qrData.description,
          dueDate: qrData.dueDate,
          singleUse: qrData.singleUse,
          modifyAmount: qrData.modifyAmount,
          currency: currency
        }
      ) as BanecoQRResponse;
      
      // Guardar QR en la base de datos
      await query(`
        INSERT INTO qr_codes (
          qr_id,
          transaction_id,
          account_credit,
          company_id,
          company_bank_id,
          environment,
          currency,
          amount,
          description,
          due_date,
          single_use,
          modify_amount,
          qr_image,
          status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      `, [
        qrResult.qrId,
        qrData.transactionId,
        cryptoService.encrypt(config.accountNumber), // Cifrar cuenta
        companyId,
        bankConfig.id,
        bankConfig.environment,
        'BOB',
        qrData.amount,
        qrData.description || 'Pago QR',
        qrData.dueDate ? new Date(qrData.dueDate) : new Date('2025-12-31'),
        qrData.singleUse !== undefined ? qrData.singleUse : true,
        qrData.modifyAmount !== undefined ? qrData.modifyAmount : false,
        qrResult.qrImage,
        'ACTIVE'
      ]);
      
      // Registrar actividad
      await logActivity(
        'QR_GENERATED',
        {
          qrId: qrResult.qrId,
          transactionId: qrData.transactionId,
          amount: qrData.amount,
          bankCode: BANCO_ECONOMICO_CODE
        },
        'INFO',
        companyId,
        userId
      );
      
      return {
        qrId: qrResult.qrId,
        qrImage: qrResult.qrImage
      };
    }
    
    if (bankConfig.bankCode === BANCO_BNB_CODE) {
      await logActivity(
        'QR_GENERATE_ERROR',
        { 
          companyId, 
          bankId,
          bankName: bankConfig.bankName,
          error: 'Banco BNB no implementado'
        },
        'ERROR',
        companyId,
        userId
      );
      
      throw new ApiError('Banco BNB no implementado. Por favor contacte al administrador.', 400);
    }
    
    if (bankConfig.bankCode === BANCO_VISA_CODE) {
      await logActivity(
        'QR_GENERATE_ERROR',
        { 
          companyId, 
          bankId,
          bankName: bankConfig.bankName,
          error: 'Banco VISA no implementado'
        },
        'ERROR',
        companyId,
        userId
      );
      
      throw new ApiError('Banco VISA no implementado. Por favor contacte al administrador.', 400);
    }
    
    if (typeof qrData.amount !== 'number' || qrData.amount <= 0) {
      throw new ApiError('El monto debe ser un número positivo', 400);
    }
    
    if (!qrData.dueDate || !/^\d{4}-\d{2}-\d{2}$/.test(qrData.dueDate)) {
      throw new ApiError('La fecha de vencimiento debe tener formato YYYY-MM-DD', 400);
    }
    
    if (typeof qrData.singleUse !== 'boolean') {
      throw new ApiError('El campo singleUse debe ser un valor booleano', 400);
    }
    
    if (typeof qrData.modifyAmount !== 'boolean') {
      throw new ApiError('El campo modifyAmount debe ser un valor booleano', 400);
    }
    
    // Implementación para Banco Económico (código 1016)
    if (bankConfig.bankCode === BANCO_ECONOMICO_CODE) {
      // Generar ID único para el QR según formato del Banco Económico
      const date = new Date();
      const qrId = `${date.getFullYear().toString().substring(2)}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}${BANCO_ECONOMICO_CODE}${Math.floor(Math.random() * 1000000000).toString().padStart(9, '0')}`;
      
      // Generar contenido del QR (según especificación del Banco Económico)
      const qrContent = {
        id: qrId,
        transactionId: qrData.transactionId,
        accountCredit: bankConfig.accountNumber,
        currency: currency,
        amount: qrData.amount,
        description: qrData.description || '',
        dueDate: qrData.dueDate,
        singleUse: qrData.singleUse,
        modifyAmount: qrData.modifyAmount,
        bankCode: BANCO_ECONOMICO_CODE
      };
      
      // Generar imagen QR
      const qrImage = await QRCode.toDataURL(JSON.stringify(qrContent));
      
      // Guardar los datos del QR en la base de datos
      await query(`
        INSERT INTO qr_codes (
          qr_id,
          transaction_id,
          account_credit,
          company_id,
          company_bank_id,
          environment,
          currency,
          amount,
          description,
          due_date,
          single_use,
          modify_amount,
          qr_image,
          status
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      `, [
        qrId,
        qrData.transactionId,
        bankConfig.accountNumber,
        companyId,
        bankId,
        currency,
        qrData.amount,
        qrData.description || null,
        qrData.dueDate,
        qrData.singleUse,
        qrData.modifyAmount,
        qrImage,
        'ACTIVE'
      ]);
      
      // Registrar actividad
      await logActivity(
        'QR_GENERATED',
        {
          qrId,
          companyId,
          bankId,
          bankName: bankConfig.bankName,
          amount: qrData.amount,
          currency: currency,
          dueDate: qrData.dueDate
        },
        'INFO',
        companyId,
        userId
      );
      
      return {
        qrId,
        qrImage
      };
    } else {
      // Para cualquier otro banco no implementado específicamente
      await logActivity(
        'QR_GENERATE_ERROR',
        { 
          companyId, 
          bankId,
          bankName: bankConfig.bankName,
          error: 'Banco no implementado'
        },
        'ERROR',
        companyId,
        userId
      );
      
      throw new ApiError(`Banco ${bankConfig.bankName} no implementado. Por favor contacte al administrador.`, 400);
    }
  }
  
  async cancelQR(
    companyId: number,
    qrId: string,
    userId?: number
  ): Promise<void> {
    // Verificar que el QR existe y pertenece a la empresa
    const qrCheck = await query(`
      SELECT 
        qr.company_bank_id,
        qr.status,
        b.code as bank_code,
        b.name as bankName
      FROM qr_codes qr
      JOIN company_bank cbc ON qr.company_bank_id = cbc.id
      JOIN banks b ON cbc.bank_id = b.id
      WHERE qr.qr_id = $1 AND qr.company_id = $2
      AND qr.deleted_at IS NULL
      AND b.deleted_at IS NULL
    `, [qrId, companyId]);
    
    if (qrCheck.rowCount === 0) {
      throw new ApiError('QR no encontrado o no pertenece a esta empresa', 404);
    }
    
    const qrData = qrCheck.rows[0];
    
    // Verificar que el QR está activo
    if (qrData.status !== 'ACTIVE') {
      throw new ApiError(`No se puede cancelar el QR porque su estado actual es: ${qrData.status}`, 400);
    }
    
    // Verificar el tipo de banco y usar la API correspondiente
    if (qrData.bank_code === BANCO_ECONOMICO_CODE) {
      // Obtener configuración de Baneco
      const config = await this.getBankConfig(companyId, qrData.bank_code);
      
      // Crear cliente API de Baneco
      const banecoApi = new BanecoApi(config.apiBaseUrl, config.aesKey);
      
      // Obtener token de autenticación
      const token = await banecoApi.getToken(config.username, config.password);
      
      // Cancelar QR
      await banecoApi.cancelQr(token, qrId);
      
      // Actualizar estado en la base de datos
      await query(`
        UPDATE qr_codes
        SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP
        WHERE qr_id = $1 AND company_id = $2
      `, [qrId, companyId]);
      
      // Registrar actividad
      await logActivity(
        'QR_CANCELLED',
        { qrId },
        'INFO',
        companyId,
        userId
      );
      
      return;
    }
    
    // Verificar si el QR ya está anulado
    if (qrData.status === 'CANCELLED') {
      throw new ApiError('El código QR ya ha sido anulado', 400);
    }
    
    // Verificar si el QR ya está pagado (solo para QR de uso único)
    if (qrData.status === 'PAID' && qrData.single_use) {
      throw new ApiError('No se puede anular un código QR de uso único que ya ha sido pagado', 400);
    }
    
    // En un sistema real, aquí llamaríamos a la API del banco para anular el QR
    
    // Actualizar el estado del QR en la base de datos
    await query(`
      UPDATE qr_codes
      SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP
      WHERE qr_id = $1
    `, [qrId]);
    
    // Registrar actividad
    await logActivity(
      'QR_CANCELLED',
      {
        qrId,
        companyBankId: qrData.company_bank_id,
        bankName: qrData.bankName
      },
      'INFO',
      companyId,
      userId
    );
  }
  
  async checkQRStatus(
    companyId: number,
    qrId: string,
    userId?: number
  ): Promise<{
    statusQRCode: number;
    payment?: PaymentQR[];
  }> {
    // Verificar que el QR existe y pertenece a la empresa
    const qrCheck = await query(`
      SELECT 
        qr.company_bank_id,
        qr.status,
        b.code as bankCode,
        b.name as bankName
      FROM qr_codes qr
      JOIN company_bank cbc ON qr.company_bank_id = cbc.id
      JOIN banks b ON cbc.bank_id = b.id
      WHERE qr.qr_id = $1 AND qr.company_id = $2
      AND qr.deleted_at IS NULL
      AND b.deleted_at IS NULL
    `, [qrId, companyId]);
    
    if (qrCheck.rowCount === 0) {
      throw new ApiError('QR no encontrado o no pertenece a esta empresa', 404);
    }
    
    const qrData = qrCheck.rows[0];
    
    // Verificar el tipo de banco y usar la API correspondiente
    if (qrData.bankCode === BANCO_ECONOMICO_CODE) {
      // Obtener configuración de Baneco
      const config = await this.getBankConfig(companyId, qrData.bankCode);
      
      // Crear cliente API de Baneco
      const banecoApi = new BanecoApi(config.apiBaseUrl, config.aesKey);
      
      // Obtener token de autenticación
      const token = await banecoApi.getToken(config.username, config.password);
      
      // Consultar estado del QR
      const statusResult = await banecoApi.getQrStatus(token, qrId) as BanecoStatusResponse;
      
      // Registrar actividad
      await logActivity(
        'QR_STATUS_CHECK',
        { 
          qrId,
          status: statusResult.statusQrCode
        },
        'INFO',
        companyId,
        userId
      );
      
      return {
        statusQRCode: statusResult.statusQrCode,
        payment: statusResult.payment || []
      };
    }
    
    // Mapear el estado del QR al formato de la API
    let statusQRCode = 0; // Activo pendiente de pago
    
    if (qrData.status === 'PAID') {
      statusQRCode = 1; // Pagado
    } else if (qrData.status === 'CANCELLED') {
      statusQRCode = 9; // Anulado
    } else if (qrData.status === 'EXPIRED') {
      statusQRCode = 10; // Expirado (no está en la doc original, pero lo añadimos)
    }
    
    // Si está pagado, obtener detalles del pago
    let payments: PaymentQR[] = [];
    
    if (statusQRCode === 1) {
      const paymentResult = await query(`
        SELECT
          qr_id,
          transaction_id,
          payment_date,
          payment_time,
          currency,
          amount,
          sender_bank_code,
          sender_name,
          sender_document_id,
          sender_account,
          description
        FROM qr_payments
        WHERE qr_id = $1 AND company_id = $2
        ORDER BY payment_date DESC, payment_time DESC
      `, [qrId, companyId]);
      
      payments = paymentResult.rows.map(row => ({
        qrId: row.qr_id,
        transactionId: row.transaction_id,
        paymentDate: row.payment_date,
        paymentTime: row.payment_time,
        currency: row.currency,
        amount: parseFloat(row.amount),
        senderBankCode: row.sender_bank_code,
        senderName: row.sender_name,
        senderDocumentId: row.sender_document_id,
        senderAccount: row.sender_account,
        description: row.description
      }));
    }
    
    // Registrar actividad
    await logActivity(
      'QR_STATUS_CHECKED',
      {
        qrId,
        status: qrData.status,
        companyBankId: qrData.company_bank_id,
        bankName: qrData.bankName
      },
      'INFO',
      companyId,
      userId
    );
    
    return {
      statusQRCode,
      payment: payments
    };
  }
  
  async getPaidQRs(
    companyId: number,
    date: string,
    bankId?: number,
    userId?: number
  ): Promise<PaymentQR[]> {
    // Si se especifica un banco, verificar su código
    if (bankId) {
      const bankCheck = await query(`
        SELECT code as "bankCode"
        FROM banks
        WHERE id = $1 AND status = 'ACTIVE'
        AND deleted_at IS NULL
      `, [bankId]);
      
      if (bankCheck.rowCount === 0) {
        throw new ApiError('Banco no encontrado o no está activo', 400);
      }
      
      const bankCode = bankCheck.rows[0].code;
      
      // Verificar el tipo de banco y usar la API correspondiente
      if (bankCode === BANCO_ECONOMICO_CODE) {
        // Obtener configuración de Baneco
        const config = await this.getBankConfig(companyId, bankCode);
        
        // Crear cliente API de Baneco
        const banecoApi = new BanecoApi(config.apiBaseUrl, config.aesKey);
        
        // Obtener token de autenticación
        const token = await banecoApi.getToken(config.username, config.password);
        
        // Convertir fecha al formato requerido por Baneco (yyyyMMdd)
        const dateObj = new Date(date.substring(0, 4) + '-' + date.substring(4, 6) + '-' + date.substring(6, 8));
        const formattedDate = format(dateObj, 'yyyyMMdd');
        
        // Consultar QRs pagados
        const paidQRs = await banecoApi.getPaidQrsByDate(token, formattedDate);
        
        // Registrar actividad
        await logActivity(
          'QR_PAID_LIST_CHECK',
          { 
            date: formattedDate,
            count: paidQRs.length
          },
          'INFO',
          companyId,
          userId
        );
        
        return paidQRs;
      }
    }

    // Validar formato de fecha (debe ser YYYYMMDD)
    if (!/^\d{8}$/.test(date)) {
      throw new ApiError('Formato de fecha inválido. Debe ser YYYYMMDD', 400);
    }
    
    // Convertir a formato de fecha para PostgreSQL
    const formattedDate = `${date.substring(0, 4)}-${date.substring(4, 6)}-${date.substring(6, 8)}`;
    
    // Preparar condición para el banco si se especifica
    const bankCondition = bankId ? 'AND bank_id = $3' : '';
    const params = bankId ? [companyId, formattedDate, bankId] : [companyId, formattedDate];
    
    // Obtener pagos de QR de la fecha especificada
    const result = await query(`
      SELECT
        qr_id,
        transaction_id,
        payment_date,
        payment_time,
        currency,
        amount,
        sender_bank_code,
        sender_name,
        sender_document_id,
        sender_account,
        description
      FROM qr_payments
      WHERE company_id = $1 
      AND date(payment_date) = $2
      ${bankCondition}
      ORDER BY payment_date DESC, payment_time DESC
    `, params);
    
    const payments = result.rows.map(row => ({
      qrId: row.qr_id,
      transactionId: row.transaction_id,
      paymentDate: row.payment_date,
      paymentTime: row.payment_time,
      currency: row.currency,
      amount: parseFloat(row.amount),
      senderBankCode: row.sender_bank_code,
      senderName: row.sender_name,
      senderDocumentId: row.sender_document_id,
      senderAccount: row.sender_account,
      description: row.description
    }));
    
    // Registrar actividad
    await logActivity(
      'QR_PAYMENTS_LISTED',
      {
        date: formattedDate,
        count: payments.length,
        bankId
      },
      'INFO',
      companyId,
      userId
    );
    
    return payments;
  }
  
  async checkExpiringQRs(): Promise<void> {
    const now = new Date();
    const twentyFourHoursLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    // Obtener QRs que vencen en las próximas 24 horas y aún están activos
    const result = await query(`
      SELECT
        q.qr_id,
        q.company_id,
        cb.bank_id,
        q.due_date,
        q.currency,
        q.amount,
        c.name as companyName,
        b.name as bankName
      FROM qr_codes q
      JOIN companies c ON q.company_id = c.id
      JOIN company_bank cb ON q.company_id = cb.company_id
      JOIN banks b ON cb.bank_id = b.id
      WHERE q.status = 'ACTIVE'
      AND q.due_date BETWEEN $1 AND $2
      AND q.deleted_at IS NULL
    `, [now.toISOString(), twentyFourHoursLater.toISOString()]);
    
    // Registrar actividad para cada QR próximo a expirar
    for (const qr of result.rows) {
      await logActivity(
        'QR_EXPIRING_SOON',
        {
          qrId: qr.qr_id,
          dueDate: qr.dueDate,
          currency: qr.currency,
          amount: qr.amount,
          companyName: qr.companyName,
          bankName: qr.bankName
        },
        'WARNING',
        qr.companyId
      );
    }
    
    console.log(`✅ Verificación de QRs por expirar completada: ${result.rowCount} QRs próximos a vencer`);
  }
  
  async updateExpiredQRs(): Promise<void> {
    const now = new Date();
    
    // Obtener QRs que ya vencieron y aún están activos
    const result = await query(`
      UPDATE qr_codes
      SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP
      WHERE status = 'ACTIVE'
      AND due_date < $1
      AND deleted_at IS NULL
      RETURNING qr_id, company_id
    `, [now.toISOString()]);
    
    // Registrar actividad para cada QR expirado
    for (const qr of result.rows) {
      await logActivity(
        'QR_EXPIRED',
        {
          qrId: qr.qr_id
        },
        'WARNING',
        qr.companyId
      );
    }
    
    console.log(`✅ Actualización de QRs expirados completada: ${result.rowCount} QRs marcados como expirados`);
  }
  
  async simulateQRPayment(
    companyId: number,
    qrId: string,
    paymentData: {
      amount?: number;
      senderBankCode?: string;
      senderName?: string;
    },
    userId?: number
  ): Promise<{
    responseCode: number;
    message: string;
  }> {
    // Verificar que el QR existe, está activo y pertenece a la empresa
    const qrCheck = await query(`
      SELECT 
        q.*,
        b.name as bankName
      FROM qr_codes q
      JOIN company_bank cb ON q.company_id = cb.company_id
      JOIN banks b ON cb.bank_id = b.id
      WHERE q.qr_id = $1 AND q.company_id = $2 AND q.status = 'ACTIVE'
      AND q.deleted_at IS NULL
    `, [qrId, companyId]);
    
    if (qrCheck.rowCount === 0) {
      return {
        responseCode: 1,
        message: 'Código QR no encontrado, no activo o no pertenece a esta empresa'
      };
    }
    
    const qrInfo = qrCheck.rows[0];
    
    // Verificar fecha de vencimiento
    if (new Date() > new Date(qrInfo.due_date)) {
      return {
        responseCode: 1,
        message: 'El código QR ha expirado'
      };
    }
    
    // Verificar monto si el QR no permite modificarlo
    if (!qrInfo.modify_amount && paymentData.amount && paymentData.amount !== parseFloat(qrInfo.amount)) {
      return {
        responseCode: 1,
        message: 'Este QR no permite modificar el monto'
      };
    }
    
    // Crear registro de pago
    const now = new Date();
    const paymentDate = now.toISOString().split('T')[0];
    const paymentTime = now.toTimeString().split(' ')[0];
    const amount = paymentData.amount || parseFloat(qrInfo.amount);
    const senderBankCode = paymentData.senderBankCode || '1016'; // Default Banco Económico
    const senderName = paymentData.senderName || 'Cliente de Prueba';
    const transactionId = `SIMU${now.getTime()}${Math.floor(Math.random() * 1000)}`;
    
    await query(`
      INSERT INTO qr_payments (
        qr_id,
        company_id,
        bank_id,
        transaction_id,
        payment_date,
        payment_time,
        currency,
        amount,
        sender_bank_code,
        sender_name,
        sender_document_id,
        sender_account,
        description
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `, [
      qrId,
      companyId,
      qrInfo.bank_id,
      transactionId,
      paymentDate,
      paymentTime,
      qrInfo.currency,
      amount,
      senderBankCode,
      senderName,
      '0', // sender_document_id
      '******1234', // sender_account (oculto)
      qrInfo.description
    ]);
    
    // Si el QR es de uso único, marcarlo como pagado
    if (qrInfo.single_use) {
      await query(`
        UPDATE qr_codes
        SET status = 'PAID', updated_at = CURRENT_TIMESTAMP
        WHERE qr_id = $1
      `, [qrId]);
    }
    
    // Registrar actividad
    await logActivity(
      'QR_PAYMENT_SIMULATED',
      {
        qrId,
        amount,
        currency: qrInfo.currency,
        bankId: qrInfo.bankId,
        bankName: qrInfo.bankName,
        transactionId
      },
      'INFO',
      companyId,
      userId
    );
    
    return {
      responseCode: 0,
      message: 'Pago de QR simulado exitosamente'
    };
  }

  async listQRs(
    companyId: number,
    filters: QRFilters,
    userId?: number
  ): Promise<QRListResponse> {
    // Construir la consulta base
    let sqlQuery = `
      SELECT 
        q.qr_id,
        q.transaction_id,
        q.created_at,
        q.due_date,
        q.currency,
        q.amount,
        q.status,
        q.description,
        q.single_use,
        q.modify_amount,
        cb.bank_id as bankId,
        b.name as bankName
      FROM qr_codes q
      JOIN company_bank cb ON q.company_id = cb.company_id
      JOIN banks b ON cb.bank_id = b.id
      WHERE q.company_id = $1
      AND q.deleted_at IS NULL
    `;
    
    // Array para almacenar los parámetros
    const queryParams: any[] = [companyId];
    let paramIndex = 2; // Empezamos desde $2
    
    // Aplicar filtros
    if (filters.status) {
      sqlQuery += ` AND q.status = $${paramIndex}`;
      queryParams.push(filters.status);
      paramIndex++;
    }
    
    if (filters.startDate) {
      sqlQuery += ` AND q.created_at >= $${paramIndex}`;
      queryParams.push(filters.startDate);
      paramIndex++;
    }
    
    if (filters.endDate) {
      sqlQuery += ` AND q.created_at <= $${paramIndex}`;
      queryParams.push(filters.endDate);
      paramIndex++;
    }
    
    if (filters.bankId) {
      sqlQuery += ` AND cb.bank_id = $${paramIndex}`;
      queryParams.push(typeof filters.bankId === 'string' ? parseInt(filters.bankId) : filters.bankId);
      paramIndex++;
    }
    
    // Ordenar por fecha de creación descendente
    sqlQuery += ` ORDER BY q.created_at DESC`;
    
    // Ejecutar la consulta
    const result = await query(sqlQuery, queryParams);
    
    // Construir la consulta de conteo
    let countQuery = `
      SELECT COUNT(*) as total
      FROM qr_codes q
      WHERE q.company_id = $1
      AND q.deleted_at IS NULL
    `;
    
    // Aplicar los mismos filtros a la consulta de conteo
    if (filters.status) {
      countQuery += ` AND q.status = $2`;
    }
    
    let countParamIndex = filters.status ? 3 : 2;
    
    if (filters.startDate) {
      countQuery += ` AND q.created_at >= $${countParamIndex}`;
      countParamIndex++;
    }
    
    if (filters.endDate) {
      countQuery += ` AND q.created_at <= $${countParamIndex}`;
      countParamIndex++;
    }
    
    if (filters.bankId) {
      countQuery += ` AND cb.bank_id = $${countParamIndex}`;
    }
    
    // Ejecutar la consulta de conteo
    const countResult = await query(countQuery, queryParams);
    const totalCount = parseInt(countResult.rows[0].total);
    
    // Crear la lista de QRs
    const qrList: QRListItem[] = [];
    
    // Obtener pagos para QRs con estado PAID
    const paidQrIds = result.rows
      .filter(row => row.status === 'PAID')
      .map(row => row.qr_id);
    
    // Obtener pagos solo si hay QRs pagados
    let paymentsMap: Record<string, PaymentQR[]> = {};
    
    if (paidQrIds.length > 0) {
      const paymentsQuery = `
        SELECT
          qr_id,
          transaction_id,
          payment_date,
          payment_time,
          currency,
          amount,
          sender_bank_code,
          sender_name,
          sender_document_id,
          sender_account,
          description
        FROM qr_payments
        WHERE company_id = $1 AND qr_id = ANY($2::text[])
        ORDER BY payment_date DESC, payment_time DESC
      `;
      
      const paymentsResult = await query(paymentsQuery, [companyId, paidQrIds]);
      
      // Agrupar pagos por qrId
      paymentsMap = paymentsResult.rows.reduce((acc, row) => {
        const payment: PaymentQR = {
          qrId: row.qr_id,
          transactionId: row.transaction_id,
          paymentDate: row.payment_date,
          paymentTime: row.payment_time,
          currency: row.currency,
          amount: parseFloat(row.amount),
          senderBankCode: row.sender_bank_code,
          senderName: row.sender_name,
          senderDocumentId: row.sender_document_id,
          senderAccount: row.sender_account,
          description: row.description
        };
        
        if (!acc[row.qr_id]) {
          acc[row.qr_id] = [];
        }
        
        acc[row.qr_id].push(payment);
        return acc;
      }, {} as Record<string, PaymentQR[]>);
    }
    
    // Mapear resultados
    for (const row of result.rows) {
      const qrItem: QRListItem = {
        qrId: row.qrId,
        transactionId: row.transactionId,
        createdAt: row.createdAt,
        dueDate: row.dueDate,
        currency: row.currency,
        amount: parseFloat(row.amount),
        status: row.status,
        description: row.description,
        bankName: row.bankName,
        bankId: row.bankId,
        singleUse: row.singleUse,
        modifyAmount: row.modifyAmount
      };
      
      // Agregar pagos si existen
      if (row.status === 'PAID' && paymentsMap[row.qrId]) {
        qrItem.payments = paymentsMap[row.qrId];
      }
      
      qrList.push(qrItem);
    }
    
    // Registrar actividad
    await logActivity(
      'QR_LIST_VIEWED',
      {
        filters,
        count: qrList.length,
        totalCount
      },
      'INFO',
      companyId,
      userId
    );
    
    return {
      qrList,
      totalCount
    };
  }

  async banecoQRNotify(data: Static<typeof BANECO_NotifyPaymentQRRequestSchema>): Promise<void> {
    const checkQR = await query<{id: number, status: string, transactionId: string, companyId: number}>(`
      SELECT q.id, q.status, q.transaction_id as "transactionId", q.company_id as "companyId" 
      FROM qr_codes q
      WHERE q.qr_id = $1
    `, [data.payment.qrId]);
    
    if (checkQR.rowCount === 0) {
      throw new ApiError('QR no encontrado', 404);
    }
    
    const qrInfo = checkQR.rows[0];
    if (qrInfo.status !== 'PENDING') {
      throw new ApiError('QR no está pendiente de pago', 400);
    }

    // Obtener el banco_id de BANECO
    const bankId = BANK_DB_ID.BANCO_ECONOMICO;

    // Extraer datos del pago de la notificación
    const payment = data.payment;
    const paymentDate = new Date(payment.paymentDate);

    // create db transaction to update qr and payment
    const client = await pool.connect();
    await client.query('BEGIN');

    // Actualizar estado del QR
    await client.query(`
      UPDATE qr_codes 
      SET status = 'PAID', updated_at = CURRENT_TIMESTAMP 
      WHERE id = $1
    `, [qrInfo.id]);
    
    // Verificar si ya existe un registro de pago para este QR
    const checkPayment = await client.query(`
      SELECT id FROM qr_payments WHERE qr_id = $1
    `, [payment.qrId]);
    
    if (checkPayment.rowCount === 0) {
      // Insertar nuevo registro de pago con todos los datos disponibles
      await client.query(`
        INSERT INTO qr_payments (
          qr_id, company_id, bank_id, transaction_id, payment_date, payment_time,
          currency, amount, sender_bank_code, sender_name, sender_document_id,
          sender_account, description, created_at, status
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP, 'PAID'
        )
      `, [
        payment.qrId,
        qrInfo.companyId,
        bankId,
        payment.transactionId,
        paymentDate,
        payment.paymentTime,
        payment.currency,
        payment.amount,
        payment.senderBankCode,
        payment.senderName,
        payment.senderDocumentId,
        payment.senderAccount,
        payment.description
      ]);
    }
    
    await client.query('COMMIT');
    client.release();
  }
} 

export const qrService = new QrService();
export default qrService; 