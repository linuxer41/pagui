import { spawn } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { logger } from '../../logger'

const __dirname = dirname(fileURLToPath(import.meta.url))
const WORKER_PATH = join(__dirname, 'ml-worker.mjs')

type PendingRequest = {
  resolve: (value: any) => void
  reject: (err: Error) => void
}

class MLClient {
  private child: ReturnType<typeof spawn> | null = null
  private queue: PendingRequest[] = []
  private buffer = ''
  private started = false

  private ensureProcess(): ReturnType<typeof spawn> {
    if (this.child && !this.child.killed) return this.child

    this.buffer = ''
    const child = spawn('node', [WORKER_PATH], {
      stdio: ['pipe', 'pipe', 'inherit'],
      windowsHide: true,
    })
    this.child = child

    child.stdout.setEncoding('utf8')
    child.stdout.on('data', (chunk: string) => {
      this.buffer += chunk
      let nl: number
      while ((nl = this.buffer.indexOf('\n')) !== -1) {
        const line = this.buffer.slice(0, nl).trim()
        this.buffer = this.buffer.slice(nl + 1)
        if (!line) continue
        const pending = this.queue.shift()
        if (!pending) continue
        let payload
        try {
          payload = JSON.parse(line)
        } catch {
          pending.reject(new Error('ML worker: respuesta inválida'))
          continue
        }
        if (!payload.ok) {
          pending.reject(new Error(String(payload.error || 'ML worker error')))
        } else {
          pending.resolve(payload)
        }
      }
    })

    child.on('error', (err) => {
      logger.error('ML worker error', { error: String(err) })
      this.child = null
      this.drainQueue(new Error(`ML worker no disponible: ${err.message}`))
    })

    child.on('exit', (code) => {
      logger.warn('ML worker exited', { code })
      if (this.child === child) this.child = null
      this.drainQueue(new Error(`ML worker terminó (exit ${code})`))
    })

    return child
  }

  private drainQueue(err: Error) {
    while (this.queue.length) {
      const pending = this.queue.shift()!
      pending.reject(err)
    }
  }

  /** Envía una acción al worker y resuelve con su resultado. Multiplexa por cola FIFO. */
  async call(action: Record<string, unknown>): Promise<any> {
    const child = this.ensureProcess()
    return new Promise((resolve, reject) => {
      this.queue.push({ resolve, reject })
      if (child.stdin) child.stdin.write(JSON.stringify(action) + '\n')
      else reject(new Error('ML worker sin stdin'))
    })
  }

  /** Cierra el proceso del worker liberando los modelos ML. */
  async close(): Promise<void> {
    if (this.child && !this.child.killed && this.child.stdin) {
      this.child.stdin.end()
    }
    this.child = null
    this.drainQueue(new Error('ML worker cerrado'))
  }
}

export const mlClient = new MLClient()

/** Extrae el texto y campos del carnet vía OCR. */
export async function ocrDocument(imageBase64: string) {
  const res = await mlClient.call({ action: 'ocr', image: imageBase64 })
  return { text: res.text || '', confidence: res.confidence || 0, fields: res.fields || null }
}

/** Compara selfie vs foto de documento y devuelve detección + similitud. */
export async function verifyFaces(selfieBase64: string, documentBase64: string) {
  const res = await mlClient.call({ action: 'verify', selfie: selfieBase64, document: documentBase64 })
  return { detected: !!res.detected, similarity: res.similarity ?? null, match: !!res.match }
}
