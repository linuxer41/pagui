import { query } from '../../shared/database/pool'
import { logger } from '../../shared/logger'
import { AppError } from '../../shared/errors/app-error'

interface PushPayload {
  title: string
  body: string
  data?: Record<string, string>
  badge?: number
  sound?: string
}

export async function sendPush(userId: bigint | string, payload: PushPayload) {
  const devices = await query(
    `SELECT fcm_token, apns_token, platform FROM devices
     WHERE user_id = $1 AND is_active = TRUE
       AND (fcm_token IS NOT NULL OR apns_token IS NOT NULL)`,
    [userId]
  )

  let sent = 0
  for (const device of devices.rows) {
    if (device.fcm_token) {
      await sendFCM(device.fcm_token, payload).catch(e =>
        logger.error('FCM send failed', { error: e.message, userId })
      )
      sent++
    }
    if (device.apns_token) {
      await sendAPNS(device.apns_token, payload).catch(e =>
        logger.error('APNS send failed', { error: e.message, userId })
      )
      sent++
    }
  }

  return sent
}

export async function sendBulkPush(userIds: (string | bigint)[], payload: PushPayload) {
  let total = 0
  for (const uid of userIds) {
    total += await sendPush(uid, payload)
  }
  return total
}

async function sendFCM(token: string, payload: PushPayload) {
  const serverKey = process.env.FCM_SERVER_KEY
  if (!serverKey) {
    logger.warn('FCM_SERVER_KEY not configured')
    return
  }

  const res = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: {
      'Authorization': `key=${serverKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: token,
      notification: {
        title: payload.title,
        body: payload.body,
        sound: payload.sound || 'default',
        badge: payload.badge || 1,
      },
      data: payload.data || {},
      priority: 'high',
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new AppError(502, `FCM error ${res.status}: ${text}`)
  }
}

async function sendAPNS(token: string, payload: PushPayload) {
  const keyId = process.env.APNS_KEY_ID
  const teamId = process.env.APNS_TEAM_ID
  const keyFile = process.env.APNS_KEY_FILE

  if (!keyId || !teamId || !keyFile) {
    logger.warn('APNS not configured')
    return
  }

  const res = await fetch(`https://api.push.apple.com/3/device/${token}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${await generateAPNSToken(keyId, teamId, keyFile)}`,
      'apns-topic': 'bo.pagui.app',
    },
    body: JSON.stringify({
      aps: {
        alert: { title: payload.title, body: payload.body },
        sound: payload.sound || 'default',
        badge: payload.badge || 1,
      },
      data: payload.data || {},
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new AppError(502, `APNS error ${res.status}: ${text}`)
  }
}

async function generateAPNSToken(keyId: string, teamId: string, keyFile: string): Promise<string> {
  const { readFileSync } = await import('node:fs')
  const { createSign } = await import('node:crypto')
  const key = readFileSync(keyFile)
  const now = Math.floor(Date.now() / 1000)
  const payload = `{ "iss": "${teamId}", "iat": ${now} }`
  const token = createSign('ES256').update(payload).end().sign({
    key,
    format: 'pem',
  } as any, 'base64')
  return `${teamId}.${keyId}.${token}`
}

export async function registerDeviceToken(userId: bigint | string, token: string, platform: 'ios' | 'android') {
  const column = platform === 'ios' ? 'apns_token' : 'fcm_token'
  await query(
    `UPDATE devices SET ${column} = $1 WHERE user_id = $2 AND is_active = TRUE ORDER BY last_seen_at DESC LIMIT 1`,
    [token, userId]
  )
  logger.info('Device push token registered', { platform, userId })
}
