import { copyFileSync } from 'node:fs'
import { join } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1]
const pagesBase = repositoryName?.endsWith('.github.io') ? '/' : repositoryName ? `/${repositoryName}/` : '/'
const base = process.env.VITE_BASE_PATH ?? (process.env.GITHUB_ACTIONS ? pagesBase : '/')

function githubPagesFallback() {
  return {
    name: 'github-pages-fallback',
    closeBundle() {
      const indexPath = join(process.cwd(), 'dist', 'index.html')
      copyFileSync(indexPath, join(process.cwd(), 'dist', '404.html'))
    },
  }
}

export default defineConfig({
  plugins: [react(), githubPagesFallback()],
  base,
  server: { port: 5173, host: '0.0.0.0' },
  preview: { port: 4173, host: '0.0.0.0' },
})
