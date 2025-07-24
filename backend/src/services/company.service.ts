import { query } from '../config/database';
import { logActivity } from './monitor.service';
import { ApiError } from '../utils/error';

interface CompanyData {
  name: string;
  businessId: string;
  address?: string;
  contactEmail: string;
  contactPhone?: string;
}

interface BankConfig {
  bankId: number;
  accountNumber: string;
  accountType?: number;
  accountName?: string;
  merchantId?: string;
  additionalConfig?: Record<string, any>;
}

interface Company {
  id: number;
  name: string;
  businessId: string;
  address?: string;
  contactEmail: string;
  contactPhone?: string;
  status: string;
  type?: string;
  documentId?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface BankConfigDetail {
  id: number;
  bankId: number;
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountType?: number;
  accountName?: string;
  merchantId?: string;
  additionalConfig?: any;
  status: string;
}

interface CompanyDetails {
  company: Company;
  bankConfigs: BankConfigDetail[];
}

class CompanyService {
  // Crear una nueva empresa
  async createCompany(companyData: CompanyData, userId?: number): Promise<Company> {
    // Verificar si ya existe una empresa con ese businessId
    const existingCheck = await query(
      'SELECT id FROM companies WHERE business_id = $1',
      [companyData.businessId]
    );
    
    if (existingCheck.rowCount && existingCheck.rowCount > 0) {
      throw new ApiError(`Ya existe una empresa con el ID de negocio '${companyData.businessId}'`, 400);
    }
    
    // Crear la empresa
    const result = await query(`
      INSERT INTO companies (
        name,
        business_id,
        address,
        contact_email,
        contact_phone
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, created_at
    `, [
      companyData.name,
      companyData.businessId,
      companyData.address || null,
      companyData.contactEmail,
      companyData.contactPhone || null
    ]);
    
    const companyId = result.rows[0].id;
    
    // Registrar actividad
    await logActivity(
      'COMPANY_CREATED',
      {
        companyId,
        name: companyData.name,
        businessId: companyData.businessId
      },
      'INFO',
      companyId,
      userId
    );
    
    return {
      id: companyId,
      name: companyData.name,
      businessId: companyData.businessId,
      address: companyData.address,
      contactEmail: companyData.contactEmail,
      contactPhone: companyData.contactPhone,
      status: 'ACTIVE'
    };
  }
  
  // Actualizar una empresa existente
  async updateCompany(companyId: number, companyData: Partial<CompanyData>, userId?: number): Promise<Company> {
    // Verificar que la empresa exista
    const companyCheck = await query('SELECT id FROM companies WHERE id = $1', [companyId]);
    
    if (companyCheck.rowCount === 0) {
      throw new ApiError('Empresa no encontrada', 404);
    }
    
    // Preparar datos para actualización
    const updates: string[] = [];
    const values: any[] = [];
    let paramCounter = 1;
    
    if (companyData.name !== undefined) {
      updates.push(`name = $${paramCounter++}`);
      values.push(companyData.name);
    }
    
    if (companyData.businessId !== undefined) {
      // Verificar que el nuevo businessId no esté en uso
      if (companyData.businessId) {
        const existingCheck = await query(
          'SELECT id FROM companies WHERE business_id = $1 AND id != $2',
          [companyData.businessId, companyId]
        );
        
        if (existingCheck.rowCount && existingCheck.rowCount > 0) {
          throw new ApiError(`Ya existe otra empresa con el ID de negocio '${companyData.businessId}'`, 400);
        }
        
        updates.push(`business_id = $${paramCounter++}`);
        values.push(companyData.businessId);
      }
    }
    
    if (companyData.address !== undefined) {
      updates.push(`address = $${paramCounter++}`);
      values.push(companyData.address || null);
    }
    
    if (companyData.contactEmail !== undefined) {
      updates.push(`contact_email = $${paramCounter++}`);
      values.push(companyData.contactEmail);
    }
    
    if (companyData.contactPhone !== undefined) {
      updates.push(`contact_phone = $${paramCounter++}`);
      values.push(companyData.contactPhone || null);
    }
    
    // Añadir updated_at
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    
    // Si no hay actualizaciones, retornar la empresa sin cambios
    if (updates.length === 1) {
      // Obtener la empresa actual
      const currentCompany = await query(`
        SELECT id, name, business_id, address, contact_email, contact_phone, status
        FROM companies
        WHERE id = $1
      `, [companyId]);
      
      return {
        id: currentCompany.rows[0].id,
        name: currentCompany.rows[0].name,
        businessId: currentCompany.rows[0].business_id,
        address: currentCompany.rows[0].address,
        contactEmail: currentCompany.rows[0].contact_email,
        contactPhone: currentCompany.rows[0].contact_phone,
        status: currentCompany.rows[0].status
      };
    }
    
    // Actualizar la empresa
    values.push(companyId); // Para la condición WHERE
    const result = await query(`
      UPDATE companies
      SET ${updates.join(', ')}
      WHERE id = $${paramCounter}
      RETURNING id, name, business_id, address, contact_email, contact_phone, status
    `, values);
    
    const updatedCompany = result.rows[0];
    
    // Registrar actividad
    await logActivity(
      'COMPANY_UPDATED',
      {
        companyId,
        updatedFields: Object.keys(companyData)
      },
      'INFO',
      companyId,
      userId
    );
    
    return {
      id: updatedCompany.id,
      name: updatedCompany.name,
      businessId: updatedCompany.business_id,
      address: updatedCompany.address,
      contactEmail: updatedCompany.contact_email,
      contactPhone: updatedCompany.contact_phone,
      status: updatedCompany.status
    };
  }
  
  // Obtener detalles de una empresa
  async getCompanyDetails(companyId: number): Promise<CompanyDetails> {
    const companyResult = await query(`
      SELECT 
        id, 
        name, 
        business_id, 
        type,
        document_id,
        address, 
        contact_email, 
        contact_phone, 
        status, 
        created_at, 
        updated_at
      FROM companies
      WHERE id = $1 AND deleted_at IS NULL
    `, [companyId]);
    
    if (companyResult.rowCount === 0) {
      throw new ApiError('Empresa no encontrada', 404);
    }
    
    const bankConfigsResult = await query(`
      SELECT 
        cbc.id,
        b.id as bank_id,
        b.code as bank_code,
        b.name as bank_name,
        cbc.account_number,
        cbc.account_type,
        cbc.account_name,
        cbc.merchant_id,
        cbc.additional_config,
        cbc.status
      FROM company_bank cbc
      JOIN banks b ON cbc.bank_id = b.id
      WHERE cbc.company_id = $1
      ORDER BY b.name
    `, [companyId]);
    
    const company = {
      id: companyResult.rows[0].id,
      name: companyResult.rows[0].name,
      businessId: companyResult.rows[0].business_id,
      type: companyResult.rows[0].type,
      documentId: companyResult.rows[0].document_id,
      address: companyResult.rows[0].address,
      contactEmail: companyResult.rows[0].contact_email,
      contactPhone: companyResult.rows[0].contact_phone,
      status: companyResult.rows[0].status,
      createdAt: companyResult.rows[0].created_at,
      updatedAt: companyResult.rows[0].updated_at
    };
    
    const bankConfigs = bankConfigsResult.rows.map(row => ({
      id: row.id,
      bankId: row.bank_id,
      bankCode: row.bank_code,
      bankName: row.bank_name,
      accountNumber: row.account_number,
      accountType: row.account_type,
      accountName: row.account_name,
      merchantId: row.merchant_id,
      additionalConfig: row.additional_config,
      status: row.status
    }));
    
    return {
      company,
      bankConfigs
    };
  }
  
  // Listar todas las empresas
  async listCompanies(): Promise<Company[]> {
    const result = await query(`
      SELECT 
        id, 
        name, 
        business_id, 
        contact_email, 
        contact_phone, 
        status, 
        created_at
      FROM companies
      ORDER BY name
    `);
    
    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      businessId: row.business_id,
      contactEmail: row.contact_email,
      contactPhone: row.contact_phone,
      status: row.status,
      createdAt: row.created_at
    }));
  }
  
  // Configurar banco para una empresa
  async configureBankForCompany(
    companyId: number,
    bankConfig: BankConfig,
    userId?: number
  ): Promise<number> {
    // Verificar que la empresa exista
    const companyCheck = await query('SELECT id FROM companies WHERE id = $1', [companyId]);
    
    if (companyCheck.rowCount === 0) {
      throw new ApiError('Empresa no encontrada', 404);
    }
    
    // Verificar que el banco exista
    const bankCheck = await query('SELECT id FROM banks WHERE id = $1', [bankConfig.bankId]);
    
    if (bankCheck.rowCount === 0) {
      throw new ApiError('Banco no encontrado', 404);
    }
    
    // Verificar si ya existe una configuración para esta empresa y banco
    const configCheck = await query(`
      SELECT id 
      FROM company_bank
      WHERE company_id = $1 AND bank_id = $2
    `, [companyId, bankConfig.bankId]);
    
    let configId;
    
    if (configCheck.rowCount && configCheck.rowCount > 0) {
      // Actualizar la configuración existente
      configId = configCheck.rows[0].id;
      
      await query(`
        UPDATE company_bank
        SET 
          account_number = $1,
          account_type = $2,
          account_name = $3,
          merchant_id = $4,
          additional_config = $5,
          status = 'ACTIVE',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $6
      `, [
        bankConfig.accountNumber,
        bankConfig.accountType || 1,
        bankConfig.accountName || 'Cuenta Principal',
        bankConfig.merchantId || null,
        bankConfig.additionalConfig ? JSON.stringify(bankConfig.additionalConfig) : null,
        configId
      ]);
      
      // Registrar actividad
      await logActivity(
        'BANK_CONFIG_UPDATED',
        {
          companyId,
          bankId: bankConfig.bankId,
          configId
        },
        'INFO',
        companyId,
        userId
      );
      
      return configId;
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
          additional_config
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `, [
        companyId,
        bankConfig.bankId,
        bankConfig.accountNumber,
        bankConfig.accountType || 1,
        bankConfig.accountName || 'Cuenta Principal',
        bankConfig.merchantId || null,
        bankConfig.additionalConfig ? JSON.stringify(bankConfig.additionalConfig) : null
      ]);
      
      configId = result.rows[0].id;
      
      // Registrar actividad
      await logActivity(
        'BANK_CONFIG_CREATED',
        {
          companyId,
          bankId: bankConfig.bankId,
          configId
        },
        'INFO',
        companyId,
        userId
      );
      
      return configId;
    }
  }
  
  // Desactivar una empresa
  async deactivateCompany(companyId: number, userId?: number): Promise<void> {
    // Verificar que la empresa exista
    const companyCheck = await query('SELECT id, name FROM companies WHERE id = $1', [companyId]);
    
    if (companyCheck.rowCount === 0) {
      throw new ApiError('Empresa no encontrada', 404);
    }
    
    // Desactivar la empresa
    await query(`
      UPDATE companies
      SET status = 'INACTIVE', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [companyId]);
    
    // Registrar actividad
    await logActivity(
      'COMPANY_DEACTIVATED',
      {
        companyId,
        companyName: companyCheck.rows[0].name
      },
      'INFO',
      companyId,
      userId
    );
  }
}

export const companyService = new CompanyService();
export default companyService; 