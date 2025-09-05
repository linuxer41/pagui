import { Static } from 'elysia';
import { BanecoApi } from '../banks';
import { pool, query } from '../config/database';
import { BANECO_NotifyPaymentQRRequestSchema, BANECO_NotifyPaymentQRResponseSchema } from '../schemas/baneco.scheamas';
import { QRRequest } from '../schemas/qr.schemas';
import { logActivity } from './monitor.service';
import { ApiError } from '../utils/error';
import { bankCredentialsService, BankCredentialsService } from './bank-credentials.service';

// Solo Banco Económico
const BANCO_ECONOMICO_ID = 1;

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
  transactionId?: string;
  amount?: number;
  currency?: string;
  description?: string;
  dueDate?: string;
  singleUse?: boolean;
  modifyAmount?: boolean;
  status?: string;
  payments?: any[]; // Array de payments de Baneco
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
  singleUse: boolean;
  modifyAmount: boolean;
  payments?: PaymentQR[];
}

interface QRListResponse {
  qrList: QRListItem[];
  totalCount: number;
}



class QrService {

  async generate(
    userId: number,
    qrData: QRRequest,
  ): Promise<QRResponse> {
    const currency = 'BOB';
    
    // Obtener configuración bancaria específica del usuario
    const config = await bankCredentialsService.getByUserId(userId);

    // Crear cliente API de Banco Económico usando la URL de la configuración
    const banecoApi = new BanecoApi(config.apiBaseUrl, config.encryptionKey);
    const client = await pool.connect();
    await client.query('BEGIN');

    try {
      // crea una transaccion para generar el QR usando la API de Banco Económico

      // Obtener token de autenticación
       const token = await banecoApi.getToken(config.username, config.password);
       
       // Generar QR usando la API de Banco Económico
       const qrResponse = await banecoApi.generateQr(
         token,
         qrData.transactionId,
         config.accountNumber,
         qrData.amount,
         {
           description: qrData.description || '',
           dueDate: qrData.dueDate,
           singleUse: qrData.singleUse !== false,
           modifyAmount: qrData.modifyAmount || false,
           currency: currency
         }
       );

      if (qrResponse.responseCode !== 0) {
        throw new ApiError(`Error al generar QR: ${qrResponse.message}`, 400);
      }

      // Guardar QR en la base de datos
      const qrResult = await query(`
        INSERT INTO qr_codes (
          qr_id, transaction_id, account_credit, user_id, third_bank_credential_id,
          environment, currency, amount, description, due_date, single_use, modify_amount, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'active')
        RETURNING id
      `, [
        qrResponse.qrId,
        qrData.transactionId,
        config.accountNumber,
        userId,
        config.id,
        config.environment,
        currency,
        qrData.amount,
        qrData.description || '',
        qrData.dueDate,
        qrData.singleUse !== false,
        qrData.modifyAmount || false
      ]);

      const qrId = qrResult.rows[0].id;

      // Registrar actividad
      await logActivity(
        'QR_GENERATED',
        {
          qrId: qrResponse.qrId,
          transactionId: qrData.transactionId,
          amount: qrData.amount,
          currency: currency,
          userId
        },
        'info',
        userId
      );

      return {
        qrId: qrResponse.qrId,
        qrImage: qrResponse.qrImage,
        transactionId: qrData.transactionId,
        amount: qrData.amount,
        currency: currency,
        description: qrData.description,
        dueDate: qrData.dueDate,
        singleUse: qrData.singleUse !== false,
        modifyAmount: qrData.modifyAmount || false,
        status: 'active'
      };

    } catch (error) {
      await logActivity(
        'QR_GENERATE_ERROR',
        {
          userId,
          error: error instanceof Error ? error.message : 'Unknown error',
          qrData
        },
        'error',
        userId
      );
      throw new ApiError('Error al generar QR: ' + (error instanceof Error ? error.message : 'Unknown error'), 401);
    }
  }

  async getQRList(
    userId: number,
    filters: QRFilters = {},
    page: number = 1,
    limit: number = 20
  ): Promise<QRListResponse> {
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE q.user_id = $1 AND q.deleted_at IS NULL';
    const params: any[] = [userId];
    let paramCount = 1;

    if (filters.status) {
      paramCount++;
      whereClause += ` AND q.status = $${paramCount}`;
      params.push(filters.status);
    }

    if (filters.startDate) {
      paramCount++;
      whereClause += ` AND q.due_date >= $${paramCount}`;
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      paramCount++;
      whereClause += ` AND q.due_date <= $${paramCount}`;
      params.push(filters.endDate);
    }

    // Obtener total de registros
    const countQuery = await query(`
      SELECT COUNT(*) as total
      FROM qr_codes q
      ${whereClause}
    `, params);

    const totalCount = parseInt(countQuery.rows[0].total);

    // Obtener lista de QRs
          const qrQuery = await query(`
        SELECT 
          q.qr_id as "qrId",
          q.transaction_id as "transactionId",
          q.created_at as "createdAt",
          q.due_date as "dueDate",
          q.currency,
          q.amount,
          q.status,
          q.description,
          q.single_use as "singleUse",
          q.modify_amount as "modifyAmount"
        FROM qr_codes q
        ${whereClause}
        ORDER BY q.created_at DESC
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `, [...params, limit, offset]);

    const qrList: QRListItem[] = qrQuery.rows.map(row => ({
      qrId: row.qrId,
      transactionId: row.transactionId,
      createdAt: row.createdAt,
      dueDate: row.dueDate,
      currency: row.currency,
      amount: parseFloat(row.amount),
      status: row.status,
      description: row.description,
      singleUse: row.singleUse,
      modifyAmount: row.modifyAmount,
      payments: []
    }));

    // Obtener pagos para cada QR
    for (const qr of qrList) {
      const paymentsQuery = await query(`
        SELECT 
          t.transaction_id as "transactionId",
          t.payment_date as "paymentDate",
          t.currency,
          t.amount,
          t.sender_name as "senderName",
          t.sender_document_id as "senderDocumentId",
          t.sender_account as "senderAccount",
          t.description,
          t.metadata
        FROM transactions t
        WHERE t.qr_id = $1 AND t.deleted_at IS NULL
        ORDER BY t.payment_date DESC
      `, [qr.qrId]);

      qr.payments = paymentsQuery.rows.map(payment => {
        const metadata = payment.metadata ? JSON.parse(payment.metadata) : {};
        return {
          qrId: qr.qrId,
          transactionId: payment.transactionId,
          paymentDate: payment.paymentDate,
          paymentTime: metadata.payment_time || '',
          currency: payment.currency,
          amount: parseFloat(payment.amount),
          senderBankCode: metadata.sender_bank_code || '',
          senderName: payment.senderName || '',
          senderDocumentId: payment.senderDocumentId || '',
          senderAccount: payment.senderAccount || '',
          description: payment.description
        };
      });
    }

    return {
      qrList,
      totalCount
    };
  }

  async getQRDetails(qrId: string, bankCredentialId: number): Promise<QRListItem | null> {
    try {
      console.log(`🔍 getQRDetails: Iniciando con qrId=${qrId}, bankCredentialId=${bankCredentialId}`);
      
      // 1. PRIMERO: Consultar estado en Baneco
      console.log('🏦 getQRDetails: Consultando estado en Baneco...');
      let banecoStatus: number | null = null;
      let banecoPayments: any[] = [];
      
      try {
        // Obtener configuración bancaria del usuario
        const config = await bankCredentialsService.getById(bankCredentialId);
        console.log('🔍 getQRDetails: Configuración bancaria:', config);
        
        if (config) {
          const banecoApi = new BanecoApi(config.apiBaseUrl, config.encryptionKey);
          
          try {
            const token = await banecoApi.getToken(config.username, config.password);
            const banecoResponse = await banecoApi.getQrStatus(token, qrId);
            
            banecoStatus = banecoResponse.statusQrCode;
            banecoPayments = banecoResponse.payment || [];
            
            console.log(`✅ getQRDetails: Estado en Baneco: ${banecoStatus}, Pagos: ${banecoPayments.length}`);
          } catch (banecoError) {
            console.log({banecoError});
            console.log(`⚠️ getQRDetails: Error consultando Baneco: ${banecoError instanceof Error ? banecoError.message : 'Error desconocido'}`);
          }
        } else {
          console.log('⚠️ getQRDetails: Usuario sin configuración bancaria activa');
        }
      } catch (configError) {
        console.log(`⚠️ getQRDetails: Error obteniendo configuración bancaria: ${configError instanceof Error ? configError.message : 'Error desconocido'}`);
      }
      
      // 2. SEGUNDO: Verificar QR en la base de datos
      console.log('🗄️ getQRDetails: Verificando QR en base de datos...');
      const qrQuery = await query(`
        SELECT 
          q.qr_id as "qrId",
          q.transaction_id as "transactionId",
          q.created_at as "createdAt",
          q.due_date as "dueDate",
          q.currency,
          q.amount,
          q.status,
          q.description,
          q.single_use as "singleUse",
          q.modify_amount as "modifyAmount",
          q.user_id as "userId",
          q.third_bank_credential_id as "bankCredentialId",
          q.environment
        FROM qr_codes q
        WHERE q.qr_id = $1 AND q.deleted_at IS NULL
      `, [qrId]);

      console.log(`📊 getQRDetails: Consulta QR completada, filas encontradas: ${qrQuery.rowCount}`);

      if (qrQuery.rowCount === 0) {
        console.log('⚠️ getQRDetails: No se encontró el QR');
        return null;
      }

      const qr = qrQuery.rows[0];
      console.log('✅ getQRDetails: QR encontrado:', qr);
      
      const qrItem: QRListItem = {
        qrId: qr.qrId,
        transactionId: qr.transactionId,
        createdAt: qr.createdAt,
        dueDate: qr.dueDate,
        currency: qr.currency,
        amount: parseFloat(qr.amount),
        status: qr.status,
        description: qr.description,
        singleUse: qr.singleUse,
        modifyAmount: qr.modifyAmount,
        payments: []
      };

      console.log('🏗️ getQRDetails: Objeto QR construido:', qrItem);

      // 3. TERCERO: Actualizar estado en base de datos si Baneco reporta cambios
      if (banecoStatus !== null) {
        console.log('🔄 getQRDetails: Actualizando estado en base de datos según Baneco...');
        
        let newStatus = qr.status;
        if (banecoStatus === 1 && qr.status === 'active') {
          newStatus = 'used';
        } else if (banecoStatus === 9 && qr.status === 'active') {
          newStatus = 'cancelled';
        }
        
        if (newStatus !== qr.status) {
          await query(`
            UPDATE qr_codes 
            SET status = $1, updated_at = CURRENT_TIMESTAMP
            WHERE qr_id = $2
          `, [newStatus, qrId]);
          
          qrItem.status = newStatus;
          console.log(`✅ getQRDetails: Estado actualizado de '${qr.status}' a '${newStatus}'`);
        }
      }

      // 4. CUARTO: Procesar pagos de Baneco si existen
      if (banecoPayments.length > 0) {
        console.log(`💳 getQRDetails: Procesando ${banecoPayments.length} pagos de Baneco...`);
        
        for (const banecoPayment of banecoPayments) {
          // Verificar si el pago ya existe en la base de datos
          const existingPaymentQuery = await query(`
            SELECT id FROM transactions 
            WHERE qr_id = $1 AND transaction_id = $2 AND deleted_at IS NULL
          `, [qrId, banecoPayment.transactionId]);
          
          if (existingPaymentQuery.rowCount === 0) {
            // Insertar nuevo pago
            await query(`
              INSERT INTO transactions (
                qr_id, user_id, third_bank_credential_id, environment, transaction_id, payment_date, currency, amount,
                type, sender_name, sender_document_id, sender_account, description,
                metadata, status, created_at, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `, [
              qrId,
              qr.userId || qr.user_id, // user_id del QR
              qr.bankCredentialId || qr.third_bank_credential_id, // third_bank_credential_id del QR
              qr.environment || 1, // environment del QR o por defecto 1
              banecoPayment.transactionId,
              banecoPayment.paymentDate,
              banecoPayment.currency,
              banecoPayment.amount.toString(),
              'incoming', // Tipo de transacción
              banecoPayment.senderName,
              banecoPayment.senderDocumentId,
              banecoPayment.senderAccount,
              banecoPayment.description,
              JSON.stringify({
                payment_time: banecoPayment.paymentTime,
                sender_bank_code: banecoPayment.senderBankCode,
                branch_code: banecoPayment.branchCode
              }),
              'completed' // Estado de la transacción
            ]);
            
            console.log(`✅ getQRDetails: Pago ${banecoPayment.transactionId} insertado`);
          }
        }
      }

      // Obtener pagos del QR (combinando base de datos y Baneco)
      console.log('💰 getQRDetails: Obteniendo pagos del QR...');
      const paymentsQuery = await query(`
        SELECT 
          t.transaction_id as "transactionId",
          t.payment_date as "paymentDate",
          t.currency,
          t.amount,
          t.sender_name as "senderName",
          t.sender_document_id as "senderDocumentId",
          t.sender_account as "senderAccount",
          t.description,
          t.metadata
        FROM transactions t
        WHERE t.qr_id = $1 AND t.deleted_at IS NULL
        ORDER BY t.payment_date DESC
      `, [qrId]);

      console.log(`💳 getQRDetails: Pagos encontrados: ${paymentsQuery.rowCount}`);

      qrItem.payments = paymentsQuery.rows.map(payment => {
        try {
          const metadata = payment.metadata ? JSON.parse(payment.metadata) : {};
          return {
            qrId: qr.qrId,
            transactionId: payment.transactionId,
            paymentDate: payment.paymentDate,
            paymentTime: metadata.payment_time || '',
            currency: payment.currency,
            amount: parseFloat(payment.amount),
            senderBankCode: metadata.sender_bank_code || '',
            senderName: payment.senderName || '',
            senderDocumentId: payment.senderDocumentId || '',
            senderAccount: payment.senderAccount || '',
            description: payment.description
          };
        } catch (parseError) {
          console.error('❌ getQRDetails: Error parseando metadata del pago:', parseError);
          // Retornar pago sin metadata si hay error de parsing
          return {
            qrId: qr.qrId,
            transactionId: payment.transactionId,
            paymentDate: payment.paymentDate,
            paymentTime: '',
            currency: payment.currency,
            amount: parseFloat(payment.amount),
            senderBankCode: '',
            senderName: payment.senderName || '',
            senderDocumentId: payment.senderDocumentId || '',
            senderAccount: payment.senderAccount || '',
            description: payment.description
          };
        }
      });

      console.log('🎉 getQRDetails: Método completado exitosamente');
      console.log('📋 getQRDetails: Flujo ejecutado: Baneco → Base de datos → Actualización → Pagos');
      return qrItem;
      
    } catch (error) {
      console.error('💥 getQRDetails: Error capturado:', error);
      console.error('💥 getQRDetails: Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
      throw error; // Re-lanzar el error para que sea manejado por el manejador global
    }
  }

  async cancelQR(qrId: string, userId: number): Promise<boolean> {
    // Obtener el QR y verificar que pertenece al usuario
    const qrQuery = await query(`
      SELECT q.id, q.status, q.third_bank_credential_id, u.third_bank_credential_id as "userBankCredentialId"
      FROM qr_codes q
      JOIN users u ON q.user_id = u.id
      WHERE q.qr_id = $1 AND q.user_id = $2 AND q.deleted_at IS NULL
    `, [qrId, userId]);

    if (qrQuery.rowCount === 0) {
      throw new ApiError('QR no encontrado o no pertenece a este usuario', 404);
    }

    const qr = qrQuery.rows[0];
    if (qr.status !== 'active') {
      throw new ApiError('Solo se pueden cancelar QRs activos', 400);
    }

    // Verificar que el usuario tenga third_bank_credential_id configurado
    if (!qr.userBankCredentialId) {
      throw new ApiError('El usuario no tiene configuración bancaria asignada', 400);
    }

    // Obtener configuración bancaria específica del usuario
    const config = await bankCredentialsService.getById(qr.userBankCredentialId);
    if (!config) {
      throw new ApiError('No se encontró la configuración bancaria del usuario', 400);
    }

    // Verificar que la configuración esté activa
    if (config.status !== 'active') {
      throw new ApiError('La configuración bancaria del usuario no está activa', 400);
    }

    // Crear cliente API de Banco Económico usando la URL de la configuración
    const banecoApi = new BanecoApi(config.apiBaseUrl, config.encryptionKey);

    try {
             // Obtener token de autenticación
       const token = await banecoApi.getToken(config.username, config.password);
       
       // Cancelar QR en Banco Económico
       const cancelResponse = await banecoApi.cancelQr(token, qrId);

      if (cancelResponse.responseCode !== 0) {
        throw new ApiError(`Error al cancelar QR: ${cancelResponse.message}`, 400);
      }

      // Actualizar estado en la base de datos
      await query(`
        UPDATE qr_codes 
        SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [qr.id]);

      // Registrar actividad
      await logActivity(
        'QR_CANCELLED',
        {
          qrId,
          userId
        },
        'info',
        userId
      );

      return true;

    } catch (error) {
      await logActivity(
        'QR_CANCEL_ERROR',
        {
          qrId,
          userId,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        'error',
        userId
      );
      throw error;
    }
  }

  async checkQRStatus(qrId: string, userId: number): Promise<QRResponse> {
    // 1. PRIMERO: Verificar si el QR existe en la base de datos
    const qrQuery = await query(`
      SELECT 
        q.qr_id as "qrId",
        q.transaction_id as "transactionId",
        q.created_at as "createdAt",
        q.due_date as "dueDate",
        q.currency,
        q.amount,
        q.status,
        q.description,
        q.single_use as "singleUse",
        q.modify_amount as "modifyAmount",
        q.user_id as "userId",
        q.third_bank_credential_id as "bankCredentialId",
        q.environment
      FROM qr_codes q
      WHERE q.qr_id = $1 AND q.deleted_at IS NULL
    `, [qrId]);

    if (qrQuery.rowCount === 0) {
      throw new ApiError('QR no encontrado en la base de datos', 404);
    }

    const qr = qrQuery.rows[0];

    // 2. SEGUNDO: Verificar que el usuario existe y obtener su third_bank_credential_id
    const user = await query(`
      SELECT id, full_name, third_bank_credential_id FROM users WHERE id = $1 AND deleted_at IS NULL
    `, [userId]);

    if (user.rowCount === 0) {
      throw new ApiError('Usuario no encontrado', 404);
    }

    const userData = user.rows[0];
    
    // Verificar que el usuario tenga third_bank_credential_id configurado
    if (!userData.third_bank_credential_id) {
      throw new ApiError('El usuario no tiene configuración bancaria asignada', 400);
    }

    // 3. TERCERO: Obtener configuración bancaria específica del usuario
    const config = await bankCredentialsService.getById(userData.third_bank_credential_id);
    if (!config) {
      throw new ApiError('No se encontró la configuración bancaria del usuario', 400);
    }

    // Verificar que la configuración esté activa
    if (config.status !== 'active') {
      throw new ApiError('La configuración bancaria del usuario no está activa', 400);
    }

    // 4. CUARTO: Crear cliente API de Banco Económico y obtener estado
    const banecoApi = new BanecoApi(config.apiBaseUrl, config.encryptionKey);
    
    try {
      // Obtener token de autenticación
      const token = await banecoApi.getToken(config.username, config.password);
      
      // Verificar estado del QR en Baneco
      const banecoResponse = await banecoApi.getQrStatus(token, qrId);
      
      // 5. QUINTO: Actualizar estado en base de datos si Baneco reporta cambios
      let currentStatus = qr.status;
      if (banecoResponse.statusQrCode === 1 && qr.status === 'active') {
        currentStatus = 'used';
        // Actualizar en base de datos
        await query(`
          UPDATE qr_codes 
          SET status = $1, updated_at = CURRENT_TIMESTAMP
          WHERE qr_id = $2
        `, [currentStatus, qrId]);
      } else if (banecoResponse.statusQrCode === 9 && qr.status === 'active') {
        currentStatus = 'cancelled';
        // Actualizar en base de datos
        await query(`
          UPDATE qr_codes 
          SET status = $1, updated_at = CURRENT_TIMESTAMP
          WHERE qr_id = $2
        `, [currentStatus, qrId]);
      }

      // 6. SEXTO: Retornar el mismo objeto que retorna generate, con payments de Baneco primero
      return {
        qrId: qr.qrId,
        qrImage: '', // No tenemos qrImage en checkStatus, pero mantenemos la estructura
        transactionId: qr.transactionId,
        amount: parseFloat(qr.amount),
        currency: qr.currency,
        description: qr.description,
        dueDate: qr.dueDate,
        singleUse: qr.singleUse,
        modifyAmount: qr.modifyAmount,
        status: currentStatus,
        payments: banecoResponse.payment || [] // Payments de Baneco primero
      };

    } catch (error) {
      throw new ApiError('Error al verificar estado del QR: ' + (error instanceof Error ? error.message : 'Unknown error'), 500);
    }
  }

  async banecoQRNotify(data: Static<typeof BANECO_NotifyPaymentQRRequestSchema>): Promise<void> {
    const checkQR = await query<{id: number, status: string, transactionId: string, userId: number}>(`
      SELECT q.id, q.status, q.transaction_id as "transactionId", q.user_id as "userId" 
      FROM qr_codes q
      WHERE q.qr_id = $1
    `, [data.payment.qrId]);
    
    if (checkQR.rowCount === 0) {
      throw new ApiError('QR no encontrado', 404);
    }
    
    const qrInfo = checkQR.rows[0];
    if (qrInfo.status !== 'active') {
      throw new ApiError('QR no está activo para pago', 400);
    }

    // Solo Banco Económico
    const bankId = BANCO_ECONOMICO_ID;

    // Extraer datos del pago de la notificación
    const payment = data.payment;
    const paymentDate = new Date(payment.paymentDate);

    // create db transaction to update qr and payment
    const client = await pool.connect();
    await client.query('BEGIN');

    try {
      // Actualizar estado del QR
      await client.query(`
        UPDATE qr_codes 
        SET status = 'used', updated_at = CURRENT_TIMESTAMP 
        WHERE id = $1
      `, [qrInfo.id]);
      
      // Verificar si ya existe un registro de pago para este QR
      const checkPayment = await client.query(`
        SELECT id FROM transactions WHERE qr_id = $1
      `, [payment.qrId]);
      
      if (checkPayment.rowCount === 0) {
        // Obtener el third_bank_credential_id del QR
        const bankQuery = await client.query(`
          SELECT third_bank_credential_id FROM qr_codes WHERE id = $1
        `, [qrInfo.id]);
        
        const bankCredentialId = bankQuery.rows[0]?.third_bank_credential_id;
        
        if (!bankCredentialId) {
          throw new ApiError('No se encontró la configuración bancaria del QR', 500);
        }
        
                 // Insertar nuevo registro de pago en la tabla transactions
         await client.query(`
           INSERT INTO transactions (
             qr_id, user_id, third_bank_credential_id, environment, transaction_id, payment_date,
             currency, amount, type, sender_name, sender_document_id, sender_account,
             description, metadata, status, created_at, updated_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         `, [
           payment.qrId,
           qrInfo.userId,
           bankCredentialId,
           1, // environment - por defecto 1 (test), se puede obtener del QR si es necesario
           payment.transactionId,
           paymentDate,
           payment.currency,
           payment.amount,
           'incoming', // Tipo de transacción
           payment.senderName,
           payment.senderDocumentId,
           payment.senderAccount,
           payment.description || '',
           JSON.stringify({
             sender_bank_code: payment.senderBankCode,
             payment_time: payment.paymentTime
           }),
           'completed' // Estado de la transacción
         ]);
      }
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
} 

export const qrService = new QrService();
export default qrService; 