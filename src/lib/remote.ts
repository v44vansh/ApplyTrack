import { Application } from '../types'
import { authApi, isApiConfigured, SessionUser, workspaceApi, WorkspaceSnapshot } from './api'
import { supabaseConfigured } from './supabase'
import { supabaseAuth, supabaseWorkspace } from './supabaseWorkspace'

export const remoteConfigured = supabaseConfigured || isApiConfigured

export const remoteAuth = {
  me: (): Promise<SessionUser> => supabaseConfigured ? supabaseAuth.me() : authApi.me().then((result) => result.user),
  login: (email: string, password: string): Promise<SessionUser> => supabaseConfigured ? supabaseAuth.login(email, password) : authApi.login(email, password).then((result) => result.user),
  register: (name: string, email: string, password: string): Promise<SessionUser> => supabaseConfigured ? supabaseAuth.register(name, email, password) : authApi.register(name, email, password).then((result) => result.user),
  logout: (): Promise<void> => supabaseConfigured ? supabaseAuth.logout() : authApi.logout().then(() => undefined),
}

export const remoteWorkspace = {
  load: (): Promise<WorkspaceSnapshot> => supabaseConfigured ? supabaseWorkspace.load() : workspaceApi.load(),
  create: async (application: Application) => supabaseConfigured
    ? { application: await supabaseWorkspace.create(application) }
    : { application: await workspaceApi.create(application) },
  update: (id: string, patch: Partial<Application>) => supabaseConfigured ? supabaseWorkspace.update(id, patch) : workspaceApi.update(id, patch),
  remove: async (id: string) => { if (supabaseConfigured) return supabaseWorkspace.remove(id); await workspaceApi.remove(id) },
}
