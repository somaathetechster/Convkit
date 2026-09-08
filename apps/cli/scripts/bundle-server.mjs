#!/usr/bin/env node
/**
 * Bundles the Convkit server into the CLI package.
 * Run before publishing the CLI.
 * Copies apps/server/dist/ → apps/cli/server/
 * Copies apps/server/package.json → apps/cli/server/package.json
 */

import { cpSync, mkdirSync, rmSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const cliRoot = join(__dirname, '..')
const repoRoot = join(cliRoot, '..', '..')
const serverDist = join(repoRoot, 'apps', 'server', 'dist')
const serverPkg = join(repoRoot, 'apps', 'server', 'package.json')
const target = join(cliRoot, 'server')

if (!existsSync(serverDist)) {
  console.error('Server dist not found. Run: cd apps/server && pnpm run build')
  process.exit(1)
}

// Clean and recreate target
if (existsSync(target)) rmSync(target, { recursive: true })
mkdirSync(target, { recursive: true })

// Copy dist files
cpSync(serverDist, join(target, 'dist'), { recursive: true })

// Copy package.json (needed for node module resolution)
cpSync(serverPkg, join(target, 'package.json'))

console.log('Server bundled into apps/cli/server/')
