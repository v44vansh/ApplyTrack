import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

process.env.DATABASE_URL ??= 'file:./dev.db'
const command = resolve(process.platform === 'win32' ? 'node_modules/.bin/prisma.cmd' : 'node_modules/.bin/prisma')
if (!existsSync(command) && !existsSync(`${command}.cmd`)) {
  console.error('Prisma CLI is not installed. Run npm ci first.')
  process.exit(1)
}
const result = spawnSync(command, process.argv.slice(2), { stdio: 'inherit', env: process.env, shell: process.platform === 'win32' })
process.exit(result.status ?? 1)
