import { query } from './src/config/database.js';

async function checkConstraint() {
  try {
    const result = await query(`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints 
      WHERE table_name = 'auth_tokens'
      AND constraint_type = 'UNIQUE';
    `);
    
    console.log('Restricciones únicas en auth_tokens:');
    result.rows.forEach(row => {
      console.log(`  ${row.constraint_name}: ${row.constraint_type}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkConstraint();
