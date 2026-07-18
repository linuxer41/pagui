import { addConnection, removeConnection } from '$lib/services/NotificationUtils.js';
import type { RequestEvent } from '@sveltejs/kit';

export function GET({ url, params }: RequestEvent) {
  const qrId = url.searchParams.get('qrId');
  const slug = params.slug;

  if (!qrId) {
    return new Response('qrId es requerido', { status: 400 });
  }

  const stream = new ReadableStream({
    start(controller) {
      addConnection(qrId, controller);

      controller.enqueue(`data: ${JSON.stringify({ type: 'connected', qrId, slug })}\n\n`);

      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(`:keepalive\n\n`);
        } catch {
          clearInterval(keepAlive);
        }
      }, 15000);

      const cleanup = () => {
        clearInterval(keepAlive);
        removeConnection(qrId);
      };

      const aborted = new Promise<void>((resolve) => {
        const signal = (url.searchParams as any).signal;
        if (signal) {
          signal.addEventListener('abort', () => {
            cleanup();
            resolve();
          });
        }
      });

      requestAnimationFrame(async () => {
        await aborted;
      });
    },
    cancel() {
      removeConnection(qrId);
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
