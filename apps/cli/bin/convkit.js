#!/usr/bin/env node
import { existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { spawn } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const entryPath = join(__dirname, '..', 'src', 'index.ts')

// Prefer the CLI package's own tsx, fall back to the workspace root's
const candidates = [
  join(__dirname, '..', 'node_modules', '.bin', 'tsx'),
  join(__dirname, '..', '..', '..', 'node_modules', '.bin', 'tsx')
]
const tsxPath = candidates.find(p => existsSync(p))

if (!tsxPath) {
  console.error('Could not find tsx. Run pnpm install from the repo root.')
  process.exit(1)
}

const child = spawn(tsxPath, [entryPath, ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: process.env
})

child.on('exit', code => process.exit(code ?? 0))
