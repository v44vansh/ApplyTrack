import { create } from 'zustand'
import { seedApplications } from '../data/seed'
import { broadcastApplications, loadActivities, loadApplications, resetActivities, resetApplications, saveActivities, saveApplications } from '../lib/storage'
import { Activity, Application, STAGE_LABELS, Stage } from '../types'

type Theme = 'light' | 'dark'

type AppState = {
  applications: Application[]
  activities: Activity[]
  hydrated: boolean
  theme: Theme
  initialize: () => Promise<void>
  setTheme: (theme: Theme) => void
  addApplication: (application: Application) => void
  updateApplication: (id: string, patch: Partial<Application>) => void
  moveApplication: (id: string, stage: Stage) => void
  deleteApplication: (id: string) => void
  resetDemo: () => Promise<void>
  replaceApplications: (applications: Application[]) => void
  replaceActivities: (activities: Activity[]) => void
}

function initialTheme(): Theme {
  try {
    const saved = window.localStorage.getItem('applytrack-theme')
    return saved === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

const persist = (applications: Application[], activities: Activity[]) => {
  void saveApplications(applications)
  void saveActivities(activities)
  broadcastApplications(applications, activities)
}

export const useAppStore = create<AppState>((set, get) => ({
  applications: seedApplications,
  activities: [],
  hydrated: false,
  theme: typeof window !== 'undefined' ? initialTheme() : 'light',
  initialize: async () => {
    const [applications, activities] = await Promise.all([loadApplications(), loadActivities()])
    set({ applications, activities, hydrated: true })
  },
  setTheme: (theme) => {
    try { window.localStorage.setItem('applytrack-theme', theme) } catch { /* ignore */ }
    set({ theme })
  },
  addApplication: (application) => {
    const applications = [application, ...get().applications]
    const activities = [{ id: `activity-${Date.now()}`, applicationId: application.id, type: 'created' as const, text: `Added ${application.company} to your pipeline`, date: application.lastUpdated }, ...get().activities]
    set({ applications, activities })
    persist(applications, activities)
  },
  updateApplication: (id, patch) => {
    const current = get().applications.find((app) => app.id === id)
    const applications = get().applications.map((app) => app.id === id ? { ...app, ...patch, lastUpdated: new Date().toISOString().slice(0, 10) } : app)
    const activities = patch.notes !== undefined && current ? [{ id: `activity-${Date.now()}`, applicationId: id, type: 'note' as const, text: `Updated notes for ${current.company}`, date: new Date().toISOString().slice(0, 10) }, ...get().activities] : get().activities
    set({ applications, activities })
    persist(applications, activities)
  },
  moveApplication: (id, stage) => {
    const current = get().applications.find((app) => app.id === id)
    const applications = get().applications.map((app) => app.id === id ? { ...app, stage, lastUpdated: new Date().toISOString().slice(0, 10) } : app)
    const activities = current && current.stage !== stage ? [{ id: `activity-${Date.now()}`, applicationId: id, type: 'move' as const, text: `${current.company} moved to ${STAGE_LABELS[stage]}`, date: new Date().toISOString().slice(0, 10) }, ...get().activities] : get().activities
    set({ applications, activities })
    persist(applications, activities)
  },
  deleteApplication: (id) => {
    const applications = get().applications.filter((app) => app.id !== id)
    set({ applications })
    persist(applications, get().activities)
  },
  resetDemo: async () => set({ applications: await resetApplications(), activities: await resetActivities() }),
  replaceApplications: (applications) => set({ applications }),
  replaceActivities: (activities) => set({ activities }),
}))
