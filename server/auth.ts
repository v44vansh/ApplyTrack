import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import type { FastifyReply, FastifyRequest } from 'fastify'
import type { PrismaClient, User } from '@prisma/client'

const SESSION_COOKIE = 'applytrack_session'
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14

export type PublicUser = Pick<User, 'id' | 'email' | 'name'>

export function publicUser(user: User): PublicUser {
  return { id: user.id, email: user.email, name: user.name }
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string) {
  const [salt, expected] = stored.split(':')
  if (!salt || !expected) return false
  const actual = scryptSync(password, salt, 64)
  const expectedBuffer = Buffer.from(expected, 'hex')
  return actual.length === expectedBuffer.length && timingSafeEqual(actual, expectedBuffer)
}

function hashSession(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export async function createSession(prisma: PrismaClient, userId: string, reply: FastifyReply) {
  const token = randomBytes(32).toString('hex')
  await prisma.session.create({ data: { tokenHash: hashSession(token), userId, expiresAt: new Date(Date.now() + SESSION_TTL_MS) } })
  reply.setCookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: process.env.COOKIE_SAME_SITE === 'none' ? 'none' : 'lax',
    secure: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_MS / 1000,
  })
}

export async function getUserFromSession(prisma: PrismaClient, token?: string) {
  if (!token) return null
  const session = await prisma.session.findUnique({ where: { tokenHash: hashSession(token) }, include: { user: true } })
  if (!session) return null
  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined)
    return null
  }
  return session.user
}

export async function currentUser(prisma: PrismaClient, request: FastifyRequest) {
  return getUserFromSession(prisma, request.cookies[SESSION_COOKIE])
}

export async function requireUser(prisma: PrismaClient, request: FastifyRequest, reply: FastifyReply) {
  const user = await currentUser(prisma, request)
  if (!user) {
    await reply.code(401).send({ error: 'UNAUTHENTICATED', message: 'Please sign in to continue.' })
    return null
  }
  return user
}

export async function clearSession(prisma: PrismaClient, request: FastifyRequest, reply: FastifyReply) {
  const token = request.cookies[SESSION_COOKIE]
  if (token) await prisma.session.deleteMany({ where: { tokenHash: hashSession(token) } })
  reply.clearCookie(SESSION_COOKIE, { path: '/' })
}

export function socketSessionToken(cookieHeader?: string) {
  const token = cookieHeader?.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${SESSION_COOKIE}=`))
  return token?.slice(SESSION_COOKIE.length + 1)
}
