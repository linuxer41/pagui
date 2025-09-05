import { query } from './src/config/database.js';

async function testSaveToken() {
  try {
    console.log('🧪 Probando inserción de token...');
    
    const userId = 1;
    const token = 'test-token-' + Date.now();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);
    
    console.log('Insertando token para usuario:', userId);
    console.log('Token:', token);
    console.log('Expira:', expiresAt);
    
    const result = await query(`
      INSERT INTO auth_tokens (user_id, token_type, token, expires_at)
      VALUES ($1, 'ACCESS_TOKEN', $2, $3)
      ON CONFLICT (user_id, token_type) 
      DO UPDATE SET token = $2, expires_at = $3, updated_at = CURRENT_TIMESTAMP
      RETURNING id, user_id, token_type, token, expires_at
    `, [userId, token, expiresAt.toISOString()]);
    
    console.log('✅ Token insertado:', result.rows[0]);
    
    // Verificar que se insertó
    const verify = await query(`
      SELECT id, user_id, token_type, token, expires_at
      FROM auth_tokens
      WHERE user_id = $1 AND token_type = 'ACCESS_TOKEN'
    `, [userId]);
    
    console.log('📊 Verificación:', verify.rows[0]);
    
  } catch (error) {
    console.error('💥 Error:', error);
  }
}

testSaveToken();
