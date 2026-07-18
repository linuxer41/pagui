import { AppError } from '../../shared/errors/app-error'
import { tenantRepository, type TenantRow } from './tenant.repository'
import { nextSnowflake } from '../../shared/snowflake'

export const tenantService = {
  async create(data: {
    fullName: string; email?: string; phone?: string
    documentType?: string; documentNumber?: string; dateOfBirth?: string
    nationality?: string; address?: string; ownerUserId: bigint
  }): Promise<TenantRow> {
    const tenant = await tenantRepository.create({
      id: nextSnowflake(), ...data,
    })
    await tenantRepository.setTenant(data.ownerUserId, tenant.id, 'owner')
    return tenant
  },

  getById(id: bigint): Promise<TenantRow | null> {
    return tenantRepository.getById(id)
  },

  listByUser(userId: bigint) {
    return tenantRepository.listByUser(userId)
  },

  async update(id: bigint, data: Parameters<typeof tenantRepository.update>[1]): Promise<TenantRow> {
    const tenant = await tenantRepository.getById(id)
    if (!tenant) throw new AppError(404, 'Cliente no encontrado')
    const updated = await tenantRepository.update(id, data)
    if (!updated) throw new AppError(500, 'Error al actualizar cliente')
    return updated
  },
}
