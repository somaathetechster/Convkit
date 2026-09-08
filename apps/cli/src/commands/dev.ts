import { spawn } from 'child_process'
import { join } from 'path'
import { existsSync } from 'fs'
import { cliRoot, resolveServerProcess } from './_server-entry.js'

function findWebRoot(): string | null {
  // The web UI ships only with the monorepo, not the published CLI
  const monorepoWeb = join(cliRoot, '..', '..', 'apps', 'web')
  if (existsSync(monorepoWeb)) return monorepoWeb
  return null
}

export async function devCommand(_flags: string[]): Promise<void> {
  console.log('Starting Convkit...')
  console.log('')

  const { cmd, args } = resolveServerProcess()

  const server = spawn(cmd, args, {
    stdio: 'inherit',
    env: { ...process.env }
  })

  const webRoot = findWebRoot()
  let web: ReturnType<typeof spawn> | null = null

  if (webRoot) {
    web = spawn('pnpm', ['dev'], {
      cwd: webRoot,
      stdio: 'inherit',
      env: { ...process.env }
    })
    console.log('Web UI: http://localhost:3000')
  } else {
    console.log('Web UI: not available (install from https://github.com/somaathetechster/Convkit)')
  }

  console.log('Server: http://localhost:4000')
  console.log('')
  console.log('Press Ctrl+C to stop')

  process.on('SIGINT', () => {
    server.kill()
    web?.kill()
    process.exit(0)
  })

  await new Promise<void>((_, reject) => {
    server.on('error', reject)
    web?.on('error', reject)
  })
}
