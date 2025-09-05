import { query } from '../config/database';
import { CompanyBankInput, CompanyBankResponse } from '../schemas/company-bank.schemas';
import { logActivity } from './monitor.service';
import { ApiError } from '../utils/error';

interface BankData {
  code: string;
  name: string;
  testApiUrl?: string;
  prodApiUrl?: string;
  apiVersion?: string;
}

interface BankResponse {
  id?: number;
  code?: string;
  name?: string;
  status?: string;
  responseCode: number;
  message: string;
}

class BankService {
  // Crear un nuevo banco
  async createBank(bankData: BankData, userId?: number, companyId?: number): Promise<BankResponse> {
    try {
      // Verificar si ya existe un banco con ese código
      const existingCheck = await query(
        'SELECT id FROM banks WHERE code = $1 AND deleted_at IS NULL',
        [bankData.code]
      );
      
      if (existingCheck.rowCount && existingCheck.rowCount > 0) {
        return {
          responseCode: 1,
          message: `Ya existe un banco con el código '${bankData.code}'`
        };
      }
      
      // Crear el banco
      const result = await query(`
        INSERT INTO banks (
          code,
          name,
          test_api_url,
          prod_api_url,
          api_version
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, created_at
      `, [
        bankData.code,
        bankData.name,
        bankData.testApiUrl || null,
        bankData.prodApiUrl || null,
        bankData.apiVersion || null
      ]);
      
      const bankId = result.rows[0].id;
      
      // Registrar actividad
      await logActivity(
        'BANK_CREATED',
        {
          bankId,
          code: bankData.code,
          name: bankData.name
        },
        'info',
        companyId,
        userId
      );
      
      return {
        id: bankId,
        code: bankData.code,
        name: bankData.name,
        status: 'active',
        responseCode: 0,
        message: 'Banco creado exitosamente'
      };
    } catch (error) {
      console.error('Error creando banco:', error);
      
      return {
        responseCode: 1,
        message: error instanceof Error ? error.message : 'Error creando banco'
      };
    }
  }
  
  // Actualizar un banco existente
  async updateBank(bankId: number, bankData: Partial<BankData>, userId?: number, companyId?: number): Promise<BankResponse> {
    try {
      // Verificar que el banco exista
      const bankCheck = await query('SELECT id FROM banks WHERE id = $1 AND deleted_at IS NULL', [bankId]);
      
      if (bankCheck.rowCount === 0) {
        return {
          responseCode: 1,
          message: 'Banco no encontrado'
        };
      }
      
      // Preparar datos para actualización
      const updates: string[] = [];
      const values: any[] = [];
      let paramCounter = 1;
      
      if (bankData.code !== undefined) {
        // Verificar que el nuevo código no esté en uso
        if (bankData.code) {
          const existingCheck = await query(
            'SELECT id FROM banks WHERE code = $1 AND id != $2 AND deleted_at IS NULL',
            [bankData.code, bankId]
          );
          
          if (existingCheck.rowCount && existingCheck.rowCount > 0) {
            return {
              responseCode: 1,
              message: `Ya existe otro banco con el código '${bankData.code}'`
            };
          }
          
          updates.push(`code = $${paramCounter++}`);
          values.push(bankData.code);
        }
      }
      
      if (bankData.name !== undefined) {
        updates.push(`name = $${paramCounter++}`);
        values.push(bankData.name);
      }
      
      if (bankData.testApiUrl !== undefined) {
        updates.push(`test_api_url = $${paramCounter++}`);
        values.push(bankData.testApiUrl || null);
      }
      
      if (bankData.prodApiUrl !== undefined) {
        updates.push(`prod_api_url = $${paramCounter++}`);
        values.push(bankData.prodApiUrl || null);
      }
      
      if (bankData.apiVersion !== undefined) {
        updates.push(`api_version = $${paramCounter++}`);
        values.push(bankData.apiVersion || null);
      }
      
      // Añadir updated_at
      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      
      // Si no hay actualizaciones, retornar éxito
      if (updates.length === 1) {
        return {
          id: bankId,
          responseCode: 0,
          message: 'No se realizaron cambios'
        };
      }
      
      // Actualizar el banco
      values.push(bankId); // Para la condición WHERE
      const result = await query(`
        UPDATE banks
        SET ${updates.join(', ')}
        WHERE id = $${paramCounter}
        RETURNING id, code, name, status
      `, values);
      
      const updatedBank = result.rows[0];
      
      // Registrar actividad
      await logActivity(
        'BANK_UPDATED',
        {
          bankId,
          updatedFields: Object.keys(bankData)
        },
        'info',
        companyId,
        userId
      );
      
      return {
        id: updatedBank.id,
        code: updatedBank.code,
        name: updatedBank.name,
        status: updatedBank.status,
        responseCode: 0,
        message: 'Banco actualizado exitosamente'
      };
    } catch (error) {
      console.error('Error actualizando banco:', error);
      
      return {
        responseCode: 1,
        message: error instanceof Error ? error.message : 'Error actualizando banco'
      };
    }
  }
  
  // Obtener detalles de un banco
  async getBankDetails(bankId: number): Promise<{
    bank?: any;
    responseCode: number;
    message: string;
  }> {
    try {
      // Obtener información del banco
      const result = await query(`
        SELECT 
          id, 
          code, 
          name, 
          status, 
          created_at, 
          updated_at
        FROM banks
        WHERE id = $1 AND deleted_at IS NULL
      `, [bankId]);
      
      if (result.rowCount === 0) {
        return {
          responseCode: 1,
          message: 'Banco no encontrado'
        };
      }
      
      const bank = {
        id: result.rows[0].id,
        code: result.rows[0].code,
        name: result.rows[0].name,
        status: result.rows[0].status,
        createdAt: result.rows[0].created_at,
        updatedAt: result.rows[0].updated_at
      };
      
      return {
        bank,
        responseCode: 0,
        message: ''
      };
    } catch (error) {
      console.error('Error obteniendo detalles del banco:', error);
      
      return {
        responseCode: 1,
        message: error instanceof Error ? error.message : 'Error obteniendo detalles del banco'
      };
    }
  }
  
  // Listar todos los bancos
  async listBanks(): Promise<{
    banks: any[];
    responseCode: number;
    message: string;
  }> {
    try {
      const result = await query(`
        SELECT 
          id, 
          code, 
          name, 
          status, 
          created_at
        FROM banks
        WHERE deleted_at IS NULL
        ORDER BY name
      `);
      
      const banks = result.rows.map(row => ({
        id: row.id,
        code: row.code,
        name: row.name,
        status: row.status,
        createdAt: row.created_at
      }));
      
      return {
        banks,
        responseCode: 0,
        message: ''
      };
    } catch (error) {
      console.error('Error listando bancos:', error);
      
      return {
        banks: [],
        responseCode: 1,
        message: error instanceof Error ? error.message : 'Error listando bancos'
      };
    }
  }
  
  // Desactivar un banco
  async deactivateBank(bankId: number, userId?: number, companyId?: number): Promise<BankResponse> {
    try {
      // Verificar que el banco exista
      const bankCheck = await query('SELECT id, code, name FROM banks WHERE id = $1 AND deleted_at IS NULL', [bankId]);
      
      if (bankCheck.rowCount === 0) {
        return {
          responseCode: 1,
          message: 'Banco no encontrado'
        };
      }
      
      // Desactivar el banco
      await query(`
        UPDATE banks
        SET status = 'inactive', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [bankId]);
      
      // Registrar actividad
      await logActivity(
        'BANK_DEACTIVATED',
        {
          bankId,
          bankCode: bankCheck.rows[0].code,
          bankName: bankCheck.rows[0].name
        },
        'info',
        companyId,
        userId
      );
      
      return {
        id: bankId,
        responseCode: 0,
        message: 'Banco desactivado exitosamente'
      };
    } catch (error) {
      console.error('Error desactivando banco:', error);
      
      return {
        responseCode: 1,
        message: error instanceof Error ? error.message : 'Error desactivando banco'
      };
    }
  }
  
  // Registrar un banco para una compañía
  async registerCompanyBank(
    companyId: number,
    bankData: CompanyBankInput,
    userId?: number
  ): Promise<CompanyBankResponse> {
    try {
      // Verificar que la compañía existe
      const companyCheck = await query('SELECT id FROM companies WHERE id = $1 AND deleted_at IS NULL', [companyId]);
      
      if (companyCheck.rowCount === 0) {
        return {
          responseCode: 1,
          message: 'Compañía no encontrada'
        };
      }
      
      // Verificar que el banco existe
      const bankCheck = await query('SELECT id, name FROM banks WHERE id = $1 AND deleted_at IS NULL', [bankData.bankId]);
      
      if (bankCheck.rowCount === 0) {
        return {
          responseCode: 1,
          message: 'Banco no encontrado'
        };
      }
      
      const bankName = bankCheck.rows[0].name;
      
      // Verificar si ya existe una configuración para esta compañía, banco y entorno
      const existingCheck = await query(
        'SELECT id FROM company_bank WHERE company_id = $1 AND bank_id = $2 AND environment = $3 AND deleted_at IS NULL',
        [companyId, bankData.bankId, bankData.environment || 1]
      );
      
      let companyBankId: number;
      let isNew = true;
      
      if (existingCheck.rowCount && existingCheck.rowCount > 0) {
        // Actualizar la configuración existente
        companyBankId = existingCheck.rows[0].id;
        isNew = false;
        
        const result = await query(`
          UPDATE company_bank SET
            account_number = $1,
            account_type = $2,
            account_name = $3,
            merchant_id = $4,
            additional_config = $5,
            environment = $6,
            bank_branch = $7,
            status = $8,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $9
          RETURNING id
        `, [
          bankData.accountNumber,
          bankData.accountType || 1,
          bankData.accountName || null,
          bankData.merchantId || null,
          bankData.additionalConfig ? JSON.stringify(bankData.additionalConfig) : '{}',
          bankData.environment || 1,
          bankData.bankBranch || null,
          bankData.status || 'active',
          companyBankId
        ]);
      } else {
        // Crear una nueva configuración
        const result = await query(`
          INSERT INTO company_bank (
            company_id,
            bank_id,
            account_number,
            account_type,
            account_name,
            merchant_id,
            additional_config,
            environment,
            bank_branch,
            status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING id
        `, [
          companyId,
          bankData.bankId,
          bankData.accountNumber,
          bankData.accountType || 1,
          bankData.accountName || null,
          bankData.merchantId || null,
          bankData.additionalConfig ? JSON.stringify(bankData.additionalConfig) : '{}',
          bankData.environment || 1,
          bankData.bankBranch || null,
          bankData.status || 'active'
        ]);
        
        companyBankId = result.rows[0].id;
      }
      
      // Registrar actividad
      await logActivity(
        isNew ? 'COMPANY_BANK_REGISTERED' : 'COMPANY_BANK_UPDATED',
        {
          companyId,
          bankId: bankData.bankId,
          bankName,
          accountNumber: bankData.accountNumber,
          environment: bankData.environment || 1
        },
        'info',
        companyId,
        userId
      );
      
      return {
        id: companyBankId,
        bankId: bankData.bankId,
        bankName,
        accountNumber: bankData.accountNumber,
        status: bankData.status || 'active',
        responseCode: 0,
        message: isNew ? 'Banco registrado exitosamente' : 'Configuración de banco actualizada exitosamente'
      };
    } catch (error) {
      console.error('Error registrando banco para compañía:', error);
      
      return {
        responseCode: 1,
        message: error instanceof Error ? error.message : 'Error registrando banco para compañía'
      };
    }
  }
  
  // Eliminar configuración de banco para una compañía
  async deleteCompanyBank(
    companyId: number,
    bankId: number,
    environment: number,
    userId?: number
  ): Promise<CompanyBankResponse> {
    try {
      // Verificar que la configuración existe
      const configCheck = await query(
        `SELECT cb.id, b.name as bank_name 
         FROM company_bank cb 
         JOIN banks b ON cb.bank_id = b.id 
         WHERE cb.company_id = $1 AND cb.bank_id = $2 AND cb.environment = $3 AND cb.deleted_at IS NULL`,
        [companyId, bankId, environment]
      );
      
      if (configCheck.rowCount === 0) {
        return {
          responseCode: 1,
          message: 'Configuración de banco no encontrada'
        };
      }
      
      const configId = configCheck.rows[0].id;
      const bankName = configCheck.rows[0].bank_name;
      
      // Marcar como eliminado
      await query(`
        UPDATE company_bank
        SET deleted_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [configId]);
      
      // Registrar actividad
      await logActivity(
        'COMPANY_BANK_DELETED',
        {
          companyId,
          bankId,
          bankName,
          environment
        },
        'info',
        companyId,
        userId
      );
      
      return {
        id: configId,
        bankId,
        bankName,
        responseCode: 0,
        message: 'Configuración de banco eliminada exitosamente'
      };
    } catch (error) {
      console.error('Error eliminando configuración de banco:', error);
      
      return {
        responseCode: 1,
        message: error instanceof Error ? error.message : 'Error eliminando configuración de banco'
      };
    }
  }
  
  // Listar bancos configurados para una compañía
  async listCompanyBanks(
    companyId: number
  ): Promise<{
    banks: any[];
    responseCode: number;
    message: string;
  }> {
    try {
      // Verificar que la compañía existe
      const companyCheck = await query('SELECT id FROM companies WHERE id = $1 AND deleted_at IS NULL', [companyId]);
      
      if (companyCheck.rowCount === 0) {
        return {
          banks: [],
          responseCode: 1,
          message: 'Compañía no encontrada'
        };
      }
      
      // Obtener configuraciones de bancos
      const result = await query(`
        SELECT 
          cb.id,
          cb.bank_id,
          b.name as bank_name,
          b.code as bank_code,
          cb.account_number,
          cb.account_type,
          cb.account_name,
          cb.merchant_id,
          cb.environment,
          cb.status,
          cb.created_at
        FROM company_bank cb
        JOIN banks b ON cb.bank_id = b.id
        WHERE cb.company_id = $1 AND cb.deleted_at IS NULL
        ORDER BY b.name
      `, [companyId]);
      
      const banks = result.rows.map(row => ({
        id: row.id,
        bankId: row.bank_id,
        bankName: row.bank_name,
        bankCode: row.bank_code,
        accountNumber: row.account_number,
        accountType: row.account_type,
        accountName: row.account_name,
        merchantId: row.merchant_id,
        environment: row.environment,
        status: row.status,
        createdAt: row.created_at
      }));
      
      return {
        banks,
        responseCode: 0,
        message: ''
      };
    } catch (error) {
      console.error('Error listando bancos de la compañía:', error);
      
      return {
        banks: [],
        responseCode: 1,
        message: error instanceof Error ? error.message : 'Error listando bancos de la compañía'
      };
    }
  }
  
  // Obtener detalles de un banco de una compañía
  async getCompanyBankDetails(
    companyId: number,
    bankConfigId: number
  ): Promise<{
    bank?: any;
    responseCode: number;
    message: string;
  }> {
    try {
      // Obtener configuración del banco
      const result = await query(`
        SELECT 
          cb.id,
          cb.bank_id,
          b.name as bank_name,
          b.code as bank_code,
          cb.account_number,
          cb.account_type,
          cb.account_name,
          cb.merchant_id,
          cb.additional_config,
          cb.environment,
          cb.bank_branch,
          cb.status,
          cb.created_at,
          cb.updated_at
        FROM company_bank cb
        JOIN banks b ON cb.bank_id = b.id
        WHERE cb.id = $1 AND cb.company_id = $2 AND cb.deleted_at IS NULL
      `, [bankConfigId, companyId]);
      
      if (result.rowCount === 0) {
        return {
          responseCode: 1,
          message: 'Configuración de banco no encontrada'
        };
      }
      
      const bankConfig = result.rows[0];
      
      // Parsear additionalConfig
      let additionalConfig = {};
      try {
        additionalConfig = bankConfig.additional_config || {};
      } catch (e) {
        console.error('Error parsing additional_config:', e);
      }
      
      const bank = {
        id: bankConfig.id,
        bankId: bankConfig.bank_id,
        bankName: bankConfig.bank_name,
        bankCode: bankConfig.bank_code,
        accountNumber: bankConfig.account_number,
        accountType: bankConfig.account_type,
        accountName: bankConfig.account_name,
        merchantId: bankConfig.merchant_id,
        additionalConfig,
        environment: bankConfig.environment,
        bankBranch: bankConfig.bank_branch,
        status: bankConfig.status,
        createdAt: bankConfig.created_at,
        updatedAt: bankConfig.updated_at
      };
      
      return {
        bank,
        responseCode: 0,
        message: ''
      };
    } catch (error) {
      console.error('Error obteniendo detalles de configuración de banco:', error);
      
      return {
        responseCode: 1,
        message: error instanceof Error ? error.message : 'Error obteniendo detalles de configuración de banco'
      };
    }
  }
}

export const bankService = new BankService();
export default bankService;