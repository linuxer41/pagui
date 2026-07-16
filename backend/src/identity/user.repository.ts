import { query } from '../shared/database/pool'
import { AppError } from '../shared/errors/app-error'

export interface UserRow {
  id: bigint
  email: string
  fullName: string
  phone: string | null
  address: string | null
  role: number
  status: string
  createdAt: Date
  updatedAt: Date
}

export interface CreateUserData {
  id: bigint
  email: string
  password: string
  fullName: string
  phone?: string
  address?: string
  role: number
}

export interface UpdateUserData {
  fullName?: string
  phone?: string
  address?: string
  status?: string
}

export interface ListFilters {
  page?: number
  limit?: number
  search?: string
  status?: string
  role?: number
}

export const userRepository = {
  async create(data: CreateUserData): Promise<UserRow> {
    const r = await query(`
      INSERT INTO users (id, email, password, full_name, phone, address, role, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
      RETURNING id
    `, [data.id, data.email, data.password, data.fullName, data.phone || null, data.address || null, data.role])
    return this.getById(r.rows[0].id) as Promise<UserRow>
  },

  async getById(id: bigint): Promise<UserRow | null> {
    const r = await query(`
      SELECT u.id, u.email, u.full_name as "fullName", u.phone, u.address,
             u.role as "role", u.status, u.created_at as "createdAt", u.updated_at as "updatedAt"
      FROM users u
      WHERE u.id = $1 AND u.deleted_at IS NULL
    `, [id])
    return r.rowCount ? r.rows[0] as UserRow : null
  },

  async getByEmail(email: string): Promise<(UserRow & { password: string }) | null> {
    const r = await query(`
      SELECT u.id, u.email, u.password, u.full_name as "fullName", u.phone, u.address,
             u.role as "role", u.status, u.created_at as "createdAt", u.updated_at as "updatedAt"
      FROM users u
      WHERE u.email = $1 AND u.deleted_at IS NULL
    `, [email])
    return r.rowCount ? r.rows[0] as UserRow & { password: string } : null
  },

  async getPasswordHash(id: bigint): Promise<string | null> {
    const r = await query('SELECT password FROM users WHERE id = $1', [id])
    return r.rowCount ? r.rows[0].password : null
  },

  async list(filters: ListFilters = {}) {
    const page = filters.page || 1
    const limit = filters.limit || 20
    const offset = (page - 1) * limit
    const conditions: string[] = ['u.deleted_at IS NULL']
    const params: unknown[] = []
    let pc = 0

    if (filters.search) {
      pc++; conditions.push(`(u.full_name ILIKE $${pc} OR u.email ILIKE $${pc})`); params.push(`%${filters.search}%`)
    }
    if (filters.status) {
      pc++; conditions.push(`u.status = $${pc}`); params.push(filters.status)
    }
    if (filters.role) {
      pc++; conditions.push(`u.role = $${pc}`); params.push(filters.role)
    }

    const where = 'WHERE ' + conditions.join(' AND ')
    const countR = await query(`SELECT COUNT(*) as total FROM users u ${where}`, params)
    const totalCount = parseInt(countR.rows[0].total)

    const usersR = await query(`
      SELECT u.id, u.email, u.full_name as "fullName", u.phone, u.address,
             u.role as "role", u.status, u.created_at as "createdAt", u.updated_at as "updatedAt"
      FROM users u
      ${where} ORDER BY u.created_at DESC LIMIT $${pc + 1} OFFSET $${pc + 2}
    `, [...params, limit, offset])

    return {
      users: usersR.rows as UserRow[],
      totalCount,
      pagination: { page, limit, totalPages: Math.ceil(totalCount / limit) },
    }
  },

  async update(id: bigint, data: UpdateUserData): Promise<UserRow> {
    const fields: string[] = []; const params: unknown[] = []; let pc = 0
    if (data.fullName !== undefined) { pc++; fields.push(`full_name = $${pc}`); params.push(data.fullName) }
    if (data.phone !== undefined) { pc++; fields.push(`phone = $${pc}`); params.push(data.phone) }
    if (data.address !== undefined) { pc++; fields.push(`address = $${pc}`); params.push(data.address) }
    if (data.status !== undefined) { pc++; fields.push(`status = $${pc}`); params.push(data.status) }
    if (fields.length === 0) throw new AppError(400, 'No fields to update')
    fields.push('updated_at = CURRENT_TIMESTAMP')
    await query(`UPDATE users SET ${fields.join(', ')} WHERE id = $${pc + 1}`, [...params, id])
    return this.getById(id) as Promise<UserRow>
  },

  async updatePassword(id: bigint, hash: string): Promise<void> {
    await query(`UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [hash, id])
  },

  async softDelete(id: bigint): Promise<void> {
    await query(`UPDATE users SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [id])
  },

  async existsByEmail(email: string): Promise<boolean> {
    const r = await query('SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL', [email])
    return r.rowCount !== null && r.rowCount > 0
  },
}
