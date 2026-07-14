import { query } from '../../shared/database/pool'
import { nextSnowflake } from '../../shared/snowflake'

export interface CompanyRow {
  id: bigint
  slug: string
  name: string
  logoUrl: string | null
  colors: Record<string, unknown> | null
  permissions: Record<string, unknown> | null
  isActive: boolean
  config: Record<string, unknown> | null
  createdAt: Date
  updatedAt: Date
}

export const companyRepository = {
  async upsert(data: {
    slug: string; name: string; logoUrl?: string; colors?: Record<string, unknown>
    permissions?: Record<string, unknown>; config?: Record<string, unknown>
  }): Promise<CompanyRow> {
    const existing = await this.getBySlug(data.slug)
    const id = existing?.id || nextSnowflake()
    const r = await query(`
      INSERT INTO companies (id, slug, name, logo_url, colors, permissions, config)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (slug) DO UPDATE SET
        name = $3, logo_url = COALESCE($4, companies.logo_url),
        colors = COALESCE($5, companies.colors), config = COALESCE($7, companies.config),
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [id, data.slug, data.name, data.logoUrl || null,
      data.colors ? JSON.stringify(data.colors) : null,
      data.permissions ? JSON.stringify(data.permissions) : null,
      data.config ? JSON.stringify(data.config) : null])
    return r.rows[0] as CompanyRow
  },

  async getBySlug(slug: string): Promise<CompanyRow | null> {
    const r = await query('SELECT * FROM companies WHERE slug = $1', [slug])
    return r.rowCount ? r.rows[0] as CompanyRow : null
  },

  async listActive(): Promise<CompanyRow[]> {
    const r = await query('SELECT * FROM companies WHERE is_active = true ORDER BY name')
    return r.rows as CompanyRow[]
  },
}
