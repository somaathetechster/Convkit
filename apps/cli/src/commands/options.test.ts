import { describe, expect, it } from 'vitest'
import { parseCommandOptions } from './options.js'

const supported = ['infobip', 'meta']

describe('CLI adapter options', () => {
  it('keeps the no-adapter command valid', () => {
    expect(parseCommandOptions([], supported)).toEqual({ help: false, adapter: undefined })
  })

  it.each(['infobip', 'meta'])('resolves %s with the default port', name => {
    expect(parseCommandOptions(['--adapter', name, '--bot', 'http://localhost:5000/webhook'], supported).adapter)
      .toEqual({ name, botUrl: 'http://localhost:5000/webhook', port: 6000 })
  })

  it('respects a custom adapter port', () => {
    expect(parseCommandOptions([
      '--adapter', 'infobip', '--bot', 'http://localhost:5000/webhook', '--adapter-port', '7000'
    ], supported).adapter?.port).toBe(7000)
  })

  it('rejects missing bots and unsupported adapters', () => {
    expect(() => parseCommandOptions(['--adapter', 'infobip'], supported)).toThrow('--bot is required')
    expect(() => parseCommandOptions(['--adapter', 'twilio', '--bot', 'http://localhost:5000'], supported))
      .toThrow('Unsupported adapter')
  })
})
