export function getRoleLabel(role: number | undefined): string {
  if (role === 1) return 'Super Admin'
  if (role === 2) return 'Administrador'
  if (role === 4) return 'Gerente'
  return 'Usuario'
}
