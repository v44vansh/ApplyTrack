import { openDB, DBSchema, IDBPDatabase } from 'idb'
import { Activity, Application } from '../types'
import { seedActivities, seedApplications } from '../data/seed'

interface ApplyTrackDB extends DBSchema {
  applications: { key: string; value: Application }
}

const DB_NAME = 'applytrack-db'
const STORE_NAME = 'applications'
const FALLBACK_KEY = 'applytrack-applications'
const ACTIVITY_KEY = 'applytrack-activities'
let dbPromise: Promise<IDBPDatabase<ApplyTrackDB>> | null = null

const canUseIndexedDb = () => typeof window !== 'undefined' && 'indexedDB' in window

const getDb = () => {
  if (!dbPromise) {
    dbPromise = openDB<ApplyTrackDB>(DB_NAME, 1, {
      upgrade(db) { db.createObjectStore(STORE_NAME) },
    })
  }
  return dbPromise
}

export async function loadApplications(): Promise<Application[]> {
  if (canUseIndexedDb()) {
    try {
      const db = await getDb()
      const values = await db.getAll(STORE_NAME)
      if (values.length) return values.sort((a, b) => b.lastUpdated.localeCompare(a.lastUpdated))
    } catch { /* localStorage is the intentional offline fallback */ }
  }
  try {
    const saved = window.localStorage.getItem(FALLBACK_KEY)
    if (saved) return JSON.parse(saved) as Application[]
  } catch { /* use seed */ }
  return seedApplications
}

export async function saveApplications(applications: Application[]): Promise<void> {
  try { window.localStorage.setItem(FALLBACK_KEY, JSON.stringify(applications)) } catch { /* private mode */ }
  if (canUseIndexedDb()) {
    try {
      const db = await getDb()
      const tx = db.transaction(STORE_NAME, 'readwrite')
      await tx.store.clear()
      await Promise.all(applications.map((app) => tx.store.put(app, app.id)))
      await tx.done
    } catch { /* localStorage still keeps the demo usable */ }
  }
}

export async function resetApplications(): Promise<Application[]> {
  await saveApplications(seedApplications)
  return seedApplications
}

export async function loadActivities(): Promise<Activity[]> {
  try {
    const saved = window.localStorage.getItem(ACTIVITY_KEY)
    if (saved) return JSON.parse(saved) as Activity[]
  } catch { /* use seed */ }
  return seedActivities
}

export async function saveActivities(activities: Activity[]): Promise<void> {
  try { window.localStorage.setItem(ACTIVITY_KEY, JSON.stringify(activities)) } catch { /* private mode */ }
}

export async function resetActivities(): Promise<Activity[]> {
  await saveActivities(seedActivities)
  return seedActivities
}

export function broadcastApplications(applications: Application[], activities: Activity[]) {
  try { new BroadcastChannel('applytrack-sync').postMessage({ applications, activities }) } catch { /* unsupported browser */ }
}
