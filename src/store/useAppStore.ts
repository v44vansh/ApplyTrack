import { create } from 'zustand'
import { seedApplications } from '../data/seed'
import { Activity, Application, STAGE_LABELS, Stage } from '../types'
import { SessionUser } from '../lib/api'
import { remoteAuth, remoteConfigured, remoteWorkspace } from '../lib/remote'
import { broadcastApplications, loadActivities, loadApplications, resetActivities, resetApplications, saveActivities, saveApplications } from '../lib/storage'

type Theme = 'light' | 'dark'
type AuthStatus = 'local' | 'checking' | 'authenticated' | 'unauthenticated' | 'error'

type AppState = {
  applications: Application[]
  activities: Activity[]
  hydrated: boolean
  authStatus: AuthStatus
  user: SessionUser | null
  authError: string | null
  theme: Theme
  initialize: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
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
  if (!remoteConfigured) broadcastApplications(applications, activities)
}

function withVersion(application: Application) {
  return { ...application, version: application.version ?? 1 }
}

export const useAppStore = create<AppState>((set, get) => ({
  applications: seedApplications,
  activities: [],
  hydrated: false,
  authStatus: remoteConfigured ? 'checking' : 'local',
  user: null,
  authError: null,
  theme: typeof window !== 'undefined' ? initialTheme() : 'light',
  initialize: async () => {
    if (remoteConfigured) {
      try {
        const user = await remoteAuth.me()
        const workspace = await remoteWorkspace.load()
        const applications = workspace.applications.map(withVersion)
        set({ applications, activities: workspace.activities, hydrated: true, authStatus: 'authenticated', user, authError: null })
        persist(applications, workspace.activities)
        return
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to connect to ApplyTrack.'
        if (!message.includes('UNAUTHENTICATED') && !message.includes('401') && !message.includes('sign in')) set({ hydrated: true, authStatus: 'error', authError: message })
        else set({ hydrated: true, authStatus: 'unauthenticated', authError: null })
        return
      }
    }
    const [applications, activities] = await Promise.all([loadApplications(), loadActivities()])
    set({ applications, activities, hydrated: true, authStatus: 'local' })
  },
  login: async (email, password) => {
    const user = await remoteAuth.login(email, password)
    const workspace = await remoteWorkspace.load()
    const applications = workspace.applications.map(withVersion)
    set({ applications, activities: workspace.activities, authStatus: 'authenticated', user, authError: null })
    persist(applications, workspace.activities)
  },
  register: async (name, email, password) => {
    const user = await remoteAuth.register(name, email, password)
    const workspace = await remoteWorkspace.load()
    const applications = workspace.applications.map(withVersion)
    set({ applications, activities: workspace.activities, authStatus: 'authenticated', user, authError: null })
    persist(applications, workspace.activities)
  },
  logout: async () => {
    if (!remoteConfigured) return
    await remoteAuth.logout()
    set({ authStatus: 'unauthenticated', user: null, applications: [], activities: [] })
  },
  setTheme: (theme) => {
    try { window.localStorage.setItem('applytrack-theme', theme) } catch { /* ignore */ }
    set({ theme })
  },
  addApplication: (application) => {
    const optimistic = withVersion(application)
    const applications = [optimistic, ...get().applications]
    const activities = [{ id: `activity-${Date.now()}`, applicationId: application.id, type: 'created' as const, text: `Added ${application.company} to your pipeline`, date: application.lastUpdated }, ...get().activities]
    set({ applications, activities })
    persist(applications, activities)
    if (remoteConfigured && get().authStatus === 'authenticated') {
      void remoteWorkspace.create(application).then(({ application: saved }) => {
        const reconciled = get().applications.map((item) => item.id === optimistic.id ? withVersion(saved) : item)
        const reconciledActivities = get().activities
          .map((item) => item.applicationId === optimistic.id ? { ...item, applicationId: saved.id } : item)
          .filter((item) => item.text !== `Added ${saved.company} to your pipeline` || item.applicationId !== saved.id)
        set({ applications: reconciled, activities: reconciledActivities })
        persist(reconciled, reconciledActivities)
      }).catch((error) => set({ authError: error instanceof Error ? error.message : 'Could not sync application.' }))
    }
  },
  updateApplication: (id, patch) => {
    const current = get().applications.find((app) => app.id === id)
    const applications = get().applications.map((app) => app.id === id ? { ...app, ...patch, lastUpdated: new Date().toISOString().slice(0, 10) } : app)
    const activities = patch.notes !== undefined && current ? [{ id: `activity-${Date.now()}`, applicationId: id, type: 'note' as const, text: `Updated notes for ${current.company}`, date: new Date().toISOString().slice(0, 10) }, ...get().activities] : get().activities
    set({ applications, activities })
    persist(applications, activities)
    if (remoteConfigured && get().authStatus === 'authenticated') void remoteWorkspace.update(id, { ...patch, version: current?.version }).then((saved) => {
      const reconciled = get().applications.map((item) => item.id === id ? withVersion(saved) : item)
      set({ applications: reconciled })
      persist(reconciled, get().activities)
    }).catch((error) => set({ authError: error instanceof Error ? error.message : 'Could not sync application.' }))
  },
  moveApplication: (id, stage) => {
    const current = get().applications.find((app) => app.id === id)
    const applications = get().applications.map((app) => app.id === id ? { ...app, stage, lastUpdated: new Date().toISOString().slice(0, 10) } : app)
    const activities = current && current.stage !== stage ? [{ id: `activity-${Date.now()}`, applicationId: id, type: 'move' as const, text: `${current.company} moved to ${STAGE_LABELS[stage]}`, date: new Date().toISOString().slice(0, 10) }, ...get().activities] : get().activities
    set({ applications, activities })
    persist(applications, activities)
    if (remoteConfigured && get().authStatus === 'authenticated') void remoteWorkspace.update(id, { stage, version: current?.version }).then((saved) => {
      const reconciled = get().applications.map((item) => item.id === id ? withVersion(saved) : item)
      set({ applications: reconciled })
      persist(reconciled, get().activities)
    }).catch((error) => set({ authError: error instanceof Error ? error.message : 'Could not sync stage change.' }))
  },
  deleteApplication: (id) => {
    const applications = get().applications.filter((app) => app.id !== id)
    set({ applications })
    persist(applications, get().activities)
    if (remoteConfigured && get().authStatus === 'authenticated') void remoteWorkspace.remove(id).catch((error) => set({ authError: error instanceof Error ? error.message : 'Could not delete application.' }))
  },
  resetDemo: async () => set({ applications: await resetApplications(), activities: await resetActivities() }),
  replaceApplications: (applications) => set({ applications }),
  replaceActivities: (activities) => set({ activities }),
}))
