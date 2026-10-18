import { create } from 'zustand'
import { seedApplications } from '../data/seed'
import { broadcastApplications, loadApplications, resetApplications, saveApplications } from '../lib/storage'
import { Application, Stage } from '../types'

type Theme = 'light' | 'dark'

type AppState = {
  applications: Application[]
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
}

function initialTheme(): Theme {
  try {
    const saved = window.localStorage.getItem('applytrack-theme')
    return saved === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

const persist = (applications: Application[]) => {
  void saveApplications(applications)
  broadcastApplications(applications)
}

export const useAppStore = create<AppState>((set, get) => ({
  applications: seedApplications,
  hydrated: false,
  theme: typeof window !== 'undefined' ? initialTheme() : 'light',
  initialize: async () => {
    const applications = await loadApplications()
    set({ applications, hydrated: true })
  },
  setTheme: (theme) => {
    try { window.localStorage.setItem('applytrack-theme', theme) } catch { /* ignore */ }
    set({ theme })
  },
  addApplication: (application) => {
    const applications = [application, ...get().applications]
    set({ applications })
    persist(applications)
  },
  updateApplication: (id, patch) => {
    const applications = get().applications.map((app) => app.id === id ? { ...app, ...patch, lastUpdated: new Date().toISOString().slice(0, 10) } : app)
    set({ applications })
    persist(applications)
  },
  moveApplication: (id, stage) => {
    const applications = get().applications.map((app) => app.id === id ? { ...app, stage, lastUpdated: new Date().toISOString().slice(0, 10) } : app)
    set({ applications })
    persist(applications)
  },
  deleteApplication: (id) => {
    const applications = get().applications.filter((app) => app.id !== id)
    set({ applications })
    persist(applications)
  },
  resetDemo: async () => set({ applications: await resetApplications() }),
  replaceApplications: (applications) => set({ applications }),
}))
