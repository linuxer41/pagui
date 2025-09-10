import { Elysia, t } from 'elysia';
import eventsService from '../services/events.service';
import { ApiError } from '../utils/error';

// Rutas para eventos del servidor (Server-Sent Events)
export const eventsRoutes = new Elysia({ prefix: '/events' })

  // Endpoint para conectarse a eventos SSE
  .get('/stream', async ({ query, headers, set }) => {
    // Obtener parámetros de query
    const { token: jwtToken, 'api-key': apiKey } = query as { token?: string; 'api-key'?: string };
    const authHeader = headers.authorization;
    
    let token: string | null = null;
    let authType: 'apikey' | 'jwt' | null = null;
    let tokenSource: 'query' | 'header' = 'query';

    // Priorizar query parameters específicos, luego Authorization header
    if (apiKey) {
      token = apiKey;
      authType = 'apikey';
      tokenSource = 'query';
    } else if (jwtToken) {
      token = jwtToken;
      authType = 'jwt';
      tokenSource = 'query';
    } else if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7); // Remover "Bearer "
      authType = 'jwt'; // Asumir JWT para Authorization header
      tokenSource = 'header';
    }

    if (!token || !authType) {
      throw new ApiError('Token requerido: use ?api-key= para API Key, ?token= para JWT, o Authorization header', 401);
    }

    // Autenticar token
    const authResult = await eventsService.authenticateToken(token, authType);
    if (!authResult) {
      throw new ApiError('Token inválido o expirado', 401);
    }

    const { accountId, userId, authType: tokenType } = authResult;
    const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Crear stream de eventos
    const stream = new ReadableStream({
      start(controller) {
        // Crear función para enviar eventos al stream
        const sendEvent = (event: any) => {
          try {
            const eventData = `id: ${event.id}\nevent: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
            controller.enqueue(new TextEncoder().encode(eventData));
          } catch (error) {
            console.error(`Error enviando evento ${event.type}:`, error);
            controller.close();
            eventsService.unsubscribe(connectionId);
          }
        };

        // Crear función para cerrar conexión
        const closeConnection = () => {
          try {
            controller.close();
          } catch (error) {
            console.error('Error cerrando controller:', error);
          }
          eventsService.unsubscribe(connectionId);
        };

        // Suscribir a eventos de la cuenta
        eventsService.subscribe(accountId, connectionId, sendEvent, closeConnection);

        // Enviar evento de conexión exitosa
        const welcomeEvent = {
          id: `welcome_${connectionId}`,
          type: 'connection',
          data: {
            message: 'Conectado exitosamente a eventos de la cuenta',
            accountId,
            userId,
            connectionId,
            authType: tokenType,
            tokenSource: tokenSource,
            timestamp: new Date().toISOString()
          }
        };

        // Enviar evento de bienvenida
        sendEvent(welcomeEvent);

        // Enviar heartbeat cada 30 segundos
        const heartbeatInterval = setInterval(() => {
          const heartbeatEvent = {
            id: `heartbeat_${Date.now()}`,
            type: 'heartbeat',
            data: {
              timestamp: new Date().toISOString(),
              connectionId
            }
          };
          
          try {
            sendEvent(heartbeatEvent);
          } catch (error) {
            console.error('Error enviando heartbeat:', error);
            clearInterval(heartbeatInterval);
            closeConnection();
          }
        }, 30000);

        // Limpiar al cerrar
        const cleanup = () => {
          clearInterval(heartbeatInterval);
          closeConnection();
        };

        // Manejar cierre de conexión
        // Nota: ReadableStreamDefaultController no tiene signal en todos los navegadores
        // La limpieza se maneja en el método cancel() del stream
      },
      cancel() {
        eventsService.unsubscribe(connectionId);
      }
    });

    // Retornar el stream con headers explícitos para SSE
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  }, {
    query: t.Object({
      token: t.Optional(t.String({
        description: 'JWT Token de autenticación',
        minLength: 1
      })),
      'api-key': t.Optional(t.String({
        description: 'API Key de autenticación',
        minLength: 1
      }))
    }),
    detail: {
      tags: ['events'],
      summary: 'Conectar a eventos del servidor (Server-Sent Events)',
      description: `
        Establece una conexión SSE para recibir eventos en tiempo real de la cuenta.
        
        **Autenticación:** Requiere un token válido (API Key o JWT)
        
        **Métodos de autenticación:**
        1. API Key: \`?api-key=YOUR_API_KEY\`
        2. JWT Token: \`?token=YOUR_JWT_TOKEN\`
        3. Authorization header: \`Authorization: Bearer YOUR_JWT_TOKEN\`
        
        **Tipos de token soportados:**
        - **API Key**: Para aplicaciones y servicios (use ?api-key=)
        - **JWT**: Para usuarios autenticados (use ?token=)
        
        **Eventos disponibles:**
        - \`connection\`: Confirmación de conexión
        - \`heartbeat\`: Latido cada 30 segundos
        - \`qr_created\`: Nuevo QR creado
        - \`qr_payment\`: Pago recibido en QR
        - \`qr_status_change\`: Cambio de estado de QR
        - \`account_balance_update\`: Actualización de balance
        
        **Formato de eventos:**
        \`\`\`
        id: event_id
        event: event_type
        data: {"key": "value"}
        \`\`\`
      `
    }
  })

  // Endpoint de prueba para verificar autenticación
  .get('/test-auth', async ({ query, headers }) => {
    // Obtener parámetros de query
    const { token: jwtToken, 'api-key': apiKey } = query as { token?: string; 'api-key'?: string };
    const authHeader = headers.authorization;
    
    let token: string | null = null;
    let authType: 'apikey' | 'jwt' | null = null;
    let tokenSource: 'query' | 'header' = 'query';

    // Priorizar query parameters específicos, luego Authorization header
    if (apiKey) {
      token = apiKey;
      authType = 'apikey';
      tokenSource = 'query';
    } else if (jwtToken) {
      token = jwtToken;
      authType = 'jwt';
      tokenSource = 'query';
    } else if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
      authType = 'jwt';
      tokenSource = 'header';
    }

    if (!token || !authType) {
      throw new ApiError('Token requerido: use ?api-key= para API Key, ?token= para JWT, o Authorization header', 401);
    }

    // Autenticar token
    const authResult = await eventsService.authenticateToken(token, authType);
    if (!authResult) {
      throw new ApiError('Token inválido o expirado', 401);
    }

    return {
      success: true,
      message: 'Autenticación exitosa',
      data: {
        accountId: authResult.accountId,
        userId: authResult.userId,
        authType: authResult.authType,
        tokenSource,
        timestamp: new Date().toISOString()
      }
    };
  }, {
    query: t.Object({
      token: t.Optional(t.String({
        description: 'JWT Token de autenticación',
        minLength: 1
      })),
      'api-key': t.Optional(t.String({
        description: 'API Key de autenticación',
        minLength: 1
      }))
    }),
    detail: {
      tags: ['events'],
      summary: 'Probar autenticación para eventos',
      description: 'Endpoint de prueba para verificar que la autenticación funciona correctamente antes de usar SSE'
    }
  })

  // Endpoint para obtener estadísticas de eventos (solo para debugging)
  .get('/stats', async ({ query, headers }) => {
    // Obtener parámetros de query
    const { token: jwtToken, 'api-key': apiKey } = query as { token?: string; 'api-key'?: string };
    const authHeader = headers.authorization;
    
    let token: string | null = null;
    let authType: 'apikey' | 'jwt' | null = null;

    // Priorizar query parameters específicos, luego Authorization header
    if (apiKey) {
      token = apiKey;
      authType = 'apikey';
    } else if (jwtToken) {
      token = jwtToken;
      authType = 'jwt';
    } else if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7); // Remover "Bearer "
      authType = 'jwt'; // Asumir JWT para Authorization header
    }

    if (!token || !authType) {
      throw new ApiError('Token requerido: use ?api-key= para API Key, ?token= para JWT, o Authorization header', 401);
    }

    // Autenticar token
    const authResult = await eventsService.authenticateToken(token, authType);
    if (!authResult) {
      throw new ApiError('Token inválido o expirado', 401);
    }

    const stats = eventsService.getStats();
    
    return {
      success: true,
      message: 'Estadísticas de eventos obtenidas',
      data: {
        ...stats,
        yourAccountId: authResult.accountId,
        authType: authResult.authType,
        timestamp: new Date().toISOString()
      }
    };
  }, {
    query: t.Object({
      token: t.Optional(t.String({
        description: 'JWT Token de autenticación',
        minLength: 1
      })),
      'api-key': t.Optional(t.String({
        description: 'API Key de autenticación',
        minLength: 1
      }))
    }),
    detail: {
      tags: ['events'],
      summary: 'Obtener estadísticas de eventos',
      description: 'Obtiene estadísticas de conexiones SSE activas (solo para debugging)'
    }
  });

export default eventsRoutes;
