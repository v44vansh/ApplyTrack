import { io, Socket } from 'socket.io-client'
import { Activity, Application } from '../types'
import { activityFromRow, applicationFromRow } from './supabaseWorkspace'
import { supabase, supabaseConfigured } from './supabase'

export type SyncPayload = { applications: Application[]; activities: Activity[] }
export type WorkspaceChange = { kind: 'upsert'; application: Application; activity?: Activity } | { kind: 'delete'; applicationId: string } | { kind: 'activity'; activity: Activity }
export type SyncEvent = SyncPayload | WorkspaceChange
type SyncHandler = (payload: SyncEvent) => void

let channel: BroadcastChannel | null = null
let socket: Socket | null = null
let supabaseChannel: ReturnType<NonNullable<typeof supabase>['channel']> | null = null

function getChannel() {
  if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return null
  if (!channel) channel = new BroadcastChannel('applytrack-sync')
  return channel
}

function getSocket() {
  const endpoint = (import.meta.env.VITE_SOCKET_URL as string | undefined) ?? (import.meta.env.PROD ? window.location.origin : undefined)
  if (!endpoint || socket) return socket
  socket = io(endpoint, { autoConnect: true, transports: ['websocket'], withCredentials: true })
  return socket
}

export function publishSync(payload: SyncPayload) {
  getChannel()?.postMessage(payload)
}

export function subscribeToSync(handler: SyncHandler) {
  const localChannel = supabaseConfigured ? null : getChannel()
  const remoteSocket = supabaseConfigured ? null : getSocket()
  localChannel?.addEventListener('message', (event) => handler(event.data as SyncPayload))
  remoteSocket?.on('workspace:change', handler)
  let stopped = false
  const supabaseClient = supabase
  if (supabaseConfigured && supabaseClient) {
    void supabaseClient.auth.getUser().then(({ data }) => {
      if (stopped || !data.user) return
      supabaseChannel = supabaseClient
        .channel(`applytrack-workspace-${data.user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'applications', filter: `owner_id=eq.${data.user.id}` }, (payload) => {
          if (payload.eventType === 'DELETE') handler({ kind: 'delete', applicationId: String((payload.old as { id: string }).id) })
          else handler({ kind: 'upsert', application: applicationFromRow(payload.new as never) })
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'activities', filter: `owner_id=eq.${data.user.id}` }, (payload) => {
          if (payload.eventType !== 'DELETE') handler({ kind: 'activity', activity: activityFromRow(payload.new as never) })
        })
        .subscribe()
    })
  }
  return () => {
    stopped = true
    if (localChannel && channel === localChannel) {
      localChannel.close()
      channel = null
    }
    remoteSocket?.off('workspace:change', handler)
    if (supabaseChannel && supabaseClient) {
      void supabaseClient.removeChannel(supabaseChannel)
      supabaseChannel = null
    }
  }
}
