import { query } from '../../shared/database/pool'

export interface TenantRow {
  id: bigint
  fullName: string
  email: string | null
  phone: string | null
  documentType: string | null
  documentNumber: string | null
  dateOfBirth: string | null
  nationality: string | null
  address: string | null
  photoUrl: string | null
  biometricHash: string | null
  biometricDataUrl: string | null
  kycLevel: string
  kycSubmittedAt: Date | null
  kycVerifiedAt: Date | null
  kycVerifiedBy: bigint | null
  kycRejectionReason: string | null
  status: string
  environment: string
}

export const tenantRepository = {
  async create(data: {
    id: bigint; fullName: string; email?: string; phone?: string
    documentType?: string; documentNumber?: string; dateOfBirth?: string
    nationality?: string; address?: string; environment?: string
  }): Promise<TenantRow> {
    const r = await query(`
      INSERT INTO tenants (id, full_name, email, phone, document_type, document_number,
        date_of_birth, nationality, address, environment)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, full_name as "fullName", email, phone,
        document_type as "documentType", document_number as "documentNumber",
        date_of_birth as "dateOfBirth", nationality, address,
        photo_url as "photoUrl", biometric_hash as "biometricHash",
        biometric_data_url as "biometricDataUrl",
        kyc_level as "kycLevel", kyc_submitted_at as "kycSubmittedAt",
        kyc_verified_at as "kycVerifiedAt", kyc_verified_by as "kycVerifiedBy",
        kyc_rejection_reason as "kycRejectionReason", status, environment
    `, [data.id, data.fullName, data.email || null, data.phone || null,
      data.documentType || null, data.documentNumber || null,
      data.dateOfBirth || null, data.nationality || null, data.address || null,
      data.environment || 'production'])
    return r.rows[0] as TenantRow
  },

  async getById(id: bigint): Promise<TenantRow | null> {
    const r = await query(`
      SELECT id, full_name as "fullName", email, phone,
        document_type as "documentType", document_number as "documentNumber",
        date_of_birth as "dateOfBirth", nationality, address,
        photo_url as "photoUrl", biometric_hash as "biometricHash",
        biometric_data_url as "biometricDataUrl",
        kyc_level as "kycLevel", kyc_submitted_at as "kycSubmittedAt",
        kyc_verified_at as "kycVerifiedAt", kyc_verified_by as "kycVerifiedBy",
        kyc_rejection_reason as "kycRejectionReason", status, environment
      FROM tenants WHERE id = $1 AND deleted_at IS NULL
    `, [id])
    return r.rowCount ? r.rows[0] as TenantRow : null
  },

  async update(id: bigint, data: Partial<{
    fullName: string; email: string; phone: string; address: string
    documentType: string; documentNumber: string; dateOfBirth: string
    nationality: string; photoUrl: string; biometricHash: string
    biometricDataUrl: string; kycLevel: string; kycSubmittedAt: string
    kycVerifiedAt: string; kycVerifiedBy: bigint; kycRejectionReason: string
    status: string; environment: string
  }>): Promise<TenantRow | null> {
    const sets: string[] = []; const params: unknown[] = []; let pc = 0
    for (const [k, v] of Object.entries(data)) {
      if (v === undefined) continue
      pc++; sets.push(`${k.replace(/([A-Z])/g, '_$1').toLowerCase()} = $${pc}`); params.push(v)
    }
    if (!sets.length) return null
    sets.push('updated_at = CURRENT_TIMESTAMP')
    await query(`UPDATE tenants SET ${sets.join(', ')} WHERE id = $${pc + 1}`, [...params, id])
    return this.getById(id)
  },

  async setTenant(userId: bigint, tenantId: bigint, role = 'owner'): Promise<void> {
    await query(`
      INSERT INTO tenant_users (user_id, tenant_id, role)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id) DO UPDATE SET role = $3, deleted_at = NULL
    `, [userId, tenantId, role])
  },

  async listByUser(userId: bigint): Promise<(TenantRow & { userRole: string })[]> {
    const r = await query(`
      SELECT t.id, t.full_name as "fullName", t.email, t.phone,
        t.document_type as "documentType", t.document_number as "documentNumber",
        t.date_of_birth as "dateOfBirth", t.nationality, t.address,
        t.photo_url as "photoUrl", t.biometric_hash as "biometricHash",
        t.biometric_data_url as "biometricDataUrl",
        t.kyc_level as "kycLevel", t.kyc_submitted_at as "kycSubmittedAt",
        t.kyc_verified_at as "kycVerifiedAt", t.kyc_verified_by as "kycVerifiedBy",
        t.kyc_rejection_reason as "kycRejectionReason", t.status, t.environment,
        tu.role as "userRole"
      FROM tenants t
      JOIN tenant_users tu ON t.id = tu.tenant_id
      WHERE tu.user_id = $1 AND t.deleted_at IS NULL AND tu.deleted_at IS NULL
    `, [userId])
    return r.rows as (TenantRow & { userRole: string })[]
  },
}
