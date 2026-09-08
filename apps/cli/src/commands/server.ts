import { spawn } from 'child_process'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..', '..', '..', '..')

export async function serverCommand(_flags: string[]): Promise<void> {
  console.log('Starting Convkit server...')

  const server = spawn('pnpm', ['dev'], {
    cwd: join(repoRoot, 'apps', 'server'),
    stdio: 'inherit',
    env: { ...process.env }
  })

  console.log('Server: http://localhost:4000')
  console.log('')
  console.log('Press Ctrl+C to stop')

  process.on('SIGINT', () => {
    server.kill()
    process.exit(0)
  })

  await new Promise<void>((_, reject) => {
    server.on('error', reject)
  })
}
