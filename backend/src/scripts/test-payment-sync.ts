#!/usr/bin/env bun

/**
 * Script de prueba para verificar que el sistema de sincronización funciona
 */

async function testPaymentSync() {
  console.log('🧪 === PRUEBA DEL SISTEMA DE SINCRONIZACIÓN ===\n');

  try {
    // 1. Verificar que Redis está disponible
    console.log('1️⃣ Verificando conexión a Redis...');
    try {
      const { Redis } = await import('ioredis');
      const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
      await redis.ping();
      console.log('✅ Redis conectado correctamente');
      await redis.quit();
    } catch (error) {
      console.log('❌ Redis no disponible:', error.message);
      console.log('💡 Asegúrate de tener Redis ejecutándose:');
      console.log('   docker run -d --name redis -p 6379:6379 redis:alpine');
      return;
    }

    // 2. Verificar que las dependencias están instaladas
    console.log('\n2️⃣ Verificando dependencias...');
    try {
      await import('bullmq');
      console.log('✅ BullMQ disponible');
    } catch (error) {
      console.log('❌ BullMQ no instalado:', error.message);
      console.log('💡 Instala las dependencias:');
      console.log('   bun add bullmq ioredis');
      return;
    }

    // 3. Verificar configuración de variables de entorno
    console.log('\n3️⃣ Verificando configuración...');
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    console.log(`✅ REDIS_URL: ${redisUrl}`);

    // 4. Probar creación de cola
    console.log('\n4️⃣ Probando creación de cola...');
    try {
      const { Queue } = await import('bullmq');
      const testQueue = new Queue('test-queue', {
        connection: {
          url: redisUrl,
          maxRetriesPerRequest: null,
        }
      });

      // Agregar un trabajo de prueba
      await testQueue.add('test-job', { message: 'Hello World' });
      console.log('✅ Cola creada y trabajo agregado exitosamente');

      // Limpiar
      await testQueue.close();
      console.log('✅ Cola cerrada correctamente');
    } catch (error) {
      console.log('❌ Error creando cola:', error.message);
      return;
    }

    // 5. Verificar que la aplicación puede iniciar
    console.log('\n5️⃣ Verificando que la aplicación puede iniciar...');
    try {
      // Solo importar el servicio, no ejecutarlo
      const paymentQueueService = await import('../services/payment-queue.service');
      console.log('✅ PaymentQueueService importado correctamente');
    } catch (error) {
      console.log('❌ Error importando PaymentQueueService:', error.message);
      return;
    }

    console.log('\n🎉 === TODAS LAS PRUEBAS PASARON ===');
    console.log('\n📋 Próximos pasos:');
    console.log('1. Aplicar schema actualizado: bun run src/index.ts init-db');
    console.log('2. Iniciar aplicación: bun run src/index.ts');
    console.log('3. Crear un QR para probar la sincronización');
    console.log('4. Monitorear: bun run src/scripts/monitor-payment-sync.ts monitor');

  } catch (error) {
    console.error('❌ Error en las pruebas:', error);
  }
}

// Ejecutar pruebas
if (import.meta.main) {
  testPaymentSync();
}

export default testPaymentSync;
