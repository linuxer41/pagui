import { query } from '../config/database';
import { logActivity } from './monitor.service';

interface BankData {
  code: string;
  name: string;
  testApiUrl?: string;
  prodApiUrl?: string;
  encryptionKey?: string;
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
          encryption_key
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, created_at
      `, [
        bankData.code,
        bankData.name,
        bankData.testApiUrl || null,
        bankData.prodApiUrl || null,
        bankData.encryptionKey || null
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
        'SUCCESS',
        companyId,
        userId
      );
      
      return {
        id: bankId,
        code: bankData.code,
        name: bankData.name,
        status: 'ACTIVE',
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
      
      if (bankData.encryptionKey !== undefined) {
        updates.push(`encryption_key = $${paramCounter++}`);
        values.push(bankData.encryptionKey || null);
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
        'SUCCESS',
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
        SET status = 'INACTIVE', updated_at = CURRENT_TIMESTAMP
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
        'SUCCESS',
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
}

export const bankService = new BankService();
export default bankService; 