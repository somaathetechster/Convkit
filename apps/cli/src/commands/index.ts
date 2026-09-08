import { testCommand } from './test.js'
import { devCommand } from './dev.js'
import { serverCommand } from './server.js'

export const commands: Record<string, (flags: string[]) => Promise<void>> = {
  test: testCommand,
  dev: devCommand,
  server: serverCommand
}
