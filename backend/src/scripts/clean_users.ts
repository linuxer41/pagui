import { query } from '../shared/database/pool'
import { logger } from '../shared/logger'

const KEEP_EMAILS = [
  'admin@pagui.com',
  'u_218023293167341568@pagui.app', // Boris Muñoz
  'u_218020523899097088@pagui.app', // Shirley Claudia Gonzáles Guardia
  'u_210084196847194112@pagui.app', // Francisco Ochoa
]

// Dry run: show what would be deleted
// Final clean: actually delete

async function dryRun() {
  console.log('=== DRY RUN: Usuarios a mantener ===')
  const keepUsers = await query(`SELECT id, email, full_name FROM users WHERE email = ANY($1) AND deleted_at IS NULL`, [KEEP_EMAILS])
  console.log(`Keep users: ${keepUsers.rowCount}`)
  for (const r of keepUsers.rows) console.log(`  KEEP: ${r.email} (${r.full_name}) id=${r.id}`)

  const keepIds = keepUsers.rows.map(r => r.id)
  if (keepIds.length === 0) {
    console.log('ERROR: No se encontraron usuarios a mantener, abortando')
    process.exit(1)
  }

  const allUsers = await query(`SELECT id, email, full_name FROM users WHERE deleted_at IS NULL ORDER BY email`)
  const toDelete = allUsers.rows.filter(r => !KEEP_EMAILS.includes(r.email))
  console.log(`\n=== Usuarios a ELIMINAR: ${toDelete.length} ===`)
  for (const r of toDelete.slice(0, 50)) console.log(`  DELETE: ${r.email} (${r.full_name})`)
  if (toDelete.length > 50) console.log(`  ... y ${toDelete.length - 50} más`)

  const deleteIds = toDelete.map(r => r.id)

  // Tenants
  const allTenants = await query(`SELECT t.id, t.full_name, t.email FROM tenants t WHERE t.deleted_at IS NULL`)
  const keepTenantsQ = await query(`
    SELECT DISTINCT t.id, t.full_name, t.email
    FROM tenants t
    JOIN tenant_users tu ON tu.tenant_id = t.id AND tu.deleted_at IS NULL
    WHERE tu.user_id = ANY($1) AND t.deleted_at IS NULL
  `, [keepIds])
  const keepTenantIds = new Set(keepTenantsQ.rows.map(r => String(r.id)))
  const tenantsToDelete = allTenants.rows.filter(r => !keepTenantIds.has(String(r.id)))
  console.log(`\n=== Tenants a ELIMINAR: ${tenantsToDelete.length} / ${allTenants.rowCount} total ===`)
  for (const r of tenantsToDelete.slice(0, 20)) console.log(`  DELETE tenant: ${r.full_name} (${r.email}) id=${r.id}`)
  if (tenantsToDelete.length > 20) console.log(`  ... y ${tenantsToDelete.length - 20} más`)
  console.log(`Keep tenants: ${keepTenantIds.size}`)
  for (const r of keepTenantsQ.rows) console.log(`  KEEP tenant: ${r.full_name} id=${r.id}`)

  // Wallets
  const allWallets = await query(`SELECT id, wallet_number, name, tenant_id FROM wallets WHERE deleted_at IS NULL`)
  const walletsToDelete = allWallets.rows.filter(r => {
    if (!r.tenant_id) return true // wallets sin tenant se eliminan salvo que tengan permiso de keep users?
    return !keepTenantIds.has(String(r.tenant_id))
  })
  // También wallets que solo tienen permisos de usuarios a eliminar y no de keep?
  // Para ser conservador, eliminamos solo por tenant_id, no por permisos
  console.log(`\n=== Wallets a ELIMINAR: ${walletsToDelete.length} / ${allWallets.rowCount} total ===`)
  for (const r of walletsToDelete.slice(0, 20)) console.log(`  DELETE wallet: ${r.wallet_number} ${r.name} tenant=${r.tenant_id}`)
  if (walletsToDelete.length > 20) console.log(`  ... y ${walletsToDelete.length - 20} más`)
  console.log(`Keep wallets: ${allWallets.rowCount - walletsToDelete.length}`)

  // Other tables counts
  const counts = await Promise.all([
    query(`SELECT COUNT(*) as c FROM auth_tokens WHERE user_id = ANY($1)`, [deleteIds.length ? deleteIds : ['0']]),
    query(`SELECT COUNT(*) as c FROM devices WHERE user_id = ANY($1)`, [deleteIds.length ? deleteIds : ['0']]),
    query(`SELECT COUNT(*) as c FROM wallet_permissions WHERE user_id = ANY($1)`, [deleteIds.length ? deleteIds : ['0']]),
    query(`SELECT COUNT(*) as c FROM tenant_users WHERE user_id = ANY($1)`, [deleteIds.length ? deleteIds : ['0']]),
    query(`SELECT COUNT(*) as c FROM audit_logs WHERE user_id = ANY($1)`, [deleteIds.length ? deleteIds : ['0']]),
    query(`SELECT COUNT(*) as c FROM wallet_movements WHERE wallet_id = ANY($1)`, [walletsToDelete.length ? walletsToDelete.map(r=>r.id) : ['0']]),
    query(`SELECT COUNT(*) as c FROM transfers WHERE sender_wallet_id = ANY($1) OR receiver_wallet_id = ANY($1)`, [walletsToDelete.length ? walletsToDelete.map(r=>r.id) : ['0']]),
  ])
  console.log(`\n=== Registros relacionados a eliminar ===`)
  console.log(`  auth_tokens: ${counts[0].rows[0].c}`)
  console.log(`  devices: ${counts[1].rows[0].c}`)
  console.log(`  wallet_permissions: ${counts[2].rows[0].c}`)
  console.log(`  tenant_users: ${counts[3].rows[0].c}`)
  console.log(`  audit_logs: ${counts[4].rows[0].c}`)
  console.log(`  wallet_movements (de wallets a eliminar): ${counts[5].rows[0].c}`)
  console.log(`  transfers (de wallets a eliminar): ${counts[6].rows[0].c}`)

  // Wallets to keep
  const keepWallets = allWallets.rows.filter(r => keepTenantIds.has(String(r.tenant_id)))
  console.log(`\n=== Resumen DRY RUN ===`)
  console.log(`Usuarios: ${allUsers.rowCount} total, ${keepUsers.rowCount} keep, ${toDelete.length} delete`)
  console.log(`Tenants: ${allTenants.rowCount} total, ${keepTenantIds.size} keep, ${tenantsToDelete.length} delete`)
  console.log(`Wallets: ${allWallets.rowCount} total, ${keepWallets.length} keep, ${walletsToDelete.length} delete`)

  return { keepIds, deleteIds, keepTenantIds, tenantsToDelete, walletsToDelete }
}

async function finalClean() {
  console.log('\n=== FINAL CLEAN: Eliminando ===')
  const { keepIds, deleteIds } = await dryRun() // re-run to get ids
  if (deleteIds.length === 0) {
    console.log('Nada que eliminar')
    return
  }

  // Orden: primero borrar dependencias, luego usuarios
  // 1. auth_tokens, devices, wallet_permissions, tenant_users, audit_logs, notifications
  const keepTenantIdsQ = await query(`SELECT DISTINCT tenant_id FROM tenant_users WHERE user_id = ANY($1)`, [keepIds])
  const keepTenantIds = new Set(keepTenantIdsQ.rows.map(r => String(r.tenant_id)))
  const walletsToDeleteQ = await query(`SELECT id FROM wallets WHERE deleted_at IS NULL AND (tenant_id IS NULL OR tenant_id != ALL($1))`, [Array.from(keepTenantIds)])
  const walletIdsToDelete = walletsToDeleteQ.rows.map(r => r.id)

  console.log(`Borrando ${deleteIds.length} usuarios...`)
  // Borrar en orden para evitar FK
  await query(`DELETE FROM auth_tokens WHERE user_id = ANY($1)`, [deleteIds])
  console.log('  auth_tokens borrados')
  await query(`DELETE FROM devices WHERE user_id = ANY($1)`, [deleteIds])
  console.log('  devices borrados')
  await query(`DELETE FROM wallet_permissions WHERE user_id = ANY($1)`, [deleteIds])
  console.log('  wallet_permissions borrados (de usuarios a eliminar)')
  await query(`DELETE FROM tenant_users WHERE user_id = ANY($1)`, [deleteIds])
  console.log('  tenant_users borrados')
  await query(`DELETE FROM notifications WHERE user_id = ANY($1)`, [deleteIds]).catch(()=>{})
  console.log('  notifications borrados (si existe)')
  await query(`DELETE FROM audit_logs WHERE user_id = ANY($1)`, [deleteIds]).catch(()=>{})
  console.log('  audit_logs borrados')

  // Wallets y movimientos
  if (walletIdsToDelete.length) {
    // wallet_movements, then wallets
    // Primero borrar wallet_permissions restantes de wallets a eliminar (de keep users que tengan acceso)
    await query(`DELETE FROM wallet_permissions WHERE wallet_id = ANY($1)`, [walletIdsToDelete])
    console.log(`  wallet_permissions de wallets a eliminar borrados`)
    // Borrar wallet_movements, qr_codes, etc. que dependen de wallets
    await query(`DELETE FROM wallet_movements WHERE wallet_id = ANY($1)`, [walletIdsToDelete])
    console.log(`  wallet_movements borrados`)
    await query(`DELETE FROM qr_codes WHERE wallet_id = ANY($1)`, [walletIdsToDelete]).catch(()=>{})
    console.log(`  qr_codes borrados`)
    await query(`DELETE FROM api_keys WHERE wallet_id = ANY($1)`, [walletIdsToDelete]).catch(()=>{})
    console.log(`  api_keys borrados`)
    await query(`DELETE FROM collection_config WHERE wallet_id = ANY($1)`, [walletIdsToDelete]).catch(()=>{})
    console.log(`  collection_config borrados`)
    await query(`DELETE FROM transfers WHERE sender_wallet_id = ANY($1) OR receiver_wallet_id = ANY($1)`, [walletIdsToDelete]).catch(()=>{})
    console.log(`  transfers borrados`)
    // Finalmente wallets (soft delete)
    await query(`UPDATE wallets SET deleted_at = CURRENT_TIMESTAMP WHERE id = ANY($1)`, [walletIdsToDelete])
    console.log(`  wallets soft-deleted: ${walletIdsToDelete.length}`)
  }

  // Tenants
  const tenantsToDeleteQ = await query(`SELECT id FROM tenants WHERE deleted_at IS NULL AND id != ALL($1)`, [Array.from(keepTenantIds)])
  const tenantIdsToDelete = tenantsToDeleteQ.rows.map(r => r.id)
  if (tenantIdsToDelete.length) {
    // Borrar tenant_users restantes, bank_accounts, baneco_credentials
    await query(`DELETE FROM tenant_users WHERE tenant_id = ANY($1)`, [tenantIdsToDelete]).catch(()=>{})
    await query(`DELETE FROM bank_accounts WHERE tenant_id = ANY($1)`, [tenantIdsToDelete]).catch(()=>{})
    await query(`DELETE FROM baneco_credentials WHERE tenant_id = ANY($1)`, [tenantIdsToDelete]).catch(()=>{})
    await query(`UPDATE tenants SET deleted_at = CURRENT_TIMESTAMP WHERE id = ANY($1)`, [tenantIdsToDelete])
    console.log(`  tenants soft-deleted: ${tenantIdsToDelete.length}`)
  }

  // Finalmente usuarios (soft delete)
  await query(`UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE id = ANY($1)`, [deleteIds])
  console.log(`  users soft-deleted: ${deleteIds.length}`)

  console.log('\n=== LIMPIEZA FINAL COMPLETADA ===')
  console.log(`Mantendidos: ${keepIds.length} usuarios, ${keepTenantIds.size} tenants`)
}

const mode = process.argv[2]
if (mode === '--dry-run' || !mode) {
  dryRun().then(()=>process.exit(0)).catch(e=>{ console.error(e); process.exit(1)})
} else if (mode === '--execute') {
  finalClean().then(()=>process.exit(0)).catch(e=>{ console.error(e); process.exit(1)})
} else {
  console.log('Uso: bun run src/scripts/clean_users.ts --dry-run  |  --execute')
  process.exit(0)
}
