const { migrateBankAccountsSystem } = require('./dist/scripts/migrate-bank-accounts-system.js');

async function runMigration() {
  try {
    console.log('🏦 Iniciando migración del sistema bancario...');
    await migrateBankAccountsSystem();
    console.log('🎉 Migración del sistema bancario completada exitosamente!');
  } catch (error) {
    console.error('💥 Error en la migración:', error);
    process.exit(1);
  }
}

runMigration();
