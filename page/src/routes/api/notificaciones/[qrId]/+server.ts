import type { RequestHandler } from '@sveltejs/kit';
import { addConnection, removeConnection, getPaymentStatus } from '$lib/services/NotificationUtils';

export const GET: RequestHandler = async ({ params }: { params: any }) => {
  const { qrId } = params;
  
  if (!qrId) {
    return new Response('QR ID requerido', { status: 400 });
  }

  // Crear stream SSE
  const stream = new ReadableStream({
    start(controller) {
      // Guardar la conexión
      addConnection(qrId, controller);
      
      // Enviar estado inicial si existe
      const status = getPaymentStatus(qrId);
      if (status) {
        controller.enqueue(`data: ${JSON.stringify(status)}\n\n`);
      }
      
      // Configurar headers SSE
      controller.enqueue(`data: ${JSON.stringify({ type: 'connected', qrId })}\n\n`);
    },
    cancel() {
      // Limpiar conexión cuando se cierra
      removeConnection(qrId);
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  });
};
