import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))

// dist/commands/ and src/commands/ are both two levels below the package root
export const cliRoot = join(__dirname, '..', '..')

export function findServerEntry(): string {
  // Monorepo takes priority — use live TypeScript source
  const monorepoSrc = join(cliRoot, '..', '..', 'apps', 'server', 'src', 'index.ts')
  if (existsSync(monorepoSrc)) return monorepoSrc

  // Monorepo built output
  const monorepoBuilt = join(cliRoot, '..', '..', 'apps', 'server', 'dist', 'index.js')
  if (existsSync(monorepoBuilt)) return monorepoBuilt

  // Global install fallback — bundled server inside CLI package
  const bundled = join(cliRoot, 'server', 'dist', 'index.js')
  if (existsSync(bundled)) return bundled

  throw new Error(
    'Cannot find Convkit server. ' +
    'If running from the monorepo, the server source should be at apps/server/src/index.ts. ' +
    'If installed globally, try reinstalling: npm install -g @convkit/cli'
  )
}

export function findTsx(): string | null {
  const candidates = [
    join(cliRoot, 'node_modules', '.bin', 'tsx'),
    // repo root node_modules, two levels up from apps/cli
    join(cliRoot, '..', '..', 'node_modules', '.bin', 'tsx')
  ]
  return candidates.find(p => existsSync(p)) ?? null
}

// Resolve the command + args needed to run the server entry we found.
// Exits the process with a message if the entry or tsx is missing.
export function resolveServerProcess(): { cmd: string; args: string[] } {
  let serverEntry: string
  try {
    serverEntry = findServerEntry()
  } catch (err: any) {
    console.error(err.message)
    process.exit(1)
  }

  if (serverEntry.endsWith('.ts')) {
    const tsx = findTsx()
    if (!tsx) {
      console.error('Cannot find tsx. Run pnpm install in the Convkit repo.')
      process.exit(1)
    }
    return { cmd: tsx, args: [serverEntry] }
  }

  return { cmd: process.execPath, args: [serverEntry] }
}
