import { query } from '../shared/database/pool'
import { nextSnowflake } from '../shared/snowflake'

export interface RoleRow {
  id: bigint
  name: string
  description: string | null
  permissions: Record<string, unknown>
}

export const roleRepository = {
  async upsert(name: string, description: string, permissions: Record<string, unknown>): Promise<RoleRow> {
    const r = await query(`
      INSERT INTO roles (id, name, description, permissions)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (name) DO UPDATE SET description = $3, permissions = $4
      RETURNING id, name, description, permissions
    `, [nextSnowflake(), name, description, JSON.stringify(permissions)])
    return r.rows[0] as RoleRow
  },

  async getById(id: bigint): Promise<RoleRow | null> {
    const r = await query('SELECT id, name, description, permissions FROM roles WHERE id = $1', [id])
    return r.rowCount ? r.rows[0] as RoleRow : null
  },

  async getByName(name: string): Promise<RoleRow | null> {
    const r = await query('SELECT id, name, description, permissions FROM roles WHERE name = $1', [name])
    return r.rowCount ? r.rows[0] as RoleRow : null
  },
}
