import { Activity, Application } from '../types'
import { SessionUser, WorkspaceSnapshot } from './api'
import { supabase } from './supabase'

type SupabaseApplicationRow = {
  id: string
  owner_id: string
  company: string
  role: string
  stage: Application['stage']
  location: string
  work_type: Application['workType']
  salary: string
  applied_date: string
  next_action: string
  next_action_date: string | null
  url: string | null
  contact: string | null
  notes: string | null
  tags: unknown
  logo: string
  color: string
  version: number
  created_at: string
  updated_at: string
}

type SupabaseActivityRow = {
  id: string
  owner_id: string
  application_id: string
  type: Activity['type']
  text: string
  occurred_at: string
}

function client() {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

export function applicationFromRow(row: SupabaseApplicationRow): Application {
  return {
    id: row.id,
    company: row.company,
    role: row.role,
    stage: row.stage,
    location: row.location,
    workType: row.work_type,
    salary: row.salary,
    appliedDate: row.applied_date,
    nextAction: row.next_action,
    nextActionDate: row.next_action_date ?? undefined,
    url: row.url ?? undefined,
    contact: row.contact ?? undefined,
    notes: row.notes ?? undefined,
    tags: Array.isArray(row.tags) ? row.tags.filter((tag): tag is string => typeof tag === 'string') : [],
    lastUpdated: row.updated_at.slice(0, 10),
    logo: row.logo,
    color: row.color,
    version: row.version,
  }
}

export function activityFromRow(row: SupabaseActivityRow): Activity {
  return { id: row.id, applicationId: row.application_id, type: row.type, text: row.text, date: row.occurred_at.slice(0, 10) }
}

function currentUserId() {
  return client().auth.getUser().then(({ data, error }) => {
    if (error || !data.user) throw new Error('UNAUTHENTICATED')
    return data.user.id
  })
}

function userFromAuth(user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> }): SessionUser {
  return { id: user.id, email: user.email ?? '', name: typeof user.user_metadata?.name === 'string' ? user.user_metadata.name : 'ApplyTrack member' }
}

export const supabaseAuth = {
  async me() {
    const { data, error } = await client().auth.getUser()
    if (error || !data.user) throw new Error('UNAUTHENTICATED')
    return userFromAuth(data.user)
  },
  async login(email: string, password: string) {
    const { data, error } = await client().auth.signInWithPassword({ email, password })
    if (error || !data.user) throw new Error(error?.message ?? 'Unable to sign in.')
    return userFromAuth(data.user)
  },
  async register(name: string, email: string, password: string) {
    const base = import.meta.env.BASE_URL.replace(/\/+$/, '')
    const emailRedirectTo = `${window.location.origin}${base}/verify-email`
    const { data, error } = await client().auth.signUp({ email, password, options: { data: { name }, emailRedirectTo } })
    if (error || !data.user) throw new Error(error?.message ?? 'Unable to create your account.')
    if (!data.session) throw new Error('Account created. Confirm your email, then sign in to continue.')
    return userFromAuth(data.user)
  },
  async logout() {
    const { error } = await client().auth.signOut()
    if (error) throw new Error(error.message)
  },
}

export const supabaseWorkspace = {
  async load(): Promise<WorkspaceSnapshot> {
    const supabaseClient = client()
    const [applicationsResult, activitiesResult] = await Promise.all([
      supabaseClient.from('applications').select('*').order('updated_at', { ascending: false }),
      supabaseClient.from('activities').select('*').order('occurred_at', { ascending: false }).limit(100),
    ])
    if (applicationsResult.error) throw new Error(applicationsResult.error.message)
    if (activitiesResult.error) throw new Error(activitiesResult.error.message)
    const applications = (applicationsResult.data as SupabaseApplicationRow[]).map(applicationFromRow)
    const activities = (activitiesResult.data as SupabaseActivityRow[]).map(activityFromRow)
    return { applications, activities, revision: applications[0]?.lastUpdated ?? '' }
  },
  async create(application: Application) {
    const ownerId = await currentUserId()
    const { data, error } = await client().from('applications').insert({
      owner_id: ownerId,
      company: application.company,
      role: application.role,
      stage: application.stage,
      location: application.location,
      work_type: application.workType,
      salary: application.salary,
      applied_date: application.appliedDate,
      next_action: application.nextAction,
      next_action_date: application.nextActionDate || null,
      url: application.url || null,
      contact: application.contact || null,
      notes: application.notes || null,
      tags: application.tags,
      logo: application.logo,
      color: application.color,
    }).select('*').single()
    if (error || !data) throw new Error(error?.message ?? 'Unable to save application.')
    return applicationFromRow(data as SupabaseApplicationRow)
  },
  async update(id: string, patch: Partial<Application>) {
    const ownerId = await currentUserId()
    const dbPatch: Record<string, unknown> = {}
    if (patch.company !== undefined) dbPatch.company = patch.company
    if (patch.role !== undefined) dbPatch.role = patch.role
    if (patch.stage !== undefined) dbPatch.stage = patch.stage
    if (patch.location !== undefined) dbPatch.location = patch.location
    if (patch.workType !== undefined) dbPatch.work_type = patch.workType
    if (patch.salary !== undefined) dbPatch.salary = patch.salary
    if (patch.appliedDate !== undefined) dbPatch.applied_date = patch.appliedDate
    if (patch.nextAction !== undefined) dbPatch.next_action = patch.nextAction
    if (patch.nextActionDate !== undefined) dbPatch.next_action_date = patch.nextActionDate || null
    if (patch.url !== undefined) dbPatch.url = patch.url || null
    if (patch.contact !== undefined) dbPatch.contact = patch.contact || null
    if (patch.notes !== undefined) dbPatch.notes = patch.notes || null
    if (patch.tags !== undefined) dbPatch.tags = patch.tags
    if (patch.logo !== undefined) dbPatch.logo = patch.logo
    if (patch.color !== undefined) dbPatch.color = patch.color
    dbPatch.version = (patch.version ?? 0) + 1
    let query = client().from('applications').update(dbPatch).eq('id', id).eq('owner_id', ownerId)
    if (patch.version !== undefined) query = query.eq('version', patch.version)
    const { data, error } = await query.select('*').single()
    if (error || !data) throw new Error(error?.code === 'PGRST116' ? 'CONFLICT: This application changed elsewhere. Refresh and try again.' : error?.message ?? 'Unable to update application.')
    const saved = applicationFromRow(data as SupabaseApplicationRow)
    return saved
  },
  async remove(id: string) {
    const ownerId = await currentUserId()
    const { error } = await client().from('applications').delete().eq('id', id).eq('owner_id', ownerId)
    if (error) throw new Error(error.message)
  },
}
