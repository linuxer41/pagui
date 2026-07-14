import { Elysia } from 'elysia'
import { sseService } from './sse.service'

let clientCounter = 0

export const sseRoutes = new Elysia({ prefix: '/events' })

  .get('/stream', ({ set, request }) => {
    const clientId = `sse_${++clientCounter}_${Date.now()}`

    set.headers['Content-Type'] = 'text/event-stream'
    set.headers['Cache-Control'] = 'no-cache'
    set.headers['Connection'] = 'keep-alive'

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

    return stream
  })

  .get('/stats', () => {
    return sseService.getStats()
  })

  .get('/test-auth', () => {
    return { message: 'SSE auth test' }
  })
