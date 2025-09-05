const { migrateAddUserBalance } = require('./dist/scripts/migrate-add-user-balance.js');

async function runMigration() {
  try {
    console.log('🚀 Iniciando migración de balance de usuarios...');
    await migrateAddUserBalance();
    console.log('🎉 Migración completada exitosamente!');
  } catch (error) {
    console.error('💥 Error en la migración:', error);
    process.exit(1);
  }
}

runMigration();
