import { spawn } from 'child_process'
import { join } from 'path'
import { existsSync } from 'fs'
import { cliRoot, resolveServerProcess } from './_server-entry.js'
import { createAdapter, supportedAdapters } from './adapter-runtime.js'
import { parseCommandOptions } from './options.js'
import { registerAdapterBot, stopChildren, waitForServerReady } from './lifecycle.js'

function findWebRoot(): string | null {
  // The web UI ships only with the monorepo, not the published CLI
  const monorepoWeb = join(cliRoot, '..', '..', 'apps', 'web')
  if (existsSync(monorepoWeb)) return monorepoWeb
  return null
}

export async function devCommand(flags: string[]): Promise<void> {
  let options
  try { options = parseCommandOptions(flags, supportedAdapters().split(', ')) } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
    return
  }
  if (options.help) {
    console.log('Usage: convkit dev [--adapter <infobip|meta> --bot <url>] [--adapter-port <port>]')
    console.log('Starts the Convkit server, web UI, and optionally a provider adapter.')
    return
  }
  console.log('Starting Convkit...')
  console.log('')

  const { cmd, args } = resolveServerProcess()

  const server = spawn(cmd, args, {
    stdio: 'inherit',
    env: { ...process.env }
  })
  const children = [server]
  let adapter: Awaited<ReturnType<typeof createAdapter>> | null = null

  if (options.adapter) {
    try {
      await Promise.race([
        waitForServerReady('http://localhost:4000'),
        new Promise<never>((_, reject) => server.once('error', reject))
      ])
      adapter = await createAdapter(options.adapter)
      await registerAdapterBot('http://localhost:4000', adapter.endpoint, options.adapter.name)
      adapter.listen()
      console.log(`${options.adapter.name} adapter: ${adapter.endpoint}`)
    } catch (error) {
      adapter?.close()
      stopChildren(children)
      throw new Error(error instanceof Error ? error.message : String(error))
    }
  }

  const webRoot = findWebRoot()
  let web: ReturnType<typeof spawn> | null = null

  if (webRoot) {
    web = spawn('pnpm', ['dev'], {
      cwd: webRoot,
      stdio: 'inherit',
      env: { ...process.env }
    })
    children.push(web)
    console.log('Web UI: http://localhost:3000')
  } else {
    console.log('Web UI: not available (install from https://github.com/somaathetechster/Convkit)')
  }

  console.log('Server: http://localhost:4000')
  console.log('')
  console.log('Press Ctrl+C to stop')

  let stopping = false
  const cleanup = (code: number) => {
    if (stopping) return
    stopping = true
    adapter?.close()
    stopChildren(children)
    process.exitCode = code
  }
  const onSignal = () => cleanup(0)
  process.once('SIGINT', onSignal)
  process.once('SIGTERM', onSignal)

  await new Promise<void>(resolve => {
    server.once('error', error => { console.error(error); cleanup(1); resolve() })
    server.once('exit', code => { if (!stopping) cleanup(code ?? 1); resolve() })
    web?.once('error', error => { console.error(error); cleanup(1); resolve() })
    web?.once('exit', code => { if (!stopping) cleanup(code ?? 1); resolve() })
  })
}
