import { query } from '../shared/database/pool'
import { nextSnowflake } from '../shared/snowflake'

export interface DeviceRow {
  id: bigint
  userId: bigint
  deviceName: string | null
  deviceType: string | null
  deviceId: string
  fcmToken: string | null
  apnsToken: string | null
  isActive: boolean
  lastSeenAt: Date | null
  createdAt: Date
}

export const deviceRepository = {
  async register(data: { userId: bigint; deviceName?: string; deviceType?: string; deviceId: string; fcmToken?: string; apnsToken?: string }): Promise<DeviceRow> {
    const r = await query(`
      INSERT INTO devices (id, user_id, device_name, device_type, device_id, fcm_token, apns_token)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (device_id) DO UPDATE SET
        fcm_token = COALESCE($6, devices.fcm_token),
        apns_token = COALESCE($7, devices.apns_token),
        is_active = true, last_seen_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [nextSnowflake(), data.userId, data.deviceName || null, data.deviceType || null, data.deviceId, data.fcmToken || null, data.apnsToken || null])
    return r.rows[0] as DeviceRow
  },

  async listByUser(userId: bigint): Promise<DeviceRow[]> {
    const r = await query('SELECT * FROM devices WHERE user_id = $1 AND is_active = true ORDER BY last_seen_at DESC NULLS LAST', [userId])
    return r.rows as DeviceRow[]
  },

  async unregister(deviceId: string): Promise<void> {
    await query('UPDATE devices SET is_active = false WHERE device_id = $1', [deviceId])
  },
}
