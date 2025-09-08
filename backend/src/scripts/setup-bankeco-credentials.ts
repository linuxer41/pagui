import { bankCredentialsService } from '../services/bank-credentials.service';

export async function setupBanecoCredentials() {
  try {
    console.log('🏦 Configurando credenciales de Banco Económico...');
    
    // Verificar si ya existen credenciales
    const existingCredentials = await bankCredentialsService.getAll();
    
    if (existingCredentials.length > 0) {
      console.log('⚠️  Ya existen credenciales bancarias. Eliminando las existentes...');
      
      // Eliminar credenciales existentes
      for (const credential of existingCredentials) {
        await bankCredentialsService.delete(credential.id);
      }
      
      console.log('✅ Credenciales existentes eliminadas');
    }
    
    // Crear credenciales de PRUEBA (Test)
    console.log('📝 Creando credenciales de PRUEBA...');
    
      const testCredential = await bankCredentialsService.create({
       accountNumber: '1041070599',
       accountName: 'Cuenta Test Banco Económico',
       merchantId: 'BANECO_TEST_MERCHANT',
       username: '1649710',
       password: '1234',
       encryptionKey: '6F09E3167E1D40829207B01041A65B12', // Clave AES del banco (NO encriptada)
       environment: 'test', // 'test' = test
       apiBaseUrl: 'https://apimktdesa.baneco.com.bo/ApiGateway/'
     });
    
    console.log(`✅ Credenciales de PRUEBA creadas con ID: ${testCredential.id}`);
    console.log(`   Usuario: ${testCredential.username}`);
    console.log(`   Cuenta: ${testCredential.accountNumber}`);
    console.log(`   Entorno: Test (${testCredential.environment})`);
    
    // Crear credenciales de PRODUCCIÓN
    console.log('🚀 Creando credenciales de PRODUCCIÓN...');
    
         const prodCredential = await bankCredentialsService.create({
       accountNumber: '5021531650',
       accountName: 'Cuenta Producción Banco Económico',
       merchantId: 'BANECO_PROD_MERCHANT',
       username: 'A96661050',
       password: 'Anarkia41?',
       encryptionKey: '320A7492A2334CDDADD8230D251B917C', // Clave AES del banco (NO encriptada)
       environment: 'prod', // 'prod' = producción
       apiBaseUrl: 'https://apimkt.baneco.com.bo/ApiGateway/'
     });
    
    console.log(`✅ Credenciales de PRODUCCIÓN creadas con ID: ${prodCredential.id}`);
    console.log(`   Usuario: ${prodCredential.username}`);
    console.log(`   Cuenta: ${prodCredential.accountNumber}`);
    console.log(`   Entorno: Producción (${prodCredential.environment})`);
    
    console.log('\n🎯 Configuración completada:');
    console.log(`   - Credenciales de PRUEBA: ${testCredential.id}`);
    console.log(`   - Credenciales de PRODUCCIÓN: ${prodCredential.id}`);
    console.log(`   - URL de Test: https://apimktdesa.baneco.com.bo/ApiGateway/`);
    console.log(`   - URL de Producción: https://apimkt.baneco.com.bo/ApiGateway/`);
    
    return {
      testCredential,
      prodCredential
    };
    
  } catch (error) {
    console.error('❌ Error configurando credenciales de Banco Económico:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  setupBanecoCredentials()
    .then(() => {
      console.log('\n✅ Configuración de Banco Económico completada exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Error en la configuración:', error);
      process.exit(1);
    });
}
