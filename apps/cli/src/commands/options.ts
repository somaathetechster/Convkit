import type { AdapterName, AdapterOptions } from './adapter-runtime.js'

export interface CommandOptions {
  adapter?: AdapterOptions
  help: boolean
}

function valueAfter(flags: string[], index: number, flag: string): string {
  const value = flags[index + 1]
  if (!value || value.startsWith('--')) throw new Error(`${flag} requires a value`)
  return value
}

export function parseCommandOptions(flags: string[], supported: string[]): CommandOptions {
  let adapterName: string | undefined
  let botUrl: string | undefined
  let adapterPort = 6000
  let help = false

  for (let index = 0; index < flags.length; index += 1) {
    const flag = flags[index]
    if (flag === '--help' || flag === '-h') { help = true; continue }
    if (flag === '--adapter') { adapterName = valueAfter(flags, index++, flag); continue }
    if (flag === '--bot') { botUrl = valueAfter(flags, index++, flag); continue }
    if (flag === '--adapter-port') {
      const rawPort = valueAfter(flags, index++, flag)
      adapterPort = Number(rawPort)
      if (!Number.isInteger(adapterPort) || adapterPort < 1 || adapterPort > 65535) {
        throw new Error('--adapter-port must be an integer between 1 and 65535')
      }
      continue
    }
    throw new Error(`Unknown option: ${flag}`)
  }

  if (!adapterName && botUrl) throw new Error('--bot requires --adapter')
  if (adapterName && !supported.includes(adapterName)) {
    throw new Error(`Unsupported adapter "${adapterName}". Supported adapters: ${supported.join(', ')}`)
  }
  if (adapterName && !botUrl) throw new Error('--bot is required when --adapter is supplied')

  if (botUrl) {
    let parsed: URL
    try { parsed = new URL(botUrl) } catch { throw new Error('--bot must be a valid URL') }
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('--bot must use http or https')
  }

  return {
    help,
    adapter: adapterName ? { name: adapterName as AdapterName, botUrl: botUrl!, port: adapterPort } : undefined
  }
}
