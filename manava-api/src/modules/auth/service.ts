import type { UserRole } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { hashPassword, verifyPassword } from '../../lib/password.js'
import { generateRefreshToken, hashRefreshToken, signAccessToken } from '../../lib/jwt.js'
import { HttpError } from '../../middleware/errorHandler.js'

// Role yang dinonaktifkan sementara: login, refresh, dan sesi aktifnya ditolak.
// Data user tetap di database sehingga role dapat diaktifkan kembali nanti.
const DISABLED_ROLES: readonly UserRole[] = ['client', 'mediator', 'finance']

function assertRoleActive(role: UserRole): void {
  if (DISABLED_ROLES.includes(role)) {
    throw new HttpError(403, 'Role dinonaktifkan')
  }
}

export interface AuthUser {
  user_id: string
  full_name: string
  email: string
  username: string
  role: UserRole
  avatar: string | null
}

export interface AuthResult {
  accessToken: string
  refreshToken: string       // raw token, sent to client via httpOnly cookie
  refreshExpiresAt: Date
  user: AuthUser
}

// Look the user up by email or username, verify password, issue token pair.
export async function login(identifier: string, password: string): Promise<AuthResult> {
  const user = await prisma.user.findFirst({
    where: { OR: [{ email: identifier }, { username: identifier }] },
  })
  if (!user || !user.is_active) {
    throw new HttpError(401, 'Invalid credentials')
  }
  const ok = await verifyPassword(password, user.password_hash)
  if (!ok) throw new HttpError(401, 'Invalid credentials')
  assertRoleActive(user.role)

  return issueTokens(toAuthUser(user))
}

export interface RegisterInput {
  email: string
  username: string
  firstName: string
  lastName: string
  password: string
}

// Self-service signup — always creates a client account and logs it in.
// Email and username must each be unique across all users.
// NOTE: pendaftaran publik dinonaktifkan selama role client tidak aktif.
export async function register(input: RegisterInput): Promise<AuthResult> {
  assertRoleActive('client')
  const emailTaken = await prisma.user.findUnique({ where: { email: input.email } })
  if (emailTaken) throw new HttpError(409, 'Email already registered')

  const usernameTaken = await prisma.user.findUnique({ where: { username: input.username } })
  if (usernameTaken) throw new HttpError(409, 'Username already taken')

  const password_hash = await hashPassword(input.password)
  const user = await prisma.user.create({
    data: {
      full_name: `${input.firstName} ${input.lastName}`,
      email: input.email,
      username: input.username,
      password_hash,
      role: 'client',
    },
  })

  return issueTokens(toAuthUser(user))
}

// Refresh flow: verify the presented raw token matches a stored hash, then
// rotate — revoke the used token and issue a fresh pair.
export async function refresh(rawToken: string): Promise<AuthResult> {
  const tokenHash = hashRefreshToken(rawToken)
  const record = await prisma.refreshToken.findUnique({
    where: { token_hash: tokenHash },
    include: { user: true },
  })
  if (!record || record.revoked_at) throw new HttpError(401, 'Refresh token invalid')
  if (record.expires_at.getTime() < Date.now()) {
    throw new HttpError(401, 'Refresh token expired')
  }

  await prisma.refreshToken.update({
    where: { id: record.id },
    data: { revoked_at: new Date() },
  })

  assertRoleActive(record.user.role)
  return issueTokens(toAuthUser(record.user))
}

export async function logout(rawToken: string | null): Promise<void> {
  if (!rawToken) return
  const tokenHash = hashRefreshToken(rawToken)
  await prisma.refreshToken.updateMany({
    where: { token_hash: tokenHash, revoked_at: null },
    data: { revoked_at: new Date() },
  })
}

export async function getUserById(userId: string): Promise<AuthUser> {
  const user = await prisma.user.findUnique({
    where: { user_id: userId },
    select: {
      user_id: true,
      full_name: true,
      email: true,
      username: true,
      role: true,
      avatar: true,
      is_active: true,
    },
  })
  if (!user || !user.is_active) throw new HttpError(401, 'User not found')
  assertRoleActive(user.role)
  return toAuthUser(user)
}

interface UserRecord {
  user_id: string
  full_name: string
  email: string
  username: string
  role: UserRole
  avatar: string | null
}

function toAuthUser(user: UserRecord): AuthUser {
  return {
    user_id: user.user_id,
    full_name: user.full_name,
    email: user.email,
    username: user.username,
    role: user.role,
    avatar: user.avatar,
  }
}

async function issueTokens(user: AuthUser): Promise<AuthResult> {
  const accessToken = signAccessToken({
    sub: user.user_id,
    role: user.role,
    email: user.email,
  })
  const { raw, hash, expires_at } = generateRefreshToken()
  await prisma.refreshToken.create({
    data: { user_id: user.user_id, token_hash: hash, expires_at },
  })
  return { accessToken, refreshToken: raw, refreshExpiresAt: expires_at, user }
}
