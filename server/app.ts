import { existsSync } from 'node:fs'
import { join } from 'node:path'
import cors from '@fastify/cors'
import cookie from '@fastify/cookie'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import staticPlugin from '@fastify/static'
import Fastify, { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { clearSession, createSession, currentUser, hashPassword, publicUser, requireUser, verifyPassword } from './auth.js'
import { prisma } from './db.js'
import { ActivityDTO, ApplicationDTO, WorkspaceSnapshot } from './types.js'

const stageSchema = z.enum(['applied', 'screening', 'interview', 'offer', 'rejected'])
const workTypeSchema = z.enum(['Remote', 'Hybrid', 'On-site'])
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD dates')
const optionalDateSchema = dateSchema.optional().or(z.literal(''))

const applicationInputSchema = z.object({
  company: z.string().trim().min(1).max(120),
  role: z.string().trim().min(1).max(160),
  stage: stageSchema,
  location: z.string().trim().min(1).max(160),
  workType: workTypeSchema,
  salary: z.string().trim().min(1).max(80),
  appliedDate: dateSchema,
  nextAction: z.string().trim().min(1).max(200),
  nextActionDate: optionalDateSchema,
  url: z.string().url().optional().or(z.literal('')),
  contact: z.string().trim().max(160).optional(),
  notes: z.string().max(5000).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
  logo: z.string().trim().min(1).max(4),
  color: z.string().regex(/^#[\da-f]{6}$/i),
})

const patchSchema = applicationInputSchema.partial().extend({ version: z.number().int().positive().optional() })

type Change = { kind: 'upsert'; application: ApplicationDTO; activity?: ActivityDTO } | { kind: 'delete'; applicationId: string }
type BuildOptions = { onChange?: (userId: string, change: Change) => void }

function toDate(value: string) {
  return new Date(`${value}T12:00:00.000Z`)
}

function dateOnly(value?: Date | null) {
  return value ? value.toISOString().slice(0, 10) : undefined
}

function parseTags(value: string) {
  try {
    const tags = JSON.parse(value)
    return Array.isArray(tags) ? tags.filter((tag): tag is string => typeof tag === 'string') : []
  } catch {
    return []
  }
}

function toApplication(record: any): ApplicationDTO {
  return {
    id: record.id,
    company: record.company,
    role: record.role,
    stage: record.stage,
    location: record.location,
    workType: record.workType,
    salary: record.salary,
    appliedDate: dateOnly(record.appliedDate)!,
    nextAction: record.nextAction,
    nextActionDate: dateOnly(record.nextActionDate),
    url: record.url ?? undefined,
    contact: record.contact ?? undefined,
    notes: record.notes ?? undefined,
    tags: parseTags(record.tagsJson),
    lastUpdated: record.updatedAt.toISOString().slice(0, 10),
    logo: record.logo,
    color: record.color,
    version: record.version,
  }
}

function toActivity(record: any): ActivityDTO {
  return { id: record.id, applicationId: record.applicationId, type: record.type, text: record.text, date: record.occurredAt.toISOString().slice(0, 10) }
}

function bodyOf(request: { body: unknown }) {
  return request.body ?? {}
}

export async function buildApp(options: BuildOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({ logger: process.env.NODE_ENV !== 'test' })
  await app.register(helmet)
  await app.register(cookie)
  await app.register(cors, { origin: process.env.FRONTEND_URL ?? true, credentials: true })
  await app.register(rateLimit, { max: 120, timeWindow: '1 minute' })
  app.addHook('onRequest', async (request, reply) => {
    const expectedOrigin = process.env.FRONTEND_URL
    const origin = request.headers.origin
    if (expectedOrigin && origin && origin !== expectedOrigin && ['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method)) {
      return reply.code(403).send({ error: 'ORIGIN_NOT_ALLOWED' })
    }
  })
  const distRoot = join(process.cwd(), 'dist')
  if (existsSync(distRoot)) await app.register(staticPlugin, { root: distRoot, prefix: '/' })

  app.get('/api/health', async () => ({ ok: true, service: 'applytrack-api' }))

  app.post('/api/auth/register', async (request, reply) => {
    const parsed = z.object({ name: z.string().trim().min(2).max(80), email: z.string().email().max(160), password: z.string().min(8).max(200) }).safeParse(bodyOf(request))
    if (!parsed.success) return reply.code(400).send({ error: 'VALIDATION_ERROR', issues: parsed.error.flatten().fieldErrors })
    const email = parsed.data.email.toLowerCase()
    try {
      const user = await prisma.user.create({ data: { name: parsed.data.name, email, passwordHash: hashPassword(parsed.data.password) } })
      await createSession(prisma, user.id, reply)
      return reply.code(201).send({ user: publicUser(user) })
    } catch (error: any) {
      if (error?.code === 'P2002') return reply.code(409).send({ error: 'EMAIL_IN_USE', message: 'An account with that email already exists.' })
      throw error
    }
  })

  app.post('/api/auth/login', async (request, reply) => {
    const parsed = z.object({ email: z.string().email(), password: z.string().min(1) }).safeParse(bodyOf(request))
    if (!parsed.success) return reply.code(400).send({ error: 'VALIDATION_ERROR', issues: parsed.error.flatten().fieldErrors })
    const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } })
    if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) return reply.code(401).send({ error: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' })
    await createSession(prisma, user.id, reply)
    return { user: publicUser(user) }
  })

  app.post('/api/auth/logout', async (request, reply) => {
    await clearSession(prisma, request, reply)
    return { ok: true }
  })

  app.get('/api/auth/me', async (request, reply) => {
    const user = await currentUser(prisma, request)
    if (!user) return reply.code(401).send({ error: 'UNAUTHENTICATED' })
    return { user: publicUser(user) }
  })

  app.get('/api/workspace', async (request, reply): Promise<WorkspaceSnapshot | void> => {
    const user = await requireUser(prisma, request, reply)
    if (!user) return
    const [applications, activities] = await Promise.all([
      prisma.application.findMany({ where: { ownerId: user.id }, orderBy: { updatedAt: 'desc' } }),
      prisma.activity.findMany({ where: { ownerId: user.id }, orderBy: { occurredAt: 'desc' }, take: 100 }),
    ])
    return { applications: applications.map(toApplication), activities: activities.map(toActivity), revision: applications[0]?.updatedAt.toISOString() ?? '' }
  })

  app.post('/api/applications', async (request, reply): Promise<ApplicationDTO | void> => {
    const user = await requireUser(prisma, request, reply)
    if (!user) return
    const parsed = applicationInputSchema.safeParse(bodyOf(request))
    if (!parsed.success) return reply.code(400).send({ error: 'VALIDATION_ERROR', issues: parsed.error.flatten().fieldErrors })
    const record = await prisma.$transaction(async (tx) => {
      const { tags, ...fields } = parsed.data
      const application = await tx.application.create({ data: { ...fields, appliedDate: toDate(parsed.data.appliedDate), nextActionDate: parsed.data.nextActionDate ? toDate(parsed.data.nextActionDate) : null, tagsJson: JSON.stringify(tags), ownerId: user.id } })
      const activity = await tx.activity.create({ data: { ownerId: user.id, applicationId: application.id, type: 'created', text: `Added ${application.company} to your pipeline` } })
      return { application, activity }
    })
    const result = toApplication(record.application)
    options.onChange?.(user.id, { kind: 'upsert', application: result, activity: toActivity(record.activity) })
    return reply.code(201).send(result)
  })

  app.patch('/api/applications/:id', async (request, reply): Promise<ApplicationDTO | void> => {
    const user = await requireUser(prisma, request, reply)
    if (!user) return
    const id = (request.params as { id: string }).id
    const parsed = patchSchema.safeParse(bodyOf(request))
    if (!parsed.success) return reply.code(400).send({ error: 'VALIDATION_ERROR', issues: parsed.error.flatten().fieldErrors })
    const expectedVersion = parsed.data.version
    const existing = await prisma.application.findFirst({ where: { id, ownerId: user.id } })
    if (!existing) return reply.code(404).send({ error: 'NOT_FOUND', message: 'Application was not found.' })
    if (expectedVersion && expectedVersion !== existing.version) return reply.code(409).send({ error: 'CONFLICT', message: 'This application changed elsewhere. Refresh and try again.' })
    const patch: any = { ...parsed.data }
    delete patch.version
    if (parsed.data.appliedDate) patch.appliedDate = toDate(parsed.data.appliedDate)
    if (parsed.data.nextActionDate !== undefined) patch.nextActionDate = parsed.data.nextActionDate ? toDate(parsed.data.nextActionDate) : null
    if (parsed.data.tags) { patch.tagsJson = JSON.stringify(parsed.data.tags); delete patch.tags }
    const activity: { type: string; text: string } | null = parsed.data.stage && parsed.data.stage !== existing.stage
      ? { type: 'move', text: `${existing.company} moved to ${parsed.data.stage[0].toUpperCase()}${parsed.data.stage.slice(1)}` }
      : parsed.data.notes !== undefined ? { type: 'note', text: `Updated notes for ${existing.company}` } : null
    delete patch.stage
    const record = await prisma.$transaction(async (tx) => {
      const application = await tx.application.update({ where: { id: existing.id }, data: { ...patch, ...(parsed.data.stage ? { stage: parsed.data.stage } : {}), version: { increment: 1 } } })
      const activityRecord = activity ? await tx.activity.create({ data: { ownerId: user.id, applicationId: application.id, type: activity.type, text: activity.text } }) : null
      return { application, activity: activityRecord }
    })
    const result = toApplication(record.application)
    options.onChange?.(user.id, { kind: 'upsert', application: result, activity: record.activity ? toActivity(record.activity) : undefined })
    return result
  })

  app.delete('/api/applications/:id', async (request, reply) => {
    const user = await requireUser(prisma, request, reply)
    if (!user) return
    const id = (request.params as { id: string }).id
    const existing = await prisma.application.findFirst({ where: { id, ownerId: user.id } })
    if (!existing) return reply.code(404).send({ error: 'NOT_FOUND', message: 'Application was not found.' })
    await prisma.application.delete({ where: { id: existing.id } })
    options.onChange?.(user.id, { kind: 'delete', applicationId: existing.id })
    return { ok: true }
  })

  app.setNotFoundHandler((request, reply) => {
    if (request.method === 'GET' && !request.url.startsWith('/api') && existsSync(join(distRoot, 'index.html'))) return reply.sendFile('index.html')
    return reply.code(404).send({ error: 'NOT_FOUND' })
  })

  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error)
    return reply.code(500).send({ error: 'INTERNAL_ERROR', message: 'Something went wrong.' })
  })
  return app
}
