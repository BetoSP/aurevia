// Superadmin es un quinto rol real, distinto de Admin (ver CLAUDE.md, docs/CONTEXT.md),
// pero tiene todo el acceso de Admin más el técnico (Módulo 8). Por eso cualquier chequeo
// que hoy compara contra 'admin' pasa a usar este helper en vez de repetir la comparación.
export function esAdminOSuperior(rol) {
  return rol === 'admin' || rol === 'superadmin';
}

export const ROLES_PANEL = ['admin', 'coordinador', 'superadmin'];
