import { query } from './src/config/database.js';

async function checkTokens() {
  try {
    console.log('🔍 Verificando tokens en la base de datos...');
    
    const result = await query(`
      SELECT id, user_id, token_type, token, expires_at, created_at
      FROM auth_tokens
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    console.log(`📊 Encontrados ${result.rowCount} tokens:`);
    result.rows.forEach((row, index) => {
      console.log(`${index + 1}. ID: ${row.id}, User: ${row.user_id}, Type: ${row.token_type}, Expires: ${row.expires_at}, Created: ${row.created_at}`);
      console.log(`   Token: ${row.token.substring(0, 50)}...`);
    });
    
  } catch (error) {
    console.error('💥 Error:', error);
  }
}

checkTokens();
