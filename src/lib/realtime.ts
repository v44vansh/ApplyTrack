import { io, Socket } from 'socket.io-client'
import { Activity, Application } from '../types'

export type SyncPayload = { applications: Application[]; activities: Activity[] }
type SyncHandler = (payload: SyncPayload) => void

let channel: BroadcastChannel | null = null
let socket: Socket | null = null

function getChannel() {
  if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return null
  if (!channel) channel = new BroadcastChannel('applytrack-sync')
  return channel
}

function getSocket() {
  const endpoint = import.meta.env.VITE_SOCKET_URL
  if (!endpoint || socket) return socket
  socket = io(endpoint, { autoConnect: true, transports: ['websocket'] })
  return socket
}

export function publishSync(payload: SyncPayload) {
  getChannel()?.postMessage(payload)
  getSocket()?.emit('applications:sync', payload)
}

export function subscribeToSync(handler: SyncHandler) {
  const localChannel = getChannel()
  const remoteSocket = getSocket()
  localChannel?.addEventListener('message', (event) => handler(event.data as SyncPayload))
  remoteSocket?.on('applications:sync', handler)
  return () => {
    if (localChannel && channel === localChannel) {
      localChannel.close()
      channel = null
    }
    remoteSocket?.off('applications:sync', handler)
  }
}
