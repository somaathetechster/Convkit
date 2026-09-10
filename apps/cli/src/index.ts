import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { commands } from './commands/index.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'))
const VERSION: string = pkg.version

const args = process.argv.slice(2)
const command = args[0]
const flags = args.slice(1)

function printHelp() {
  console.log('')
  console.log('convkit — WhatsApp bot development environment')
  console.log('')
  console.log('Usage:')
  console.log('  convkit dev              Start server and web UI')
  console.log('  convkit server           Start server only')
  console.log('  convkit test [pattern]   Run test files')
  console.log('  convkit version          Print version')
  console.log('')
  console.log('Options for convkit dev/server:')
  console.log('  --adapter <infobip|meta> Start a provider adapter')
  console.log('  --bot <url>              Existing bot webhook URL (required with --adapter)')
  console.log('  --adapter-port <port>    Adapter port (default: 6000)')
  console.log('')
  console.log('Options for convkit test:')
  console.log('  --server <url>           Convkit server URL (default: http://localhost:4000)')
  console.log('  --bot <url>              Bot webhook URL (default: http://localhost:5000/webhook)')
  console.log('  --timeout <ms>           Step timeout in ms (default: 5000)')
  console.log('  --json                   Output results as JSON')
  console.log('  --headless               Run without browser UI (server only)')
  console.log('')
}

if (!command || command === 'help' || command === '--help' || command === '-h') {
  printHelp()
  process.exit(0)
}

if (command === 'version' || command === '--version' || command === '-v') {
  console.log(VERSION)
  process.exit(0)
}

const handler = commands[command]
if (!handler) {
  console.error(`Unknown command: ${command}`)
  console.error('Run convkit --help for usage')
  process.exit(1)
}

try {
  await handler(flags)
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
}
