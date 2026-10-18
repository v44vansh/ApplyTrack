import { io, Socket } from 'socket.io-client'
import { Activity, Application } from '../types'

export type SyncPayload = { applications: Application[]; activities: Activity[] }
export type WorkspaceChange = { kind: 'upsert'; application: Application; activity?: Activity } | { kind: 'delete'; applicationId: string }
export type SyncEvent = SyncPayload | WorkspaceChange
type SyncHandler = (payload: SyncEvent) => void

let channel: BroadcastChannel | null = null
let socket: Socket | null = null

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
  const localChannel = getChannel()
  const remoteSocket = getSocket()
  localChannel?.addEventListener('message', (event) => handler(event.data as SyncPayload))
  remoteSocket?.on('workspace:change', handler)
  return () => {
    if (localChannel && channel === localChannel) {
      localChannel.close()
      channel = null
    }
    remoteSocket?.off('workspace:change', handler)
  }
}
