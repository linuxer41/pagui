import { Static } from 'elysia';
import { BanecoApi } from '../banks';
import { pool, query } from '../config/database';
import { BANECO_NotifyPaymentQRRequestSchema, BANECO_NotifyPaymentQRResponseSchema } from '../schemas/baneco.scheamas';
import { QRRequest } from '../schemas/qr.schemas';
import { ApiError } from '../utils/error';
import { bankCredentialsService, BankCredentialsService } from './bank-credentials.service';
import accountService from './account.service';

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
  qrImage: string;
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

  async getByQrId(qrId: string): Promise<QRListItem> {
    const qrQuery = await query(`
      SELECT 
        q.qr_id as "qrId",
        q.qr_image as "qrImage",
        q.transaction_id as "transactionId",
        q.created_at as "createdAt",
        q.due_date as "dueDate",
        q.amount,
        q.currency,
        q.status,
        q.description,
        q.single_use as "singleUse",
        q.modify_amount as "modifyAmount"
      FROM qr_codes q
      WHERE q.qr_id = $1 AND q.deleted_at IS NULL
    `, [qrId]);
    if (qrQuery.rowCount === 0) {
      throw new ApiError('QR no encontrado', 404);
    }
    const qr = qrQuery.rows[0];
    
    return {
      qrId: qr.qrId,
      qrImage: qr.qrImage,
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
  }

  async generate(
    accountId: number,
    qrData: QRRequest,
    bankCredentialId: number
  ): Promise<QRListItem> {
    const currency = 'BOB';


    console.log('bankCredentialId',bankCredentialId);
    
    // Obtener configuración bancaria específica
    const config = await bankCredentialsService.getById(bankCredentialId);
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
          qr_id, transaction_id, account_id, third_bank_credential_id,
          amount, currency, description, due_date, qr_image, 
          single_use, modify_amount, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'active')
        RETURNING id
      `, [
        qrResponse.qrId,
        qrData.transactionId,
        accountId,
        config.id,
        qrData.amount,
        currency,
        qrData.description || '',
        qrData.dueDate,
        qrResponse.qrImage,
        qrData.singleUse !== false,
        qrData.modifyAmount || false
      ]);

      const qrDetails = await this.getByQrId(qrResponse.qrId);

      // Agregar trabajo de sincronización a la cola
      try {
        const paymentQueueService = await import('./payment-queue.service');
        await paymentQueueService.default.addPaymentSyncJob({
          qrId: qrResponse.qrId,
          accountId: accountId,
          priority: 'high', // Alta prioridad para QRs nuevos
          delay: 0 // Sin delay, verificar inmediatamente
        });
        console.log(`📋 Trabajo de sincronización agregado para QR: ${qrResponse.qrId}`);
      } catch (queueError) {
        console.error('Error agregando trabajo a la cola:', queueError);
        // No fallar la creación del QR si hay error en la cola
      }

      return qrDetails;

    } catch (error) {
      // Activity logging removed
      throw new ApiError('Error al generar QR: ' + (error instanceof Error ? error.message : 'Unknown error'), 401);
    }
  }

  async getQRList(
    accountId: number,
    filters: QRFilters = {},
    page: number = 1,
    limit: number = 20
  ): Promise<QRListResponse> {
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE q.account_id = $1 AND q.deleted_at IS NULL';
    const params: any[] = [accountId];
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
          q.amount,
          q.currency,
          q.status,
          q.description,
          q.qr_image as "qrImage",
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
      qrImage: row.qrImage,
      singleUse: row.singleUse,
      modifyAmount: row.modifyAmount,
      payments: []
    }));

    // Obtener pagos para cada QR
    for (const qr of qrList) {
      const paymentsQuery = await query(`
        SELECT 
          am.reference_id as "transactionId",
          am.created_at as "paymentDate",
          'BOB' as currency,
          am.amount,
          am.sender_name as "senderName",
          am.description,
          am.reference_type as "referenceType"
        FROM account_movements am
        WHERE am.qr_id = $1 AND am.deleted_at IS NULL AND am.movement_type = 'qr_payment'
        ORDER BY am.created_at DESC
      `, [qr.qrId]);

      qr.payments = paymentsQuery.rows.map(payment => {
        return {
          qrId: qr.qrId,
          transactionId: payment.transactionId,
          paymentDate: payment.paymentDate,
          paymentTime: '', // No tenemos este campo en account_movements
          currency: payment.currency,
          amount: parseFloat(payment.amount),
          senderBankCode: '', // No tenemos este campo en account_movements
          senderName: payment.senderName || '',
          senderDocumentId: '', // No tenemos este campo en account_movements
          senderAccount: '', // No tenemos este campo en account_movements
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
          q.amount,
          q.currency,
          q.status,
          q.description,
          q.qr_image as "qrImage",
          q.single_use as "singleUse",
          q.modify_amount as "modifyAmount",
          q.account_id as "accountId"
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
            SELECT id FROM account_movements 
            WHERE qr_id = $1 AND reference_id = $2 AND deleted_at IS NULL
          `, [qrId, banecoPayment.transactionId]);
          
          if (existingPaymentQuery.rowCount === 0) {
            // Obtener la cuenta asociada al QR
            const accountQuery = await query(`
              SELECT a.id, a.balance 
              FROM accounts a 
              JOIN qr_codes q ON a.id = q.account_id 
              WHERE q.qr_id = $1
            `, [qrId]);
            
            if (accountQuery.rows.length === 0) {
              console.log(`⚠️ getQRDetails: No se encontró cuenta para QR ${qrId}`);
              continue;
            }
            
            const account = accountQuery.rows[0];
            
            // Crear movimiento de cuenta usando el nuevo método con validación de duplicados
            await accountService.createAccountMovement({
              accountId: account.id,
              movementType: 'qr_payment',
              amount: parseFloat(banecoPayment.amount),
              description: banecoPayment.description || 'Pago QR recibido',
              qrId: qrId,
              transactionId: banecoPayment.transactionId,
              paymentDate: banecoPayment.paymentDate ? new Date(banecoPayment.paymentDate) : undefined,
              paymentTime: banecoPayment.paymentTime,
              currency: banecoPayment.currency,
              senderName: banecoPayment.senderName,
              senderDocumentId: banecoPayment.senderDocumentId,
              senderAccount: banecoPayment.senderAccount,
              senderBankCode: banecoPayment.senderBankCode,
              referenceId: banecoPayment.transactionId,
              referenceType: 'qr_payment'
            });
            
            console.log(`✅ getQRDetails: Pago ${banecoPayment.transactionId} insertado`);
          }
        }
      }

      // Obtener pagos del QR (combinando base de datos y Baneco)
      console.log('💰 getQRDetails: Obteniendo pagos del QR...');
      const paymentsQuery = await query(`
        SELECT 
          am.reference_id as "transactionId",
          am.created_at as "paymentDate",
          'BOB' as currency,
          am.amount,
          am.sender_name as "senderName",
          am.description,
          am.reference_type as "referenceType"
        FROM account_movements am
        WHERE am.qr_id = $1 AND am.deleted_at IS NULL AND am.movement_type = 'qr_payment'
        ORDER BY am.created_at DESC
      `, [qrId]);

      console.log(`💳 getQRDetails: Pagos encontrados: ${paymentsQuery.rowCount}`);

      qrItem.payments = paymentsQuery.rows.map(payment => {
        return {
          qrId: qr.qrId,
          transactionId: payment.transactionId,
          paymentDate: payment.paymentDate,
          paymentTime: '', // No tenemos este campo en account_movements
          currency: payment.currency,
          amount: parseFloat(payment.amount),
          senderBankCode: '', // No tenemos este campo en account_movements
          senderName: payment.senderName || '',
          senderDocumentId: '', // No tenemos este campo en account_movements
          senderAccount: '', // No tenemos este campo en account_movements
          description: payment.description
        };
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

  async cancelQR(qrId: string, accountId: number): Promise<boolean> {
    // Obtener el QR y verificar que pertenece a la cuenta
    const qrQuery = await query(`
      SELECT q.id, q.status, q.account_id, q.third_bank_credential_id
      FROM qr_codes q
      WHERE q.qr_id = $1 AND q.account_id = $2 AND q.deleted_at IS NULL
    `, [qrId, accountId]);

    if (qrQuery.rowCount === 0) {
      throw new ApiError('QR no encontrado o no pertenece a esta cuenta', 404);
    }

    const qr = qrQuery.rows[0];
    if (qr.status !== 'active') {
      throw new ApiError('Solo se pueden cancelar QRs activos', 400);
    }

    // Verificar que el usuario tenga third_bank_credential_id configurado
    if (!qr.third_bank_credential_id) {
      throw new ApiError('El usuario no tiene configuración bancaria asignada', 400);
    }

    // Obtener configuración bancaria específica del usuario
    const config = await bankCredentialsService.getById(qr.third_bank_credential_id);
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
      // Activity logging removed

      return true;

    } catch (error) {
      // Activity logging removed
      throw error;
    }
  }

  async getQRPayments(qrId: string, userId: number): Promise<any[]> {
    // 1. PRIMERO: Verificar que el QR existe en la base de datos
    const qrQuery = await query(`
      SELECT 
        q.qr_id as "qrId",
        q.account_id as "accountId"
      FROM qr_codes q
      WHERE q.qr_id = $1 AND q.deleted_at IS NULL
    `, [qrId]);

    if (qrQuery.rowCount === 0) {
      throw new ApiError('QR no encontrado en la base de datos', 404);
    }

    const qr = qrQuery.rows[0];

    // 2. SEGUNDO: Verificar que el usuario existe y obtener su cuenta primaria con third_bank_credential_id
    const userAccount = await query(`
      SELECT 
        u.id, 
        u.full_name,
        a.third_bank_credential_id
      FROM users u
      JOIN user_accounts ua ON u.id = ua.user_id
      JOIN accounts a ON ua.account_id = a.id
      WHERE u.id = $1 AND u.deleted_at IS NULL AND ua.deleted_at IS NULL AND a.deleted_at IS NULL
      AND ua.is_primary = true
    `, [userId]);

    if (userAccount.rowCount === 0) {
      throw new ApiError('Usuario no encontrado o no tiene cuenta primaria', 404);
    }

    const userData = userAccount.rows[0];
    
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

    // 4. CUARTO: Crear cliente API de Banco Económico y obtener pagos
    const banecoApi = new BanecoApi(config.apiBaseUrl, config.encryptionKey);
    
    try {
      // Obtener token de autenticación
      const token = await banecoApi.getToken(config.username, config.password);
      
      // Verificar estado del QR en Baneco para obtener pagos
      const banecoResponse = await banecoApi.getQrStatus(token, qrId);
      
      // Retornar solo los pagos de Baneco
      return banecoResponse.payment || [];

    } catch (error) {
      throw new ApiError('Error al obtener pagos del QR: ' + (error instanceof Error ? error.message : 'Unknown error'), 500);
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
        q.amount,
        q.currency,
        q.status,
        q.description,
        q.qr_image as "qrImage",
        q.single_use as "singleUse",
        q.modify_amount as "modifyAmount",
        q.account_id as "accountId"
      FROM qr_codes q
      WHERE q.qr_id = $1 AND q.deleted_at IS NULL
    `, [qrId]);

    if (qrQuery.rowCount === 0) {
      throw new ApiError('QR no encontrado en la base de datos', 404);
    }

    const qr = qrQuery.rows[0];

    // 2. SEGUNDO: Verificar que el usuario existe y obtener su cuenta primaria con third_bank_credential_id
    const userAccount = await query(`
      SELECT 
        u.id, 
        u.full_name,
        a.third_bank_credential_id
      FROM users u
      JOIN user_accounts ua ON u.id = ua.user_id
      JOIN accounts a ON ua.account_id = a.id
      WHERE u.id = $1 AND u.deleted_at IS NULL AND ua.deleted_at IS NULL AND a.deleted_at IS NULL
      AND ua.is_primary = true
    `, [userId]);

    if (userAccount.rowCount === 0) {
      throw new ApiError('Usuario no encontrado o no tiene cuenta primaria', 404);
    }

    const userData = userAccount.rows[0];
    
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

    // 4. CUARTO: Crear cliente API de Banco Económico y obtener estado (solo para actualizar status)
    const banecoApi = new BanecoApi(config.apiBaseUrl, config.encryptionKey);
    
    try {
      // Obtener token de autenticación
      const token = await banecoApi.getToken(config.username, config.password);
      
      // Verificar estado del QR en Baneco (solo para actualizar status, no para obtener pagos)
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

      // 6. SEXTO: Retornar solo los detalles del QR (sin pagos de Baneco)
      return {
        qrId: qr.qrId,
        qrImage: qr.qrImage || '', // Usar la imagen almacenada en la base de datos
        transactionId: qr.transactionId,
        amount: parseFloat(qr.amount),
        currency: qr.currency,
        description: qr.description,
        dueDate: qr.dueDate,
        singleUse: qr.singleUse,
        modifyAmount: qr.modifyAmount,
        status: currentStatus,
        payments: [] // Sin pagos de Baneco en este endpoint
      };

    } catch (error) {
      // Si hay error con Baneco, retornar los datos de la base de datos sin actualizar status
      return {
        qrId: qr.qrId,
        qrImage: qr.qrImage || '',
        transactionId: qr.transactionId,
        amount: parseFloat(qr.amount),
        currency: qr.currency,
        description: qr.description,
        dueDate: qr.dueDate,
        singleUse: qr.singleUse,
        modifyAmount: qr.modifyAmount,
        status: qr.status, // Usar status de la base de datos
        payments: []
      };
    }
  }

  async banecoQRNotify(data: Static<typeof BANECO_NotifyPaymentQRRequestSchema>): Promise<void> {
    const checkQR = await query<{id: number, status: string, transactionId: string, accountId: number}>(`
      SELECT q.id, q.status, q.transaction_id as "transactionId", q.account_id as "accountId" 
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


    // Extraer datos del pago de la notificación
    const payment = data.payment;

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
        SELECT id FROM account_movements WHERE qr_id = $1 AND reference_id = $2
      `, [payment.qrId, payment.transactionId]);
      
      if (checkPayment.rowCount === 0) {
        // Obtener la cuenta asociada al QR
        const accountQuery = await client.query(`
          SELECT a.id, a.balance 
          FROM accounts a 
          JOIN qr_codes q ON a.id = q.account_id 
          WHERE q.id = $1
        `, [qrInfo.id]);
        
        if (accountQuery.rows.length === 0) {
          throw new ApiError('No se encontró la cuenta asociada al QR', 500);
        }
        
        const account = accountQuery.rows[0];
        
        // Crear movimiento de cuenta usando el nuevo método con validación de duplicados
        await accountService.createAccountMovement({
          accountId: account.id,
          movementType: 'qr_payment',
          amount: parseFloat(payment.amount.toString()),
          description: payment.description || 'Pago QR recibido',
          qrId: payment.qrId,
          transactionId: payment.transactionId,
          paymentDate: payment.paymentDate ? new Date(payment.paymentDate) : undefined,
          paymentTime: payment.paymentTime,
          currency: payment.currency,
          senderName: payment.senderName,
          senderDocumentId: payment.senderDocumentId,
          senderAccount: payment.senderAccount,
          senderBankCode: payment.senderBankCode,
          referenceId: payment.transactionId,
          referenceType: 'qr_payment'
        });
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
