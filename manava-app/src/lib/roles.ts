import type { UserRole } from '../types'

// Role yang dinonaktifkan sementara (belum dirilis). Tipe UserRole tetap utuh
// agar halaman/komponen lama tidak error — akses diblokir di gerbang:
// backend menolak login/refresh, frontend menyembunyikan semua entry point.
// 'client' aktif kembali sejak fitur booking editor dirilis.
export const DISABLED_ROLES: readonly UserRole[] = ['mediator', 'finance'] as const

export const ACTIVE_ROLES: readonly UserRole[] = ['superadmin', 'hr_admin', 'admin_manager', 'editor', 'client'] as const

export function isRoleDisabled(role: UserRole): boolean {
  return DISABLED_ROLES.includes(role)
}
