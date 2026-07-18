import { Elysia } from 'elysia'
import { sseService } from './sse.service'
import { authService } from '../../identity/auth.service'
import { AppError } from '../../shared/errors/app-error'

let clientCounter = 0

export const sseRoutes = new Elysia({ prefix: '/events' })

  .get('/stream', async ({ request }) => {
    const url = new URL(request.url)
    const token = url.searchParams.get('token')

    if (!token) throw new AppError(401, 'JWT requerida')

    let userId: bigint
    try {
      const decoded = await authService.verifyTokenWithDb(token)
      const userInfo = await authService.getUserInfo(decoded.email)
      if (!userInfo) throw new AppError(401, 'Usuario no encontrado')
      userId = userInfo.id
    } catch (err) {
      if (err instanceof AppError) throw err
      throw new AppError(401, 'Token inválido')
    }

    const clientId = `sse_${++clientCounter}_${Date.now()}`

    const stream = new ReadableStream({
      start(controller) {
        sseService.addClient(
          clientId,
          userId,
          (data: string) => {
            try { controller.enqueue(new TextEncoder().encode(data)) } catch {}
          },
          () => {
            try { controller.close() } catch {}
          }
        )

        request.signal.addEventListener('abort', () => {
          sseService.removeClient(clientId)
        })
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    })
  }, {
    detail: { tags: ['Events'], summary: 'Stream SSE en tiempo real' },
  })

  .get('/stats', () => {
    return sseService.getStats()
  }, {
    detail: { tags: ['Events'], summary: 'Estadísticas del servidor SSE' },
  })
