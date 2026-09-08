#!/usr/bin/env node

import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync } from 'fs'
import { spawn } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const distEntry = join(__dirname, '..', 'dist', 'index.js')

// If built dist exists, run it directly with node (no tsx needed)
if (existsSync(distEntry)) {
  const child = spawn(process.execPath, [distEntry, ...process.argv.slice(2)], {
    stdio: 'inherit',
    env: process.env
  })
  child.on('exit', code => process.exit(code ?? 0))
} else {
  // Dev mode: find tsx and run TypeScript source
  const candidates = [
    join(__dirname, '..', 'node_modules', '.bin', 'tsx'),
    join(__dirname, '..', '..', '..', 'node_modules', '.bin', 'tsx')
  ]
  const tsx = candidates.find(p => existsSync(p))
  if (!tsx) {
    console.error('convkit: cannot find tsx. Run pnpm install in the Convkit repo.')
    process.exit(1)
  }
  const srcEntry = join(__dirname, '..', 'src', 'index.ts')
  const child = spawn(tsx, [srcEntry, ...process.argv.slice(2)], {
    stdio: 'inherit',
    env: process.env
  })
  child.on('exit', code => process.exit(code ?? 0))
}
