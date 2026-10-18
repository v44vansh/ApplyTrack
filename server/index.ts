import 'dotenv/config'
import { Server } from 'socket.io'
import { buildApp } from './app.js'
import { getUserFromSession, socketSessionToken } from './auth.js'
import { closeDatabase, prisma } from './db.js'

const port = Number(process.env.PORT ?? 4000)
let io: Server

const app = await buildApp({
  onChange: (userId, change) => {
    io?.to(`user:${userId}`).emit('workspace:change', change)
  },
})

io = new Server(app.server, {
  cors: { origin: process.env.FRONTEND_URL ?? true, credentials: true },
})

io.use(async (socket, next) => {
  try {
    const user = await getUserFromSession(prisma, socketSessionToken(socket.handshake.headers.cookie))
    if (!user) return next(new Error('unauthorized'))
    socket.data.userId = user.id
    next()
  } catch (error) {
    next(error as Error)
  }
})

io.on('connection', (socket) => {
  socket.join(`user:${socket.data.userId}`)
  socket.emit('workspace:ready', { connectedAt: new Date().toISOString() })
})

const shutdown = async () => {
  io.close()
  await app.close()
  await closeDatabase()
  process.exit(0)
}

process.on('SIGINT', () => void shutdown())
process.on('SIGTERM', () => void shutdown())

await app.listen({ port, host: '0.0.0.0' })
app.log.info(`ApplyTrack API listening on http://localhost:${port}`)
