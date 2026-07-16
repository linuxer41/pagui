import { Elysia } from 'elysia'
import { sseService } from './sse.service'

let clientCounter = 0

export const sseRoutes = new Elysia({ prefix: '/events' })

  .get('/stream', ({ request }) => {
    const clientId = `sse_${++clientCounter}_${Date.now()}`

    const stream = new ReadableStream({
      start(controller) {
        sseService.addClient(
          clientId,
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

  .get('/test-auth', () => {
    return { message: 'SSE auth test' }
  }, {
    detail: { tags: ['Events'], summary: 'Test de autenticación SSE' },
  })
