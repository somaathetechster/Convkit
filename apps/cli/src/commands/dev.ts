import { spawn } from 'child_process'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..', '..', '..', '..')

export async function devCommand(_flags: string[]): Promise<void> {
  console.log('Starting Convkit...')
  console.log('')

  const server = spawn('pnpm', ['dev'], {
    cwd: join(repoRoot, 'apps', 'server'),
    stdio: 'inherit',
    env: { ...process.env }
  })

  const web = spawn('pnpm', ['dev'], {
    cwd: join(repoRoot, 'apps', 'web'),
    stdio: 'inherit',
    env: { ...process.env }
  })

  console.log('Server: http://localhost:4000')
  console.log('Web UI: http://localhost:3000')
  console.log('')
  console.log('Press Ctrl+C to stop')

  process.on('SIGINT', () => {
    server.kill()
    web.kill()
    process.exit(0)
  })

  await new Promise<void>((_, reject) => {
    server.on('error', reject)
    web.on('error', reject)
  })
}
