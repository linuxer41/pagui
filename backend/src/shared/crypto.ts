import crypto from 'node:crypto'

const ALGORITHM = 'aes-256-cbc'

function getKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY || 'default-encryption-key-change-in-production!'
  return crypto.createHash('sha256').update(secret).digest()
}

export function encrypt(text: string): string {
  const key = getKey()
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return iv.toString('hex') + ':' + encrypted
}

export function decrypt(encryptedText: string): string {
  const key = getKey()
  const parts = encryptedText.split(':')
  const iv = Buffer.from(parts.shift()!, 'hex')
  const encrypted = parts.join(':')
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

export function hash(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex')
}

export function randomToken(length = 32): string {
  return crypto.randomBytes(length).toString('hex')
}

export function generateSeedPhrase(): string[] {
  const words = [
    'arena', 'brazo', 'casa', 'dedo', 'eco', 'faro', 'gato', 'hoja',
    'isla', 'juez', 'kilo', 'lago', 'mano', 'nube', 'ojo', 'palo',
    'queso', 'rama', 'sapo', 'taza', 'uno', 'vaca', 'yema', 'zorro',
    'alto', 'bajo', 'cielo', 'dulce', 'este', 'flor', 'gris', 'hondo',
  ]
  const phrase: string[] = []
  const used = new Set<number>()
  while (phrase.length < 12) {
    const idx = crypto.randomInt(0, words.length)
    if (!used.has(idx)) {
      used.add(idx)
      phrase.push(words[idx])
    }
  }
  return phrase
}
